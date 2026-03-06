/**
 * JOM26 Form Widget - Standalone with PostMessage
 */

console.log('[JOM26] Form widget loading...');

// Pledge options by user type - all map to boxes
const pledgeOptions = {
  individual: [
    "Box 1",
    "Box 2",
    "Box 3",
    "Box 4",
    "Box 5"
  ],
  family: [
    "Box 1",
    "Box 2",
    "Box 3",
    "Box 4",
    "Box 5"
  ],
  school: [
    "Box 1",
    "Box 2",
    "Box 3",
    "Box 4",
    "Box 5"
  ],
  organisation: [
    "Box 1",
    "Box 2",
    "Box 3",
    "Box 4",
    "Box 5"
  ],
  community: [
    "Box 1",
    "Box 2",
    "Box 3",
    "Box 4",
    "Box 5"
  ],
  other: [
    "Box 1",
    "Box 2",
    "Box 3",
    "Box 4",
    "Box 5"
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
  
  select.innerHTML = '<option value="">Select a box...</option>';
  options.forEach((option, index) => {
    const optionEl = document.createElement('option');
    optionEl.value = index + 1;
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
  
  // Extract the actual participant count for each group pathway type
  let participantsCount = null;
  if (widgetState.userType === 'family') {
    participantsCount = parseInt(document.getElementById('participants_count')?.value) || 1;
  } else if (widgetState.userType === 'school') {
    participantsCount = parseInt(document.getElementById('class_size')?.value) || null;
  } else if (widgetState.userType === 'organisation') {
    participantsCount = parseInt(document.getElementById('org_size')?.value) || null;
  } else if (widgetState.userType === 'community') {
    participantsCount = parseInt(document.getElementById('group_size')?.value) || null;
  }

  const familySize = widgetState.userType === 'family' ? participantsCount : null;

  let boxNumber = parseInt(document.getElementById('pledge').value) || 1;

  const payload = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    pledge: document.getElementById('pledge').value,
    userType: widgetState.userType,
    familySize: familySize,
    participantsCount: participantsCount,
    newsletter: document.getElementById('newsletter').checked,
    boxNumber: boxNumber
  };

  let tokens;
  let useFirestore = false;

  if (window.JOM?.submitPledgeWithFirestore) {
    try {
      const result = await window.JOM.submitPledgeWithFirestore(payload);
      tokens = result.tokens;
      boxNumber = result.boxNumber || boxNumber;
      useFirestore = true;

      const msg = {
        type: 'PLEDGE_SUBMITTED',
        tokens: tokens,
        boxNumber: boxNumber,
        data: payload
      };

      // Send to parent page (which forwards to patch iframe)
      if (window.parent !== window) {
        window.parent.postMessage(msg, '*');
      }
      // Also send to own window for same-page listeners
      window.postMessage(msg, '*');
      
    } catch (err) {
      console.error('Firestore submission failed:', err);
      alert('Failed to submit to database. Using local mode instead.');
    }
  }

  if (!useFirestore) {
    tokens = participantsCount || 1;
    
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'PLEDGE_SUBMITTED',
        tokens: tokens,
        boxNumber: boxNumber,
        data: payload
      }, '*');
    }
    
    window.postMessage({
      type: 'PLEDGE_SUBMITTED',
      tokens: tokens,
      boxNumber: boxNumber,
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
