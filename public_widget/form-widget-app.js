/**
 * JOM26 Form Widget - Standalone with PostMessage
 */

console.log('[JOM26] Form widget loading...');

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
  if (widgetState.currentStep === 3) {
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
  
  document.querySelectorAll('.pathway-card').forEach(card => {
    card.classList.remove('selected');
  });
  event.currentTarget.classList.add('selected');
  
  updatePledgeOptions(type);
  generatePathwayFields(type);
  
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
  
  const familySize = widgetState.userType === 'family' 
    ? parseInt(document.getElementById('participants_count')?.value) || null 
    : null;

  const payload = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    pledge: document.getElementById('pledge').value,
    userType: widgetState.userType,
    familySize: familySize,
    newsletter: document.getElementById('newsletter').checked
  };

  let tokens;
  let useFirestore = false;

  if (window.JOM?.submitPledgeWithFirestore) {
    try {
      tokens = await window.JOM.submitPledgeWithFirestore(payload);
      useFirestore = true;
    } catch (err) {
      console.error('Firestore submission failed:', err);
      alert('Failed to submit to database. Using local mode instead.');
    }
  }

  if (!useFirestore) {
    tokens = 1;
    if (widgetState.userType === 'family') {
      tokens = familySize || 1;
    } else if (widgetState.userType === 'school') {
      tokens = parseInt(document.getElementById('class_size')?.value) || 30;
    } else if (widgetState.userType === 'organisation') {
      tokens = Math.min(parseInt(document.getElementById('org_size')?.value) || 10, 100);
    } else if (widgetState.userType === 'community') {
      tokens = parseInt(document.getElementById('group_size')?.value) || 5;
    }
    
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'PLEDGE_SUBMITTED',
        tokens: tokens,
        data: payload
      }, '*');
    }
    
    window.postMessage({
      type: 'PLEDGE_SUBMITTED',
      tokens: tokens,
      data: payload
    }, '*');
  }
  
  document.getElementById('awarded-tokens').innerText = tokens;
  document.getElementById('success-modal').classList.add('active');
  
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
  }
});

console.log('[JOM26] Form widget ready');
