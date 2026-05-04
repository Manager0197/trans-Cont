import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Box,
  Calendar,
  Truck,
  DollarSign,
  LogOut,
  Plus,
  Check,
  X as XIcon,
  Trash2,
  Edit2,
  LayoutDashboard,
  Shovel,
  AlertCircle,
} from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/firestore-error";
import { useAuth } from "../lib/auth";
import { useSettings } from "../hooks/useSettings";
import ConfirmModal from "../components/ConfirmModal";

export default function PortailOperations() {
  const { user, logOut } = useAuth();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState(
    user?.email === "flotte@translog-pro.com" ? "flotte" : "global",
  );

  // States for Partenaires
  const [chargements, setChargements] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [maintenances, setMaintenances] = useState<any[]>([]);

  // Advanced Filters
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [blSearch, setBlSearch] = useState("");
  const [transporteurFilter, setTransporteurFilter] = useState("all");

  // States for Flotte
  const [camions, setCamions] = useState<any[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const [showNewCamion, setShowNewCamion] = useState(false);
  const [newCamion, setNewCamion] = useState({
    numero: "",
    chauffeur: "",
    type: "interne",
  });
  const [isEditingCamion, setIsEditingCamion] = useState<string | null>(null);
  const [editCamionForm, setEditCamionForm] = useState({
    numero: "",
    chauffeur: "",
    type: "interne",
  });
  const [deleteCamionId, setDeleteCamionId] = useState<string | null>(null);

  // Assignment State
  const [assigningMission, setAssigningMission] = useState<any | null>(null);

  useEffect(() => {
    // Shared listeners
    const unsubChargementsTotal = onSnapshot(
      collection(db, "chargements"),
      (snap) => {
        setChargements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "chargements");
      },
    );

    const unsubDossiers = onSnapshot(
      collection(db, "dossiers"),
      (snap) => {
        setDossiers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "dossiers");
      },
    );

    const qCamions = query(
      collection(db, "camions"),
      orderBy("createdAt", "desc"),
    );
    const unsubCamions = onSnapshot(
      qCamions,
      (snap) => {
        setCamions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "camions");
      },
    );

    const unsubM = onSnapshot(
      collection(db, "maintenances"),
      (snap) => {
        setMaintenances(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "maintenances");
      },
    );

    return () => {
      unsubChargementsTotal();
      unsubDossiers();
      unsubCamions();
      unsubM();
    };
  }, []);

  // --- Filtering Logic ---
  const filteredData = useMemo(() => {
    let result = chargements.map((c) => ({
      ...c,
      dossier: dossiers.find((d) => d.id === c.dossierId),
    }));

    // BL Search
    if (blSearch) {
      result = result.filter(
        (c) =>
          c.dossier?.numeroBL?.toLowerCase().includes(blSearch.toLowerCase()) ||
          c.numeroConteneur?.toLowerCase().includes(blSearch.toLowerCase()),
      );
    }

    // Date Range Filter
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      result = result.filter((c) => {
        const d = new Date(c.createdAt);
        return d >= start && d <= end;
      });
    }

    return result;
  }, [chargements, dossiers, blSearch, dateRange]);

  const groupedData = useMemo(() => {
    const groups: { [key: string]: { id: string; dossier: any; items: any[] } } = {};
    
    filteredData.forEach((ch) => {
      const gId = ch.dossierId || "unassigned";
      if (!groups[gId]) {
        groups[gId] = { id: gId, dossier: ch.dossier, items: [] };
      }
      groups[gId].items.push(ch);
    });

    return Object.values(groups).sort(
      (a, b) =>
        new Date(b.dossier?.createdAt || 0).getTime() -
        new Date(a.dossier?.createdAt || 0).getTime(),
    );
  }, [filteredData]);

  const groupedPartenaireData = useMemo(() => {
    return groupedData
      .map(group => ({
        ...group,
        items: group.items.filter(item => item.typeTransporteur === "externe")
      }))
      .filter(group => group.items.length > 0);
  }, [groupedData]);

  const groupedFlotteData = useMemo(() => {
    return groupedData
      .map(group => ({
        ...group,
        items: group.items.filter(item => item.typeTransporteur !== "externe") // treat empty/undefined as interne
      }))
      .filter(group => group.items.length > 0);
  }, [groupedData]);

  const handleCreateCamion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamion.numero) return;
    try {
      await addDoc(collection(db, "camions"), {
        ...newCamion,
        statut: "actif",
        createdAt: new Date().toISOString(),
      });
      setShowNewCamion(false);
      setNewCamion({ numero: "", chauffeur: "" });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "camions");
    }
  };

  const toggleCamionStatut = async (id: string, newVal: string) => {
    try {
      await updateDoc(doc(db, "camions", id), {
        statut: newVal,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `camions/${id}`);
    }
  };

  const handleEditCamion = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "camions", id), {
        ...editCamionForm,
        updatedAt: new Date().toISOString(),
      });
      setIsEditingCamion(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `camions/${id}`);
    }
  };

  const handleDeleteCamion = async () => {
    if (!deleteCamionId) return;
    try {
      await deleteDoc(doc(db, "camions", deleteCamionId));
      setDeleteCamionId(null);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `camions/${deleteCamionId}`,
      );
    }
  };

  const handleAssignCamion = async (camionId: string) => {
    if (!assigningMission) return;
    try {
      const selectedCamion = camions.find(c => c.id === camionId);
      const updates: any = {
        camionId: camionId,
        updatedAt: new Date().toISOString(),
      };
      
      if (selectedCamion) {
        updates.typeTransporteur = selectedCamion.type === "externe" ? "externe" : "interne";
      }

      await updateDoc(doc(db, "chargements", assigningMission.id), updates);
      setAssigningMission(null);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `chargements/${assigningMission.id}`,
      );
    }
  };

  const getCamionStats = (camionId: string) => {
    const now = new Date();
    const filtered = chargements.filter((ch) => ch.camionId === camionId);
    const maintFiltered = maintenances.filter((m) => m.camionId === camionId);

    const cumulativeVolume = filtered.length;
    const monthlyActivity = filtered.filter((ch) => {
      if (!ch.dateChargement) return false;
      const d = new Date(ch.dateChargement);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    }).length;

    const ca = filtered.reduce(
      (sum, ch) => sum + (Number(ch.prixTotal) || 0),
      0,
    );
    const totalMaint = maintFiltered.reduce(
      (sum, m) => sum + (Number(m.cout) || 0),
      0,
    );
    const profitNet = ca - totalMaint;

    return { cumulativeVolume, monthlyActivity, ca, totalMaint, profitNet };
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
              <h1 className="text-base font-bold uppercase text-white tracking-tight">
                Portail <span className="text-blue-500">Opérations</span>
              </h1>
              <p className="text-[9px] font-medium uppercase tracking-widest text-slate-500">
                Gestion Logistique
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50">
            <button
              onClick={() => setActiveTab("global")}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "global" ? "bg-white text-slate-900 shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Tout
            </button>
            <button
              onClick={() => setActiveTab("flotte")}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "flotte" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}
            >
              <Truck className="w-3.5 h-3.5" /> Flotte Interne
            </button>
            <button
              onClick={() => setActiveTab("partenaires")}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "partenaires" ? "bg-amber-500 text-slate-900 shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}
            >
              <Box className="w-3.5 h-3.5" /> Flotte Externe
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => window.print()}
              className="hidden lg:flex items-center gap-2 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest no-print"
            >
              Imprimer Rapport
            </button>
            <button
              onClick={logOut}
              className="text-slate-400 hover:text-rose-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all group"
            >
              <span className="hidden sm:inline">Quitter Session</span>{" "}
              <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 pb-24">
        {/* Advanced Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full space-y-1">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest px-1">
              Filtre Date
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 font-medium text-[10px] outline-none"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
              />
              <input
                type="date"
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 font-medium text-[10px] outline-none"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex-1 w-full space-y-1">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest px-1">
              Référence BL / Conteneur
            </p>
            <input
              placeholder="Ex: MEDUZ..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 font-bold text-[10px] uppercase outline-none"
              value={blSearch}
              onChange={(e) => setBlSearch(e.target.value)}
            />
          </div>

          <button
            onClick={() => {
              setDateRange({ start: "", end: "" });
              setBlSearch("");
            }}
            className="px-4 py-1.5 text-slate-400 hover:text-rose-500 text-[9px] font-bold uppercase transition-all"
          >
            Réinitialiser
          </button>
        </div>

        {activeTab === "flotte" || activeTab === "global" ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {activeTab === "flotte" && (
              <>
                {/* Simple Fleet Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                      Unités de Flotte
                    </h2>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Effectif Propriétaire
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowNewCamion(true);
                        setNewCamion({ ...newCamion, type: "interne" });
                      }}
                      className="bg-blue-600 text-white px-5 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter
                    </button>
                  </div>
                </div>

                {showNewCamion && (
                  <form
                    onSubmit={handleCreateCamion}
                    className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4"
                  >
                    <input
                      placeholder="Immatriculation"
                      required
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-medium"
                      value={newCamion.numero}
                      onChange={(e) =>
                        setNewCamion({ ...newCamion, numero: e.target.value })
                      }
                    />
                    <input
                      placeholder="Conducteur"
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-medium"
                      value={newCamion.chauffeur}
                      onChange={(e) =>
                        setNewCamion({ ...newCamion, chauffeur: e.target.value })
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-emerald-600 text-white font-bold uppercase text-[9px] rounded-lg"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => setShowNewCamion(false)}
                        className="px-3 text-slate-400 font-bold uppercase text-[9px]"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {activeTab === "global" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-2">
                 <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Dossiers Actifs
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {groupedData.length}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Total Conteneurs
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    {filteredData.length}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Assignés
                  </p>
                  <p className="text-xl font-bold text-emerald-600">
                    {filteredData.filter(c => c.camionId).length}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    En attente
                  </p>
                  <p className="text-xl font-bold text-rose-500">
                    {filteredData.filter(c => !c.camionId).length}
                  </p>
                </div>
              </div>
            )}
                {/* Missions List grouped by Dossier (Collapsible Folders) */}
            <div className="space-y-4">
              {(activeTab === "global" 
                ? groupedData 
                : activeTab === "flotte" 
                  ? groupedFlotteData 
                  : groupedPartenaireData
              ).map((group) => {
                const isCollapsed = collapsedGroups[group.id] ?? true;
                const itemsCount = group.items.length;
                const missingUnits = group.items.some(m => !m.camionId);
                
                return (
                  <div
                    key={group.id}
                    className={`bg-white dark:bg-slate-900 border transition-all duration-300 rounded-2xl overflow-hidden ${isCollapsed ? "border-slate-200 dark:border-slate-800 shadow-sm" : "border-blue-500/30 shadow-xl dark:shadow-blue-900/10"}`}
                  >
                    <div 
                      onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.id]: !isCollapsed }))}
                      className={`px-5 py-4 cursor-pointer flex justify-between items-center transition-colors ${isCollapsed ? "bg-white dark:bg-slate-900" : "bg-blue-50/30 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/20"}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isCollapsed ? "bg-slate-100 dark:bg-slate-800 text-slate-400" : "bg-blue-600 text-white shadow-lg shadow-blue-500/30 rotate-6"}`}>
                           <Box className={`w-5 h-5 transition-transform ${isCollapsed ? "" : "-rotate-6"}`} />
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-1">
                            BL: #{group.dossier?.numeroBL || "DOSSIER SANS NUMÉRO"}
                          </h4>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                            {group.dossier?.client || "Client Inconnu"} • {itemsCount} CONTENEUR(S)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {!isCollapsed && missingUnits && (
                           <span className="text-[8px] font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-full uppercase tracking-tighter animate-pulse">
                             Assignation Requise
                           </span>
                        )}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${isCollapsed ? "text-slate-300" : "text-blue-500 rotate-180 bg-blue-100 dark:bg-blue-900/40"}`}>
                           <Plus className={`w-4 h-4 transition-transform ${isCollapsed ? "" : "rotate-45"}`} />
                        </div>
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div className="divide-y divide-slate-50 dark:divide-slate-800/50 animate-in slide-in-from-top-2 duration-200">
                        {group.items.map((miss) => {
                          const camion = camions.find(
                            (c) => c.id === miss.camionId,
                          );
                          const isInterne = miss.typeTransporteur === "interne";
                          
                          return (
                            <div
                              key={miss.id}
                              onClick={() => setAssigningMission(miss)}
                              className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-6">
                                <div className={`w-1.5 h-8 rounded-full ${isInterne ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                                <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Conteneur</p>
                                  <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                    {miss.numeroConteneur}
                                  </span>
                                </div>
                                <div className="h-8 w-px bg-slate-100 dark:bg-slate-800"></div>
                                <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Destination</p>
                                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg uppercase text-slate-600 font-black">
                                    {miss.ville}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {camion ? (
                                  <div className="flex flex-col items-end">
                                    <p className={`text-[8px] font-black ${isInterne ? 'text-blue-600' : 'text-amber-600'} uppercase tracking-[0.2em] mb-1`}>
                                      {isInterne ? 'Vecteur CDI' : 'Vecteur Externe'}
                                    </p>
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isInterne ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 border-blue-100' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 border-amber-100'}`}>
                                      <Truck className="w-3.5 h-3.5" />
                                      <span className="text-[10px] font-black uppercase">
                                        {camion.numero}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-rose-500/10 text-rose-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-rose-500/20 flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3" />
                                    Besoins d'unité
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {activeTab !== "global" && (
              <>
                {/* Fleet Status Table */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                    <th className="px-4 py-3 font-bold">Unité / Immat</th>
                    <th className="px-4 py-3 font-bold">Conducteur</th>
                    <th className="px-4 py-3 font-bold">Type</th>
                    <th className="px-4 py-3 font-bold">Statut</th>
                    <th className="px-4 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {camions
                    .filter((c) =>
                      activeTab === "flotte"
                        ? c.type !== "externe"
                        : c.type === "externe",
                    )
                    .map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/20 text-[11px] transition-colors"
                      >
                        <td className="px-4 py-3">
                          {isEditingCamion === c.id ? (
                            <input
                              className="bg-white dark:bg-slate-800 border-2 border-blue-500/50 rounded px-2 py-1 text-xs w-full font-bold outline-none"
                              value={editCamionForm.numero}
                              onChange={(e) =>
                                setEditCamionForm({
                                  ...editCamionForm,
                                  numero: e.target.value,
                                })
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" &&
                                handleEditCamion(e as any, c.id)
                              }
                              autoFocus
                            />
                          ) : (
                            <span className="font-bold text-slate-900 dark:text-white uppercase">
                              {c.numero}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditingCamion === c.id ? (
                            <input
                              className="bg-white dark:bg-slate-800 border-2 border-blue-500/50 rounded px-2 py-1 text-xs w-full font-medium outline-none"
                              value={editCamionForm.chauffeur}
                              onChange={(e) =>
                                setEditCamionForm({
                                  ...editCamionForm,
                                  chauffeur: e.target.value,
                                })
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" &&
                                handleEditCamion(e as any, c.id)
                              }
                            />
                          ) : (
                            <span className="text-slate-500 uppercase font-medium">
                              {c.chauffeur || "N/A"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditingCamion === c.id ? (
                            <select
                              className="bg-white dark:bg-slate-800 border-2 border-blue-500/50 rounded px-2 py-1 text-xs w-full font-bold outline-none cursor-pointer"
                              value={editCamionForm.type}
                              onChange={(e) =>
                                setEditCamionForm({
                                  ...editCamionForm,
                                  type: e.target.value as any,
                                })
                              }
                            >
                              <option value="interne">Interne</option>
                              <option value="externe">Externe</option>
                            </select>
                          ) : (
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${c.type === "interne" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}
                            >
                              {c.type || "Interne"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={c.statut}
                            onChange={(e) =>
                              toggleCamionStatut(c.id, e.target.value)
                            }
                            className={`text-[9px] font-bold uppercase px-2 py-1 rounded bg-transparent outline-none cursor-pointer ${
                              c.statut === "actif"
                                ? "text-emerald-600"
                                : c.statut === "panne"
                                  ? "text-rose-600"
                                  : "text-amber-600"
                            }`}
                          >
                            <option value="actif">En Circulation</option>
                            <option value="panne">Panne</option>
                            <option value="maintenance">Maintenance</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2 text-slate-400">
                            {isEditingCamion === c.id ? (
                              <button
                                onClick={(e) =>
                                  handleEditCamion(e as any, c.id)
                                }
                                className="text-emerald-500 hover:scale-110 transition-transform"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setIsEditingCamion(c.id);
                                  setEditCamionForm({
                                    numero: c.numero,
                                    chauffeur: c.chauffeur,
                                    type: c.type || (activeTab === "flotte" ? "interne" : "externe"),
                                  });
                                }}
                                className="hover:text-blue-500 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteCamionId(c.id)}
                              className="hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    ) : activeTab === "partenaires" ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Simple Grid and Tables for Partenaires */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Missions Externes
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {groupedPartenaireData.reduce(
                    (sum, g) => sum + g.items.length,
                    0,
                  )}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Total Acomptes
                </p>
                <p className="text-xl font-bold text-emerald-600">
                  {chargements
                    .filter((c) => c.typeTransporteur === "externe")
                    .reduce((sum, c) => sum + (Number(c.avance) || 0), 0)
                    .toLocaleString()}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Solde à Payer
                </p>
                <p className="text-xl font-bold text-amber-600">
                  {(
                    chargements
                      .filter((c) => c.typeTransporteur === "externe")
                      .reduce((sum, c) => sum + (Number(c.prixTotal) || 0), 0) -
                    chargements
                      .filter((c) => c.typeTransporteur === "externe")
                      .reduce((sum, c) => sum + (Number(c.avance) || 0), 0)
                  ).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {groupedPartenaireData.map((group) => {
                const isCollapsed = collapsedGroups[group.id] ?? true;
                return (
                  <div
                    key={group.id}
                    className={`bg-white dark:bg-slate-900 border transition-all duration-300 rounded-2xl overflow-hidden ${isCollapsed ? "border-slate-200 dark:border-slate-800 shadow-sm" : "border-amber-500/30 shadow-xl dark:shadow-amber-900/10"}`}
                  >
                    <div 
                      onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.id]: !isCollapsed }))}
                      className={`px-5 py-4 cursor-pointer flex justify-between items-center transition-colors ${isCollapsed ? "bg-white dark:bg-slate-900" : "bg-amber-50/30 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/20"}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isCollapsed ? "bg-slate-100 dark:bg-slate-800 text-slate-400" : "bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 rotate-6"}`}>
                           <Box className={`w-5 h-5 transition-transform ${isCollapsed ? "" : "-rotate-6"}`} />
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-1">
                            BL: #{group.dossier?.numeroBL || "DOSSIER SANS NUMÉRO"}
                          </h4>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                            {group.dossier?.client || "Client Inconnu"} • {group.items.reduce((sum, item) => sum + (Number(item.prixTotal) || 0), 0).toLocaleString()} {settings.devise}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${isCollapsed ? "text-slate-300" : "text-amber-500 rotate-180 bg-amber-100 dark:bg-amber-900/40"}`}>
                           <Plus className={`w-4 h-4 transition-transform ${isCollapsed ? "" : "rotate-45"}`} />
                        </div>
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div className="animate-in slide-in-from-top-2 duration-200">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                              <th className="px-6 py-3">Conteneur</th>
                              <th className="px-6 py-3">Ville</th>
                              <th className="px-6 py-3 text-right">Tarif (FCFA)</th>
                              <th className="px-6 py-3">Vecteur</th>
                              <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {group.items.map((miss) => (
                              <MissionRow
                                key={miss.id}
                                miss={miss}
                                camions={camions}
                                setAssigningMission={setAssigningMission}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </main>

      {/* Mobile Nav for Portal */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2 flex justify-around items-center z-40 pb-safe">
        <button
          onClick={() => setActiveTab("global")}
          className={`flex flex-col items-center gap-1 p-2 ${activeTab === "global" ? "text-white" : "text-slate-500"}`}
        >
          <LayoutDashboard className="w-5 h-5" />{" "}
          <span className="text-[8px] font-black uppercase">Tout</span>
        </button>
        <button
          onClick={() => setActiveTab("flotte")}
          className={`flex flex-col items-center gap-1 p-2 ${activeTab === "flotte" ? "text-blue-500" : "text-slate-500"}`}
        >
          <Truck className="w-5 h-5" />{" "}
          <span className="text-[8px] font-black uppercase">Flotte</span>
        </button>
        <button
          onClick={() => setActiveTab("partenaires")}
          className={`flex flex-col items-center gap-1 p-2 ${activeTab === "partenaires" ? "text-amber-500" : "text-slate-500"}`}
        >
          <Box className="w-5 h-5" />{" "}
          <span className="text-[8px] font-black uppercase">Missions</span>
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

      {/* Assignment Modal */}
      {assigningMission && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setAssigningMission(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <div>
                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-1">
                  Assignation Unité
                </p>
                <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                  Conteneur : {assigningMission.numeroConteneur}
                </h3>
              </div>
              <button
                onClick={() => setAssigningMission(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <XIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Sélectionner un transporteur (
                {assigningMission.typeTransporteur}) :
              </p>
              <div className="grid grid-cols-1 gap-2">
                {camions
                  .filter(
                    (c) =>
                      c.statut === "actif" &&
                      (assigningMission.typeTransporteur === "interne" 
                        ? c.type !== "externe" 
                        : c.type === "externe"),
                  )
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleAssignCamion(c.id)}
                      className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/30 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.type === "interne" ? "bg-blue-600" : "bg-amber-500"} text-white`}
                        >
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white uppercase text-sm leading-none">
                            {c.numero}
                          </p>
                          <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-1">
                            {c.chauffeur || "Sans chauffeur"}
                          </p>
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                    </button>
                  ))}

                {/* Formulaire d'ajout rapide pour saisie directe (Parfait pour l'externe) */}
                <div className="mt-4 p-6 bg-slate-50 dark:bg-slate-950/40 rounded-[1.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">
                        Saisie Directe (Nouveau Véhicule)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input 
                          type="text" 
                          placeholder="IMMATRICULATION (Ex: AA-000-XX)" 
                          id="quick_numero"
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                        <input 
                          type="text" 
                          placeholder="Chauffeur (Optionnel)" 
                          id="quick_chauffeur"
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={async (e) => {
                        const target = e.currentTarget;
                        const numInput = document.getElementById('quick_numero') as HTMLInputElement;
                        const chaufInput = document.getElementById('quick_chauffeur') as HTMLInputElement;
                        const num = numInput.value;
                        const chauf = chaufInput.value;
                        
                        if (!num) return;
                        
                        target.disabled = true;
                        try {
                          const docRef = await addDoc(collection(db, "camions"), {
                            numero: num.trim().toUpperCase(),
                            chauffeur: chauf.trim() || "Chauffeur Externe",
                            type: assigningMission.typeTransporteur,
                            statut: "actif",
                            createdAt: new Date().toISOString()
                          });
                          handleAssignCamion(docRef.id);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          target.disabled = false;
                        }
                      }}
                      className="bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
                    >
                      Confirmer & Assigner l'unité
                    </button>
                  </div>
                </div>

                <div className="mt-8 mb-4 flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ou choisir une unité existante</span>
                  <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                </div>

                {camions.filter(
                  (c) =>
                    c.statut === "actif" &&
                    (assigningMission.typeTransporteur === "interne"
                      ? c.type !== "externe"
                      : c.type === "externe"),
                ).length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-slate-400 font-bold uppercase text-[8px] tracking-widest italic">
                      Aucun véhicule pré-enregistré dans la liste
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => handleAssignCamion("")}
                className="px-4 py-2 text-rose-500 font-bold uppercase text-[9px] tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition-all"
              >
                Désaffecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCardPartenaire({
  label,
  value,
  icon: Icon,
  color,
  highlight = false,
}: any) {
  const colors: any = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600",
  };
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 ${highlight ? "ring-1 ring-amber-500/30" : ""}`}
    >
      <div
        className={`p-2.5 rounded-lg ${colors[color] || colors.blue} shrink-0`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">
          {label}
        </p>
        <h3 className="text-base font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
          {value}
        </h3>
      </div>
    </div>
  );
}

function StatRow({ label, value, sub, highlight = false }: any) {
  return (
    <div className="p-4 sm:border-r sm:last:border-r-0 border-b sm:border-b-0 last:border-b-0 border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
      <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
        {label}
      </p>
      <p
        className={`text-base font-bold tabular-nums ${highlight ? "text-blue-600" : "text-slate-900 dark:text-white"}`}
      >
        {value}
      </p>
      <p className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-normal mt-1">
        {sub}
      </p>
    </div>
  );
}

function MissionRow({
  miss,
  camions,
  setAssigningMission,
}: any) {
  const [isEditingMission, setIsEditingMission] = useState(false);
  const [editMissionForm, setEditMissionForm] = useState({
    ville: miss.ville,
    prixTotal: miss.prixTotal,
  });
  const camion = camions.find((c) => c.id === miss.camionId);

  const saveMission = async () => {
    try {
      await updateDoc(doc(db, "chargements", miss.id), {
        ...editMissionForm,
        updatedAt: new Date().toISOString(),
      });
      setIsEditingMission(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chargements/${miss.id}`);
    }
  };

  return (
    <tr
      key={miss.id}
      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-[11px] transition-colors"
    >
      <td
        className="px-4 py-3 font-bold text-slate-900 dark:text-white uppercase cursor-pointer"
        onClick={() => setAssigningMission(miss)}
      >
        {miss.numeroConteneur}
      </td>
      <td className="px-4 py-3">
        {isEditingMission ? (
          <input
            className="bg-white dark:bg-slate-800 border rounded px-1.5 py-0.5 text-[10px] w-24 outline-none border-blue-500/50 uppercase"
            value={editMissionForm.ville}
            onChange={(e) =>
              setEditMissionForm({ ...editMissionForm, ville: e.target.value })
            }
          />
        ) : (
          <span className="text-slate-500 font-medium uppercase">
            {miss.ville}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {isEditingMission ? (
          <input
            type="number"
            className="bg-white dark:bg-slate-800 border rounded px-1.5 py-0.5 text-[10px] w-20 outline-none border-blue-500/50 text-right"
            value={editMissionForm.prixTotal}
            onChange={(e) =>
              setEditMissionForm({
                ...editMissionForm,
                prixTotal: e.target.value,
              })
            }
          />
        ) : (
          <span className="font-bold text-amber-600">
            {(Number(miss.prixTotal) || 0).toLocaleString()}
          </span>
        )}
      </td>
      <td
        className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300 uppercase cursor-pointer"
        onClick={() => setAssigningMission(miss)}
      >
        {camion ? (
          camion.numero
        ) : (
          <span className="text-rose-500 animate-pulse">À affecter</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {isEditingMission ? (
            <button
              onClick={saveMission}
              className="text-emerald-500 hover:scale-110"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setIsEditingMission(true)}
              className="text-slate-400 hover:text-blue-500"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setAssigningMission(miss)}
            className="text-slate-400 hover:text-blue-500"
          >
            <Truck className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
