import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, where, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Plus, ChevronDown, ChevronUp, Truck, FolderOpen, Search, Trash2, Edit2, Check, X as XIcon, Box, CheckCircle2, DollarSign, ShieldCheck, UserCircle } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/firestore-error";
import ConfirmModal from "../components/ConfirmModal";
import { cn } from "../lib/utils";
import { useAuth } from "../lib/auth";

import { useSettings } from "../hooks/useSettings";

export default function Dossiers() {
  const { settings } = useSettings();
  const { role } = useAuth();
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [camions, setCamions] = useState<any[]>([]);
  const [partenaires, setPartenaires] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newDossier, setNewDossier] = useState<{numeroBL: string, client: string, nbConteneurs: number | string, prixContrat: number | string}>({ numeroBL: "", client: "", nbConteneurs: 1, prixContrat: 0 });
  const [newConteneurs, setNewConteneurs] = useState([{ id: Math.random(), numero: '', type: "20'", transport: 'interne', prix: 0, avance: 0 }]);

  const DEFAULT_PRICES: any = useMemo(() => ({
    interne: { "20'": 0, "40'": 0 },
    externe: { "20'": 0, "40'": 0 }
  }), [settings]);

  const handleNbConteneursChange = (valStr: string) => {
    if (valStr === "") {
      setNewDossier(prev => ({ ...prev, nbConteneurs: "" }));
      return;
    }
    let val = parseInt(valStr);
    if (isNaN(val) || val < 1) val = 1;
    setNewDossier(prev => ({ ...prev, nbConteneurs: val }));
    setNewConteneurs(prev => {
      const arr = [...prev];
      while (arr.length < val) {
        arr.push({ 
          id: Math.random(), 
          numero: '', 
          type: "20'", 
          transport: 'interne', 
          prix: 0, 
          avance: 0 
        });
      }
      if (arr.length > val) arr.length = val;
      return arr;
    });
  };

  useEffect(() => {
    const q = query(collection(db, "dossiers"), orderBy("createdAt", "desc"));
    const unsubD = onSnapshot(q, (snap) => {
      setDossiers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "dossiers");
    });

    const unsubC = onSnapshot(collection(db, "camions"), snap => {
      setCamions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "camions");
    });

    return () => { unsubD(); unsubC(); };
  }, []);

  const filteredDossiers = useMemo(() => {
    return dossiers.filter(d => {
      const matchesSearch = d.numeroBL.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || d.statut === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [dossiers, searchTerm, statusFilter]);

  const totalPrevCost = useMemo(() => newConteneurs.reduce((acc, c) => acc + (Number(c.prix) || 0), 0), [newConteneurs]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDossier.numeroBL) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const docRef = await addDoc(collection(db, "dossiers"), {
        numeroBL: newDossier.numeroBL,
        client: newDossier.client || "",
        nbConteneurs: Number(newDossier.nbConteneurs) || 0,
        prixContrat: Number(newDossier.prixContrat) || 0,
        statut: "en_cours",
        statutPaiementClient: "non_paye",
        dateCreation: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Create units AND initiate chargement records
      const promises = newConteneurs.map(async (c) => {
        try {
          const contRef = await addDoc(collection(db, "conteneurs"), {
            dossierId: docRef.id,
            numero: c.numero || "EN ATTENTE",
            type: c.type,
            typeTransport: c.transport,
            statut: "en_attente",
            createdAt: new Date().toISOString()
          });

          return await addDoc(collection(db, "chargements"), {
            dossierId: docRef.id,
            conteneurId: contRef.id,
            numeroConteneur: c.numero || "EN ATTENTE",
            typeTransporteur: c.transport,
            prixTotal: Number(c.prix) || 0,
            avance: Number(c.avance) || 0,
            solde: (Number(c.prix) || 0) - (Number(c.avance) || 0),
            statutPaiement: (Number(c.prix) - Number(c.avance)) <= 0 ? "paye" : "non_paye",
            statutApprobation: role === 'secretaria' ? "valide" : "en_attente",
            dateChargement: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } catch (subErr) {
          console.error("Erreur détaillée lors de la création d'un chargement/conteneur:", subErr);
          throw subErr;
        }
      });

      await Promise.all(promises);

      setSaveSuccess(true);
      setTimeout(() => {
        setShowNew(false);
        setSaveSuccess(false);
        setNewDossier({ numeroBL: "", client: "", nbConteneurs: 1, prixContrat: "" });
        setNewConteneurs([{ id: Math.random(), numero: '', type: "20'", transport: 'interne', prix: 0, avance: 0 }]);
      }, 1500);
    } catch (err) {
      console.error("Erreur d'enregistrement:", err);
      handleFirestoreError(err, OperationType.CREATE, "dossiers");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter font-display">
            Point d'Entrée <span className="text-blue-600">Numérique</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Gestion et ingestion matricielle des dossiers connaissements (BL)</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button 
            onClick={() => setShowNew(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> Nouveau Dossier
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 transition-colors">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Recherche par N° BL..." 
            className="w-full pl-10 pr-4 py-3 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold placeholder:text-slate-400 dark:placeholder:text-slate-600"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <div className="absolute left-3.5 top-3.5 text-slate-400">
            <Search className="w-5 h-5" />
          </div>
        </div>
        <select 
          className="w-full border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">Tous les statuts opérationnels</option>
          <option value="en_cours">En cours (Flux Ouvert)</option>
          <option value="cloture">Clôturé (Archives)</option>
        </select>
        <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest">
          <Truck className="w-4 h-4 text-blue-500" />
          <span>{filteredDossiers.length} Unités logiques</span>
        </div>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="bg-slate-900 p-6 sm:p-8 rounded-[2rem] shadow-xl flex flex-col gap-8 animate-in fade-in slide-in-from-top-4 duration-300 border border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="w-full">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Numéro de BL</label>
              <input 
                type="text" 
                placeholder="Ex: #2024-045"
                required
                className="w-full bg-slate-950 text-white border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 font-bold"
                value={newDossier.numeroBL}
                onChange={e => setNewDossier({...newDossier, numeroBL: e.target.value})}
              />
            </div>
            <div className="w-full">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Client</label>
              <input 
                type="text" 
                placeholder="Ex: TRANS-AFRIQUE"
                className="w-full bg-slate-950 text-white border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 font-bold"
                value={newDossier.client}
                onChange={e => setNewDossier({...newDossier, client: e.target.value})}
              />
            </div>
            {role === 'secretaria' && (
              <div className="w-full">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Vente Dossier (BL) ({settings.devise})</label>
                <input 
                  type="number" 
                  placeholder="Ex: 500000"
                  required
                  className="w-full bg-slate-950 text-white border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 font-bold"
                  value={newDossier.prixContrat}
                  onFocus={e => e.target.select()}
                  onChange={e => setNewDossier({...newDossier, prixContrat: parseInt(e.target.value) || 0})}
                />
              </div>
            )}
            <div className="w-full">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre de conteneurs</label>
                <div className="text-[10px] font-black text-blue-500 uppercase">
                  Volume: {newConteneurs.reduce((acc, c) => acc + (c.type === "40'" ? 2 : 1), 0)} EVP
                </div>
              </div>
              <input 
                type="number" 
                min="1"
                required
                className="w-full bg-slate-950 text-white border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                value={newDossier.nbConteneurs}
                onFocus={(e) => e.target.select()}
                onChange={e => handleNbConteneursChange(e.target.value)}
              />
            </div>
            <div className="w-full">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Coût Total Prévu (Estimation)</label>
              <div className="relative">
                <div className="w-full bg-slate-900 text-blue-400 border border-slate-800 rounded-xl px-4 py-3 font-black text-xl flex items-center justify-between">
                   <span>{totalPrevCost.toLocaleString()}</span>
                   <span className="text-[10px] text-slate-500 uppercase">{settings.devise}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-500" /> Planification des coûts (Dépenses prévues)
              </h4>
            </div>
            <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300 min-w-[900px]">
                <thead className="bg-slate-900 border-b border-slate-800 text-xs uppercase font-bold text-slate-500 whitespace-nowrap">
                  <tr>
                    <th className="px-4 py-4 w-16 text-center">N°</th>
                    <th className="px-4 py-4">ID Conteneur</th>
                    <th className="px-4 py-4 w-32">Taille</th>
                    <th className="px-4 py-4 w-40">Transport</th>
                    <th className="px-4 py-4 w-32">Montant ({settings.devise})</th>
                    <th className="px-4 py-4 w-32">Avance ({settings.devise})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {newConteneurs.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-slate-900/50 transition-colors whitespace-nowrap">
                      <td className="px-4 py-3 text-center font-black text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          placeholder="ID / Scellé"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg px-3 py-2 text-white outline-none transition-all uppercase font-mono text-xs"
                          value={c.numero}
                          onChange={e => {
                            const updated = [...newConteneurs];
                            updated[idx].numero = e.target.value.toUpperCase();
                            setNewConteneurs(updated);
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select 
                          className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg px-2 py-2 text-white outline-none transition-all text-xs font-bold"
                          value={c.type}
                          onChange={e => {
                            const updated = [...newConteneurs];
                            const newType = e.target.value;
                            updated[idx].type = newType;
                            // updated[idx].prix = DEFAULT_PRICES[updated[idx].transport][newType]; // Supprimé pour garder à 0 par défaut
                            setNewConteneurs(updated);
                          }}
                        >
                          <option value="20'">20 Pieds</option>
                          <option value="40'">40 Pieds</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select 
                          className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg px-2 py-2 text-white outline-none transition-all text-xs font-bold"
                          value={c.transport}
                          onChange={e => {
                            const updated = [...newConteneurs];
                            const newTransport = e.target.value;
                            updated[idx].transport = newTransport;
                            // updated[idx].prix = DEFAULT_PRICES[newTransport][updated[idx].type]; // Supprimé pour garder à 0 par défaut
                            setNewConteneurs(updated);
                          }}
                        >
                          <option value="interne">Interne</option>
                          <option value="externe">Externe</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg px-3 py-2 text-white outline-none transition-all font-bold text-xs"
                          value={c.prix}
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            const updated = [...newConteneurs];
                            updated[idx].prix = parseInt(e.target.value) || 0;
                            setNewConteneurs(updated);
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg px-3 py-2 text-white outline-none transition-all font-bold text-xs"
                          value={c.avance}
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            const updated = [...newConteneurs];
                            updated[idx].avance = parseInt(e.target.value) || 0;
                            setNewConteneurs(updated);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 text-sm font-bold">
            <button type="button" onClick={() => setShowNew(false)} className="px-6 py-3 text-slate-400 hover:text-white transition-colors" disabled={isSaving}>
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className={`text-white px-10 py-3 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2 ${saveSuccess ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}
            >
              {isSaving ? (
                <>Enregistrement en cours...</>
              ) : saveSuccess ? (
                <><Check className="w-5 h-5" /> Dossier Créé !</>
              ) : (
                <>Créer le dossier et les unités</>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {filteredDossiers.map(dossier => (
          <DossierCard key={dossier.id} dossier={dossier} camions={camions} />
        ))}
        {filteredDossiers.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-100">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
               <FolderOpen className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Moteur d'investigation : Aucun résultat</h3>
            <p className="text-slate-500 font-medium">Afin d'obtenir des résultats, vérifiez les critères de recherche.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface DossierCardProps {
  dossier: any;
  camions: any[];
  key?: any;
}

function DossierCard({ dossier, camions }: DossierCardProps) {
  const { settings } = useSettings();
  const { role } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [conteneurs, setConteneurs] = useState<any[]>([]);
  const [chargements, setChargements] = useState<any[]>([]);

  useEffect(() => {
    const unsubC = onSnapshot(query(collection(db, "conteneurs"), where("dossierId", "==", dossier.id)), snap => {
      setConteneurs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "conteneurs");
    });
    
    const unsubCh = onSnapshot(query(collection(db, "chargements"), where("dossierId", "==", dossier.id)), snap => {
      setChargements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "chargements");
    });

    return () => { unsubC(); unsubCh(); };
  }, [dossier.id]);

  const toggleStatus = async () => {
    try {
      await updateDoc(doc(db, "dossiers", dossier.id), {
        statut: dossier.statut === "en_cours" ? "cloture" : "en_cours",
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `dossiers/${dossier.id}`);
    }
  };

  const handleDeleteDossier = async () => {
    try {
      // Clean up associated conteneurs and chargements in parallel to prevent leaving orphans
      const deleteConteneursPromises = conteneurs.map(c => deleteDoc(doc(db, "conteneurs", c.id)));
      const deleteChargementsPromises = chargements.map(ch => deleteDoc(doc(db, "chargements", ch.id)));
      
      await Promise.all([...deleteConteneursPromises, ...deleteChargementsPromises]);
      await deleteDoc(doc(db, "dossiers", dossier.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `dossiers/${dossier.id}`);
    }
  };

  const handleDeleteChargement = async () => {
    if (!deleteChargementData) return;
    try {
      await deleteDoc(doc(db, "chargements", deleteChargementData.id));
      if (deleteChargementData.conteneurId) {
        await deleteDoc(doc(db, "conteneurs", deleteChargementData.conteneurId));
      }
      setDeleteChargementData(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `chargements/${deleteChargementData.id}`);
    }
  };

  const togglePaiementStatus = async () => {
    try {
      await updateDoc(doc(db, "dossiers", dossier.id), {
        statutPaiementClient: dossier.statutPaiementClient === "paye" ? "non_paye" : "paye",
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `dossiers/${dossier.id}`);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    numeroBL: dossier.numeroBL,
    client: dossier.client || "",
    nbConteneurs: dossier.nbConteneurs,
    prixContrat: dossier.prixContrat
  });
  const [showDeleteDossier, setShowDeleteDossier] = useState(false);
  const [deleteChargementData, setDeleteChargementData] = useState<{id: string, conteneurId?: string} | null>(null);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "dossiers", dossier.id), {
        ...editForm,
        updatedAt: new Date().toISOString()
      });
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `dossiers/${dossier.id}`);
    }
  };

  const stats = useMemo(() => {
    const totalChargements = chargements.length;
    const totalPrix = chargements.filter(ch => ch.statutApprobation !== 'rejete').reduce((sum, ch) => sum + (Number(ch.prixTotal) || 0), 0);
    const totalAvance = chargements.filter(ch => ch.statutApprobation !== 'rejete').reduce((sum, ch) => sum + (Number(ch.avance) || 0), 0);
    const totalSolde = chargements.filter(ch => ch.statutApprobation !== 'rejete').reduce((sum, ch) => sum + (Number(ch.solde) || 0), 0);
    const hasPending = chargements.some(ch => ch.statutApprobation === 'en_attente');
    const progress = (totalChargements / (Number(dossier.nbConteneurs) || 1)) * 100;
    const marge = (Number(dossier.prixContrat) || 0) - totalPrix;
    
    return {
      totalChargements,
      totalPrix,
      totalAvance,
      totalSolde,
      marge,
      progress: Math.min(progress, 100),
      isComplete: totalChargements >= (Number(dossier.nbConteneurs) || 1)
    };
  }, [chargements, dossier.nbConteneurs, dossier.prixContrat]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden transition-all hover:border-blue-500/30 group">
      <div 
        className="p-6 sm:p-8 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className={`p-4 sm:p-5 rounded-2xl flex-shrink-0 transition-transform group-hover:scale-110 duration-300 ${dossier.statut === 'en_cours' ? 'bg-blue-600/10 text-blue-600 border border-blue-600/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
              <FolderOpen className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                {isEditing ? (
                  <form onSubmit={handleEdit} className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input 
                      type="text" 
                      className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-sm font-bold text-slate-900 dark:text-white"
                      value={editForm.numeroBL}
                      onChange={e => setEditForm({...editForm, numeroBL: e.target.value})}
                      autoFocus
                    />
                    <button type="submit" className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600">
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <>
                    <h3 className="text-base sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate max-w-[120px] sm:max-w-none">BL #{dossier.numeroBL}</h3>
                    <div className="flex flex-col text-[8px] font-black leading-tight">
                       <span className="text-blue-600 dark:text-blue-400 uppercase truncate max-w-[150px]">{dossier.client && dossier.client !== "Client Inconnu" ? dossier.client : "Client non spécifié"}</span>
                       <span className="text-slate-400 dark:text-slate-500">{new Date(dossier.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {role === 'secretaria' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                        className="p-1.5 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
                <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] shadow-sm whitespace-nowrap ${dossier.statut === 'en_cours' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {dossier.statut === 'en_cours' ? 'Flux Ouvert' : 'Clôturé'}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Plan de charge : <span className="text-blue-600">{stats.totalChargements}</span> / {isEditing ? (
                  <input 
                    type="number" 
                    className="w-12 bg-transparent border-b border-blue-500/30 text-blue-600 focus:outline-none"
                    value={editForm.nbConteneurs}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setEditForm({...editForm, nbConteneurs: parseInt(e.target.value)})}
                  />
                ) : dossier.nbConteneurs} conteneurs
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            {role === 'secretaria' && (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowDeleteDossier(true); }}
                className="p-3 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-xl transition-all shadow-sm"
                title="Supprimer définitivement"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <div className="hidden lg:block w-48">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                <span>Progression</span>
                <span>{Math.round(stats.progress)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${stats.isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
                  style={{ width: `${stats.progress}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </div>

        {/* Mobile Mini Progress Bar */}
        <div className="mt-4 lg:hidden h-1 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${stats.isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
            style={{ width: `${stats.progress}%` }}
          />
        </div>
      </div>

      {expanded && (
        <div className="p-6 sm:p-10 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 transition-colors">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="lg:col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Client</label>
              {isEditing ? (
                 <input 
                   type="text" 
                   className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-sm font-bold text-slate-900 dark:text-white"
                   value={editForm.client}
                   onChange={e => setEditForm({...editForm, client: e.target.value})}
                 />
              ) : (
                <p className="font-bold text-slate-900 dark:text-white px-1">{dossier.client && dossier.client !== "Client Inconnu" ? dossier.client : "Client non spécifié"}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative group/edit">
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-4">Vente Dossier (BL)</p>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-base font-black text-slate-900 dark:text-white"
                    value={editForm.prixContrat}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setEditForm({...editForm, prixContrat: parseInt(e.target.value) || 0})}
                  />
                  <span className="text-[10px] font-bold text-slate-400">{settings.devise}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{(Number(dossier.prixContrat) || 0).toLocaleString()} {settings.devise}</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                    className="p-1.5 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-1">
               <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-4">Ouverture Dossier</p>
               <p className="text-sm font-black text-slate-900 dark:text-white uppercase tabular-nums">
                 {new Date(dossier.createdAt).toLocaleDateString('fr-FR')}
               </p>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 à {new Date(dossier.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
               </p>
            </div>
            {role === 'secretaria' && (
              <>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-4">Dépenses Logistiques</p>
                  <p className="text-xl font-black text-rose-500 tabular-nums">{stats.totalPrix.toLocaleString()} {settings.devise}</p>
                  {stats.hasPending && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-600 text-[8px] font-black uppercase rounded-full border border-amber-200">
                      <ShieldCheck className="w-2.5 h-2.5" /> Approbation en attente
                    </div>
                  )}
                </div>
                <div 
                  className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-help hover:border-blue-500/50 transition-all group/avance"
                  title="Modifier les avances directement dans le tableau des chargements"
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Avances Décaissées</p>
                    <div className="p-1 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                      <Edit2 className="w-2.5 h-2.5 text-blue-500" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-blue-500 tabular-nums">{stats.totalAvance.toLocaleString()} {settings.devise}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-2 italic">Géré par transaction</p>
                </div>
                <div className="bg-slate-950 p-6 rounded-2xl border border-blue-500/20 shadow-lg shadow-blue-500/10">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Profitabilité (NETTE)</p>
                  <p className={`text-xl font-black tabular-nums transition-colors ${stats.marge >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stats.marge.toLocaleString()} {settings.devise}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-blue-600 rounded-full" />
              <h4 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tighter">Manifeste d'Expédition</h4>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {role === 'secretaria' && (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); togglePaiementStatus(); }} 
                    className={cn(
                      "flex-1 sm:flex-none text-[10px] px-4 py-2 rounded-lg font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2",
                      dossier.statutPaiementClient === "paye" 
                        ? "bg-emerald-500 text-white hover:bg-emerald-600" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    {dossier.statutPaiementClient === "paye" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                    {dossier.statutPaiementClient === "paye" ? "Dossier Soldé" : "Marquer Soldé"}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleStatus(); }} 
                    className="flex-1 sm:flex-none text-xs px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 bg-white font-medium shadow-sm transition-colors"
                  >
                    {dossier.statut === 'en_cours' ? 'Clôturer Dossier' : 'Réouvrir Dossier'}
                  </button>
                </>
              )}
              <div className="flex-1 sm:flex-none">
                <AddChargementModal dossier={dossier} camions={camions} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="whitespace-nowrap">
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-4 px-4 font-black uppercase text-slate-400 tracking-wider">Date/Heure</th>
                    <th className="py-4 px-4 font-black uppercase text-slate-400 tracking-wider">Unité / EVP</th>
                    <th className="py-4 px-4 font-black uppercase text-slate-400 tracking-wider">Vecteur / Camion</th>
                    <th className="py-4 px-4 font-black uppercase text-slate-400 tracking-wider">État Validation</th>
                    {role === 'secretaria' && (
                      <>
                        <th className="py-4 px-4 font-black uppercase text-slate-400 tracking-wider text-right">Coût Total</th>
                        <th className="py-4 px-4 font-black uppercase text-slate-400 tracking-wider text-right">Avance Verse</th>
                      </>
                    )}
                    <th className="py-4 px-4 font-black uppercase text-slate-400 tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {chargements.map(ch => (
                    <tr key={ch.id} className="group/row hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors whitespace-nowrap">
                      <td className="py-4 px-4 font-bold text-slate-400 tabular-nums">
                        {new Date(ch.dateChargement || ch.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <Box className="w-3 h-3 text-blue-500" />
                           </div>
                           <span className="font-black text-slate-900 dark:text-white uppercase">{ch.numeroConteneur || "N/A"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                           <Truck className="w-3.5 h-3.5 text-slate-400" />
                           {(role === 'secretaria' || role === 'logistique') ? (
                             <EditableFleet 
                               currentType={ch.typeTransporteur || 'interne'}
                               currentCamionId={ch.camionId}
                               currentPrestataire={ch.nomTransporteurExterne}
                               camions={camions}
                               onChange={async (updates) => {
                                 try {
                                   await updateDoc(doc(db, "chargements", ch.id), { 
                                     ...updates,
                                     updatedAt: new Date().toISOString()
                                   });
                                 } catch (err) {
                                   handleFirestoreError(err, OperationType.UPDATE, `chargements/${ch.id}`);
                                 }
                               }}
                             />
                           ) : (
                             <span className="font-bold text-slate-600 dark:text-slate-300">
                               {ch.typeTransporteur === 'interne' 
                                 ? (camions.find(c => c.id === ch.camionId)?.numero || ch.camionId || "Flotte") 
                                 : `Prest: ${ch.nomTransporteurExterne || "N/A"}`}
                             </span>
                           )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                           {ch.statutApprobation === 'valide' ? (
                             <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">
                               <CheckCircle2 className="w-3 h-3" /> Validé
                             </span>
                           ) : ch.statutApprobation === 'rejete' ? (
                             <span className="flex items-center gap-1 text-[9px] font-black text-rose-500 uppercase bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-md border border-rose-100 dark:border-rose-800">
                               <XIcon className="w-3 h-3" /> Rejeté
                             </span>
                           ) : (
                             <span className="flex items-center gap-1 text-[9px] font-black text-amber-500 uppercase bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-800 animate-pulse">
                               <ShieldCheck className="w-3 h-3" /> En attente
                             </span>
                           )}
                        </div>
                      </td>
                      {role === 'secretaria' && (
                        <>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end">
                              <EditableAmount 
                                value={ch.prixTotal} 
                                onChange={async (val) => {
                                  try {
                                    await updateDoc(doc(db, "chargements", ch.id), { 
                                      prixTotal: val,
                                      solde: val - (ch.avance || 0),
                                      updatedAt: new Date().toISOString()
                                    });
                                  } catch (err) {
                                    handleFirestoreError(err, OperationType.UPDATE, `chargements/${ch.id}`);
                                  }
                                }}
                              />
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end">
                              <EditableAmount 
                                value={ch.avance}
                                highlightColor="text-emerald-500"
                                onChange={async (val) => {
                                  try {
                                    await updateDoc(doc(db, "chargements", ch.id), { 
                                      avance: val,
                                      solde: (ch.prixTotal || 0) - val,
                                      updatedAt: new Date().toISOString()
                                    });
                                  } catch (err) {
                                    handleFirestoreError(err, OperationType.UPDATE, `chargements/${ch.id}`);
                                  }
                                }}
                              />
                            </div>
                          </td>
                        </>
                      )}
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {role === 'secretaria' && ch.statutApprobation === 'en_attente' && (
                            <>
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await updateDoc(doc(db, "chargements", ch.id), { statutApprobation: "valide", updatedAt: new Date().toISOString() });
                                  } catch (err) {
                                    handleFirestoreError(err, OperationType.UPDATE, `chargements/${ch.id}`);
                                  }
                                }}
                                className="p-2 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/10 rounded-lg transition-all"
                                title="Valider la dépense"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await updateDoc(doc(db, "chargements", ch.id), { statutApprobation: "rejete", updatedAt: new Date().toISOString() });
                                  } catch (err) {
                                    handleFirestoreError(err, OperationType.UPDATE, `chargements/${ch.id}`);
                                  }
                                }}
                                className="p-2 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/10 rounded-lg transition-all"
                                title="Rejeter la dépense"
                              >
                                <XIcon className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {role === 'secretaria' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteChargementData({ id: ch.id, conteneurId: ch.conteneurId });
                              }}
                              className="p-2 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/10 rounded-lg transition-all"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {chargements.length === 0 && (
                    <tr>
                      <td colSpan={role === 'secretaria' ? 7 : 4} className="py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                        Flux logistique vierge
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteDossier}
        onClose={() => setShowDeleteDossier(false)}
        onConfirm={handleDeleteDossier}
        title="Supprimer le dossier BL"
        message="Cette action supprimera définitivement le dossier. Note : les chargements associés devront être gérés séparément pour une intégrité parfaite de la base."
        confirmText="Supprimer le dossier"
      />

      <ConfirmModal
        isOpen={!!deleteChargementData}
        onClose={() => setDeleteChargementData(null)}
        onConfirm={handleDeleteChargement}
        title="Supprimer le chargement"
        message="Voulez-vous vraiment retirer ce conteneur de ce dossier ? Cette action libérera l'unité de transport mais supprimera l'historique de ce chargement spécifique."
        confirmText="Supprimer le chargement"
      />
    </div>
  );
}

function EditableAmount({ value, onChange, highlightColor = "text-slate-900 dark:text-white" }: { value: number, onChange: (val: number) => void, highlightColor?: string }) {
  const { settings } = useSettings();
  const { role } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(value);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <input 
          type="number"
          autoFocus
          className="w-24 bg-blue-50 dark:bg-blue-900/30 border border-blue-500/50 rounded-lg px-2 py-1.5 text-xs font-black outline-none shadow-inner"
          value={val}
          onFocus={e => e.target.select()}
          onChange={e => setVal(parseInt(e.target.value) || 0)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onChange(val);
              setIsEditing(false);
            }
            if (e.key === 'Escape') {
              setVal(value);
              setIsEditing(false);
            }
          }}
        />
        <button onClick={() => { onChange(val); setIsEditing(false); }} className="p-1.5 bg-emerald-500 text-white rounded-lg shadow-sm">
          <Check className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end group/btn cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
       <div className="flex items-center gap-1.5 py-1 px-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">
         <p className={`font-black text-xs tabular-nums transition-colors ${highlightColor}`}>
           {value?.toLocaleString()} {settings.devise}
         </p>
         <Edit2 className="w-2.5 h-2.5 text-blue-500" />
       </div>
    </div>
  );
}

function EditableFleet({ currentType, currentCamionId, currentPrestataire, camions, onChange }: { currentType: string, currentCamionId?: string, currentPrestataire?: string, camions: any[], onChange: (updates: any) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [type, setType] = useState(currentType);
  const [camionId, setCamionId] = useState(currentCamionId || "");
  const [prestataire, setPrestataire] = useState(currentPrestataire || "");

  if (isEditing) {
    const hasChanges = type !== currentType || (type === 'interne' && camionId !== currentCamionId) || (type === 'externe' && prestataire !== currentPrestataire);
    
    return (
      <div className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-900 border border-blue-500/30 rounded-xl shadow-xl z-20 min-w-[220px]" onClick={e => e.stopPropagation()}>
        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Type de Flotte</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button 
            type="button"
            onClick={() => setType('interne')}
            className={`flex items-center justify-center gap-2 text-[10px] font-black uppercase py-2 rounded-lg transition-all border ${type === 'interne' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}
          >
            <Truck className="w-3 h-3" />
            Interne
          </button>
          <button 
            type="button"
            onClick={() => setType('externe')}
            className={`flex items-center justify-center gap-2 text-[10px] font-black uppercase py-2 rounded-lg transition-all border ${type === 'externe' ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}
          >
            <UserCircle className="w-3 h-3" />
            Externe
          </button>
        </div>

        <div className="space-y-1">
          {type === 'interne' ? (
            <>
              <p className="text-[9px] font-black uppercase text-slate-400 px-1">Sélection Camion (Opt.)</p>
              <select 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none"
                value={camionId}
                onChange={e => setCamionId(e.target.value)}
              >
                <option value="">Choisir plus tard...</option>
                {camions.filter(c => c.type !== 'externe').map(c => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900">
                    {c.numero} - {c.chauffeur || 'Sans chauffeur'}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <p className="text-[9px] font-black uppercase text-slate-400 px-1">Prestataire (Opt.)</p>
              <input 
                placeholder="Nom du prestataire"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none"
                value={prestataire}
                onChange={e => setPrestataire(e.target.value)}
              />
            </>
          )}
        </div>

        <div className="flex gap-2 mt-2">
          <button 
            onClick={() => { 
              onChange({
                typeTransporteur: type,
                camionId: type === 'interne' ? (camionId || null) : null,
                nomTransporteurExterne: type === 'externe' ? (prestataire || null) : null
              }); 
              setIsEditing(false); 
            }} 
            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${hasChanges ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
            disabled={!hasChanges}
          >
            Enregistrer
          </button>
          <button 
            onClick={() => { 
              setType(currentType);
              setCamionId(currentCamionId || "");
              setPrestataire(currentPrestataire || "");
              setIsEditing(false); 
            }} 
            className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-mono"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  const currentCamion = camions.find(c => c.id === currentCamionId);

  return (
    <button 
      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      className="flex items-center gap-2 py-1 px-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all text-left group/edit"
    >
      <div className="flex flex-col">
        <span className={`text-[8px] font-black uppercase tracking-widest ${currentType === 'interne' ? 'text-blue-500' : 'text-amber-500'}`}>
          {currentType === 'interne' ? 'FLOTTE CDI' : 'PRESTATAIRE'}
        </span>
        <span className="font-bold text-slate-900 dark:text-white uppercase text-[10px]">
          {currentType === 'interne' 
            ? (currentCamion?.numero || currentCamionId || "À affecter") 
            : (currentPrestataire || "N/A")}
        </span>
      </div>
      <Edit2 className="w-2.5 h-2.5 text-blue-500 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
    </button>
  );
}

function AddChargementModal({ dossier, camions: externalCamions }: { dossier: any; camions?: any[] }) {
  const { settings } = useSettings();
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [localCamions, setLocalCamions] = useState<any[]>([]);
  const camions = externalCamions || localCamions;
  const [partenaires, setPartenaires] = useState<any[]>([]);
  const [form, setForm] = useState({
    numeroConteneur: "",
    typeConteneur: "20'",
    typeTransporteur: "interne",
    camionId: "",
    nomTransporteurExterne: "",
    avance: 0,
    prixTotal: 0
  });

  useEffect(() => {
    if (open) {
      let unsubC = () => {};
      if (!externalCamions) {
        unsubC = onSnapshot(collection(db, "camions"), snap => {
          setLocalCamions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, "camions");
        });
      }

      const unsubP = onSnapshot(collection(db, "partenaires"), snap => {
        setPartenaires(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, "partenaires");
      });

      return () => { unsubC(); unsubP(); };
    }
  }, [open, externalCamions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create conteneur first
      const contRef = await addDoc(collection(db, "conteneurs"), {
        numero: form.numeroConteneur,
        dossierId: dossier.id,
        type: form.typeConteneur,
        typeTransport: form.typeTransporteur,
        statut: "en_attente",
        createdAt: new Date().toISOString()
      });

      // Create chargement
      await addDoc(collection(db, "chargements"), {
        dossierId: dossier.id,
        conteneurId: contRef.id,
        numeroConteneur: form.numeroConteneur,
        typeTransporteur: form.typeTransporteur,
        camionId: form.typeTransporteur === 'interne' ? form.camionId : null,
        nomTransporteurExterne: form.typeTransporteur === 'externe' ? form.nomTransporteurExterne : null,
        avance: form.avance,
        prixTotal: form.prixTotal,
        solde: form.prixTotal - form.avance,
        statutPaiement: (form.prixTotal - form.avance) <= 0 ? "paye" : "non_paye",
        statutApprobation: role === 'secretaria' ? "valide" : "en_attente",
        dateChargement: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      
      setOpen(false);
      setForm({ numeroConteneur: "", typeConteneur: "20'", typeTransporteur: "interne", camionId: "", nomTransporteurExterne: "", avance: 0, prixTotal: 0 });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "chargements");
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700">
        Ajouter Chargement
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Nouveau Chargement</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">N° Conteneur</label>
              <input required type="text" className="w-full border rounded-lg px-3 py-2" value={form.numeroConteneur} onChange={e => setForm({...form, numeroConteneur: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type de Conteneur</label>
              <select className="w-full border rounded-lg px-3 py-2" value={form.typeConteneur} onChange={e => setForm({...form, typeConteneur: e.target.value})}>
                <option value="20'">20 Pieds</option>
                <option value="40'">40 Pieds</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Mode Opérationnel</label>
            <select className="w-full border rounded-lg px-3 py-2" value={form.typeTransporteur} onChange={e => setForm({...form, typeTransporteur: e.target.value})}>
              <option value="interne">Flotte Interne (Maîtrise direct)</option>
              <option value="externe">Sous-traitance (Prestation déléguée)</option>
            </select>
          </div>

          {form.typeTransporteur === 'interne' ? (
            <div>
              <label className="block text-sm font-medium mb-1">Camion (Propriétaire)</label>
              <select required className="w-full border rounded-lg px-3 py-2" value={form.camionId} onChange={e => setForm({...form, camionId: e.target.value})}>
                <option value="">Sélectionner un camion...</option>
                {camions.map(c => <option key={c.id} value={c.id}>{c.numero}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">Entreprise Prestataire</label>
              <select required className="w-full border rounded-lg px-3 py-2" value={form.nomTransporteurExterne} onChange={e => setForm({...form, nomTransporteurExterne: e.target.value})}>
                <option value="">Sélectionner une entreprise...</option>
                {partenaires.map(p => <option key={p.id} value={p.nom}>{p.nom}</option>)}
              </select>
            </div>
          )}

          {role === 'secretaria' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Prix Total / Engagement ({settings.devise})</label>
                <input required type="number" min="0" className="w-full border rounded-lg px-3 py-2" value={form.prixTotal} onChange={e => setForm({...form, prixTotal: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Avance / Provision ({settings.devise})</label>
                <input required type="number" min="0" className="w-full border rounded-lg px-3 py-2" value={form.avance} onChange={e => setForm({...form, avance: parseInt(e.target.value) || 0})} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
}
