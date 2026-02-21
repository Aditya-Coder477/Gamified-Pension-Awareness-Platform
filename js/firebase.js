// ============================================================
// firebase.js — Firebase Initialization
// Paste your Firebase project config here.
// This file is imported by all other JS modules.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ✅ Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtm3bUUMA27Y923NhQkandAQvDmR5d7lM",
  authDomain: "game-awareness.firebaseapp.com",
  projectId: "game-awareness",
  storageBucket: "game-awareness.firebasestorage.app",
  messagingSenderId: "840786695713",
  appId: "1:840786695713:web:7a0aa254c65fbe3c137560",
  measurementId: "G-YJ6KYRKCE7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export service instances for use across JS modules
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
