import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Percent, CreditCard, Tag, Landmark, UserPlus, Trash2, Building2 } from "lucide-react";
import { collection, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestore-error";

export default function Parametres() {
  const [config, setConfig] = useState({
    tva: 18,
    devise: "FCFA",
    prix20: 150000,
    prix40: 250000
  });

  const [partners, setPartners] = useState<any[]>([]);
  const [newPartner, setNewPartner] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load config from Firestore
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        setConfig(snap.data() as any);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "settings/global");
    });

    const unsubPartners = onSnapshot(collection(db, "partenaires"), (snap) => {
      setPartners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "partenaires");
    });
    return () => {
      unsub();
      unsubPartners();
    };
  }, []);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const { setDoc, doc } = await import("firebase/firestore");
      await setDoc(doc(db, "settings", "global"), {
        ...config,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert("Configuration sauvegardée avec succès !");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "settings/global");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPartner = async () => {
    if (!newPartner) return;
    try {
      await addDoc(collection(db, "partenaires"), {
        nom: newPartner,
        createdAt: new Date().toISOString()
      });
      setNewPartner("");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "partenaires");
    }
  };

  const handleDeletePartner = async (id: string) => {
    try {
      await deleteDoc(doc(db, "partenaires", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `partenaires/${id}`);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter font-display">
            Configuration <span className="text-blue-600">Système</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Pilotage des variables fiscales et onboarding des prestataires</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl">
              <Percent className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Taxes & Devises</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Taux de TVA (%)</label>
              <input 
                type="number" 
                className="w-full border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 bg-slate-50 dark:bg-slate-950 font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                value={config.tva}
                onChange={e => setConfig({...config, tva: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Devise de référence</label>
              <select 
                className="w-full border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 bg-slate-50 dark:bg-slate-950 font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                value={config.devise}
                onChange={e => setConfig({...config, devise: e.target.value})}
              >
                <option value="FCFA">FCFA (XOF)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none lg:col-span-2 transition-colors">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl">
              <UserPlus className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Onboarding Sous-traitance (EXTERNE)</h3>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <input 
              type="text" 
              placeholder="Nom de l'entreprise prestataire..."
              className="flex-1 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 bg-slate-50 dark:bg-slate-950 font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              value={newPartner}
              onChange={e => setNewPartner(e.target.value)}
            />
            <button 
              onClick={handleAddPartner}
              className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
            >
              Enregistrer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 custom-scrollbar max-h-[300px] overflow-y-auto pr-2">
            {partners.map(p => (
              <div key={p.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-blue-500 transition-all">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-slate-400 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                  <span className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight text-sm">{p.nom}</span>
                </div>
                <button 
                  onClick={() => handleDeletePartner(p.id)}
                  className="text-slate-300 dark:text-slate-800 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none lg:col-span-3 transition-colors">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl">
              <Tag className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Grille Tarifaire (Standard Logistique)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Unité 20' Standard</label>
              <div className="relative">
                <input 
                  type="number" 
                  className="w-full border border-slate-100 dark:border-slate-800 rounded-2xl pl-6 pr-14 py-4 bg-slate-50 dark:bg-slate-950 font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                  value={config.prix20}
                  onChange={e => setConfig({...config, prix20: parseInt(e.target.value) || 0})}
                />
                <span className="absolute right-6 top-4 font-black text-slate-400 text-xs">F</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Unité 40' High Cube</label>
              <div className="relative">
                <input 
                  type="number" 
                  className="w-full border border-slate-100 dark:border-slate-800 rounded-2xl pl-6 pr-14 py-4 bg-slate-50 dark:bg-slate-950 font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                  value={config.prix40}
                  onChange={e => setConfig({...config, prix40: parseInt(e.target.value) || 0})}
                />
                <span className="absolute right-6 top-4 font-black text-slate-400 text-xs">F</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 dark:bg-slate-950 p-10 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl border border-slate-800 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] pointer-events-none" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="p-5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
             <Landmark className="w-10 h-10" />
          </div>
          <div>
             <h3 className="text-2xl font-black uppercase tracking-tighter">Indexation Grand Livre</h3>
             <p className="text-slate-400 font-medium">Synchronisation des paramètres avec le moteur comptable</p>
          </div>
        </div>
        <button 
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="bg-white text-slate-900 px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-100 transition-all active:scale-95 shadow-xl shadow-white/10 relative z-10 disabled:opacity-50"
        >
          {isSaving ? "Enregistrement..." : "Soumettre les modifications"}
        </button>
      </div>
    </div>
  );
}
