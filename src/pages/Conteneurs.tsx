import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  Search, Box, Truck, FolderOpen, Calendar, 
  ChevronDown, ChevronUp, DollarSign, ArrowUpRight, 
  ArrowDownRight, Filter, Download, CheckCircle2, AlertCircle
} from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/firestore-error";
import { cn } from "../lib/utils";
import { useSettings } from "../hooks/useSettings";

export default function Conteneurs() {
  const { settings } = useSettings();
  const [conteneurs, setConteneurs] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [chargements, setChargements] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [transportFilter, setTransportFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [expandedDossiers, setExpandedDossiers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubConteneurs = onSnapshot(query(collection(db, "conteneurs"), orderBy("createdAt", "desc")), (snap) => {
      setConteneurs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "conteneurs");
    });

    const unsubDossiers = onSnapshot(collection(db, "dossiers"), (snap) => {
      setDossiers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "dossiers");
    });

    const unsubChargements = onSnapshot(collection(db, "chargements"), (snap) => {
      setChargements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "chargements");
    });

    return () => {
      unsubConteneurs();
      unsubDossiers();
      unsubChargements();
    };
  }, []);

  const toggleDossier = (id: string) => {
    const next = new Set(expandedDossiers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedDossiers(next);
  };

  const groupedData = useMemo(() => {
    const groups: Record<string, any> = {};

    dossiers.forEach(d => {
      const dossierChargements = chargements.filter(ch => ch.dossierId === d.id);
      const dossierConteneurs = conteneurs.filter(c => c.dossierId === d.id);
      
      const totalCost = dossierChargements.reduce((acc, ch) => acc + (Number(ch.prixTotal) || 0), 0);
      const totalRevenue = Number(d.prixContrat) || 0;
      const margin = totalRevenue - totalCost;
      
      const isInterne = dossierChargements.some(ch => ch.typeTransporteur === "interne");
      const isExterne = dossierChargements.some(ch => ch.typeTransporteur === "externe");
      
      let typeTransportValue = "À définir";
      if (isInterne && isExterne) typeTransportValue = "Mixte";
      else if (isInterne) typeTransportValue = "Interne";
      else if (isExterne) typeTransportValue = "Externe";

      groups[d.id] = {
        ...d,
        items: dossierConteneurs.map(c => ({
          ...c,
          chargement: dossierChargements.find(ch => ch.conteneurId === c.id)
        })),
        financials: {
          revenue: totalRevenue,
          cost: totalCost,
          margin,
          marginPercent: totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0
        },
        typeTransport: typeTransportValue,
        statutSoldé: d.statutPaiementClient === "paye" || d.statut === "soldé"
      };
    });

    return Object.values(groups)
      .filter((g: any) => {
        const matchesSearch = 
          g.numeroBL?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          g.client?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesTransport = 
          transportFilter === "all" || 
          g.typeTransport.toLowerCase() === transportFilter.toLowerCase();
          
        const matchesPayment = 
          paymentStatusFilter === "all" || 
          (paymentStatusFilter === "paye" ? g.statutSoldé : !g.statutSoldé);
          
        return matchesSearch && matchesTransport && matchesPayment;
      })
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [dossiers, conteneurs, chargements, searchTerm, transportFilter, paymentStatusFilter]);

  const stats = useMemo(() => {
    const totalRev = groupedData.reduce((acc, g) => acc + g.financials.revenue, 0);
    const totalCost = groupedData.reduce((acc, g) => acc + g.financials.cost, 0);
    return {
      revenue: totalRev,
      cost: totalCost,
      profit: totalRev - totalCost,
      pendingCount: groupedData.filter(g => !g.statutSoldé).length,
      totalEVP: conteneurs.length
    };
  }, [groupedData, conteneurs]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter font-display">
            Inventaire <span className="text-blue-600">Fiscal EVP</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Registre comptable et opérationnel des flux de marchandises</p>
        </div>
        <button 
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl"
          onClick={() => window.print()}
        >
          <Download className="w-4 h-4" /> Exporter PDF Fiscal
        </button>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <FiscalCard 
          label="Chiffre d'Affaires" 
          value={stats.revenue} 
          currency={settings.devise}
          icon={<ArrowUpRight className="w-5 h-5 text-emerald-500" />}
          sublabel="Volume de ventes global"
        />
        <FiscalCard 
          label="Coûts Logistiques" 
          value={stats.cost} 
          currency={settings.devise}
          icon={<ArrowDownRight className="w-5 h-5 text-rose-500" />}
          sublabel="Frais transporteurs & Flotte"
        />
        <FiscalCard 
          label="Résultat Net (EBITDA)" 
          value={stats.profit} 
          currency={settings.devise}
          icon={<DollarSign className="w-5 h-5 text-blue-500" />}
          sublabel={`${((stats.profit / (stats.revenue || 1)) * 100).toFixed(1)}% de marge`}
          highlight
        />
        <FiscalCard 
          label="Dossiers en Attente" 
          value={stats.pendingCount} 
          icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
          sublabel="À solder fiscalement"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden transition-all">
        {/* Filters Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Rechercher par BL ou Client..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-900 dark:text-white"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
            </div>
            
            <div className="flex gap-2 min-w-fit">
              <select 
                className="px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-[10px] uppercase tracking-widest text-slate-900 dark:text-white"
                value={transportFilter}
                onChange={e => setTransportFilter(e.target.value)}
              >
                <option value="all">Filtre Transport</option>
                <option value="interne">Interne Only</option>
                <option value="externe">Externe Only</option>
                <option value="mixte">Flux Mixte</option>
              </select>

              <select 
                className="px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-[10px] uppercase tracking-widest text-slate-900 dark:text-white"
                value={paymentStatusFilter}
                onChange={e => setPaymentStatusFilter(e.target.value)}
              >
                <option value="all">Échéance</option>
                <option value="paye">Soldé</option>
                <option value="non_paye">Non Soldé</option>
              </select>
            </div>
          </div>
        </div>

        {/* Master Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/30 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5">Dossier / BL</th>
                <th className="px-6 py-5">Transport</th>
                <th className="px-6 py-5">Assignation</th>
                <th className="px-6 py-5">Vente (CA)</th>
                <th className="px-6 py-5">Achat (Coût)</th>
                <th className="px-6 py-5">Statut Fiscal</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {groupedData.map((group: any) => {
                const isExpanded = expandedDossiers.has(group.id);
                const assignedCount = group.items.filter((item: any) => item.chargement?.camionId).length;
                const totalCount = group.items.length;
                const percentAssigned = totalCount > 0 ? (assignedCount / totalCount) * 100 : 0;
                const isProfitable = group.financials.margin >= 0;
                
                return (
                  <React.Fragment key={group.id}>
                    <tr className={cn(
                      "group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all cursor-pointer",
                      isExpanded && "bg-blue-50/30 dark:bg-blue-900/10"
                    )} onClick={() => toggleDossier(group.id)}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                            group.statutSoldé 
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                              : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                          )}>
                            <FolderOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 dark:text-white text-base tracking-tighter uppercase">BL #{group.numeroBL}</p>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mt-1">{group.client || "Client Externe"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                            {group.typeTransport}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="w-24 space-y-1">
                          <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-400">
                            <span>{assignedCount}/{totalCount} EVP</span>
                            <span>{percentAssigned.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full transition-all duration-500", percentAssigned === 100 ? "bg-emerald-500" : "bg-blue-500")}
                              style={{ width: `${percentAssigned}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 font-mono font-black text-slate-900 dark:text-white">
                        {group.financials.revenue.toLocaleString()} <span className="text-[9px] text-slate-400">{settings.devise}</span>
                      </td>
                      <td className="px-6 py-6 font-mono font-black text-slate-500">
                        {group.financials.cost.toLocaleString()} <span className="text-[9px] text-slate-400">{settings.devise}</span>
                      </td>
                      <td className="px-6 py-6">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                          group.statutSoldé 
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        )}>
                          {group.statutSoldé ? <CheckCircle2 className="w-3 h-3" /> : <Box className="w-3 h-3" />}
                          {group.statutSoldé ? "Clôturé" : "Ouvert"}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className={cn(
                          "p-2 rounded-lg transition-transform",
                          isExpanded ? "rotate-180 bg-blue-100 dark:bg-blue-900/30 text-blue-600" : "text-slate-400 hover:text-slate-600"
                        )}>
                          <ChevronDown className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="px-8 pb-8 pt-0 bg-slate-50/50 dark:bg-slate-900/20">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 dark:border-slate-800 pt-6 animate-in fade-in slide-in-from-top-2">
                            {/* Breakdown of containers */}
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Box className="w-3.5 h-3.5" /> Détail des Unités EVP
                              </h4>
                              <div className="grid grid-cols-1 gap-2">
                                {group.items.map((item: any) => (
                                  <div key={item.id} className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group/item hover:border-blue-500/50 transition-all">
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black",
                                        item.type === "20'" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"
                                      )}>
                                        {item.type}
                                      </div>
                                      <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                                        {item.numero}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[9px] font-black text-slate-400 uppercase leading-none">Coût Transport</p>
                                      <p className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
                                        {(item.chargement?.prixTotal || 0).toLocaleString()} {settings.devise}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Financial Summary for the BL */}
                            <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                               <div className="flex justify-between items-end border-b border-slate-50 dark:border-slate-800 pb-4">
                                  <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Totalité du Dossier</h4>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Équilibre Comptable</p>
                                  </div>
                                  <div className="text-right">
                                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Rendement du Dossier</p>
                                     <div className={cn(
                                       "px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest",
                                       isProfitable ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                                     )}>
                                        {isProfitable ? "Performance Optimale" : "Ajustement Requis"}
                                     </div>
                                  </div>
                               </div>
                               
                               <div className="space-y-4">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-bold uppercase text-[10px]">Revenus (Contrat Client)</span>
                                    <span className="font-mono font-black text-slate-900 dark:text-white">{group.financials.revenue.toLocaleString()} {settings.devise}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-bold uppercase text-[10px]">Charges Opérationnelles</span>
                                    <span className="font-mono font-black text-rose-500">-{group.financials.cost.toLocaleString()} {settings.devise}</span>
                                  </div>
                                  <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
                                    <span className="font-black uppercase text-[11px] text-slate-900 dark:text-white tracking-widest text-lg">Profit Net</span>
                                    <span className={cn("text-2xl font-black font-mono", isProfitable ? "text-emerald-500" : "text-rose-500")}>
                                      {group.financials.margin.toLocaleString()} {settings.devise}
                                    </span>
                                  </div>
                               </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          
          {groupedData.length === 0 && (
            <div className="py-32 text-center">
               <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                 <Filter className="w-8 h-8 text-slate-200 dark:text-slate-700" />
               </div>
               <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Aucune correspondance fiscale trouvée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FiscalCard({ 
  label, 
  value, 
  currency, 
  icon, 
  sublabel, 
  highlight 
}: { 
  label: string, 
  value: number, 
  currency?: string, 
  icon: React.ReactNode, 
  sublabel: string,
  highlight?: boolean
}) {
  return (
    <div className={cn(
      "p-8 rounded-[2.5rem] border transition-all duration-300 relative overflow-hidden group",
      highlight 
        ? "bg-slate-900 border-slate-800 shadow-2xl shadow-slate-900/20" 
        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none hover:border-blue-500/30"
    )}>
      {highlight && <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl -mr-16 -mt-16" />}
      
      <div className="flex items-center justify-between mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <div className={cn(
          "p-2.5 rounded-xl transition-transform group-hover:scale-110",
          highlight ? "bg-slate-800 text-white" : "bg-slate-50 dark:bg-slate-800"
        )}>
          {icon}
        </div>
      </div>

      <div className="space-y-1">
        <p className={cn(
          "text-3xl font-black tabular-nums tracking-tighter font-mono",
          highlight ? "text-white" : "text-slate-900 dark:text-white"
        )}>
          {value.toLocaleString()} {currency && <span className="text-xs ml-1 text-slate-400 uppercase">{currency}</span>}
        </p>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{sublabel}</p>
      </div>
    </div>
  );
}
