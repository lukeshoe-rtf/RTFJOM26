/**
 * Token Boxes Visualisation
 * Sky canvas: animated drifting clouds + tokens that fall into the boxes.
 * The canvas is position:absolute inside .boxes-container and covers the
 * full banner (including the area behind the boxes), so tokens appear to
 * fly through the sky and land in their box.
 */

class TokenBoxes {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    this.boxCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    this.total = 0;

    this.fallingTokens = [];

    this.tokenColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F97316'];

    // ── Animated clouds ──────────────────────────────────────────────
    // x is a fraction of canvas width (0 = left edge, 1 = right edge).
    // speed is in width-fractions per second (clouds drift left → right).
    this.clouds = [
      { x: 0.05, y: 24, scale: 1.05, speed: 0.013 },
      { x: 0.28, y: 46, scale: 0.72, speed: 0.021 },
      { x: 0.52, y: 14, scale: 1.30, speed: 0.008 },
      { x: 0.71, y: 56, scale: 0.88, speed: 0.017 },
      { x: 0.90, y: 32, scale: 0.60, speed: 0.026 },
    ];
    this._cloudLast = null; // timestamp of last cloud update

    // ── Animation suppression (first-one-wins between postMessage / Firestore) ──
    // Tracks when each box last had an animation claimed by either path.
    this.recentlyAnimated = {};

    // ── postMessage listener ──────────────────────────────────────────
    window.addEventListener('message', (event) => {
      if (event.data.type === 'PLEDGE_SUBMITTED') {
        const boxNum = event.data.boxNumber || 1;
        const count  = event.data.tokens || 1;
        // First-one-wins: if Firestore already claimed this box's animation
        // within the last 10 s, skip — otherwise claim it and play.
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

    // Start continuous cloud animation loop
    this._startCloudLoop();
  }

  // ── Cloud animation loop ─────────────────────────────────────────────
  _startCloudLoop() {
    const tick = (ts) => {
      if (this._cloudLast !== null) {
        const dt = (ts - this._cloudLast) / 1000; // elapsed seconds
        for (const c of this.clouds) {
          c.x += c.speed * dt;
          if (c.x > 1.35) c.x = -0.35; // wrap: re-enter from left
        }
      }
      this._cloudLast = ts;
      this.render();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ── Canvas sizing ────────────────────────────────────────────────────
  resize() {
    // Canvas is position:absolute inside .boxes-container.
    // We size it to match the container so it covers the full banner.
    const container = this.canvas.parentElement;
    const ratio = window.devicePixelRatio || 1;

    const width  = container.clientWidth;
    const height = container.clientHeight;

    this.canvas.width  = width  * ratio;
    this.canvas.height = height * ratio;
    this.canvas.style.width  = width  + 'px';
    this.canvas.style.height = height + 'px';

    this.ctx.scale(ratio, ratio);
    this.width  = width;
    this.height = height;

    this.render();
  }

  // ── Token burst spawner ──────────────────────────────────────────────
  /**
   * Trigger a staggered burst of tokens — one per actual token in the
   * submission. Each token waits 150–300 ms after the previous so they
   * overlap mid-fall but are visually countable. Capped at 30 for perf.
   */
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
    const boxWrappers = document.querySelectorAll('.box-wrapper');
    const targetBox   = boxWrappers[boxNumber - 1];
    if (!targetBox) return;

    const boxRect    = targetBox.querySelector('.token-box').getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();

    // Target: horizontal centre of the box, vertical centre of the box face.
    // Because the canvas now covers the full banner (not just the sky strip),
    // we can aim directly at the box rather than stopping at the canvas edge.
    const targetX = boxRect.left + boxRect.width  / 2 - canvasRect.left;
    const targetY = boxRect.top  + boxRect.height / 2 - canvasRect.top;

    // Start above the canvas with a small random horizontal spread
    const startX = targetX + (Math.random() - 0.5) * 40;
    const startY = -30;

    const colorIndex = (boxNumber - 1) % this.tokenColors.length;

    const token = {
      x: startX, y: startY,
      targetX, targetY,
      boxNumber,
      color: this.tokenColors[colorIndex],
      progress: 0,
      rotation: 0,
    };

    this.fallingTokens.push(token);
    this.animateToken(token);
  }

  animateToken(token) {
    const speed = 0.025;
    token.progress += speed;
    token.rotation += 0.1;

    if (token.progress < 1) {
      token.x = token.x + (token.targetX - token.x) * speed * 2;
      token.y = token.y + (token.targetY - token.y) * speed * 3;
      // render() is driven by the cloud loop; no extra render call needed
      requestAnimationFrame(() => this.animateToken(token));
    } else {
      // Token has landed — remove from active list
      const index = this.fallingTokens.indexOf(token);
      if (index > -1) this.fallingTokens.splice(index, 1);

      // Update internal counts (box display is driven by patch-widget-app.js)
      this.boxCounts[token.boxNumber] = (this.boxCounts[token.boxNumber] || 0) + 1;
      this.total++;
    }
  }

  // ── Firestore animation trigger ──────────────────────────────────────
  /**
   * Called by the Firestore onSnapshot path (patch.html inline module).
   * First-one-wins: if postMessage already claimed this box's animation
   * within the last 10 s this is a no-op, preventing double animations.
   */
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
    this.render();
  }

  // ── Render ───────────────────────────────────────────────────────────
  render() {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);
    this.drawClouds();
    this.drawFallingTokens();
  }

  drawClouds() {
    const { ctx, width, clouds } = this;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    for (const c of clouds) {
      this._drawCloud(c.x * width, c.y, c.scale);
    }
  }

  _drawCloud(x, y, scale) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.arc(x,               y,               20 * scale, 0, Math.PI * 2);
    ctx.arc(x + 28 * scale,  y - 12 * scale,  26 * scale, 0, Math.PI * 2);
    ctx.arc(x + 56 * scale,  y,               20 * scale, 0, Math.PI * 2);
    ctx.arc(x + 28 * scale,  y +  7 * scale,  18 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawFallingTokens() {
    const ctx = this.ctx;
    for (const token of this.fallingTokens) {
      ctx.save();
      ctx.translate(token.x, token.y);
      ctx.rotate(token.rotation);

      // Coin body
      ctx.fillStyle = token.color;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();

      // Shine highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-3, -3, 5, 0, Math.PI * 2);
      ctx.stroke();

      // Centre glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

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
  // Expose globally so Firestore path (patch.html inline module) can call
  // triggerAnimationFromFirestore, and patch-widget-app.js can call update().
  window.tokenBoxes = tokenBoxes;

  if (typeof window.tokenBoxesInit === 'function') {
    window.tokenBoxesInit(tokenBoxes);
  }
});
