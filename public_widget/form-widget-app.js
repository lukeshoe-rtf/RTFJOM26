/**
 * JOM26 Form Widget - Standalone with PostMessage
 */

console.log('[JOM26] Form widget loading...');

// Pledge options by user type - all map to boxes
const pledgeOptions = {
  individual: [
    "In your Shopping Basket",
    "In your Garden",
    "Extra Veg On your Plate",
    "As your meal",
    "As a Snack"
  ],
  family: [
    "In your Shopping Basket",
    "In your Garden",
    "Extra Veg On your Plate",
    "As your meal",
    "As a Snack"
  ],
  school: [
    "In your Shopping Basket",
    "In your Garden",
    "Extra Veg On your Plate",
    "As your meal",
    "As a Snack"
  ],
  organisation: [
    "In your Shopping Basket",
    "In your Garden",
    "Extra Veg On your Plate",
    "As your meal",
    "As a Snack"
  ],
  community: [
    "In your Shopping Basket",
    "In your Garden",
    "Extra Veg On your Plate",
    "As your meal",
    "As a Snack"
  ],
  other: [
    "In your Shopping Basket",
    "In your Garden",
    "Extra Veg On your Plate",
    "As your meal",
    "As a Snack"
  ]
};

// Pathway field configurations
// Fields sharing the same `row` key are rendered side-by-side in a .form-row div.
const pathwayFields = {
  individual: [],
  family: [
    { id: 'participants_count', label: 'How many family members are taking part?', type: 'number', required: true, min: 1, max: 20 }
  ],
  school: [
    { id: 'school_name',  label: 'School Name',       type: 'text',   required: true },
    { id: 'class_name',   label: 'Class/Year Group',   type: 'text',   required: true,  row: 'sc1' },
    { id: 'class_size',   label: 'Number of Students', type: 'number', required: true,  row: 'sc1', min: 1, max: 100 }
  ],
  organisation: [
    { id: 'org_name', label: 'Organisation Name', type: 'text',   required: true,  row: 'or1' },
    { id: 'org_type', label: 'Organisation Type', type: 'select', required: true,  row: 'or1',
      options: ['Business', 'Non-profit', 'Government', 'Healthcare', 'Education', 'Other'] },
    { id: 'org_size', label: 'Number of Participants', type: 'number', required: false, min: 1, max: 1000 }
  ],
  community: [
    { id: 'group_name', label: 'Group Name', type: 'text',   required: true, row: 'co1' },
    { id: 'group_size', label: 'Group Size', type: 'number', required: true, row: 'co1', min: 1, max: 100 }
  ],
  other: [
    { id: 'description', label: 'Description', type: 'textarea', required: false }
  ]
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

  // Notify parent of new content height so the iframe resizes dynamically
  setTimeout(notifyHeight, 50);
}

// Types that are eligible for the shout-out feature
const SHOUTOUT_TYPES = ['school', 'organisation', 'community'];

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

  // Show / hide the shout-out opt-in checkbox
  const shoutoutGroup = document.getElementById('shoutout-opt-in-group');
  if (shoutoutGroup) {
    shoutoutGroup.style.display = SHOUTOUT_TYPES.includes(type) ? 'flex' : 'none';
    if (!SHOUTOUT_TYPES.includes(type)) {
      const cb = document.getElementById('shoutout');
      if (cb) cb.checked = false;
    }
  }

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
 * Render a single field to an HTML string
 */
function renderField(field) {
  const req  = field.required ? ' required' : '';
  const star = field.required ? ' *' : '';
  const minA = field.min !== undefined ? ` min="${field.min}"` : '';
  const maxA = field.max !== undefined ? ` max="${field.max}"` : '';

  if (field.type === 'select') {
    const opts = field.options.map(o => `<option value="${o}">${o}</option>`).join('');
    return `<div class="form-group">
      <label for="${field.id}">${field.label}${star}</label>
      <select id="${field.id}"${req}><option value="">Select...</option>${opts}</select>
    </div>`;
  }
  if (field.type === 'textarea') {
    return `<div class="form-group">
      <label for="${field.id}">${field.label}${star}</label>
      <textarea id="${field.id}" rows="3"${req}></textarea>
    </div>`;
  }
  return `<div class="form-group">
    <label for="${field.id}">${field.label}${star}</label>
    <input type="${field.type}" id="${field.id}"${req}${minA}${maxA}>
  </div>`;
}

