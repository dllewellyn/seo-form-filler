import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = { projectId: "demo-seo-backlink" };
const app = initializeApp(firebaseConfig);
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
