// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC8pzBOqExWyNNx3OOssPAAmC8XgcobO8M",
  authDomain: "rtfjom26.firebaseapp.com",
  projectId: "rtfjom26",
  storageBucket: "rtfjom26.firebasestorage.app",
  messagingSenderId: "901133745338",
  appId: "1:901133745338:web:6cbf4a556108b599879683",
  measurementId: "G-3SQ368P9RG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);