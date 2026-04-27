import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { DollarSign, CheckCircle, Clock, AlertTriangle, ShieldCheck, Calculator, ArrowRight, Truck } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/firestore-error";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "../hooks/useSettings";

export default function Finances() {
  const { settings } = useSettings();
  const [chargements, setChargements] = useState<any[]>([]);
  const [confirmPayId, setConfirmPayId] = useState<string | null>(null);

  useEffect(() => {
    // We listen to all chargements to show history and pending
    const unsub = onSnapshot(collection(db, "chargements"), (snap) => {
      setChargements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "chargements");
    });
    return () => unsub();
  }, []);

  const handlePay = async (id: string) => {
    try {
      await updateDoc(doc(db, "chargements", id), {
        statutPaiement: "paye",
        datePaiement: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setConfirmPayId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chargements/${id}`);
    }
  };

  const pendingCount = chargements.filter(c => c.statutPaiement === 'non_paye').length;
  const totalDebt = chargements.filter(c => c.statutPaiement === 'non_paye').reduce((sum, c) => sum + (Number(c.solde) || 0), 0);

  return (
    <div className="space-y-10 pb-20">
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter font-display">
              Gestion des <span className="text-blue-600">Flux</span> & Provisions
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Analyse prudentielle des quittances et des soldes transitoires</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-slate-50 dark:bg-slate-950 px-8 py-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Encours Global</p>
                <p className="text-xl font-black text-rose-500 tabular-nums">{totalDebt.toLocaleString()} {settings.devise}</p>
             </div>
             <div className="bg-slate-50 dark:bg-slate-950 px-8 py-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">En attente</p>
                <p className="text-xl font-black text-amber-500 tabular-nums">{pendingCount}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {chargements.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).map((ch) => (
          <ChargementFinanceCard 
            key={ch.id} 
            chargement={ch} 
            onPayRequest={() => setConfirmPayId(ch.id)} 
          />
        ))}
        {chargements.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
            <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 uppercase">Aucun flux financier détecté</h3>
            <p className="text-slate-500">Injectez des chargements pour démarrer le suivi prudentiel.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {confirmPayId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="bg-emerald-100 dark:bg-emerald-500/20 w-20 h-20 rounded-3xl flex items-center justify-center text-emerald-600 mb-8">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">Quittance Finale</h3>
              <p className="text-slate-500 leading-relaxed mb-8">
                Confirmez-vous le règlement intégral du solde restant ? Cette action horodatera le paiement et clôturera la transaction comptable dans le grand livre.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => handlePay(confirmPayId)}
                  className="flex-1 bg-emerald-600 text-white font-black uppercase py-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                >
                  Confirmer le Paiement
                </button>
                <button 
                  onClick={() => setConfirmPayId(null)}
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

function ChargementFinanceCard({ chargement, onPayRequest }: { chargement: any; onPayRequest: () => void; key?: string | number }) {
  const { settings } = useSettings();
  const isPaid = chargement.statutPaiement === 'paye';
  const isInternal = chargement.typeTransporteur === 'interne';
  
  // Logic for aging debt (e.g. > 7 days)
  const isOverdue = !isPaid && (new Date().getTime() - new Date(chargement.createdAt || 0).getTime() > 7 * 24 * 60 * 60 * 1000);

  return (
    <div className={`overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none transition-all duration-300 ${isPaid ? 'opacity-70' : 'hover:border-blue-500/50'} ${isOverdue ? 'ring-2 ring-rose-500 shadow-rose-500/20' : ''}`}>
      <div className="px-8 py-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors">
         <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full shadow-[0_0_8px] transition-all ${isPaid ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-amber-500 shadow-amber-500/50 animate-pulse'}`} />
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
              Cas d'Usage — Dossier ID: {chargement.dossierId?.slice(-6)} • Vecteur: {isInternal ? 'Flotte Interne' : 'Sous-traitance Prestataire'}
            </p>
         </div>
         {isOverdue && (
           <div className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-4 py-1.5 rounded-full border border-rose-500/20 animate-bounce">
              <AlertTriangle className="w-4 h-4" /> Alerte : Échéance dépassée
           </div>
         )}
         <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">
           Réf : {chargement.id.slice(-8)}
         </p>
      </div>

      <div className="p-6 sm:p-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 sm:gap-8">
          <FinanceItem 
            label=" UNITÉ CHARGÉE" 
            value={chargement.numeroConteneur || "EN ATTENTE"} 
            subtext="Identifiant Unique"
          />
          <FinanceItem 
            label="PROVISION UNITAIRE" 
            value={`${(Number(chargement.avance) || 0).toLocaleString()} ${settings.devise}`} 
            subtext="Virement Initial"
          />
          <FinanceItem 
            label="PROVISION CUMULÉE" 
            value={`${(Number(chargement.avance) || 0).toLocaleString()} ${settings.devise}`} 
            subtext="Quittance de Trésorerie"
            highlight
            highlightColor="text-emerald-500"
          />
          <FinanceItem 
            label="MONTANT CONVENTIONNEL" 
            value={`${(Number(chargement.prixTotal) || 0).toLocaleString()} ${settings.devise}`} 
            subtext="Engagement Marché"
          />
          <FinanceItem 
            label="SOLDE NET PASSIF" 
            value={`${(Number(chargement.solde) || 0).toLocaleString()} ${settings.devise}`} 
            subtext="Débit en attente"
            highlight
            highlightColor="text-rose-500"
          />
          <div className="flex flex-col items-center justify-center">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-6">OPÉRATION COMPTABLE</p>
            {isPaid ? (
               <div className="flex items-center gap-3 bg-emerald-500/10 text-emerald-500 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] border border-emerald-500/20">
                  <CheckCircle className="w-5 h-5" /> Transaction Archivée
               </div>
            ) : (
               <button 
                 onClick={onPayRequest}
                 className="group relative flex items-center gap-3 bg-slate-900 dark:bg-slate-950 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200 dark:shadow-none overflow-hidden"
               >
                  <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative z-10 flex items-center gap-3">
                    <Clock className="w-4 h-4 text-amber-500" /> Valider Quittance
                  </span>
               </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceItem({ label, value, subtext, highlight = false, highlightColor = "text-white" }: { label: string, value: string | number, subtext: string, highlight?: boolean, highlightColor?: string }) {
  return (
    <div className="flex flex-col items-center text-center p-6 border border-transparent hover:border-slate-50 dark:hover:bg-slate-950/50 rounded-[2rem] transition-all group">
      <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-8">{label}</p>
      <p className={`text-xl font-black mb-2 tracking-tighter tabular-nums ${highlight ? highlightColor : "text-slate-900 dark:text-white"}`}>
        {value}
      </p>
      <p className="text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest">{subtext}</p>
    </div>
  );
}
