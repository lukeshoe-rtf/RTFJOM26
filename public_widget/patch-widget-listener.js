
// Firestore real-time listener for the Patch widget (Option C)
import { db } from './widget-config.js';
import { doc, onSnapshot, collection, getCountFromServer } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export function startTotaliserListener(updateFn) {
  const ref = doc(db, 'public', 'totaliser');
  return onSnapshot(ref, (snap) => {
    const data = snap.data() || { total_tokens: 0, goal: 1 };
    updateFn({ total: data.total_tokens, goal: data.goal });
  });
}

export async function fetchSubmissionCount() {
  const snap = await getCountFromServer(collection(db, 'submissions'));
  return snap.data().count || 0;
}
