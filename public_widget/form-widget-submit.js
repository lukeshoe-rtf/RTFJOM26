
// Firestore submission + totaliser update (Option C)
import { db } from './widget-config.js';
import {
  collection, addDoc, query, where, getDocs,
  serverTimestamp, doc, runTransaction
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

console.log('[JOM26] form-widget-submit.js loaded, db available:', !!db);

function calculateTokens(userType, familySize) {
  switch (String(userType || '').toLowerCase()) {
    case 'individual': return 1;
    case 'family': return Math.max(1, Number(familySize || 1));
    case 'school':
    case 'organisation':
    case 'community':
    case 'other':
      return 5;
    default:
      return 1;
  }
}

export async function submitPledge({ name, email, pledge, userType, familySize, newsletter }) {
  // Optional duplicate check (schools are exempt)
  if ((userType || '').toLowerCase() !== 'school') {
    const dupQ = query(collection(db, 'submissions'), where('email', '==', email));
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) throw new Error('This email has already submitted a pledge.');
  }

  const tokens = calculateTokens(userType, familySize);

  // 1) Write submission (collection auto-creates on first write)
  await addDoc(collection(db, 'submissions'), {
    name: name || null,
    email,
    pledge,
    user_type: userType,
    participants_count: userType === 'family' ? Number(familySize || 1) : null,
    tokens,
    newsletter_opt_in: Boolean(newsletter),
    created_at: serverTimestamp()
  });

  // 2) Atomic increment of public/totaliser.total_tokens
  const totalRef = doc(db, 'public', 'totaliser');
  await runTransaction(db, async (t) => {
    const snap = await t.get(totalRef);
    const current = snap.exists() ? (snap.data().total_tokens || 0) : 0;
    t.update(totalRef, { total_tokens: current + tokens });
  });

  return tokens;
}

// Global hook for Option C (F1): your existing form-widget-app.js can call this
window.JOM = window.JOM || {};
window.JOM.submitPledgeWithFirestore = async (payload) => submitPledge(payload);
