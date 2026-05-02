import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, where, updateDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { DollarSign, CheckCircle, Clock, AlertTriangle, ShieldCheck, Calculator, ArrowRight, Truck, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/firestore-error";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "../hooks/useSettings";

export default function Finances() {
  const { settings } = useSettings();
  const [chargements, setChargements] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [confirmPayDossierId, setConfirmPayDossierId] = useState<string | null>(null);
  const [expandedDossiers, setExpandedDossiers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubChargements = onSnapshot(collection(db, "chargements"), (snap) => {
      setChargements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "chargements");
    });

    const unsubDossiers = onSnapshot(collection(db, "dossiers"), (snap) => {
      setDossiers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "dossiers");
    });

    return () => {
      unsubChargements();
      unsubDossiers();
    };
  }, []);

  const groupedData = useMemo<Record<string, any[]>>(() => {
    const groups: Record<string, any[]> = {};
    chargements.forEach(c => {
      const dId = c.dossierId || 'unassigned';
      if (!groups[dId]) groups[dId] = [];
      groups[dId].push(c);
    });
    return groups;
  }, [chargements]);

  const handlePayDossier = async (dossierId: string) => {
    const items = (groupedData[dossierId] as any[]).filter(c => c.statutPaiement !== 'paye');
    if (items.length === 0) return;

    try {
      const batch = writeBatch(db);
      items.forEach(item => {
        const totalAmount = Number(item.prixTotal) || 0;
        const ref = doc(db, "chargements", item.id);
        batch.update(ref, {
          statutPaiement: "paye",
          avance: totalAmount,
          solde: 0,
          datePaiement: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
      setConfirmPayDossierId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chargements/bulk/${dossierId}`);
    }
  };

  const handlePaySingle = async (item: any) => {
    if (item.statutPaiement === 'paye') return;
    try {
      const totalAmount = Number(item.prixTotal) || 0;
      await updateDoc(doc(db, "chargements", item.id), {
        statutPaiement: "paye",
        avance: totalAmount,
        solde: 0,
        datePaiement: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chargements/${item.id}`);
    }
  };

  const toggleDossier = (dId: string) => {
    setExpandedDossiers(prev => ({ ...prev, [dId]: !prev[dId] }));
  };

  const pendingCount = chargements.filter(c => c.statutPaiement === 'non_paye').length;
  const totalDebt = chargements.filter(c => c.statutPaiement === 'non_paye').reduce((sum, c) => sum + (Number(c.solde) || 0), 0);

  return (
    <div className="space-y-10 pb-20">
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter font-display">
              Gestion par <span className="text-blue-600">Dossier</span> & Flux
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium italic">Validation groupée des quittances par BL / Dossier</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-slate-50 dark:bg-slate-950 px-8 py-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Encours Global</p>
                <p className="text-xl font-black text-rose-500 tabular-nums">{totalDebt.toLocaleString()} {settings.devise}</p>
             </div>
             <div className="bg-slate-50 dark:bg-slate-950 px-8 py-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Unités à Valider</p>
                <p className="text-xl font-black text-amber-500 tabular-nums">{pendingCount}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {(Object.entries(groupedData) as [string, any[]][])
          .sort((a, b) => {
            // Sort by latest created item in the group
            const latestA = Math.max(
              ...a[1].map((i) => new Date(i.createdAt || 0).getTime()),
            );
            const latestB = Math.max(
              ...b[1].map((i) => new Date(i.createdAt || 0).getTime()),
            );
            return latestB - latestA;
          })
          .map(([dId, items]) => {
          const dossier = dossiers.find(d => d.id === dId);
          const allPaid = items.every(i => i.statutPaiement === 'paye');
          const groupDebt = items.reduce((sum, i) => sum + (i.statutPaiement !== 'paye' ? (Number(i.solde) || 0) : 0), 0);
          const isExpanded = expandedDossiers[dId];

          return (
            <div key={dId} className={`bg-white dark:bg-slate-900 rounded-[3rem] border-2 transition-all overflow-hidden ${allPaid ? 'border-slate-100 dark:border-slate-800 opacity-60' : 'border-blue-500/20 shadow-2xl shadow-blue-500/10'}`}>
               <div onClick={() => toggleDossier(dId)} className="p-8 lg:p-10 flex flex-col lg:flex-row justify-between items-center gap-8 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/20">
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center font-black italic shadow-lg text-xl rotate-3 ${allPaid ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white shadow-blue-500/30'}`}>BL</div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">#{dossier?.numeroBL || "Dossier Non Référencé"}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Client : <span className="text-slate-900 dark:text-white">{dossier?.client || "Inconnu"}</span> • {items.length} unité(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-8 w-full lg:w-auto">
                    <div className="text-center sm:text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Encours Dossier</p>
                       <p className={`text-2xl font-black tabular-nums ${groupDebt > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                         {groupDebt.toLocaleString()} <span className="text-sm">{settings.devise}</span>
                       </p>
                    </div>

                    {!allPaid ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setConfirmPayDossierId(dId); }}
                        className="bg-slate-900 dark:bg-slate-950 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl flex items-center gap-3"
                      >
                         <CheckCircle className="w-5 h-5" /> Tout Valider
                      </button>
                    ) : (
                      <div className="bg-emerald-500/10 text-emerald-500 px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Dossier Soldé
                      </div>
                    )}
                    
                    <div className="text-slate-300">
                      {isExpanded ? <ChevronUp className="w-8 h-8" /> : <ChevronDown className="w-8 h-8" />}
                    </div>
                  </div>
               </div>

               {isExpanded && (
                 <div className="px-10 pb-10 space-y-6">
                    <div className="h-px bg-slate-100 dark:bg-slate-800 mb-10" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {items.map(ch => (
                         <div key={ch.id} className={`p-6 rounded-[2rem] border transition-all ${ch.statutPaiement === 'paye' ? 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-100 dark:border-slate-800' : 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/50 shadow-sm'}`}>
                            <div className="flex justify-between items-start mb-4">
                               <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">{ch.numeroConteneur}</h4>
                               <div className="flex items-center gap-2">
                                 <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${ch.statutPaiement === 'paye' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600 animate-pulse'}`}>
                                   {ch.statutPaiement === 'paye' ? 'Réglé' : 'Attente'}
                                 </span>
                                 {ch.statutPaiement !== 'paye' && (
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); handlePaySingle(ch); }}
                                     className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                                     title="Valider cette unité"
                                   >
                                     <CheckCircle className="w-4 h-4" />
                                   </button>
                                 )}
                               </div>
                            </div>
                            <div className="space-y-1">
                               <p className="flex justify-between text-[11px] font-bold text-slate-400">
                                 <span>Convention :</span>
                                 <span className="text-slate-900 dark:text-white">{(Number(ch.prixTotal) || 0).toLocaleString()} {settings.devise}</span>
                               </p>
                               <p className="flex justify-between text-[11px] font-bold text-slate-400">
                                 <span>Acompte :</span>
                                 <span className="text-emerald-500">{(Number(ch.avance) || 0).toLocaleString()} {settings.devise}</span>
                               </p>
                               <p className="flex justify-between text-[11px] font-black text-rose-500 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                                 <span>Solde Net :</span>
                                 <span>{(Number(ch.solde) || 0).toLocaleString()} {settings.devise}</span>
                               </p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
          );
        })}

        {chargements.length === 0 && (
          <div className="text-center py-40 bg-white rounded-[5rem] border-4 border-dashed border-slate-100 italic">
            <Calculator className="w-20 h-20 text-slate-100 mx-auto mb-6" />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.4em]">Aucun flux financier en attente</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {confirmPayDossierId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="bg-blue-100 dark:bg-blue-500/20 w-20 h-20 rounded-3xl flex items-center justify-center text-blue-600 mb-8 font-black text-2xl italic">BL</div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">Clôture de Dossier</h3>
              <p className="text-slate-500 leading-relaxed mb-8">
                Vous allez valider la quittance intégrale pour toutes les unités de ce dossier ({groupedData[confirmPayDossierId].length} conteneurs). Cette action est irréversible et passera tous les statuts en "Réglé".
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => handlePayDossier(confirmPayDossierId)}
                  className="flex-1 bg-blue-600 text-white font-black uppercase py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg"
                >
                  Valider le Dossier
                </button>
                <button 
                  onClick={() => setConfirmPayDossierId(null)}
                  className="px-8 py-4 text-slate-400 font-bold uppercase hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
