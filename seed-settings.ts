import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  try {
    await setDoc(doc(db, "settings", "global"), {
      tva: 18,
      devise: "FCFA",
      prix20: 150000,
      prix40: 250000,
      surcharge: 5000,
      updatedAt: new Date().toISOString()
    });
    console.log("Global settings seeded successfully");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding settings:", err);
    process.exit(1);
  }
}

seed();
