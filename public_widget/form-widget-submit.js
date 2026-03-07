
// Firestore submission + totaliser update (Option C)
import { db } from './widget-config.js';
import {
  collection, addDoc, query, where, getDocs,
  serverTimestamp, doc, runTransaction
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

console.log('[JOM26] form-widget-submit.js loaded, db available:', !!db);

function calculateTokens(userType, participantsCount) {
  switch (String(userType || '').toLowerCase()) {
    case 'individual':
    case 'other':
      return 1;
    case 'family':
    case 'school':
    case 'organisation':
    case 'community':
      return Math.max(1, Number(participantsCount || 1));
    default:
      return 1;
  }
}

export async function submitPledge({ name, email, pledge, userType, familySize, participantsCount, newsletter, boxNumber }) {
  // Optional duplicate check (schools are exempt)
  if ((userType || '').toLowerCase() !== 'school') {
    const dupQ = query(collection(db, 'submissions'), where('email', '==', email));
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) throw new Error('This email has already submitted a pledge.');
  }

  const tokens = calculateTokens(userType, participantsCount || familySize);
  const boxNum = parseInt(boxNumber) || 1;

  // 1) Write submission (collection auto-creates on first write)
  await addDoc(collection(db, 'submissions'), {
    name: name || null,
    email,
    pledge,
    user_type: userType,
    participants_count: participantsCount ? Number(participantsCount) : null,
    box_number: boxNum,
    tokens,
    newsletter_opt_in: Boolean(newsletter),
    created_at: serverTimestamp()
  });

  // 2) Atomic increment of box-specific counter and total_tokens
  const totalRef = doc(db, 'public', 'totaliser');
  const boxKey = `box${boxNum}`;
  
  await runTransaction(db, async (t) => {
    const snap = await t.get(totalRef);
    const current = snap.exists() ? (snap.data() || {}) : {};

    const currentBoxCount = current[boxKey] || 0;
    const currentTotal = current.total_tokens || 0;

    // Use set+merge so the document is created automatically if it doesn't exist yet
    t.set(totalRef, {
      [boxKey]: currentBoxCount + tokens,
      total_tokens: currentTotal + tokens
    }, { merge: true });
  });

  return { tokens, boxNumber: boxNum };
}

// Global hook for Option C (F1): your existing form-widget-app.js can call this
window.JOM = window.JOM || {};
window.JOM.submitPledgeWithFirestore = async (payload) => submitPledge(payload);
