import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Truck, Plus, Check, X as XIcon, Trash2, Edit2, LayoutDashboard, DollarSign, AlertCircle, TrendingUp, Wrench, History, Calendar } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/firestore-error";
import { useSettings } from "../hooks/useSettings";
import ConfirmModal from "../components/ConfirmModal";

export default function Camions() {
  const { settings } = useSettings();
  const [camions, setCamions] = useState<any[]>([]);
  const [chargements, setChargements] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [maintenances, setMaintenances] = useState<any[]>([]);
  
  const [showNew, setShowNew] = useState(false);
  const [newCamion, setNewCamion] = useState({ numero: "", chauffeur: "", type: "interne" });
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ numero: "", chauffeur: "", type: "interne" });
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assigningLoading, setAssigningLoading] = useState<string | null>(null);

  // Maintenance state
  const [showMaintModal, setShowMaintModal] = useState<string | null>(null);
  const [newMaint, setNewMaint] = useState({ type: "", description: "", cout: "", dateIntervention: new Date().toISOString().split('T')[0] });
  const [viewLogsId, setViewLogsId] = useState<string | null>(null);

  useEffect(() => {
    const unsubC = onSnapshot(query(collection(db, "camions"), orderBy("createdAt", "desc")), (snap) => {
      setCamions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, "camions"));

    const unsubCh = onSnapshot(collection(db, "chargements"), (snap) => {
      setChargements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, "chargements"));

    const unsubD = onSnapshot(collection(db, "dossiers"), (snap) => {
      setDossiers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, "dossiers"));

    const unsubM = onSnapshot(query(collection(db, "maintenances"), orderBy("dateIntervention", "desc")), (snap) => {
      setMaintenances(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, "maintenances"));

    return () => { unsubC(); unsubCh(); unsubD(); unsubM(); };
  }, []);

  const pendingMissions = chargements.filter(ch => ch.typeTransporteur === 'interne' && !ch.camionId);

  const handleAssignCamion = async (chargementId: string, camionId: string) => {
    if (!camionId) return;
    setAssigningLoading(chargementId);
    try {
      await updateDoc(doc(db, "chargements", chargementId), {
        camionId: camionId,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chargements/${chargementId}`);
    } finally {
      setAssigningLoading(null);
    }
  };

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
      setNewCamion({ numero: "", chauffeur: "", type: "interne" });
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

  const toggleStatut = async (id: string, newVal: string) => {
    try {
      await updateDoc(doc(db, "camions", id), { 
        statut: newVal,
        updatedAt: new Date().toISOString()
      });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `camions/${id}`); }
  };

  const getStats = (camionId: string) => {
    const now = new Date();
    const filtered = chargements.filter(ch => ch.camionId === camionId);
    const maintFiltered = maintenances.filter(m => m.camionId === camionId);

    const cumulativeVolume = filtered.length;
    const monthlyActivity = filtered.filter(ch => {
      if (!ch.dateChargement) return false;
      const d = new Date(ch.dateChargement);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    
    const ca = filtered.reduce((sum, ch) => sum + (Number(ch.prixTotal) || 0), 0);
    const totalMaint = maintFiltered.reduce((sum, m) => sum + (Number(m.cout) || 0), 0);
    const profitNet = ca - totalMaint;
    
    return { cumulativeVolume, monthlyActivity, ca, totalMaint, profitNet };
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMaintModal || !newMaint.cout || !newMaint.type) return;
    try {
      await addDoc(collection(db, "maintenances"), {
        ...newMaint,
        camionId: showMaintModal,
        cout: Number(newMaint.cout),
        createdAt: new Date().toISOString()
      });
      setShowMaintModal(null);
      setNewMaint({ type: "", description: "", cout: "", dateIntervention: new Date().toISOString().split('T')[0] });
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, "maintenances"); }
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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button 
            onClick={() => window.print()}
            className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all active:scale-95 no-print"
          >
            Imprimer l'État
          </button>
          <button 
            onClick={() => setShowNew(true)}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 sm:px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Ajouter un véhicule
          </button>
        </div>
      </div>

      {/* Missions Internes en Attente */}
      {pendingMissions.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-[2rem] p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-amber-900 dark:text-amber-400 uppercase tracking-tighter">Missions Internes en Attente</h2>
              <p className="text-amber-700/60 dark:text-amber-500/60 text-[10px] font-bold uppercase tracking-widest">{pendingMissions.length} conteneur(s) interne(s) à assigner</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingMissions.map(miss => {
              const dossier = dossiers.find(d => d.id === miss.dossierId);
              return (
                <div key={miss.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200/50 dark:border-amber-800/30 shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conteneur</p>
                      <h4 className="font-black text-slate-900 dark:text-white uppercase">{miss.numeroConteneur}</h4>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-[10px] font-bold text-slate-500 uppercase">
                      BL #{dossier?.numeroBL || "???"}
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Assigner à la Flotte :</label>
                    <select 
                      disabled={assigningLoading === miss.id}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                      onChange={(e) => handleAssignCamion(miss.id, e.target.value)}
                      value=""
                    >
                      <option value="">Choisir un camion...</option>
                      {camions.filter(c => c.statut === 'actif').map(c => (
                        <option key={c.id} value={c.id}>{c.numero} - {c.chauffeur}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showNew && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] lg:rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-6 animate-in slide-in-from-top-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Type Flotte</label>
            <select 
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              value={newCamion.type}
              onChange={e => setNewCamion({...newCamion, type: e.target.value})}
            >
              <option value="interne">🚛 Flotte Interne</option>
              <option value="externe">🤝 Partenaire Externe</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Immatriculation / Nom</label>
            <input 
              placeholder="Ex: AA-123-BB" 
              required 
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              value={newCamion.numero} 
              onChange={e => setNewCamion({...newCamion, numero: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Chauffeur / Contact</label>
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
                        <select 
                          className="bg-slate-100 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs font-black uppercase"
                          value={editForm.type}
                          onChange={e => setEditForm({...editForm, type: e.target.value})}
                        >
                          <option value="interne">Interne</option>
                          <option value="externe">Externe</option>
                        </select>
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
                        <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${c.type === 'interne' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-slate-900'}`}>
                          {c.type === 'interne' ? 'Interne' : 'Partenaire'}
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{c.numero}</h3>
                        <button onClick={() => { setIsEditing(c.id); setEditForm({ numero: c.numero, chauffeur: c.chauffeur, type: c.type || 'interne' }); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors shrink-0"><Edit2 className="w-5 h-5" /></button>
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
                  <button onClick={() => setDeleteId(c.id)} className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-all no-print"><Trash2 className="w-5 h-5" /></button>
                  <div className="flex flex-col gap-1 w-full sm:w-auto min-w-[150px]">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center mb-1">État Opérationnel</p>
                    <select 
                      value={c.statut}
                      onChange={(e) => toggleStatut(c.id, e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest outline-none border-2 transition-all cursor-pointer ${
                        c.statut === 'actif' ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : 
                        c.statut === 'panne' ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/20' :
                        c.statut === 'maintenance' ? 'bg-amber-500 border-amber-400 text-slate-900 shadow-lg shadow-amber-500/20' :
                        'bg-slate-200 border-slate-300 text-slate-500'
                      }`}
                    >
                      <option value="actif">🚛 En Circulation</option>
                      <option value="panne" className="bg-white text-rose-600">⚠ En Panne</option>
                      <option value="maintenance" className="bg-white text-amber-600">🛠 Maintenance</option>
                      <option value="inactif" className="bg-white text-slate-600">🚫 Hors Service</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4">
                 <StatBox label="Missions" value={stats.cumulativeVolume} icon={LayoutDashboard} />
                 <StatBox label="CA Brut" value={`${(stats.ca/1000).toFixed(1)}K`} sub={settings.devise} highlight icon={TrendingUp} />
                 <StatBox label="Maintenance" value={`${(stats.totalMaint/1000).toFixed(1)}K`} sub={settings.devise} icon={Wrench} variant="danger" />
                 <StatBox label="Profit Net" value={`${(stats.profitNet/1000).toFixed(1)}K`} sub={settings.devise} icon={DollarSign} variant="success" />
              </div>
              
              <div className="px-8 py-4 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between gap-4">
                 <div className="flex gap-2">
                   <button 
                     onClick={() => setShowMaintModal(c.id)}
                     className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                   >
                     <Plus className="w-3.5 h-3.5" /> Enregistrer Entretien
                   </button>
                   <button 
                     onClick={() => setViewLogsId(viewLogsId === c.id ? null : c.id)}
                     className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewLogsId === c.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}
                   >
                     <History className="w-3.5 h-3.5" /> {viewLogsId === c.id ? 'Masquer Historique' : 'Consulter Historique'}
                   </button>
                 </div>
              </div>

              {viewLogsId === c.id && (
                <div className="p-8 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                   <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                     <History className="w-4 h-4" /> Journal des interventionstechniques
                   </h4>
                   <div className="space-y-3">
                     {maintenances.filter(m => m.camionId === c.id).map(m => (
                       <div key={m.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-all">
                          <div className="flex items-center gap-4">
                             <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                               <Wrench className="w-4 h-4 text-blue-500" />
                             </div>
                             <div>
                               <p className="font-black text-slate-900 dark:text-white uppercase text-[11px] tracking-tight">{m.type}</p>
                               <p className="text-[10px] text-slate-500 font-medium">{m.description || "Aucun détail saisi."}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-6 mt-4 sm:mt-0">
                             <div className="text-right">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Date</p>
                               <p className="font-bold text-xs">{new Date(m.dateIntervention).toLocaleDateString('fr-FR')}</p>
                             </div>
                             <div className="text-right px-4 py-1.5 bg-rose-500/10 rounded-lg">
                               <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-none mb-1">Coût</p>
                               <p className="font-black text-rose-500 tabular-nums">{Number(m.cout).toLocaleString()} {settings.devise}</p>
                             </div>
                          </div>
                       </div>
                     ))}
                     {maintenances.filter(m => m.camionId === c.id).length === 0 && (
                       <div className="py-10 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">
                         Aucune intervention enregistrée pour ce véhicule
                       </div>
                     )}
                   </div>
                </div>
              )}
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

      {/* Maintenance Entry Modal */}
      {showMaintModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowMaintModal(null)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
             <form onSubmit={handleCreateMaintenance}>
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Entretien Technique</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Log Maintenance</h3>
                  </div>
                  <button type="button" onClick={() => setShowMaintModal(null)} className="p-3 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                    <XIcon className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-8 space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-2">Type d'intervention <Wrench className="w-3 h-3" /></label>
                        <select 
                          required
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          value={newMaint.type}
                          onChange={e => setNewMaint({...newMaint, type: e.target.value})}
                        >
                          <option value="">Sélectionner...</option>
                          <option value="Panne Moteur">Panne Moteur</option>
                          <option value="Pneumatiques">Pneumatiques</option>
                          <option value="Vidange / Filtres">Vidange / Filtres</option>
                          <option value="Pièces de rechange">Pièces de rechange</option>
                          <option value="Carburant">Carburant</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-2">Coût ({settings.devise}) <DollarSign className="w-3 h-3" /></label>
                        <input 
                          type="number"
                          required
                          placeholder="Ex: 50000"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          value={newMaint.cout}
                          onChange={e => setNewMaint({...newMaint, cout: e.target.value})}
                        />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-2">Date de l'intervention <Calendar className="w-3 h-3" /></label>
                      <input 
                        type="date"
                        required
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={newMaint.dateIntervention}
                        onChange={e => setNewMaint({...newMaint, dateIntervention: e.target.value})}
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Description / Observations</label>
                      <textarea 
                        rows={3}
                        placeholder="Détails sur les pièces changées ou la nature de la panne..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        value={newMaint.description}
                        onChange={e => setNewMaint({...newMaint, description: e.target.value})}
                      />
                   </div>
                </div>

                <div className="p-8 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-50 dark:border-slate-800 flex gap-4">
                   <button type="submit" className="flex-1 bg-blue-600 text-white font-black uppercase text-[10px] tracking-[0.2em] py-4 rounded-xl shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Enregistrer l'Entretien</button>
                   <button type="button" onClick={() => setShowMaintModal(null)} className="px-6 py-4 text-slate-400 font-black uppercase text-[10px]">Annuler</button>
                </div>
             </form>
          </div>
        </div>
      )}

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

function StatBox({ label, value, sub, highlight = false, icon: Icon, variant }: any) {
  const getColors = () => {
    if (variant === 'danger') return 'text-rose-500';
    if (variant === 'success') return 'text-emerald-500';
    if (highlight) return 'text-blue-500';
    return 'text-slate-900 dark:text-white';
  };

  return (
    <div className="p-8 border-r last:border-r-0 border-slate-50 dark:border-slate-800/50 flex flex-col items-center text-center group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
       <div className={`mb-4 transition-colors ${variant === 'danger' ? 'text-rose-300' : variant === 'success' ? 'text-emerald-300' : 'text-slate-300 dark:text-slate-700'} group-hover:text-blue-500`}>
         <Icon className="w-5 h-5" />
       </div>
       <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-2">{label}</p>
       <div className="flex items-baseline gap-1">
         <p className={`text-3xl font-black tabular-nums transition-transform group-hover:scale-110 ${getColors()}`}>{value}</p>
         {sub && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sub}</span>}
       </div>
    </div>
  );
}
