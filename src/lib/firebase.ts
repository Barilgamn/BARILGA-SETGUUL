import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAc33kkc9ECz7N-qyat_YzVdO4BeiHpSKY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0644566318.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0644566318",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0644566318.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "356755634846",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:356755634846:web:53eed43f36072ebdd0d98f"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-abbbd3a2-e3f9-41d8-82d5-028bddea3459");
export const auth = getAuth(app);
