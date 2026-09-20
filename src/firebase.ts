import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer
} from 'firebase/firestore';

export const DATABASE_ID = "ai-studio-shivam-6138ca5c-1e3b-412f-957d-d52501eff503";

export const firebaseConfig = {
  apiKey: "AIzaSyBgsDf1VyV8yWoJBiKsp5zKO6IhGUYkpKI",
  authDomain: "shivam-2bace.firebaseapp.com",
  projectId: "shivam-2bace",
  storageBucket: "shivam-2bace.firebasestorage.app",
  messagingSenderId: "998857606826",
  appId: "1:998857606826:web:b294810014f9b4b60172d3",
};

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, DATABASE_ID);
export const auth = getAuth(app);

// Helper to test connection
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    const testDocRef = doc(db, 'system', 'connection_ping');
    await getDocFromServer(testDocRef);
    return true;
  } catch (error: any) {
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn('Firebase currently offline or connecting...', error);
      return false;
    }
    // If permission or document not found, connection itself still succeeded
    return true;
  }
}
