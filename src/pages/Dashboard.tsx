import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Truck, FolderOpen, DollarSign, AlertCircle, Filter, Calendar, Search } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/firestore-error";

import { useSettings } from "../hooks/useSettings";

export default function Dashboard() {
  const { settings } = useSettings();
  
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [conteneurs, setConteneurs] = useState<any[]>([]);
  const [chargements, setChargements] = useState<any[]>([]);

  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [filterTransport, setFilterTransport] = useState('tous'); 
  const [filterPaiement, setFilterPaiement] = useState('tous'); 
  const [searchTxt, setSearchTxt] = useState('');

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const unsubD = onSnapshot(collection(db, "dossiers"), (snap) => {
      setDossiers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, "dossiers"));
    unsubs.push(unsubD);

    const unsubC = onSnapshot(collection(db, "conteneurs"), (snap) => {
      setConteneurs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, "conteneurs"));
    unsubs.push(unsubC);

    const unsubCh = onSnapshot(collection(db, "chargements"), (snap) => {
      setChargements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, "chargements"));
    unsubs.push(unsubCh);

    return () => unsubs.forEach(u => u());
  }, []);

  const stats = useMemo(() => {
    let dossiersActifs = dossiers.filter(d => d.statut === "en_cours").length;
    let du = 0;
    let semaine = 0;
    let echues = 0;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    chargements.forEach(data => {
      if (data.statutPaiement === "non_paye") {
        du += data.solde || 0;
        if (data.createdAt && new Date(data.createdAt) < oneWeekAgo) {
          echues++;
        }
      }
      if (data.dateChargement && new Date(data.dateChargement) > oneWeekAgo) {
        semaine++;
      }
    });

    return { dossiersActifs, montantDu: du, chargementsSemaine: semaine, creancesEchues: echues };
  }, [dossiers, chargements]);

  const enrichedDossiers = useMemo(() => {
    return dossiers.map((dossier) => {
      const dossierChargements = chargements.filter(c => c.dossierId === dossier.id);
      const dossierConteneurs = conteneurs.filter(c => c.dossierId === dossier.id);
      
      const countInterne = dossierChargements.filter(c => c.typeTransporteur === 'interne').length;
      const countExterne = dossierChargements.filter(c => c.typeTransporteur === 'externe').length;
      
      const montantTotal = dossierChargements.reduce((acc, c) => acc + (Number(c.prixTotal) || 0), 0);
      const montantPaye = dossierChargements.reduce((acc, c) => acc + (Number(c.avance) || 0), 0);
      const montantDu = dossierChargements.reduce((acc, c) => acc + (Number(c.solde) || 0), 0);

      let statusGlobalPaiement = 'non_paye';
      if (dossierChargements.length > 0) {
        if (montantDu <= 0 && montantPaye > 0) statusGlobalPaiement = 'paye';
        else if (montantPaye > 0 && montantDu > 0) statusGlobalPaiement = 'en_attente';
        else statusGlobalPaiement = 'non_paye';
      }

      return {
        ...dossier,
        totalConteneursCount: dossierConteneurs.length,
        chargementsCount: dossierChargements.length,
        countInterne,
        countExterne,
        montantTotal,
        montantPaye,
        montantDu,
        statusGlobalPaiement
      };
    }).filter((dossier) => {
      if (searchTxt && !String(dossier.numeroBL).toLowerCase().includes(searchTxt.toLowerCase())) return false;

      const dateTargetStr = dossier.createdAt || dossier.dateCreation;
      if (dateTargetStr) {
        const dDate = new Date(dateTargetStr);
        if (filterDateDebut) {
           const dDebut = new Date(filterDateDebut);
           dDebut.setHours(0,0,0,0);
           if (dDate < dDebut) return false;
        }
        if (filterDateFin) {
           const dFin = new Date(filterDateFin);
           dFin.setHours(23,59,59,999);
           if (dDate > dFin) return false;
        }
      }

      if (filterTransport === 'interne' && dossier.countInterne === 0) return false;
      if (filterTransport === 'externe' && dossier.countExterne === 0) return false;
      
      if (filterPaiement !== 'tous' && dossier.statusGlobalPaiement !== filterPaiement) return false;
      
      return true;
    }).sort((a, b) => {
      const da = new Date(b.createdAt || b.dateCreation || 0).getTime();
      const db = new Date(a.createdAt || a.dateCreation || 0).getTime();
      return da - db;
    });
  }, [dossiers, conteneurs, chargements, filterDateDebut, filterDateFin, filterTransport, filterPaiement, searchTxt]);

  return (
    <div className="space-y-6 pb-20">
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter font-display">
          Tableau de Bord <span className="text-blue-600">de Gestion</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Vue d'ensemble et suivi consolidé de l'ensemble des dossiers BL</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard title="Dossiers Actifs" value={stats.dossiersActifs} icon={FolderOpen} color="bg-blue-600" />
        <StatCard title="Chargements (7j)" value={stats.chargementsSemaine} icon={Truck} color="bg-slate-800" />
        <StatCard title="Créances à Solder" value={`${stats.montantDu.toLocaleString()} ${settings.devise}`} icon={DollarSign} color="bg-emerald-600" />
        <StatCard title="Créances Échues" value={stats.creancesEchues} icon={AlertCircle} color="bg-rose-600" highlight={stats.creancesEchues > 0} />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] lg:rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center mb-8">
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Répertoire des Dossiers</h2>
          
          {/* Filters */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 w-full lg:w-auto text-sm font-medium">
            <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 w-full xl:w-auto">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input 
                type="text" 
                placeholder="N° de BL..." 
                className="bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold w-full xl:w-32"
                value={searchTxt}
                onChange={e => setSearchTxt(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full xl:w-auto">
              <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                <input type="date" value={filterDateDebut} onChange={e => setFilterDateDebut(e.target.value)} className="bg-transparent text-slate-900 dark:text-white outline-none w-full" />
              </div>
              <span className="hidden sm:block text-slate-400 font-bold px-1">-</span>
              <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 relative">
                 <input type="date" value={filterDateFin} onChange={e => setFilterDateFin(e.target.value)} className="bg-transparent text-slate-900 dark:text-white outline-none w-full" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full xl:w-auto">
              <div className="hidden sm:flex items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                 <Filter className="w-4 h-4 text-slate-400" />
              </div>
              <select value={filterTransport} onChange={e => setFilterTransport(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto">
                <option value="tous">Tous Transports</option>
                <option value="interne">Inclus Interne</option>
                <option value="externe">Inclus Externe</option>
              </select>
              <select value={filterPaiement} onChange={e => setFilterPaiement(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto">
                <option value="tous">Tous Paiements</option>
                <option value="paye">Soldé (Payé)</option>
                <option value="non_paye">Non Payé</option>
                <option value="en_attente">Paiement Partiel</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-100 dark:border-slate-800 whitespace-nowrap">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Dossier BL</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Conteneurs</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Transp. (Int / Ext)</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Montant Global</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Paiement / Réglement</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Reste à Payer</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {enrichedDossiers.map((doc) => {
                const isSoldeZero = doc.montantDu === 0;
                return (
                  <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group whitespace-nowrap">
                    <td className="p-4">
                      <div className="font-black text-slate-900 dark:text-white">{doc.numeroBL}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {doc.statut === 'en_cours' ? '🔴 EN COURS' : '🟢 CLÔTURÉ'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('fr-FR') : '-'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl font-black text-slate-900 dark:text-white">
                        {doc.totalConteneursCount}/{doc.nbConteneurs}
                      </div>
                    </td>
                    <td className="p-4 text-center text-xs font-bold">
                      <div className="flex items-center justify-center gap-2">
                        <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded-lg" title="Interne">
                          {doc.countInterne}
                        </span>
                        <span className="text-slate-300">/</span>
                        <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded-lg" title="Externe">
                          {doc.countExterne}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-black text-slate-900 dark:text-white">
                        {doc.montantTotal.toLocaleString()} <span className="text-slate-400 font-bold text-xs">{settings.devise}</span>
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${doc.statusGlobalPaiement === 'paye' ? 'text-emerald-500' : 'text-slate-500'}`}>
                          {doc.statusGlobalPaiement === 'paye' ? 'Montant Soldé' : 'Avance'}
                        </span>
                        <div className="font-black text-slate-900 dark:text-white">
                          {doc.montantPaye.toLocaleString()} <span className="text-slate-400 font-bold text-xs">{settings.devise}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-black ${doc.montantDu > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                        {doc.montantDu.toLocaleString()} <span className="opacity-50 font-bold text-xs">{settings.devise}</span>
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {doc.montantTotal === 0 ? (
                        <span className="px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-slate-100 text-slate-500 dark:bg-slate-800">
                          Non Défini
                        </span>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm ${
                          doc.statusGlobalPaiement === 'paye' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : doc.statusGlobalPaiement === 'en_attente'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        }`}>
                          {doc.statusGlobalPaiement === 'paye' ? 'Soldé' : doc.statusGlobalPaiement === 'en_attente' ? 'Partiel' : 'Non Payé'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {enrichedDossiers.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                    Aucun dossier trouvé pour ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, highlight = false }: { title: string, value: string | number, icon: any, color: string, highlight?: boolean }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none p-8 flex flex-col gap-6 transition-all duration-300 group border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 ${highlight ? 'ring-2 ring-rose-500 border-transparent animate-pulse' : ''}`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 duration-300 ${color}`}>
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{title}</p>
        <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums truncate">{value}</p>
      </div>
    </div>
  );
}

