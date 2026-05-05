import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, signInWithEmailAndPassword, signInAnonymously, setPersistence, browserLocalPersistence } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type UserRole = "secretaria" | "logistique";

const AuthContext = createContext<{ 
  user: User | null; 
  role: UserRole | null;
  loading: boolean; 
  signIn: () => void; 
  signInEmail: (email: string, pass: string) => Promise<void>;
  logOut: () => void 
}>({
  user: null,
  role: null,
  loading: true,
  signIn: () => {},
  signInEmail: async () => {},
  logOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Force local persistence to prevent frequent logouts
    setPersistence(auth, browserLocalPersistence).catch(err => console.error("Persistence error", err));

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      if (u) {
        const demoSessionType = localStorage.getItem('auth_demo_session');
        if (demoSessionType && u.isAnonymous) {
          // Hydrate demo labels if we are logged in anonymously
          const demoUser = {
            ...u,
            email: `${demoSessionType}@translog-demo.com`,
            displayName: demoSessionType === 'admin' ? "Secrétariat PRO" : (demoSessionType === 'flotte' ? "Logistique PRO" : "Transporteur PRO"),
          } as User;
          setUser(demoUser);
          setRole(demoSessionType === 'admin' ? 'secretaria' : 'logistique');
        } else {
          setUser(u);
          // Fetch role from Firestore
          try {
            const userDoc = await getDoc(doc(db, "users", u.uid));
            if (userDoc.exists()) {
              setRole(userDoc.data().role as UserRole);
            } else {
              // Default role or prompt to set? For now dev is secretaria
              const defaultRole: UserRole = "secretaria"; 
              await setDoc(doc(db, "users", u.uid), {
                email: u.email,
                role: defaultRole,
                displayName: u.displayName || u.email?.split('@')[0],
                createdAt: new Date().toISOString()
              });
              setRole(defaultRole);
            }
          } catch (err) {
            console.error("Error fetching user role", err);
            setRole("logistique"); // Safe fallback
          }
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      localStorage.removeItem('auth_demo_session');
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in", error);
    }
  };

  const signInEmail = async (email: string, pass: string) => {
    // Basic sanitization
    const cleanEmail = (email || "").trim();
    const cleanPass = (pass || "").trim();

    if (!cleanEmail) throw new Error("L'identifiant est requis");

    // Demo bypass for the requested account
    let type: string | null = null;
    if ((cleanEmail === "admin" || cleanEmail === "admin@translog.com") && (cleanPass === "123456" || cleanPass === "admin123")) type = 'admin';
    else if ((cleanEmail === "logistique" || cleanEmail === "logistique@translog.com") && (cleanPass === "123456" || cleanPass === "logistique123")) type = 'flotte';
    else if ((cleanEmail === "stagiaire" || cleanEmail === "stagiaire@translog.com") && (cleanPass === "123456" || cleanPass === "stagiaire123")) type = 'stagiaire';
    else if (cleanEmail === "transporteur" && (cleanPass === "123456" || cleanPass === "transporteur123")) type = 'transporteur';

    if (type) {
      try {
        localStorage.setItem('auth_demo_session', type);
        const cred = await signInAnonymously(auth);
        const demoUser = {
          ...cred.user,
          email: `${type}@translog-demo.com`,
          displayName: type === 'admin' ? "Secrétariat PRO" : (type === 'flotte' ? "Logistique PRO" : (type === 'stagiaire' ? "Stagiaire PRO" : "Transporteur PRO")),
        } as User;
        setUser(demoUser);
        setRole(type === 'admin' ? 'secretaria' : (type === 'stagiaire' ? 'stagiaire' : 'logistique'));
        setLoading(false);
        return;
      } catch (error: any) {
        console.error("Error signing in anonymously for demo", error);
        
        // Handle the specific case where Anonymous Auth is not enabled in Firebase Console
        if (error.code === "auth/admin-restricted-operation") {
          console.warn("DÉMO: Connexion anonyme désactivée dans la console Firebase. Passage en mode local (sans synchronisation).");
          const demoUser = {
            email: `${type}@translog-demo.com`,
            uid: `local-demo-${type}`,
            displayName: type === 'admin' ? "Secrétariat PRO (Local)" : (type === 'flotte' ? "Logistique PRO (Local)" : (type === 'stagiaire' ? "Stagiaire PRO (Local)" : "Transporteur PRO (Local)")),
          } as User;
          setUser(demoUser);
          setRole(type === 'admin' ? 'secretaria' : (type === 'stagiaire' ? 'stagiaire' : 'logistique'));
          setLoading(false);
          // We don't re-throw, we allow local access with a warning
          return;
        }
        localStorage.removeItem('auth_demo_session'); // Clean up on failure
        throw error;
      }
    }

    // If not a demo account, it must be a valid email format for Firebase
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error("L'identifiant doit être un email valide (ex: admin@translog.com)");
    }

    try {
      localStorage.removeItem('auth_demo_session');
      await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
    } catch (error: any) {
      console.error("Error signing in with email", error);
      throw error;
    }
  };

  const logOut = async () => {
    localStorage.removeItem('auth_demo_session');
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signInEmail, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
