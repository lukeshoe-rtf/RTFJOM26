/**
 * JOM26 Veg Patch Widget - Standalone with PostMessage
 */

// State
let patchState = {
  total: 1247, // Demo starting value
  goal: 100000,
  submissions: 0
};

/**
 * Initialize
 */
function init() {
  updateDisplay();
  
  // Request initial state from parent/siblings
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'REQUEST_UPDATE' }, '*');
  }
}

/**
 * Update display
 */
function updateDisplay() {
  const percentage = (patchState.total / patchState.goal) * 100;
  const tokensToGoal = Math.max(0, patchState.goal - patchState.total);
  
  document.getElementById('total-tokens').textContent = patchState.total.toLocaleString();
  document.getElementById('goal-value').textContent = patchState.goal.toLocaleString();
  document.getElementById('percentage-complete').textContent = percentage.toFixed(1) + '%';
  document.getElementById('tokens-to-goal').textContent = tokensToGoal.toLocaleString();
  document.getElementById('total-submissions').textContent = patchState.submissions.toLocaleString();
  document.getElementById('progress-text').textContent = percentage.toFixed(0) + '%';
  
  const progressFill = document.getElementById('progress-fill');
  progressFill.style.width = Math.min(percentage, 100) + '%';
  
  // Update veg patch canvas
  if (window.vegPatch) {
    vegPatch.update(patchState.total, patchState.goal);
  }
}

/**
 * Add tokens (for demo or from submissions)
 */
function addTokens(amount) {
  patchState.total += amount;
  patchState.submissions += 1;
  updateDisplay();
  
  // Broadcast update to other widgets
  broadcastUpdate();
}

/**
 * Update goal
 */
function updateGoal(newGoal) {
  patchState.goal = newGoal;
  updateDisplay();
  broadcastUpdate();
}

/**
 * Broadcast state to other widgets
 */
function broadcastUpdate() {
  const message = {
    type: 'PATCH_UPDATE',
    total: patchState.total,
    goal: patchState.goal,
    submissions: patchState.submissions
  };
  
  // Send to parent window
  if (window.parent !== window) {
    window.parent.postMessage(message, '*');
  }
  
  // Broadcast to siblings
  window.postMessage(message, '*');
}

/**
 * Listen for messages from form widget or parent
 */
window.addEventListener('message', (event) => {
  const data = event.data;
  
  if (data.type === 'PLEDGE_SUBMITTED') {
    // New pledge submitted - add tokens
    addTokens(data.tokens);
  } else if (data.type === 'PATCH_UPDATE') {
    // Another patch widget updated - sync state
    patchState.total = data.total;
    patchState.goal = data.goal;
    patchState.submissions = data.submissions || patchState.submissions;
    updateDisplay();
  } else if (data.type === 'UPDATE_TOTAL') {
    // Manual update from parent (for demo controls)
    patchState.total = data.total;
    if (data.goal) patchState.goal = data.goal;
    updateDisplay();
  }
});

// Request updates from parent if in iframe
if (window.parent !== window) {
  window.parent.postMessage({ type: 'REQUEST_UPDATE' }, '*');
}

// Expose functions for external control (demo purposes)
window.JOM26VegPatch = {
  addTokens: addTokens,
  updateGoal: updateGoal,
  getState: () => ({ ...patchState })
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', init);
