import { initializeApp } from 'firebase/app';
import { getAuth, browserPopupRedirectResolver } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let auth;

try {
  console.log('Firebase config:', {
    apiKey: firebaseConfig.apiKey ? 'exists' : 'missing',
    authDomain: firebaseConfig.authDomain ? 'exists' : 'missing',
    projectId: firebaseConfig.projectId ? 'exists' : 'missing'
  });
  
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  auth.useDeviceLanguage();
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

export { auth }; 
