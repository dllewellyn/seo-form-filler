import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const requiredEnvVars = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingVars = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => `VITE_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

if (missingVars.length > 0) {
    throw new Error(
        `Missing required Firebase environment variables: ${missingVars.join(', ')}. ` +
        'Copy .env.example to .env and fill in your Firebase project values.'
    );
}

const firebaseConfig = requiredEnvVars;

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Only connect to emulators in development mode, not in Cloud Run production
if (import.meta.env.DEV) {
    if (!(db as any)._emulatorConfig) {
        connectFirestoreEmulator(db, 'localhost', 8081);
    }
    if (!(auth as any).emulatorConfig) {
        connectAuthEmulator(auth, "http://localhost:9099");
    }
}

export { db, auth };
