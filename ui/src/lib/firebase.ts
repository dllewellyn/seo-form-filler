import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = { 
    apiKey: "AIzaSyA_DummyKey_1234567890",
    projectId: "demo-seo-backlink" 
};

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Only connect to emulator once
if (!(db as any)._emulatorConfig) {
    connectFirestoreEmulator(db, 'localhost', 8081);
}
if (!(auth as any).emulatorConfig) {
    connectAuthEmulator(auth, "http://localhost:9099");
}

export { db, auth };
