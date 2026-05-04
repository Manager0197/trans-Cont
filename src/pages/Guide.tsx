import React from "react";
import { 
  BookOpen, 
  LayoutDashboard, 
  FolderOpen, 
  Truck, 
  DollarSign, 
  ShieldCheck, 
  MousePointer2, 
  Smartphone,
  ChevronRight,
  Info
} from "lucide-react";

export default function Guide() {
  const sections = [
    {
      title: "Tableau de Bord & Vision Executive",
      icon: LayoutDashboard,
      color: "blue",
      content: "Le dashboard centralise vos KPIs. Surveillez en temps réel le volume de transport, le chiffre d'affaires et la rentabilité nette de votre flotte.",
      steps: [
        "Visualisez les alertes de maintenance en haut de page.",
        "Consultez les revenus mensuels comparés aux coûts d'entretien.",
        "Accédez rapidement aux derniers dossiers créés."
      ]
    },
    {
      title: "Gestion des Dossiers BL",
      icon: FolderOpen,
      color: "emerald",
      content: "Cœur de votre activité, ici vous créez les dossiers de transport basés sur les connaissements (BL).",
      steps: [
        "Créez un dossier en saisissant le numéro BL et le navire.",
        "Ajoutez les conteneurs (EVP) un par un avec leur destination.",
        "Générez les factures et reçus directement depuis l'onglet documents."
      ]
    },
    {
      title: "Gestion de Flotte & Parc",
      icon: Truck,
      color: "indigo",
      content: "Gérez vos actifs roulants, qu'ils soient en interne ou chez des partenaires externes.",
      steps: [
        "Saisissez l'immatriculation et le chauffeur assigné.",
        "Déclarez les maintenances (pneus, huile, moteur) pour suivre les coûts.",
        "Mettez à jour le statut du véhicule (Actif, En Panne, Maintenance)."
      ]
    },
    {
      title: "Portail des Opérations",
      icon: ShieldCheck,
      color: "amber",
      content: "C'est l'outil terrain. Utilisé pour affecter les missions aux chauffeurs en temps réel.",
      steps: [
        "Sélectionnez une mission 'À affecter'.",
        "Choisissez un véhicule disponible parmi la liste.",
        "Le chauffeur est instantanément assigné à la mission."
      ]
    },
    {
      title: "Finances & Flux de Trésorerie",
      icon: DollarSign,
      color: "rose",
      content: "Suivez chaque centime. Gérez les paiements au comptant et les acomptes versés aux partenaires.",
      steps: [
        "Enregistrez les encaissements clients pour solder les factures.",
        "Suivez les avances faites aux porteurs externes.",
        "Exportez les rapports financiers pour votre comptabilité."
      ]
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      <header className="relative p-10 rounded-[3rem] bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] -mr-32 -mt-32 transition-colors group-hover:bg-blue-600/30" />
        <div className="relative flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/40 rotate-6 group-hover:rotate-0 transition-transform">
            <BookOpen className="w-10 h-10 text-white -rotate-6 group-hover:rotate-0 transition-transform" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter sm:text-5xl">Guide <span className="text-blue-500">Employé</span></h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Maîtrisez votre outil TransLog Enterprise</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
              <MousePointer2 className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Version Bureau</h3>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 font-medium"> 
            Optimisée pour l'administration, la facturation et la gestion complexe des dossiers. Utilisez un navigateur moderne (Chrome/Edge) pour une expérience fluide.
          </p>
          <ul className="space-y-3">
            {['Raccourcis clavier intuitifs', 'Affichage multi-colonnes', 'Exports PDF & Excel'].map(f => (
              <li key={f} className="flex items-center gap-3 text-xs font-black text-slate-900 dark:text-slate-300 uppercase tracking-tight">
                <ChevronRight className="w-4 h-4 text-blue-500" /> {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Version Mobile</h3>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 font-medium">
            Idéale pour les chauffeurs et agents de quai. Accédez au Portail Opérations pour valider vos missions directement sur le terrain.
          </p>
          <ul className="space-y-3">
            {['Interface tactile simplifiée', 'Suivi temps réel', 'Notification d\'affectation'].map(f => (
              <li key={f} className="flex items-center gap-3 text-xs font-black text-slate-900 dark:text-slate-300 uppercase tracking-tight">
                <ChevronRight className="w-4 h-4 text-emerald-500" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-8 px-4">
        {sections.map((section, idx) => {
          const Icon = section.icon;
          return (
            <div key={idx} className="group overflow-hidden bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl transition-all hover:border-blue-500/50">
              <div className="flex flex-col lg:flex-row">
                <div className={`lg:w-1/3 p-10 bg-${section.color}-500 flex flex-col items-center justify-center text-center text-white relative overflow-hidden`}>
                  <Icon className="w-24 h-24 mb-6 opacity-20 absolute -top-4 -left-4 rotate-12" />
                  <Icon className="w-16 h-16 mb-4 relative z-10 animate-pulse" />
                  <h4 className="text-2xl font-black uppercase tracking-tighter relative z-10 leading-tight">{section.title}</h4>
                </div>
                <div className="lg:w-2/3 p-10 space-y-8 relative">
                   <div className="flex items-start gap-4">
                     <div className="mt-1"><Info className="w-5 h-5 text-blue-500" /></div>
                     <p className="text-slate-600 dark:text-slate-300 font-medium text-lg leading-relaxed italic">"{section.content}"</p>
                   </div>
                   
                   <div className="space-y-4">
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions clés à maîtriser :</p>
                     <div className="grid grid-cols-1 gap-3">
                        {section.steps.map((step, sidx) => (
                          <div key={sidx} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:translate-x-2">
                            <span className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg text-xs font-black shadow-sm text-blue-600">{sidx + 1}</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{step}</span>
                          </div>
                        ))}
                     </div>
                   </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-20 text-center">
        <div className="mb-8 inline-block p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
          <ShieldCheck className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">Besoin d'aide supplémentaire ?</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-lg mx-auto font-medium">Votre administrateur système peut configurer des accès spécifiques. Pour tout bug technique, contactez le support.</p>
        <button 
          onClick={() => window.print()}
          className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl"
        >
          Imprimer le Guide PDF
        </button>
      </div>
    </div>
  );
}
