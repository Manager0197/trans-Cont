import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, where, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Box, Calendar, Truck, DollarSign, LogOut, Plus, Check, X as XIcon, Trash2, Edit2, LayoutDashboard, Shovel } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/firestore-error";
import { useAuth } from "../lib/auth";
import { useSettings } from "../hooks/useSettings";
import ConfirmModal from "../components/ConfirmModal";

export default function PortailOperations() {
  const { user, logOut } = useAuth();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState(user?.email === 'flotte@translog-pro.com' ? 'flotte' : 'partenaires');
  
  // States for Partenaires
  const [chargements, setChargements] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState("all");

  // States for Flotte
  const [camions, setCamions] = useState<any[]>([]);
  const [showNewCamion, setShowNewCamion] = useState(false);
  const [newCamion, setNewCamion] = useState({ numero: "", chauffeur: "" });
  const [isEditingCamion, setIsEditingCamion] = useState<string | null>(null);
  const [editCamionForm, setEditCamionForm] = useState({ numero: "", chauffeur: "" });
  const [deleteCamionId, setDeleteCamionId] = useState<string | null>(null);

  useEffect(() => {
    // Shared listeners
    const unsubChargementsTotal = onSnapshot(collection(db, "chargements"), (snap) => {
      setChargements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "chargements");
    });

    const unsubDossiers = onSnapshot(collection(db, "dossiers"), (snap) => {
      setDossiers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "dossiers");
    });

    const qCamions = query(collection(db, "camions"), orderBy("createdAt", "desc"));
    const unsubCamions = onSnapshot(qCamions, (snap) => {
      setCamions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "camions");
    });

    return () => {
      unsubChargementsTotal();
      unsubDossiers();
      unsubCamions();
    };
  }, []);

  // --- Partenaire Logic ---
  const partenaireData = useMemo(() => {
    // Only externe for partenaire view
    let raw = chargements.filter(c => c.typeTransporteur === 'externe');
    const now = new Date();
    if (dateFilter !== "all") {
      const days = parseInt(dateFilter);
      raw = raw.filter(c => {
        if (!c.createdAt) return false;
        const d = new Date(c.createdAt);
        const diffTime = Math.abs(now.getTime() - d.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= days;
      });
    }
    return raw.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [chargements, dateFilter]);

  const statsPartenaire = useMemo(() => {
    let totals = partenaireData.reduce((acc, ch) => {
      acc.dues += (Number(ch.prixTotal) || 0);
      acc.advances += (Number(ch.avance) || 0);
      return acc;
    }, { dues: 0, advances: 0 });
    return { ...totals, balance: totals.dues - totals.advances };
  }, [partenaireData]);

  // --- Flotte Logic ---
  const handleCreateCamion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamion.numero) return;
    try {
      await addDoc(collection(db, "camions"), {
        ...newCamion,
        statut: "actif",
        createdAt: new Date().toISOString()
      });
      setShowNewCamion(false);
      setNewCamion({ numero: "", chauffeur: "" });
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, "camions"); }
  };

  const toggleCamionStatut = async (id: string, current: string) => {
    try {
      await updateDoc(doc(db, "camions", id), {
        statut: current === 'actif' ? 'inactif' : 'actif',
        updatedAt: new Date().toISOString()
      });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `camions/${id}`); }
  };

  const handleEditCamion = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "camions", id), { ...editCamionForm, updatedAt: new Date().toISOString() });
      setIsEditingCamion(null);
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `camions/${id}`); }
  };

  const handleDeleteCamion = async () => {
    if (!deleteCamionId) return;
    try {
      await deleteDoc(doc(db, "camions", deleteCamionId));
      setDeleteCamionId(null);
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `camions/${deleteCamionId}`); }
  };

  const getCamionStats = (camionId: string) => {
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      {/* Unified Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-blue-500/30 rotate-3">
              <Shovel className="w-6 h-6 text-white -rotate-3" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase text-white tracking-tighter">Portail <span className="text-blue-500">Opérations</span></h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Services de support logistique</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50">
             {(user?.email === 'admin@translog-pro.com' || user?.email === 'flotte@translog-pro.com') && (
               <button 
                 onClick={() => setActiveTab('flotte')}
                 className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'flotte' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
               >
                 <Truck className="w-3.5 h-3.5" /> Flotte Interne
               </button>
             )}
             {(user?.email === 'admin@translog-pro.com' || user?.email === 'transporteur@translog-pro.com') && (
               <button 
                 onClick={() => setActiveTab('partenaires')}
                 className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'partenaires' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
               >
                 <Calendar className="w-3.5 h-3.5" /> Sous-Traitance
               </button>
             )}
          </div>

          <button onClick={logOut} className="text-slate-400 hover:text-rose-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all group">
            <span className="hidden sm:inline">Quitter Session</span> <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-12 pb-24">
        {activeTab === 'flotte' ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Fleet Management UI copied from Camions.tsx but styled for portal */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600/10 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Gestion Actifs Flotte</h2>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Unités roulantes propriétaires et affectations</p>
                  </div>
               </div>
               <button 
                 onClick={() => setShowNewCamion(true)}
                 className="w-full sm:w-auto bg-blue-600 text-white px-6 sm:px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
               >
                 <Plus className="w-4 h-4" /> Nouveau Véhicule
               </button>
            </div>

            {showNewCamion && (
              <form onSubmit={handleCreateCamion} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in zoom-in-95">
                <input 
                  placeholder="N° Immatriculation" 
                  required 
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-sm"
                  value={newCamion.numero} 
                  onChange={e => setNewCamion({...newCamion, numero: e.target.value})} 
                />
                <input 
                  placeholder="Chauffeur Assigné" 
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-sm"
                  value={newCamion.chauffeur} 
                  onChange={e => setNewCamion({...newCamion, chauffeur: e.target.value})} 
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest rounded-xl">Enregistrer</button>
                  <button onClick={() => setShowNewCamion(false)} className="px-4 py-3 text-slate-400 font-black uppercase text-[10px]">Annuler</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 gap-12">
              {camions.map(c => {
                const stats = getCamionStats(c.id);
                return (
                  <div key={c.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl group/card transition-all hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none">
                    <div className="p-6 sm:p-8 border-b border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-slate-50/30 dark:bg-slate-950/20">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full sm:w-auto">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-xl sm:rounded-[1.5rem] p-3 sm:p-4 text-white shadow-xl shadow-blue-500/20 md:rotate-3 transition-transform group-hover/card:rotate-0">
                          <Truck className="w-full h-full" />
                        </div>
                        <div className="flex-1 w-full">
                          {isEditingCamion === c.id ? (
                            <form onSubmit={e => handleEditCamion(e, c.id)} className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                              <input 
                                className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 font-black text-xl text-slate-900 dark:text-white" 
                                value={editCamionForm.numero} 
                                onChange={e => setEditCamionForm({...editCamionForm, numero: e.target.value})} 
                              />
                              <div className="flex gap-2 text-sm">
                                <button type="submit" className="flex-1 md:flex-none p-2 bg-emerald-500 justify-center text-white rounded-lg flex items-center"><Check className="w-4 h-4 mr-1" /> OK</button>
                                <button type="button" onClick={() => setIsEditingCamion(null)} className="flex-1 md:flex-none p-2 bg-slate-200 dark:bg-slate-700 justify-center text-slate-500 rounded-lg flex items-center"><XIcon className="w-4 h-4" /></button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-center justify-between sm:justify-start gap-3 w-full">
                              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{c.numero}</h3>
                              <button onClick={() => { setIsEditingCamion(c.id); setEditCamionForm({ numero: c.numero, chauffeur: c.chauffeur }); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors shrink-0"><Edit2 className="w-4 h-4" /></button>
                            </div>
                          )}
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono mt-1">{c.chauffeur || "Aucun chauffeur"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 self-end sm:self-auto w-full sm:w-auto justify-end">
                        <button onClick={() => setDeleteCamionId(c.id)} className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                        <button onClick={() => toggleCamionStatut(c.id, c.statut)} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${c.statut === 'actif' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>STATUS : {c.statut}</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4">
                       <StatRow label="Missions Totales" value={stats.cumulativeVolume} sub="Depuis inception" />
                       <StatRow label="Mois en cours" value={stats.monthlyActivity} sub="Missions M-1" />
                       <StatRow label="Chiffre Affaires" value={`${(stats.ca/1000).toFixed(1)}K`} sub={settings.devise} highlight />
                       <StatRow label="Avances" value={`${(stats.provisions/1000).toFixed(1)}K`} sub={settings.devise} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Partenaire View Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <SummaryCardPartenaire label="Missions assignées" value={partenaireData.length} icon={Box} color="blue" />
              <SummaryCardPartenaire label="Avances reçues" value={`${statsPartenaire.advances.toLocaleString()} ${settings.devise}`} icon={DollarSign} color="emerald" />
              <SummaryCardPartenaire label="Solde à percevoir" value={`${statsPartenaire.balance.toLocaleString()} ${settings.devise}`} icon={DollarSign} color="amber" highlight />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
               <div className="p-6 sm:p-8 border-b border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                 <div>
                   <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
                     <Calendar className="w-6 h-6 text-amber-500" /> Historique Sous-Traitance
                   </h2>
                   <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Suivi des chargements externes et règlements</p>
                 </div>
                 <select 
                   className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-3 font-bold text-xs uppercase tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
                   value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                 >
                   <option value="all">Tout l'historique</option>
                   <option value="7">Dernière semaine</option>
                   <option value="30">Dernier mois</option>
                 </select>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50/50 dark:bg-slate-950/20 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-50 dark:border-slate-800 whitespace-nowrap">
                     <tr>
                       <th className="px-6 py-5">Référence Dossier BL</th>
                       <th className="px-6 py-5">Conteneur</th>
                       <th className="px-6 py-5 text-right">Montant Contractuel</th>
                       <th className="px-6 py-5 text-right">Avance Reçue</th>
                       <th className="px-6 py-5 text-right">Reliquat</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                     {partenaireData.map(ch => {
                       const dossier = dossiers.find(d => d.id === ch.dossierId);
                       const mt = Number(ch.prixTotal) || 0;
                       const av = Number(ch.avance) || 0;
                       return (
                         <tr key={ch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors whitespace-nowrap">
                           <td className="px-6 py-5 font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mr-2">#{dossier?.numeroBL || 'BL-NEW'}</td>
                           <td className="px-6 py-5">
                             <div className="font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-slate-600 dark:text-slate-400 inline-block tracking-tighter">
                               {ch.numeroConteneur || "SANS NUMERO"}
                             </div>
                           </td>
                           <td className="px-6 py-5 text-right font-black tabular-nums">{mt.toLocaleString()}</td>
                           <td className="px-6 py-5 text-right font-black tabular-nums text-emerald-500">{av.toLocaleString()}</td>
                           <td className="px-6 py-5 text-right font-black tabular-nums text-rose-500">{(mt-av).toLocaleString()}</td>
                         </tr>
                       )
                     })}
                     
                     {partenaireData.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                Aucune mission assignée pour cette période.
                            </td>
                        </tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Nav for Portal */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2 flex justify-around items-center z-40 pb-safe">
         <button onClick={() => setActiveTab('flotte')} className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'flotte' ? 'text-blue-500' : 'text-slate-500'}`}>
           <Truck className="w-5 h-5" /> <span className="text-[8px] font-black uppercase">Flotte</span>
         </button>
         <button onClick={() => setActiveTab('partenaires')} className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'partenaires' ? 'text-amber-500' : 'text-slate-500'}`}>
           <Calendar className="w-5 h-5" /> <span className="text-[8px] font-black uppercase">Missions</span>
         </button>
      </nav>

      <ConfirmModal 
        isOpen={!!deleteCamionId} 
        onClose={() => setDeleteCamionId(null)} 
        onConfirm={handleDeleteCamion} 
        title="Supprimer l'unité de flotte" 
        message="Attention : cette action est irréversible. Toutes les statistiques liées à ce camion seront conservées dans les archives."
        variant="danger" 
      />
    </div>
  );
}

function SummaryCardPartenaire({ label, value, icon: Icon, color, highlight = false }: any) {
  const colors: any = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600"
  };
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 ${highlight ? 'ring-2 ring-amber-500/20' : ''}`}>
       <div className={`p-4 rounded-2xl ${colors[color] || colors.blue} shrink-0`}>
         <Icon className="w-8 h-8" />
       </div>
       <div>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
         <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter break-all">{value}</h3>
       </div>
    </div>
  );
}

function StatRow({ label, value, sub, highlight = false }: any) {
  return (
    <div className="p-6 sm:p-8 sm:border-r sm:last:border-r-0 border-b sm:border-b-0 last:border-b-0 border-slate-50 dark:border-slate-800/50 flex flex-col items-center text-center group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
       <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-4">{label}</p>
       <p className={`text-2xl sm:text-3xl font-black tabular-nums transition-transform group-hover:scale-110 ${highlight ? 'text-blue-500' : 'text-slate-900 dark:text-white'}`}>{value}</p>
       <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">{sub}</p>
    </div>
  );
}