/**
 * Generate dynamic pathway fields — fields sharing the same `row` key
 * are wrapped in a .form-row div so they sit side by side.
 */
function generatePathwayFields(type) {
  const container = document.getElementById('pathway-fields');
  const fields = pathwayFields[type] || [];

  if (fields.length === 0) {
    container.innerHTML = '';
    return;
  }

  const html = [];
  let i = 0;
  while (i < fields.length) {
    const f = fields[i];
    if (f.row !== undefined) {
      const rowKey = f.row;
      const rowFields = [];
      while (i < fields.length && fields[i].row === rowKey) rowFields.push(fields[i++]);
      html.push(`<div class="form-row">${rowFields.map(renderField).join('')}</div>`);
    } else {
      html.push(renderField(f));
      i++;
    }
  }
  container.innerHTML = html.join('');
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

  // For shout-out, prefer the group/school/org name over the contact's personal name
  let displayName = document.getElementById('name').value.trim();
  if (widgetState.userType === 'school') {
    displayName = document.getElementById('school_name')?.value?.trim() || displayName;
  } else if (widgetState.userType === 'organisation') {
    displayName = document.getElementById('org_name')?.value?.trim() || displayName;
  } else if (widgetState.userType === 'community') {
    displayName = document.getElementById('group_name')?.value?.trim() || displayName;
  }

  const payload = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    pledge: document.getElementById('pledge').value,
    userType: widgetState.userType,
    familySize: familySize,
    participantsCount: participantsCount,
    newsletter: document.getElementById('newsletter').checked,
    boxNumber: boxNumber,
    shoutout: document.getElementById('shoutout')?.checked || false,
    displayName: displayName,
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

  // Scroll the parent page to the top so the token animation is visible
  scrollParentToTop();
});

/**
 * Notify the parent page of the current form content height so the
 * iframe can auto-resize instead of using a fixed height.
 *
 * We measure .widget-container's getBoundingClientRect().height rather
 * than document.scrollHeight: scrollHeight always returns at least
 * clientHeight (the iframe's current CSS height), so it can never report
 * a height smaller than the iframe is already set to — meaning the iframe
 * could never shrink back down after expanding.  getBoundingClientRect()
 * returns the element's actual rendered size, independent of iframe height.
 */
function notifyHeight() {
  var container = document.querySelector('.widget-container');
  var h = container ? Math.ceil(container.getBoundingClientRect().height) : 200;
  try { window.parent.postMessage({ type: 'FORM_HEIGHT', height: h }, '*'); } catch (e) {}
}

/**
 * Scroll the parent page to the top so the user can watch tokens fall
 * into the Veg Patch widget. Called both on submit and from the modal button.
 */
function scrollParentToTop() {
  try { window.parent.postMessage({ type: 'SCROLL_TO_TOP' }, '*'); } catch (e) {}
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
}

/**
 * Modal functions
 */
function showSuccessModal(tokens, boxNumber) {
  document.getElementById('awarded-tokens').textContent = tokens;
  document.getElementById('success-modal').classList.add('active');
}

function closeSuccessModal() {
  document.getElementById('success-modal').classList.remove('active');
}

function watchTokenFall() {
  closeSuccessModal();
  scrollParentToTop();
}

// Listen for messages from veg patch widget
window.addEventListener('message', (event) => {
  if (event.data.type === 'REQUEST_UPDATE') {
    // Veg patch is requesting current state
  }
});

console.log('[JOM26] Form widget ready');

// Send initial height once the page has rendered
setTimeout(notifyHeight, 100);
