
// Firestore real-time listener for the Patch widget (Option C)
import { db } from './widget-config.js';
import { doc, onSnapshot, collection, getCountFromServer } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

let previousTotal = null;

export function startTotaliserListener(updateFn) {
  console.log('[JOM26] Starting totaliser listener');
  const ref = doc(db, 'public', 'totaliser');
  
  return onSnapshot(ref, (snap) => {
    const data = snap.data() || { total_tokens: 0, goal: 100000 };
    const total = data.total_tokens;
    const goal = data.goal || 100000;
    
    const isUpdate = previousTotal !== null && total > previousTotal;
    const tokensAdded = isUpdate ? total - previousTotal : 0;
    
    console.log('[JOM26] Firestore update:', { total, goal, previousTotal, isUpdate, tokensAdded });
    
    previousTotal = total;
    
    updateFn({ total, goal, tokensAdded, isUpdate });
  });
}

export async function fetchSubmissionCount() {
  const snap = await getCountFromServer(collection(db, 'submissions'));
  return snap.data().count || 0;
}
