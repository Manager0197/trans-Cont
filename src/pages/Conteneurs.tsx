import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Search, Box, Truck, FolderOpen, Calendar, Plus, X, Trash2 } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/firestore-error";
import { cn } from "../lib/utils";
import ConfirmModal from "../components/ConfirmModal";

export default function Conteneurs() {
  const [conteneurs, setConteneurs] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [chargements, setChargements] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch all containers
    const unsubConteneurs = onSnapshot(query(collection(db, "conteneurs"), orderBy("createdAt", "desc")), (snap) => {
      setConteneurs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "conteneurs");
    });

    // Fetch dossiers for mapping names/BL
    const unsubDossiers = onSnapshot(collection(db, "dossiers"), (snap) => {
      setDossiers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "dossiers");
    });

    // Fetch chargements to see transport info
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

  const filteredConteneurs = useMemo(() => {
    return conteneurs.filter(c => {
      const matchesSearch = c.numero?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || c.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [conteneurs, searchTerm, typeFilter]);

  const stats = useMemo(() => {
    return {
      total: conteneurs.length,
      c20: conteneurs.filter(c => c.type === "20'").length,
      c40: conteneurs.filter(c => c.type === "40'").length,
      other: conteneurs.filter(c => c.type !== "20'" && c.type !== "40'").length
    };
  }, [conteneurs]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, "conteneurs", deleteId));
      setDeleteId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `conteneurs/${deleteId}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter font-display">
            Mémoire <span className="text-blue-600">Logistique</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Registre centralisé des unités scellées (EVP) et cycle de vie</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard label="Unités Totales" value={stats.total} icon={<Box className="w-6 h-6" />} color="bg-blue-600 shadow-blue-500/20" />
        <SummaryCard label="Conteneurs 20'" value={stats.c20} icon={<Box className="w-6 h-6" />} color="bg-emerald-600 shadow-emerald-500/10" />
        <SummaryCard label="Conteneurs 40'" value={stats.c40} icon={<Box className="w-6 h-6" />} color="bg-amber-600 shadow-amber-500/10" />
        <SummaryCard label="Hors Garabits" value={stats.other} icon={<Box className="w-6 h-6" />} color="bg-slate-800 shadow-slate-500/10" />
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-8 transition-colors">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="Rechercher par matricule conteneur..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-900 dark:text-white"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
          </div>
          <select 
            className="md:w-64 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-900 dark:text-white"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="all">Tous les formats</option>
            <option value="20'">Standard 20'</option>
            <option value="40'">High Cube 40'</option>
            <option value="Autre">Autres formats</option>
          </select>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">
                  <th className="pb-6 pt-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">Unité / Matricule</th>
                  <th className="pb-6 pt-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">Dossier BL Associé</th>
                  <th className="pb-6 pt-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">Vecteur Logistique</th>
                  <th className="pb-6 pt-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4 text-center">Statut Expédition</th>
                  <th className="pb-6 pt-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4 text-right pr-6">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredConteneurs.map(c => {
                const dossier = dossiers.find(d => d.id === c.dossierId);
                const chargement = chargements.find(ch => ch.conteneurId === c.id);
                
                return (
                  <tr key={c.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors whitespace-nowrap">
                    <td className="py-6 px-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 duration-300 ${c.type === "20'" ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                          <Box className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg">{c.numero || "NP-ALPHA"}</p>
                             <div className="flex flex-col text-[8px] font-black leading-none text-slate-400 uppercase tracking-tighter">
                               <span>DÉPART : {new Date(c.createdAt).toLocaleDateString('fr-FR')}</span>
                               <span>À : {new Date(c.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                             </div>
                          </div>
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{c.type} Pieds</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-4 font-black">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                         <FolderOpen className="w-4 h-4 text-blue-500" />
                         {dossier ? `BL #${dossier.numeroBL}` : 'NON ASSIGNÉ'}
                      </div>
                    </td>
                    <td className="py-6 px-4">
                      {chargement ? (
                        <div className="flex items-center gap-3 text-slate-900 dark:text-white font-black text-sm uppercase tracking-tight">
                          <div className={cn("w-2 h-2 rounded-full", chargement.typeTransporteur === 'interne' ? "bg-emerald-500" : "bg-amber-500")} />
                          <span>{chargement.typeTransporteur === 'interne' ? 'Flotte Interne' : chargement.nomTransporteurExterne}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 font-bold text-[10px] uppercase tracking-widest">En attente d'engagement</span>
                      )}
                    </td>
                    <td className="py-6 px-4 text-center">
                       <span className={cn(
                         "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                         chargement ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                       )}>
                         {chargement ? 'EN COURS' : 'DISPONIBLE'}
                       </span>
                    </td>
                    <td className="py-6 px-4 text-right pr-6">
                       <button 
                         onClick={() => setDeleteId(c.id)}
                         className="p-3 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/10 rounded-xl transition-all shadow-sm group/del"
                         title="Retirer"
                       >
                         <Trash2 className="w-5 h-5 transition-transform group-hover/del:scale-110" />
                       </button>
                    </td>
                  </tr>
                );
              })}
              {filteredConteneurs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <p className="text-slate-400 font-bold">Aucune unité répertoriée dans le registre.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Retrait d'Unité Physique"
        message="Attention : la suppression d'un conteneur du registre est irréversible. Notez que cela n'effacera pas le dossier BL associé, mais l'unité ne sera plus comptabilisée dans l'inventaire."
        confirmText="Supprimer définitivement"
      />
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center justify-between group hover:border-blue-500/30 transition-all duration-300">
      <div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">{label}</p>
        <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{value}</p>
      </div>
      <div className={cn("p-4 rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110", color)}>
        {icon}
      </div>
    </div>
  );
}


