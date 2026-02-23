/**
 * JOM26 Widget Application Logic
 */

// State
const widgetState = {
  currentStep: 1,
  userType: null,
  formData: {}
};

// Pathway field configurations
const pathwayFields = {
  individual: [],
  family: [
    { id: 'participants_count', label: 'How many family members?', type: 'number', required: true, min: 1, max: 20 }
  ],
  school: [
    { id: 'school_name', label: 'School Name', type: 'text', required: true },
    { id: 'class_name', label: 'Class/Year Group', type: 'text', required: true },
    { id: 'class_size', label: 'Number of Students', type: 'number', required: true, min: 1, max: 100 }
  ],
  organisation: [
    { id: 'org_name', label: 'Organisation Name', type: 'text', required: true },
    { id: 'org_type', label: 'Organisation Type', type: 'select', required: true, options: [
      'Business', 'Non-profit', 'Government', 'Healthcare', 'Education', 'Other'
    ]},
    { id: 'org_size', label: 'Number of Participants', type: 'number', required: false, min: 1, max: 1000 }
  ],
  community: [
    { id: 'group_name', label: 'Group Name', type: 'text', required: true },
    { id: 'group_size', label: 'Group Size', type: 'number', required: true, min: 1, max: 100 }
  ],
  other: []
};

/**
 * Initialize widget
 */
function initWidget() {
  // Load current totals
  loadTotals();
  
  // Refresh totals every 30 seconds
  setInterval(loadTotals, 30000);
  
  // Setup pathway card listeners
  document.querySelectorAll('.pathway-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      selectPathway(card.dataset.type);
    });
  });
}

/**
 * Load and display current totals
 */
async function loadTotals() {
  try {
    const getTotals = functions.httpsCallable('getTotals');
    const result = await getTotals();
    
    const { total, goal, percentage } = result.data;
    
    document.getElementById('widget-total').textContent = total.toLocaleString();
    document.getElementById('widget-goal').textContent = goal.toLocaleString();
    document.getElementById('progress-fill').style.width = Math.min(percentage, 100) + '%';
    
    if (window.miniPatch) {
      miniPatch.update(total, goal);
    }
  } catch (error) {
    console.error('Error loading totals:', error);
  }
}

/**
 * Step navigation
 */
function nextStep() {
  // Validate current step
  const currentStepEl = document.querySelector(`.form-step[data-step="${widgetState.currentStep}"]`);
  const inputs = currentStepEl.querySelectorAll('input[required], textarea[required]');
  
  let valid = true;
  inputs.forEach(input => {
    if (!input.value.trim()) {
      input.classList.add('error');
      valid = false;
    } else {
      input.classList.remove('error');
    }
  });
  
  if (!valid) {
    return;
  }
  
  // Save data from step 1
  if (widgetState.currentStep === 1) {
    widgetState.formData.name = document.getElementById('name').value;
    widgetState.formData.email = document.getElementById('email').value;
    widgetState.formData.pledge = document.getElementById('pledge').value;
    widgetState.formData.newsletter_opt_in = document.getElementById('newsletter').checked;
  }
  
  // Move to next step
  widgetState.currentStep++;
  showStep(widgetState.currentStep);
}

function prevStep() {
  widgetState.currentStep--;
  showStep(widgetState.currentStep);
}

function showStep(stepNumber) {
  document.querySelectorAll('.form-step').forEach(step => {
    step.classList.remove('active');
  });
  
  document.querySelector(`.form-step[data-step="${stepNumber}"]`).classList.add('active');
}

/**
 * Pathway selection
 */
function selectPathway(type) {
  widgetState.userType = type;
  
  // Update UI
  document.querySelectorAll('.pathway-card').forEach(card => {
    card.classList.remove('selected');
  });
  event.currentTarget.classList.add('selected');
  
  // Generate pathway-specific fields
  generatePathwayFields(type);
  
  // Move to step 3
  setTimeout(() => {
    widgetState.currentStep = 3;
    showStep(3);
  }, 300);
}

