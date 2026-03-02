import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = { projectId: "demo-seo-backlink" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Only connect to emulator once
if (!(db as any)._emulatorConfig) {
    connectFirestoreEmulator(db, 'localhost', 8081);
}

export { db };
