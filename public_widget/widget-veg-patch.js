/**
 * Mini Vegetable Patch Visualisation for Widget
 */

class MiniVegPatch {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.total = 0;
    this.goal = 100000;
    this.percentage = 0;
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    if (!this.canvas) return;
    
    const container = this.canvas.parentElement;
    const ratio = window.devicePixelRatio || 1;
    
    const width = Math.min(400, container.clientWidth);
    const height = 200;
    
    this.canvas.width = width * ratio;
    this.canvas.height = height * ratio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    this.ctx.scale(ratio, ratio);
    this.width = width;
    this.height = height;
    
    this.render();
  }
  
  update(total, goal) {
    this.total = total;
    this.goal = goal;
    this.percentage = Math.min(100, (total / goal) * 100);
    this.render();
  }
  
  render() {
    if (!this.canvas) return;
    
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.4);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(1, '#B0E0E6');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height * 0.4);
    
    // Soil
    const soilGradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
    soilGradient.addColorStop(0, '#8B4513');
    soilGradient.addColorStop(1, '#654321');
    ctx.fillStyle = soilGradient;
    ctx.fillRect(0, height * 0.4, width, height * 0.6);
    
    // Vegetables
    const maxVeg = 12;
    const vegCount = Math.floor((this.percentage / 100) * maxVeg);
    const vegSize = Math.max(10, Math.min(25, width / 15)); // Ensure minimum size
    
    for (let i = 0; i < vegCount; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const x = (width / 5) * (col + 1);
      const y = height * 0.5 + (row * vegSize * 1.5);
      
      this.drawSimpleVeg(x, y, vegSize, i % 3);
    }
    
    // Progress text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 3;
    const text = `${this.percentage.toFixed(0)}%`;
    ctx.strokeText(text, width / 2, 25);
    ctx.fillText(text, width / 2, 25);
  }
  
  drawSimpleVeg(x, y, size, type) {
    const ctx = this.ctx;
    
    ctx.save();
    ctx.translate(x, y);
    
    if (type === 0) {
      // Carrot
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(-size * 0.3, -size * 0.3, size * 0.2, size * 0.4);
      ctx.fillRect(0, -size * 0.3, size * 0.2, size * 0.4);
      ctx.fillStyle = '#FF9800';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size * 0.15, size * 0.3);
      ctx.lineTo(size * 0.15, size * 0.3);
      ctx.closePath();
      ctx.fill();
    } else if (type === 1) {
      // Tomato
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -size * 0.5);
      ctx.stroke();
      ctx.fillStyle = '#F44336';
      ctx.beginPath();
      ctx.arc(0, -size * 0.3, Math.max(2, size * 0.2), 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Lettuce
      ctx.fillStyle = '#4CAF50';
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        ctx.beginPath();
        ctx.ellipse(
          Math.cos(angle) * size * 0.2,
          Math.sin(angle) * size * 0.2,
          size * 0.15,
          size * 0.25,
          angle,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
    
    ctx.restore();
  }
}

// Initialize
let miniPatch;
document.addEventListener('DOMContentLoaded', () => {
  miniPatch = new MiniVegPatch('miniPatchCanvas');
});
