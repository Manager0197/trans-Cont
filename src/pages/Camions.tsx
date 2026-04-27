import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Truck, Plus, Check, X as XIcon, Trash2, Edit2, LayoutDashboard, DollarSign, AlertCircle, TrendingUp } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/firestore-error";
import { useSettings } from "../hooks/useSettings";
import ConfirmModal from "../components/ConfirmModal";

export default function Camions() {
  const { settings } = useSettings();
  const [camions, setCamions] = useState<any[]>([]);
  const [chargements, setChargements] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newCamion, setNewCamion] = useState({ numero: "", chauffeur: "" });
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ numero: "", chauffeur: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "camions"), orderBy("createdAt", "desc"));
    const unsubC = onSnapshot(q, (snap) => {
      setCamions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "camions");
    });

    const unsubCh = onSnapshot(collection(db, "chargements"), (snap) => {
      setChargements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "chargements");
    });

    return () => { unsubC(); unsubCh(); };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamion.numero) return;
    try {
      await addDoc(collection(db, "camions"), {
        ...newCamion,
        statut: "actif",
        createdAt: new Date().toISOString()
      });
      setShowNew(false);
      setNewCamion({ numero: "", chauffeur: "" });
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, "camions"); }
  };

  const handleEdit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "camions", id), { ...editForm, updatedAt: new Date().toISOString() });
      setIsEditing(null);
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `camions/${id}`); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, "camions", deleteId));
      setDeleteId(null);
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `camions/${deleteId}`); }
  };

  const toggleStatut = async (id: string, current: string) => {
    try {
      await updateDoc(doc(db, "camions", id), {
        statut: current === 'actif' ? 'inactif' : 'actif',
        updatedAt: new Date().toISOString()
      });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `camions/${id}`); }
  };

  const getStats = (camionId: string) => {
    const now = new Date();
    const filtered = chargements.filter(ch => ch.camionId === camionId);
    const cumulativeVolume = filtered.length;
    const monthlyActivity = filtered.filter(ch => {
      if (!ch.dateChargement) return false;
      const d = new Date(ch.dateChargement);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const provisions = filtered.reduce((sum, ch) => sum + (Number(ch.avance) || 0), 0);
    const ca = filtered.reduce((sum, ch) => sum + (Number(ch.prixTotal) || 0), 0);
    return { cumulativeVolume, monthlyActivity, provisions, ca };
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter font-display">
            Gestion <span className="text-blue-600">Flotte Interne</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight mt-1">Pilotage des actifs roulants, assignation chauffeurs et revue de performance</p>
        </div>
        <button 
          onClick={() => setShowNew(true)}
          className="bg-blue-600 text-white px-6 sm:px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Ajouter un véhicule
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] lg:rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Immatriculation</label>
            <input 
              placeholder="Ex: AA-123-BB" 
              required 
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              value={newCamion.numero} 
              onChange={e => setNewCamion({...newCamion, numero: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Chauffeur</label>
            <input 
              placeholder="Nom du chauffeur" 
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              value={newCamion.chauffeur} 
              onChange={e => setNewCamion({...newCamion, chauffeur: e.target.value})} 
            />
          </div>
          <div className="flex gap-2 items-end">
            <button type="submit" className="flex-1 bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors">Enregistrer</button>
            <button type="button" onClick={() => setShowNew(false)} className="px-6 py-4 text-slate-400 font-black uppercase text-[10px] hover:text-rose-500 transition-colors">Annuler</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-8">
        {camions.map(c => {
          const stats = getStats(c.id);
          return (
            <div key={c.id} className="bg-white dark:bg-slate-900 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl group/card transition-all hover:border-blue-500/20">
              <div className="p-6 sm:p-8 border-b border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-slate-50/30 dark:bg-slate-950/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full sm:w-auto">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/20 md:rotate-3 transition-transform group-hover/card:rotate-0">
                    <Truck className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <div className="flex-1 w-full">
                    {isEditing === c.id ? (
                      <form onSubmit={e => handleEdit(e, c.id)} className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                        <input 
                          className="bg-slate-100 dark:bg-slate-800 border rounded-xl px-3 py-2 font-black text-xl text-slate-900 dark:text-white" 
                          value={editForm.numero} 
                          onChange={e => setEditForm({...editForm, numero: e.target.value})} 
                        />
                        <div className="flex gap-2 text-sm">
                          <button type="submit" className="flex-1 md:flex-none p-2 bg-emerald-500 justify-center text-white rounded-lg flex items-center"><Check className="w-4 h-4 mr-1" /> OK</button>
                          <button type="button" onClick={() => setIsEditing(null)} className="flex-1 md:flex-none p-2 bg-slate-200 dark:bg-slate-700 justify-center text-slate-500 rounded-lg flex items-center"><XIcon className="w-4 h-4" /></button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between sm:justify-start gap-3 w-full">
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{c.numero}</h3>
                        <button onClick={() => { setIsEditing(c.id); setEditForm({ numero: c.numero, chauffeur: c.chauffeur }); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors shrink-0"><Edit2 className="w-5 h-5" /></button>
                      </div>
                    )}
                    {isEditing === c.id ? (
                        <div className="mt-2">
                            <input 
                                className="bg-slate-100 dark:bg-slate-800 border rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white w-full" 
                                value={editForm.chauffeur} 
                                onChange={e => setEditForm({...editForm, chauffeur: e.target.value})} 
                                placeholder="Nom du chauffeur"
                            />
                        </div>
                    ) : (
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono mt-1">{c.chauffeur || "Non assigné"}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto w-full sm:w-auto justify-end">
                  <button onClick={() => setDeleteId(c.id)} className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                  <button onClick={() => toggleStatut(c.id, c.statut)} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${c.statut === 'actif' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                    MODE : {c.statut}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4">
                 <StatBox label="Missions" value={stats.cumulativeVolume} icon={LayoutDashboard} />
                 <StatBox label="CA Généré" value={`${(stats.ca/1000).toFixed(1)}K`} sub={settings.devise} highlight icon={TrendingUp} />
                 <StatBox label="Activités (30j)" value={stats.monthlyActivity} icon={AlertCircle} />
                 <StatBox label="Total Avances" value={`${(stats.provisions/1000).toFixed(1)}K`} sub={settings.devise} icon={DollarSign} />
              </div>
            </div>
          );
        })}
        {camions.length === 0 && (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
            <Truck className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Aucun véhicule enregistré dans la flotte</p>
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={handleDelete} 
        title="Supprimer définitivement" 
        message="Cette action est irréversible. Les statistiques historiques associées à ce camion seront conservées dans les rapports globaux."
        variant="danger" 
      />
    </div>
  );
}

function StatBox({ label, value, sub, highlight = false, icon: Icon }: any) {
  return (
    <div className="p-8 border-r last:border-r-0 border-slate-50 dark:border-slate-800/50 flex flex-col items-center text-center group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
       <div className="mb-4 text-slate-300 dark:text-slate-700 group-hover:text-blue-500 transition-colors">
         <Icon className="w-5 h-5" />
       </div>
       <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-2">{label}</p>
       <div className="flex items-baseline gap-1">
         <p className={`text-3xl font-black tabular-nums transition-transform group-hover:scale-110 ${highlight ? 'text-blue-500' : 'text-slate-900 dark:text-white'}`}>{value}</p>
         {sub && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sub}</span>}
       </div>
    </div>
  );
}
