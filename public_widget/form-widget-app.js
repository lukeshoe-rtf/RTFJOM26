/**
 * JOM26 Form Widget - Standalone with PostMessage
 */

// Pledge options by user type
const pledgeOptions = {
  individual: [
    "Add another veg to our dinner",
    "Add a veg to Lunch",
    "Try new Veg",
    "Eat larger quantity",
    "Try an old veg I didn't use to like"
  ],
  family: [
    "Add another veg to our dinner",
    "Add a veg to Lunch",
    "Try new Veg",
    "Eat larger quantity",
    "Try an old veg I didn't use to like"
  ],
  school: [
    "Option 1",
    "Option 2",
    "Option 3",
    "Option 4",
    "Option 5"
  ],
  organisation: [
    "Option 1",
    "Option 2",
    "Option 3",
    "Option 4",
    "Option 5"
  ],
  community: [
    "Option 1",
    "Option 2",
    "Option 3",
    "Option 4",
    "Option 5"
  ],
  other: [
    "Option 1",
    "Option 2",
    "Option 3",
    "Option 4",
    "Option 5"
  ]
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

// Widget state
const widgetState = {
  currentStep: 1,
  userType: null,
  formData: {}
};

/**
 * Step navigation
 */
function nextStep() {
  // Validate current step if needed
  if (widgetState.currentStep === 3) {
    // Will be validated on submit
    return;
  }
  
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
function selectPathway(event, type) {
  event.preventDefault();
  widgetState.userType = type;
  
  // Update UI
  document.querySelectorAll('.pathway-card').forEach(card => {
    card.classList.remove('selected');
  });
  event.currentTarget.classList.add('selected');
  
  // Update pledge dropdown options
  updatePledgeOptions(type);
  
  // Generate pathway-specific fields
  generatePathwayFields(type);
  
  // Move to step 3
  setTimeout(() => {
    widgetState.currentStep = 3;
    showStep(3);
  }, 300);
}

/**
 * Update pledge dropdown based on user type
 */
function updatePledgeOptions(type) {
  const select = document.getElementById('pledge');
  const options = pledgeOptions[type] || [];
  
  select.innerHTML = '<option value="">Select your pledge...</option>';
  options.forEach(option => {
    const optionEl = document.createElement('option');
    optionEl.value = option;
    optionEl.textContent = option;
    select.appendChild(optionEl);
  });
}

/**
 * Generate dynamic pathway fields
 */
function generatePathwayFields(type) {
  const container = document.getElementById('pathway-fields');
  const fields = pathwayFields[type] || [];
  
  if (fields.length === 0) {
    container.innerHTML = '';
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
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    pledge: document.getElementById('pledge').value,
    user_type: widgetState.userType,
    newsletter_opt_in: document.getElementById('newsletter').checked
  };
  
  // Add pathway-specific fields
  const fields = pathwayFields[widgetState.userType] || [];
  fields.forEach(field => {
    const value = document.getElementById(field.id)?.value;
    if (value) {
      submissionData[field.id] = field.type === 'number' ? parseInt(value) : value;
    }
  });
  
  // Calculate tokens
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
  
   // Send to parent window (for veg patch update)
   if (window.parent !== window) {
     window.parent.postMessage({
       type: 'PLEDGE_SUBMITTED',
       tokens: tokens,
       data: submissionData
     }, '*');
   }
   
   // Broadcast to all siblings and parent (including admin console)
   window.postMessage({
     type: 'PLEDGE_SUBMITTED',
     tokens: tokens,
     data: submissionData
   }, '*');
  
  // Show success modal
  showSuccessModal(tokens);
  
  // Reset form
  document.getElementById('pledge-form').reset();
  widgetState.currentStep = 1;
  widgetState.userType = null;
  widgetState.formData = {};
  showStep(1);
});

/**
 * Modal functions
 */
function showSuccessModal(tokens) {
  document.getElementById('awarded-tokens').textContent = tokens;
  document.getElementById('success-modal').classList.add('active');
}

function closeSuccessModal() {
  document.getElementById('success-modal').classList.remove('active');
}

// Listen for messages from veg patch widget
window.addEventListener('message', (event) => {
  if (event.data.type === 'REQUEST_UPDATE') {
    // Veg patch is requesting current state
    // (Used when veg patch loads after form submission)
  }
});
