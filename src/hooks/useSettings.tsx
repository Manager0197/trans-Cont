import React, { createContext, useContext, useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface SystemConfig {
  tva: number;
  devise: string;
  prix20: number;
  prix40: number;
}

const DEFAULT_CONFIG: SystemConfig = {
  tva: 18,
  devise: "FCFA",
  prix20: 150000,
  prix40: 250000
};

interface SettingsContextType {
  settings: SystemConfig;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_CONFIG,
  loading: true
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only ONE listener for the whole app
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SystemConfig);
      }
      setLoading(false);
    }, (err) => {
      console.error("Settings listener error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
