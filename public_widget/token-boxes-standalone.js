/**
 * Token Boxes Visualisation
 * Canvas is position:absolute inside .boxes-container and covers the full
 * widget area. Veggie token images (6 varieties, random) fall from above
 * and land in their target box.
 *
 * Animation loop is on-demand: starts when tokens are spawned, stops when
 * all tokens have landed. No continuous background loop (no sky/clouds).
 */

class TokenBoxes {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    this.boxCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    this.total = 0;

    this.fallingTokens = [];
    this._animating = false;

    // ── Animation suppression (first-one-wins: postMessage vs Firestore) ──
    // Whichever path fires first for a given box claims the animation;
    // the second path within 10 s is a no-op.
    this.recentlyAnimated = {};

    // ── Preload all 6 veggie token images ─────────────────────────────
    this.tokenImages = this._loadTokenImages();

    // ── postMessage listener ──────────────────────────────────────────
    window.addEventListener('message', (event) => {
      if (event.data.type === 'PLEDGE_SUBMITTED') {
        const boxNum = event.data.boxNumber || 1;
        const count  = event.data.tokens || 1;
        const lastAnimated = this.recentlyAnimated[boxNum] || 0;
        if (Date.now() - lastAnimated < 10000) return;
        this.recentlyAnimated[boxNum] = Date.now();
        this.triggerBurst(boxNum, count);
      }
    });

    // Kept for backward-compat: external code can push updates this way.
    window.onTokenBoxesUpdate = ({ boxCounts, total }) => {
      this.boxCounts = boxCounts || this.boxCounts;
      this.total = total;
    };

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  // ── Token image loader ───────────────────────────────────────────────
  _loadTokenImages() {
    const names = [
      'Token 1 - Carrot.png',
      'Token 2 - Pea pod.png',
      'Token 3 - Mushroom.png',
      'Token 4 - Corn.png',
      'Token 5 - Tomato.png',
      'Token 6 - Cabbage.png',
    ];
    return names.map(name => {
      const img = new Image();
      img.src = `assets/${name}`;
      return img;
    });
  }

  // ── Canvas sizing ────────────────────────────────────────────────────
  resize() {
    const ratio  = window.devicePixelRatio || 1;
    // Fixed design dimensions — must match .boxes-container CSS (1284 × 374 px).
    // Do NOT read clientWidth/clientHeight: the container may report collapsed
    // height before layout completes, or the iframe viewport may be narrower
    // than the 1284 px design width, causing getBoundingClientRect-style bugs.
    const width  = 1284;
    const height = 374;

    this.canvas.width  = width  * ratio;
    this.canvas.height = height * ratio;
    this.canvas.style.width  = width  + 'px';
    this.canvas.style.height = height + 'px';

    this.ctx.scale(ratio, ratio);
    this.width  = width;
    this.height = height;
  }

