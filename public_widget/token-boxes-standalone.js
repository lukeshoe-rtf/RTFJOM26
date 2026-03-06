/**
 * Token Boxes Visualisation
 * Tokens fall from the sky into numbered boxes
 */

class TokenBoxes {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    this.boxCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    this.total = 0;
    
    this.fallingTokens = [];
    this.animationId = null;
    
    this.tokenColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F97316'];
    
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.tokenQueue = [];
    this.isAnimating = false;

    // Tracks when each box last had an animation queued via postMessage.
    // Used to suppress a duplicate Firestore-triggered animation when both
    // paths are active (form + patch embedded in the same index.html).
    this.recentlyAnimated = {};

    window.addEventListener('message', (event) => {
      if (event.data.type === 'PLEDGE_SUBMITTED') {
        const boxNum = event.data.boxNumber || 1;
        this.recentlyAnimated[boxNum] = Date.now();
        this.queueTokenAnimation(boxNum, event.data.tokens || 1);
      }
    });

    window.onTokenBoxesUpdate = ({ boxCounts, total }) => {
      this.boxCounts = boxCounts || this.boxCounts;
      this.total = total;
    };
  }
  
  resize() {
    const container = this.canvas.parentElement;
    const ratio = window.devicePixelRatio || 1;
    
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.canvas.width = width * ratio;
    this.canvas.height = height * ratio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    this.ctx.scale(ratio, ratio);
    this.width = width;
    this.height = height;
    
    this.render();
  }
  
  queueTokenAnimation(boxNumber, tokens) {
    for (let i = 0; i < tokens; i++) {
      this.tokenQueue.push({ 
        boxNumber, 
        delay: i * 200,
        timestamp: Date.now() + i * 200
      });
    }
    this.processQueue();
  }
  
  processQueue() {
    if (this.isAnimating || this.tokenQueue.length === 0) return;
    
    const now = Date.now();
    const readyTokens = this.tokenQueue.filter(t => t.timestamp <= now);
    
    if (readyTokens.length === 0) {
      setTimeout(() => this.processQueue(), 50);
      return;
    }
    
    const token = this.tokenQueue.shift();
    this.animateTokenFall(token.boxNumber);
  }
  
  animateTokenFall(boxNumber) {
    this.isAnimating = true;

    const boxWrappers = document.querySelectorAll('.box-wrapper');
    const targetBox = boxWrappers[boxNumber - 1];

    if (!targetBox) {
      this.isAnimating = false;
      this.processQueue();
      return;
    }

    const boxRect = targetBox.querySelector('.token-box').getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();

    // Target X is the horizontal centre of the chosen box, relative to the canvas.
    // Target Y is the bottom of the sky canvas — the token falls out of the sky
    // into the box below. (Using the box's viewport Y would be outside the canvas
    // bounds, causing the token to be clipped by the sky-area's overflow:hidden.)
    const targetX = boxRect.left + boxRect.width / 2 - canvasRect.left;
    const targetY = this.height - 10;

    const startX = this.width / 2 + (Math.random() - 0.5) * 100;
    const startY = -30;

    const colorIndex = (boxNumber - 1) % this.tokenColors.length;
    const token = {
      x: startX,
      y: startY,
      targetX,
      targetY,
      boxNumber,
      color: this.tokenColors[colorIndex],
      progress: 0,
      rotation: 0
    };
    
    this.fallingTokens.push(token);
    this.animateToken(token);
  }
  
  animateToken(token) {
    const speed = 0.025;
    token.progress += speed;
    token.rotation += 0.1;
    
    if (token.progress < 1) {
      const easeProgress = 1 - Math.pow(1 - token.progress, 3);
      
      token.x = token.x + (token.targetX - token.x) * speed * 2;
      token.y = token.y + (token.targetY - token.y) * speed * 3;
      
      this.render();
      requestAnimationFrame(() => this.animateToken(token));
    } else {
      const index = this.fallingTokens.indexOf(token);
      if (index > -1) {
        this.fallingTokens.splice(index, 1);
      }
      
      this.boxCounts[token.boxNumber] = (this.boxCounts[token.boxNumber] || 0) + 1;
      this.total++;
      
      this.render();
      
      this.isAnimating = false;
      this.processQueue();
    }
  }
  
  /**
   * Trigger animation from a Firestore snapshot delta.
   * Skipped if postMessage already handled the same box within the last 10s
   * (avoids a double animation when form + patch are both embedded in index.html).
   */
  triggerAnimationFromFirestore(boxNumber, amount) {
    const lastPostMessage = this.recentlyAnimated[boxNumber] || 0;
    if (Date.now() - lastPostMessage < 10000) return; // postMessage already handled it
    this.queueTokenAnimation(boxNumber, amount);
  }

  update(boxCounts, total) {
    this.boxCounts = boxCounts;
    this.total = total;
    this.render();
  }
  
  render() {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    
    ctx.clearRect(0, 0, width, height);
    
    this.drawClouds();
    this.drawFallingTokens();
  }
  
  drawClouds() {
    const ctx = this.ctx;
    const width = this.width;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    const cloudPositions = [
      { x: width * 0.15, y: 30, scale: 0.8 },
      { x: width * 0.4, y: 50, scale: 1 },
      { x: width * 0.7, y: 25, scale: 0.7 },
      { x: width * 0.85, y: 60, scale: 0.9 }
    ];
    
    cloudPositions.forEach(cloud => {
      this.drawCloud(cloud.x, cloud.y, cloud.scale);
    });
  }
  
  drawCloud(x, y, scale) {
    const ctx = this.ctx;
    
    ctx.beginPath();
    ctx.arc(x, y, 20 * scale, 0, Math.PI * 2);
    ctx.arc(x + 25 * scale, y - 10 * scale, 25 * scale, 0, Math.PI * 2);
    ctx.arc(x + 50 * scale, y, 20 * scale, 0, Math.PI * 2);
    ctx.arc(x + 25 * scale, y + 5 * scale, 18 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  
  drawFallingTokens() {
    const ctx = this.ctx;
    
    this.fallingTokens.forEach(token => {
      ctx.save();
      ctx.translate(token.x, token.y);
      ctx.rotate(token.rotation);
      
      ctx.fillStyle = token.color;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-3, -3, 5, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    });
  }
}

let tokenBoxes;

window.updateTokenBoxes = function(boxCounts, total) {
  if (tokenBoxes) {
    tokenBoxes.update(boxCounts, total);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  tokenBoxes = new TokenBoxes('tokenCanvas');
  
  if (typeof window.tokenBoxesInit === 'function') {
    window.tokenBoxesInit(tokenBoxes);
  }
});
