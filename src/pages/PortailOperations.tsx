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
    user?.email === "flotte@translog-pro.com" ? "flotte" : "partenaires",
  );
  const [activeSubTab, setActiveSubTab] = useState<"interne" | "externe">(
    "interne",
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

  // --- Partenaire Logic ---
  const groupedPartenaireData = useMemo(() => {
    const externeChargements = filteredData.filter(
      (c) => c.typeTransporteur === "externe",
    );
    const groups: { [key: string]: { dossier: any; items: any[] } } = {};

    externeChargements.forEach((ch) => {
      const dId = ch.dossierId || "unassigned";
      if (!groups[dId]) {
        groups[dId] = { dossier: ch.dossier, items: [] };
      }
      groups[dId].items.push(ch);
    });

    return Object.values(groups).sort(
      (a, b) =>
        new Date(b.dossier?.createdAt || 0).getTime() -
        new Date(a.dossier?.createdAt || 0).getTime(),
    );
  }, [filteredData]);

  // --- Flotte Logic ---
  const groupedFlotteData = useMemo(() => {
    const interneChargements = filteredData.filter(
      (c) => c.typeTransporteur === "interne",
    );
    const groups: { [key: string]: { dossier: any; items: any[] } } = {};
    interneChargements.forEach((ch) => {
      const dId = ch.dossierId || "unassigned";
      if (!groups[dId]) groups[dId] = { dossier: ch.dossier, items: [] };
      groups[dId].items.push(ch);
    });
    return Object.values(groups).sort(
      (a, b) =>
        new Date(b.dossier?.createdAt || 0).getTime() -
        new Date(a.dossier?.createdAt || 0).getTime(),
    );
  }, [filteredData]);

  const groupedExterneData = useMemo(() => {
    const externeChargements = filteredData.filter(
      (c) => c.typeTransporteur === "externe",
    );
    const groups: { [key: string]: { dossier: any; items: any[] } } = {};
    externeChargements.forEach((ch) => {
      const dId = ch.dossierId || "unassigned";
      if (!groups[dId]) groups[dId] = { dossier: ch.dossier, items: [] };
      groups[dId].items.push(ch);
    });
    return Object.values(groups).sort(
      (a, b) =>
        new Date(b.dossier?.createdAt || 0).getTime() -
        new Date(a.dossier?.createdAt || 0).getTime(),
    );
  }, [filteredData]);

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
      await updateDoc(doc(db, "chargements", assigningMission.id), {
        camionId: camionId,
        updatedAt: new Date().toISOString(),
      });
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
              onClick={() => setActiveTab("flotte")}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "flotte" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}
            >
              <Truck className="w-3.5 h-3.5" /> Flotte Interne
            </button>
            <button
              onClick={() => setActiveTab("partenaires")}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "partenaires" ? "bg-amber-500 text-slate-900 shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}
            >
              <Truck className="w-3.5 h-3.5" /> Flotte Externe
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

        {activeTab === "flotte" ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Simple Fleet Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                  Unités de Flotte
                </h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Flotte {activeSubTab === "interne" ? "en CDI" : "Partenaire"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-slate-200 dark:bg-slate-800 p-1 rounded-lg flex gap-1">
                  <button
                    onClick={() => setActiveSubTab("interne")}
                    className={`px-4 py-1.5 rounded-md font-bold text-[9px] uppercase transition-all ${activeSubTab === "interne" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500"}`}
                  >
                    Interne
                  </button>
                  <button
                    onClick={() => setActiveSubTab("externe")}
                    className={`px-4 py-1.5 rounded-md font-bold text-[9px] uppercase transition-all ${activeSubTab === "externe" ? "bg-white dark:bg-slate-700 text-amber-500 shadow-sm" : "text-slate-500"}`}
                  >
                    Externe
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowNewCamion(true);
                    setNewCamion({ ...newCamion, type: activeSubTab });
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold uppercase text-[9px] hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" /> Ajouter
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

            {/* Missions List grouped by Dossier (Condensed) */}
            <div className="space-y-4">
              {(activeSubTab === "interne"
                ? groupedFlotteData
                : groupedExterneData
              ).map((group) => (
                <div
                  key={group.dossier?.id || "unassigned"}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm"
                >
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                      #{group.dossier?.numeroBL || "SANS DOSSIER"} •{" "}
                      <span className="text-slate-500">
                        {group.dossier?.client || "Client Inconnu"}
                      </span>
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {group.items.length} unité(s)
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.items.map((miss) => {
                      const camion = camions.find(
                        (c) => c.id === miss.camionId,
                      );
                      return (
                        <div
                          key={miss.id}
                          onClick={() => setAssigningMission(miss)}
                          className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {miss.numeroConteneur}
                            </span>
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase text-slate-500 font-bold">
                              {miss.ville}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {camion ? (
                              <div className="flex items-center gap-2">
                                <Truck className="w-3 h-3 text-blue-500" />
                                <span className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">
                                  {camion.numero}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-rose-500 font-bold uppercase animate-pulse">
                                À affecter
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

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
                      activeSubTab === "interne"
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
                                    type: c.type || activeSubTab,
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
          </div>
        ) : (
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
              {groupedPartenaireData.map((group) => (
                <div
                  key={group.dossier?.id || "unassigned"}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm"
                >
                  <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/20 flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                      Dossier BL: #{group.dossier?.numeroBL || "SANS DOSSIER"}
                    </h4>
                    <span className="text-xs font-bold text-amber-600">
                      {group.items
                        .reduce(
                          (sum, item) => sum + (Number(item.prixTotal) || 0),
                          0,
                        )
                        .toLocaleString()}{" "}
                      {settings.devise}
                    </span>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[8px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                        <th className="px-4 py-2">Conteneur</th>
                        <th className="px-4 py-2">Ville</th>
                        <th className="px-4 py-2 text-right">Tarif (FCFA)</th>
                        <th className="px-4 py-2">Vecteur</th>
                        <th className="px-4 py-2 text-right">Actions</th>
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
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Nav for Portal */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2 flex justify-around items-center z-40 pb-safe">
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
          <Calendar className="w-5 h-5" />{" "}
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
                      c.type ===
                        (assigningMission.typeTransporteur === "interne"
                          ? "interne"
                          : "externe"),
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

                {camions.filter(
                  (c) =>
                    c.statut === "actif" &&
                    c.type ===
                      (assigningMission.typeTransporteur === "interne"
                        ? "interne"
                        : "externe"),
                ).length === 0 && (
                  <div className="text-center py-6 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-dotted border-slate-200 dark:border-slate-800">
                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                      Aucune unité active disponible
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
