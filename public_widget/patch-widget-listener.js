
import { db } from './widget-config.js';
import { doc, onSnapshot, collection, getCountFromServer } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

let previousBoxCounts = null;

export function startBoxTotaliserListener(updateFn) {
  const ref = doc(db, 'public', 'totaliser');
  
  return onSnapshot(ref, (snap) => {
    const data = snap.data() || { 
      box1: 0, 
      box2: 0, 
      box3: 0, 
      box4: 0, 
      box5: 0,
      total_tokens: 0 
    };
    
    const boxCounts = {
      1: data.box1 || 0,
      2: data.box2 || 0,
      3: data.box3 || 0,
      4: data.box4 || 0,
      5: data.box5 || 0
    };
    
    const total = data.total_tokens || 
      (boxCounts[1] + boxCounts[2] + boxCounts[3] + boxCounts[4] + boxCounts[5]);
    
    const isUpdate = previousBoxCounts !== null && (
      boxCounts[1] > previousBoxCounts[1] ||
      boxCounts[2] > previousBoxCounts[2] ||
      boxCounts[3] > previousBoxCounts[3] ||
      boxCounts[4] > previousBoxCounts[4] ||
      boxCounts[5] > previousBoxCounts[5]
    );
    
    previousBoxCounts = { ...boxCounts };
    
    updateFn({ boxCounts, total, isUpdate });
  });
}

export async function fetchSubmissionCount() {
  const snap = await getCountFromServer(collection(db, 'submissions'));
  return snap.data().count || 0;
}