/**
 * Generate dynamic pathway fields
 */
function generatePathwayFields(type) {
  const container = document.getElementById('pathway-fields');
  const fields = pathwayFields[type] || [];
  
  if (fields.length === 0) {
    container.innerHTML = '<p>Great! Just click below to submit your pledge.</p>';
    return;
  }
  
  container.innerHTML = fields.map(field => {
    if (field.type === 'select') {
      return `
        <div class="form-group">
          <label for="${field.id}">${field.label} ${field.required ? '*' : ''}</label>
          <select id="${field.id}" ${field.required ? 'required' : ''}>
            <option value="">Select...</option>
            ${field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
          </select>
        </div>
      `;
    } else {
      return `
        <div class="form-group">
          <label for="${field.id}">${field.label} ${field.required ? '*' : ''}</label>
          <input 
            type="${field.type}" 
            id="${field.id}" 
            ${field.required ? 'required' : ''}
            ${field.min ? `min="${field.min}"` : ''}
            ${field.max ? `max="${field.max}"` : ''}
          >
        </div>
      `;
    }
  }).join('');
}

/**
 * Form submission
 */
document.getElementById('pledge-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Collect all data
  const submissionData = {
    ...widgetState.formData,
    user_type: widgetState.userType,
    created_at: new Date().toISOString()
  };
  
  // Add pathway-specific fields
  const fields = pathwayFields[widgetState.userType] || [];
  fields.forEach(field => {
    const value = document.getElementById(field.id)?.value;
    if (value) {
      submissionData[field.id] = field.type === 'number' ? parseInt(value) : value;
    }
  });
  
  // Show loading
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = '🌱 Planting...';
  submitBtn.disabled = true;
  
  try {
    // Submit to Firestore
    const docRef = await db.collection('submissions').add(submissionData);
    
    // Wait a moment for the Cloud Function to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get updated totals
    const getTotals = functions.httpsCallable('getTotals');
    const result = await getTotals();
    
    // Calculate tokens (simplified client-side for display)
    let tokens = 1;
    if (widgetState.userType === 'family') {
      tokens = submissionData.participants_count || 1;
    } else if (widgetState.userType === 'school') {
      tokens = submissionData.class_size || 30;
    } else if (widgetState.userType === 'organisation') {
      tokens = Math.min(submissionData.org_size || 10, 100);
    } else if (widgetState.userType === 'community') {
      tokens = submissionData.group_size || 5;
    }
    
    // Show success modal
    showSuccessModal(tokens, result.data.total);
    
    // Reset form
    document.getElementById('pledge-form').reset();
    widgetState.currentStep = 1;
    widgetState.userType = null;
    widgetState.formData = {};
    showStep(1);
    
  } catch (error) {
    console.error('Submission error:', error);
    
    // Check if it's a duplicate email error
    if (error.message && error.message.includes('duplicate')) {
      showErrorModal('This email has already been used to make a pledge. Each person can only pledge once (schools can submit multiple classes).');
    } else {
      showErrorModal('Oops! Something went wrong. Please try again or contact support if the problem persists.');
    }
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

/**
 * Modal functions
 */
function showSuccessModal(tokens, newTotal) {
  document.getElementById('awarded-tokens').textContent = tokens;
  document.getElementById('new-total').textContent = newTotal.toLocaleString();
  document.getElementById('success-modal').classList.add('active');
  
  // Refresh totals display
  loadTotals();
}

function closeSuccessModal() {
  document.getElementById('success-modal').classList.remove('active');
}

function showErrorModal(message) {
  document.getElementById('error-message').textContent = message;
  document.getElementById('error-modal').classList.add('active');
}

function closeErrorModal() {
  document.getElementById('error-modal').classList.remove('active');
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', initWidget);