  // ── On-demand animation loop ─────────────────────────────────────────
  // Starts when the first token of a burst is added; stops automatically
  // once all tokens have landed, clearing the canvas.
  _startAnimLoop() {
    if (this._animating) return;
    this._animating = true;
    const tick = () => {
      if (this.fallingTokens.length === 0) {
        this._animating = false;
        this.ctx.clearRect(0, 0, this.width, this.height);
        return;
      }
      this.render();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ── Token burst spawner ──────────────────────────────────────────────
  // Staggers tokens 150–300 ms apart so they overlap mid-fall but are
  // individually countable. Capped at 30 for performance.
  triggerBurst(boxNumber, count) {
    const tokenCount = Math.min(count || 1, 30);
    let cumulativeDelay = 0;
    for (let i = 0; i < tokenCount; i++) {
      const gap = 150 + Math.random() * 150;
      setTimeout(() => this.animateTokenFall(boxNumber), cumulativeDelay);
      cumulativeDelay += gap;
    }
  }

  animateTokenFall(boxNumber) {
    // Compute box centres directly from CSS layout constants.
    // This avoids getBoundingClientRect() coordinate-space confusion:
    // the canvas is top:0;left:0 inside .boxes-container, so canvas
    // coordinates ARE boxes-container coordinates.
    //   boxes-row margin-top : 191 px  (box-bottom = 364 px = canvas 374 − 10)
    //   gradient rect size   : 156 × 113 px
    //   gap (space-between)  : (1284 − 5×156) / 4 = 126 px
    const BOX_W   = 156;
    const BOX_H   = 113;
    const GAP     = (1284 - 5 * BOX_W) / 4; // 126 px
    const SKY_H   = 191; // matches .boxes-row margin-top in patch.html
    const idx     = Math.min(5, Math.max(1, boxNumber)) - 1;

    const targetX = BOX_W / 2 + idx * (BOX_W + GAP); // horizontal centre
    const targetY = SKY_H + BOX_H / 2;                // vertical centre of gradient rect

    // Start near the top of the sky with a small random horizontal spread.
    const startX = targetX + (Math.random() - 0.5) * 40;
    const startY = 0; // Start at the very top of the sky area

    // Pick a random veggie token image.
    const img = this.tokenImages[Math.floor(Math.random() * this.tokenImages.length)];

    const token = {
      x: startX, y: startY,
      targetX, targetY,
      boxNumber,
      img,
      progress: 0,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.12,
    };

    this.fallingTokens.push(token);
    this._startAnimLoop(); // no-op if loop is already running
  }

  // ── Firestore animation trigger ──────────────────────────────────────
  triggerAnimationFromFirestore(boxNumber, amount) {
    const lastAnimated = this.recentlyAnimated[boxNumber] || 0;
    if (Date.now() - lastAnimated < 10000) {
      console.log('[JOM26] Animation suppressed for box', boxNumber, '(already handled)');
      return;
    }
    this.recentlyAnimated[boxNumber] = Date.now();
    console.log('[JOM26] Firestore triggering burst for box', boxNumber, 'amount', amount);
    this.triggerBurst(boxNumber, amount);
  }

  // ── State sync ───────────────────────────────────────────────────────
  update(boxCounts, total) {
    this.boxCounts = boxCounts;
    this.total = total;
  }

  // ── Render ───────────────────────────────────────────────────────────
  // Advances all token positions, removes landed tokens, then draws.
  render() {
    const { ctx, width, height } = this;
    // Tokens are only drawn while above the box top (y < SKY_H).
    // Once a token crosses into the box area it is simply not painted —
    // it appears to enter the box and vanish. Physics keep running until
    // progress >= 1 so the counter still increments at the right time.
    const SKY_H = 210; // tokens travel 20 px into the box face before disappearing

    ctx.clearRect(0, 0, width, height);

    for (let i = this.fallingTokens.length - 1; i >= 0; i--) {
      const token = this.fallingTokens[i];
      const speed = 0.025;

      // ── advance physics ──────────────────────────────────────────────
      token.progress += speed;
      token.rotation += token.rotSpeed;
      token.x += (token.targetX - token.x) * speed * 2;
      token.y += (token.targetY - token.y) * speed * 3;

      if (token.progress >= 1) {
        this.fallingTokens.splice(i, 1);
        this.boxCounts[token.boxNumber] = (this.boxCounts[token.boxNumber] || 0) + 1;
        this.total++;
        continue;
      }

      // ── draw only while in the sky area ──────────────────────────────
      if (token.y >= SKY_H) continue; // past box top — skip drawing

      ctx.save();
      ctx.translate(token.x, token.y);
      ctx.rotate(token.rotation);

      const size = 48;
      if (token.img && token.img.complete && token.img.naturalWidth > 0) {
        ctx.drawImage(token.img, -size / 2, -size / 2, size, size);
      } else {
        // Fallback circle while image is still loading
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}

// ── Singleton + global hooks ─────────────────────────────────────────────
let tokenBoxes;

window.updateTokenBoxes = function (boxCounts, total) {
  if (tokenBoxes) tokenBoxes.update(boxCounts, total);
};

document.addEventListener('DOMContentLoaded', () => {
  tokenBoxes = new TokenBoxes('tokenCanvas');
  // Expose globally so Firestore path (patch.html inline module) and
  // patch-widget-app.js can call triggerAnimationFromFirestore / update().
  window.tokenBoxes = tokenBoxes;

  if (typeof window.tokenBoxesInit === 'function') {
    window.tokenBoxesInit(tokenBoxes);
  }
});
