import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || "(default)");

// Validate Connection to Firestore
import { doc, getDocFromServer } from 'firebase/firestore';

async function testConnection() {
  try {
    // Only test if we have a valid config
    if (!firebaseConfig.apiKey) return;
    
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection verified!");
  } catch (error: any) {
    console.warn("Firestore connection test status:", error.message);
    if (error.message?.includes('the client is offline') || error.message?.includes('Could not reach Cloud Firestore backend')) {
      console.error("Please check your Firebase configuration or network connection.");
    }
  }
}
testConnection();
