import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, signInWithEmailAndPassword, signInAnonymously } from "firebase/auth";

const AuthContext = createContext<{ 
  user: User | null; 
  loading: boolean; 
  signIn: () => void; 
  signInEmail: (email: string, pass: string) => Promise<void>;
  logOut: () => void 
}>({
  user: null,
  loading: true,
  signIn: () => {},
  signInEmail: async () => {},
  logOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      const demoSessionType = localStorage.getItem('auth_demo_session');
      if (demoSessionType && u && u.isAnonymous) {
        // Hydrate demo labels if we are logged in anonymously
        setUser({
          ...u,
          email: `${demoSessionType}@translog-demo.com`,
          displayName: demoSessionType === 'admin' ? "Administrateur Démo" : (demoSessionType === 'flotte' ? "Gestionnaire Flotte" : "Transporteur Partenaire"),
        } as User);
      } else {
        setUser(u);
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
    // Demo bypass for the requested account
    let type: string | null = null;
    if (email === "admin" && pass === "123456") type = 'admin';
    else if (email === "flotte" && pass === "123456") type = 'flotte';
    else if (email === "transporteur" && pass === "123456") type = 'transporteur';

    if (type) {
      try {
        const cred = await signInAnonymously(auth);
        setUser({
          ...cred.user,
          email: `${type}@translog-demo.com`,
          displayName: type === 'admin' ? "Administrateur Démo" : (type === 'flotte' ? "Gestionnaire Flotte" : "Transporteur Partenaire"),
        } as User);
        localStorage.setItem('auth_demo_session', type);
        setLoading(false);
        return;
      } catch (error: any) {
        console.error("Error signing in anonymously for demo", error);
        
        // Handle the specific case where Anonymous Auth is not enabled in Firebase Console
        if (error.code === "auth/admin-restricted-operation") {
          console.warn("DÉMO: Connexion anonyme désactivée dans la console Firebase. Passage en mode local (sans synchronisation).");
          setUser({
            email: `${type}@translog-demo.com`,
            uid: `local-demo-${type}`,
            displayName: type === 'admin' ? "Administrateur Démo (Local)" : (type === 'flotte' ? "Gestionnaire Flotte (Local)" : "Transporteur Partenaire (Local)"),
          } as User);
          localStorage.setItem('auth_demo_session', type);
          setLoading(false);
          // We don't re-throw, we allow local access with a warning
          return;
        }
        throw error;
      }
    }

    try {
      localStorage.removeItem('auth_demo_session');
      const finalEmail = email.includes('@') ? email : `${email}@demo.com`;
      await signInWithEmailAndPassword(auth, finalEmail, pass);
    } catch (error) {
      console.error("Error signing in with email", error);
      throw error;
    }
  };

  const logOut = async () => {
    localStorage.removeItem('auth_demo_session');
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInEmail, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
