import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { handleFirestoreError, OperationType } from "../lib/firestore-error";
import { Search, Calendar, Filter, Truck, FileText, Landmark, BarChart3, TrendingUp, AlertCircle, ChevronRight } from "lucide-react";

export default function Rapports() {
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [chargements, setChargements] = useState<any[]>([]);
  const [camions, setCamions] = useState<any[]>([]);
  
  const [filter, setFilter] = useState("all");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [searchTruck, setSearchTruck] = useState("");
  const [searchBL, setSearchBL] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const unsubD = onSnapshot(collection(db, "dossiers"), snap => {
      setDossiers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "dossiers");
    });
    const unsubC = onSnapshot(collection(db, "chargements"), snap => {
      setChargements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "chargements");
    });
    const unsubCamions = onSnapshot(collection(db, "camions"), snap => {
      setCamions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "camions");
    });
    return () => { unsubD(); unsubC(); unsubCamions(); };
  }, []);

  const filteredData = useMemo(() => {
    const now = new Date();
    
    // Filter chargements
    let filteredC = chargements.filter(ch => {
      // Time filters
      if (!ch.dateChargement) return filter === "all";
      const date = new Date(ch.dateChargement);
      
      if (filter === "month") {
        if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false;
      } else if (filter === "quarter") {
        if (Math.abs(now.getTime() - date.getTime()) > 90 * 24 * 60 * 60 * 1000) return false;
      } else if (filter === "semester") {
        if (Math.abs(now.getTime() - date.getTime()) > 180 * 24 * 60 * 60 * 1000) return false;
      } else if (filter === "year") {
        if (date.getFullYear() !== now.getFullYear()) return false;
      } else if (filter === "custom") {
        if (customRange.start && date < new Date(customRange.start)) return false;
        if (customRange.end && date > new Date(customRange.end)) return false;
      }

      // Attribute filters
      if (searchTruck && ch.camionId !== searchTruck && ch.nomTransporteurExterne !== searchTruck) return false;
      if (searchBL && !ch.dossierId?.toLowerCase().includes(searchBL.toLowerCase())) return false;
      if (statusFilter !== "all" && ch.statutPaiement !== statusFilter) return false;

      return true;
    });

    // Filter dossiers (for general stats)
    let filteredD = dossiers.filter(d => {
      if (filter === "all") return true;
      if (!d.createdAt) return false;
      const date = new Date(d.createdAt);
      
      if (filter === "month") {
        if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false;
      } else if (filter === "custom") {
        if (customRange.start && date < new Date(customRange.start)) return false;
        if (customRange.end && date > new Date(customRange.end)) return false;
      }
      return true;
    });

    return { filteredC, filteredD };
  }, [chargements, dossiers, filter, customRange, searchTruck, searchBL, statusFilter]);

  const stats = useMemo(() => {
    const { filteredC, filteredD } = filteredData;
    
    // -- PERF OPERATIONNELLES --
    const volumeGlobal = filteredD.length;
    const dossiersClotures = filteredD.filter(d => d.statut === "cloturé").length;
    const tauxCloture = volumeGlobal > 0 ? (dossiersClotures / volumeGlobal) * 100 : 0;
    const debitConteneurs = filteredC.length; // EVP simplified

    // -- MATRICE LOGISTIQUE --
    const interne = filteredC.filter(c => c.typeTransporteur === "interne").length;
    const externe = filteredC.filter(c => c.typeTransporteur === "externe").length;
    const ratioDependance = (interne + externe) > 0 ? (externe / (interne + externe)) * 100 : 0;

    // -- SANTE FINANCIERE --
    const provisions = filteredC.reduce((sum, ch) => sum + (ch.avance || 0), 0);
    const passifsResolus = filteredC.filter(ch => ch.statutPaiement === "paye").reduce((sum, ch) => sum + (ch.solde || 0), 0);
    const bfrLogistique = filteredC.filter(ch => ch.statutPaiement === "non_paye").reduce((sum, ch) => sum + (ch.solde || 0), 0);

    // -- AUDIT FLOTTE --
    const truckEfficiency: Record<string, number> = {};
    filteredC.forEach(ch => {
      if (ch.typeTransporteur === "interne" && ch.camionId) {
        truckEfficiency[ch.camionId] = (truckEfficiency[ch.camionId] || 0) + 1;
      }
    });
    const sortedTrucks = Object.entries(truckEfficiency).sort((a, b) => b[1] - a[1]);
    const topTruckId = sortedTrucks[0]?.[0];
    const topTruck = camions.find(c => c.id === topTruckId)?.numero || "N/A";

    return { 
      volumeGlobal, tauxCloture, debitConteneurs,
      interne, externe, ratioDependance,
      provisions, passifsResolus, bfrLogistique,
      topTruck, topTruckCount: sortedTrucks[0]?.[1] || 0
    };
  }, [filteredData, camions]);

  const pieData = [
    { name: "Interne", value: stats.interne },
    { name: "Externe", value: stats.externe }
  ];
  const COLORS = ['#3b82f6', '#f59e0b'];

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col gap-6">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter font-display">
            Data <span className="text-blue-600">Mining</span> & Clôture
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Analyse matricielle périodique du grand-livre logistique</p>
        </div>

        {/* FILTRES AVANCÉS */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 transition-colors">
           <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white">Moteur de filtrage & Pivot</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Granularité Temporelle</label>
                <select 
                  className="w-full border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 bg-slate-50 dark:bg-slate-950 font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                >
                  <option value="all">Historique complet</option>
                  <option value="month">Mensuel</option>
                  <option value="quarter">Trimestriel</option>
                  <option value="semester">Semestriel</option>
                  <option value="year">Annuel</option>
                  <option value="custom">Plage personnalisée</option>
                </select>
              </div>

              {filter === "custom" && (
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Fenêtre glissante</label>
                  <div className="flex gap-2">
                    <input type="date" className="w-full border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-950 font-black text-xs text-slate-900 dark:text-white" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} />
                    <input type="date" className="w-full border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-950 font-black text-xs text-slate-900 dark:text-white" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Pivot par Vecteur</label>
                <select 
                  className="w-full border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 bg-slate-50 dark:bg-slate-950 font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  value={searchTruck}
                  onChange={e => setSearchTruck(e.target.value)}
                >
                  <option value="">Tous les vecteurs</option>
                  {camions.map(c => <option key={c.id} value={c.id}>{c.numero}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Pivot par Connaissement</label>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Saisie BL..." 
                    className="w-full border border-slate-100 dark:border-slate-800 rounded-2xl pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-950 font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    value={searchBL}
                    onChange={e => setSearchBL(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Statut de Recouvrement</label>
                <select 
                  className="w-full border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 bg-slate-50 dark:bg-slate-950 font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="all">Tous statuts</option>
                  <option value="paye">Soldes clôturés</option>
                  <option value="non_paye">Créances ouvertes</option>
                </select>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Quadrant 
          title="Performances Opérationnelles" 
          icon={<FileText className="w-5 h-5 text-blue-500" />}
          items={[
            { label: "Volume global de connaissements", value: stats.volumeGlobal },
            { label: "Taux de clôture des dossiers BL", value: `${stats.tauxCloture.toFixed(1)}%` },
            { label: "Débit total des conteneurs (EVP)", value: stats.debitConteneurs }
          ]}
        />
        <Quadrant 
          title="Matrice Logistique" 
          icon={<Truck className="w-5 h-5 text-amber-500" />}
          items={[
            { label: "Indicateurs de charge globale", value: stats.debitConteneurs },
            { label: "Ratio de dépendance Interne/Externe", value: `${stats.ratioDependance.toFixed(1)}%` },
            { label: "Camion Référent / Top Vecteur", value: stats.topTruck }
          ]}
        />
        <Quadrant 
          title="Santé Financière" 
          icon={<Landmark className="w-5 h-5 text-emerald-500" />}
          items={[
            { label: "Flux de trésorerie sortants (Provisions)", value: `${(stats.provisions / 1000).toFixed(0)}K` },
            { label: "Passifs résolus (Soldes clôturés)", value: `${(stats.passifsResolus / 1000).toFixed(0)}K` },
            { label: "BFR Logistique (Créances ouvertes)", value: `${(stats.bfrLogistique / 1000).toFixed(0)}K` }
          ]}
        />
        <Quadrant 
          title="Audit Flotte" 
          icon={<TrendingUp className="w-5 h-5 text-rose-500" />}
          items={[
            { label: "Classement de productivité machine", value: `${stats.topTruckCount} units` },
            { label: "Indice de Goulot d'Étranglement", value: stats.externe > stats.interne ? "Flux Subi" : "Flux Maitrisé" },
            { label: "Traçabilité des litiges financiers", value: stats.bfrLogistique > 5000000 ? "Alerte Rouge" : "Normal" }
          ]}
        />
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-10 border border-slate-800 shadow-2xl overflow-hidden relative">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] -mr-32 -mt-32" />
         <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center">
            <div className="flex-1">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Projection des Impayés</h3>
              <p className="text-slate-400 mb-8 max-w-lg leading-relaxed">Analyse prédictive de la dette fournisseur basée sur les dossers BL ouverts. Simulation de l'impact sur la trésorerie à M+1.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Prévision S+1</p>
                    <p className="text-3xl font-black text-white">{(stats.bfrLogistique * 1.2 / 1000).toFixed(0)}K <span className="text-sm font-medium text-rose-400 font-sans">+20%</span></p>
                 </div>
                 <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Seuil de Risque</p>
                    <p className="text-3xl font-black text-white">{(15000000 / 1000).toFixed(0)}K</p>
                 </div>
              </div>
            </div>
            
            <div className="w-full lg:w-96 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
               <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-6">Répartition Réel vs Cible</h4>
               <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function Quadrant({ title, icon, items }: { title: string, icon: React.ReactNode, items: { label: string, value: string | number }[] }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none group hover:border-blue-500/30 transition-all duration-500 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
      <div className="flex items-center gap-4 mb-10 relative z-10">
         <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl group-hover:scale-110 transition-transform shadow-sm">
            {icon}
         </div>
         <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">{title}</h3>
      </div>
      <ul className="space-y-8 relative z-10">
        {items.map((item, idx) => (
          <li key={idx} className="flex justify-between items-center group/item">
            <div className="flex items-center gap-4">
               <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800 group-hover/item:bg-blue-500 group-hover/item:shadow-[0_0_8px] transition-all" />
               <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{item.label}</span>
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{item.value}</span>
          </li>
        ))}
      </ul>
      <div className="mt-10 pt-10 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center gap-3 group/btn cursor-pointer relative z-10">
         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover/btn:text-blue-500 transition-colors">Audit approfondi des données</span>
         <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover/btn:text-blue-500 group-hover/btn:translate-x-1 transition-all" />
      </div>
    </div>
  );
}
