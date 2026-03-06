/**
 * JOM26 Token Boxes Widget - Standalone with PostMessage
 */

// State
let boxState = {
  boxCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  total: 0,
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
  const total = Object.values(boxState.boxCounts).reduce((a, b) => a + b, 0);
  
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`box${i}-count`);
    if (el) {
      el.textContent = (boxState.boxCounts[i] || 0).toLocaleString();
    }
  }
  
  const totalEl = document.getElementById('total-tokens');
  if (totalEl) {
    totalEl.textContent = total.toLocaleString();
  }
  
  const submissionsEl = document.getElementById('total-submissions');
  if (submissionsEl) {
    submissionsEl.textContent = boxState.submissions.toLocaleString();
  }
  
  // Update token boxes canvas
  if (window.tokenBoxes) {
    tokenBoxes.update(boxState.boxCounts, total);
  }
}

/**
 * Add tokens to a specific box (for demo or from submissions)
 */
function addTokens(boxNumber, amount) {
  boxNumber = Math.min(5, Math.max(1, boxNumber));
  boxState.boxCounts[boxNumber] = (boxState.boxCounts[boxNumber] || 0) + amount;
  boxState.submissions += 1;
  updateDisplay();
  
  // Broadcast update to other widgets
  broadcastUpdate();
}

/**
 * Update box counts
 */
function updateBoxCounts(newBoxCounts) {
  boxState.boxCounts = newBoxCounts;
  updateDisplay();
  broadcastUpdate();
}

/**
 * Broadcast state to other widgets
 */
function broadcastUpdate() {
  const total = Object.values(boxState.boxCounts).reduce((a, b) => a + b, 0);
  
  const message = {
    type: 'BOXES_UPDATE',
    boxCounts: boxState.boxCounts,
    total: total,
    submissions: boxState.submissions
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
    // New pledge submitted - add tokens to the specified box
    addTokens(data.boxNumber || 1, data.tokens || 1);
  } else if (data.type === 'BOXES_UPDATE') {
    // Another box widget updated - sync state
    boxState.boxCounts = data.boxCounts || boxState.boxCounts;
    boxState.total = data.total;
    boxState.submissions = data.submissions || boxState.submissions;
    updateDisplay();
  } else if (data.type === 'UPDATE_BOXES') {
    // Manual update from parent (for demo controls)
    if (data.boxCounts) boxState.boxCounts = data.boxCounts;
    updateDisplay();
  } else if (data.type === 'REQUEST_UPDATE') {
    broadcastUpdate();
  }
});

// Request updates from parent if in iframe
if (window.parent !== window) {
  window.parent.postMessage({ type: 'REQUEST_UPDATE' }, '*');
}

/**
 * Sync box counts from Firestore snapshot — keeps boxState in agreement with
 * the database so any subsequent updateDisplay() call shows the correct values.
 * Called by the Firestore listener in patch.html's inline module script.
 */
function syncFromFirestore(newBoxCounts, newTotal) {
  boxState.boxCounts = { ...newBoxCounts };
  boxState.total = newTotal;
  updateDisplay();
}

// Expose functions for external control (demo purposes)
window.JOM26TokenBoxes = {
  addTokens: addTokens,
  updateBoxCounts: updateBoxCounts,
  syncFromFirestore: syncFromFirestore,
  setSubmissionsCount: (count) => { boxState.submissions = count; },
  getState: () => ({ ...boxState })
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', init);
