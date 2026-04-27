import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FolderOpen, Truck, DollarSign, FileBarChart, Menu, X, LogOut, Box, Moon, Sun, ShieldCheck } from "lucide-react";
import { cn } from "./lib/utils";
import Dashboard from "./pages/Dashboard";
import Dossiers from "./pages/Dossiers";
import Conteneurs from "./pages/Conteneurs";
import Finances from "./pages/Finances";
import Rapports from "./pages/Rapports";
import Parametres from "./pages/Parametres";
import PortailOperations from "./pages/PortailOperations";
import Camions from "./pages/Camions";
import { AuthProvider, useAuth } from "./lib/auth";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Settings } from "lucide-react";

function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div className="w-10 h-10 bg-blue-600 rounded-xl rotate-3 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Truck className="w-6 h-6 text-white -rotate-3" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-sm" />
      </div>
      <div>
        <h1 className="text-xl font-black tracking-tighter uppercase leading-none text-slate-900 dark:text-white font-display">Trans<span className="text-blue-600">Log</span></h1>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 leading-none mt-1">Enterprise Pro</p>
      </div>
    </div>
  );
}

function Sidebar({ isOpen, setIsOpen, logOut, user, theme, toggleTheme }: { isOpen: boolean; setIsOpen: (v: boolean) => void; logOut: () => void; user: any; theme: string; toggleTheme: () => void }) {
  const location = useLocation();
  
  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/dossiers", label: "Dossiers BL", icon: FolderOpen },
    { path: "/conteneurs", label: "Inventaire EVP", icon: Box },
    { path: "/flotte", label: "Gestion Flotte", icon: Truck },
    { path: "/finances", label: "Flux Trésorerie", icon: DollarSign },
    { path: "/rapports", label: "Executive Board", icon: FileBarChart },
    { path: "/parametres", label: "Configuration", icon: Settings },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsOpen(false)} />
      )}
      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#0c111d] text-slate-900 dark:text-white min-h-screen flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-100 dark:border-slate-800",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-8 pb-10 flex items-center justify-between">
          <Logo />
          <button className="md:hidden text-slate-400 hover:text-slate-900 dark:hover:text-white" onClick={() => setIsOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto pb-4 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold uppercase text-[10px] tracking-widest group",
                  isActive 
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-400 dark:text-slate-600")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
           <button 
             onClick={toggleTheme}
             className="w-full flex items-center justify-between gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-white rounded-2xl transition-all group font-bold uppercase text-[10px] tracking-widest"
           >
             <div className="flex items-center gap-3">
               {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
               <span>Mode {theme === 'dark' ? 'Clair' : 'Sombre'}</span>
             </div>
             <div className="w-8 h-4 bg-slate-100 dark:bg-slate-800 rounded-full relative p-1">
                <div className={cn("w-2 h-2 rounded-full transition-all duration-300", theme === 'dark' ? "bg-blue-500 translate-x-4" : "bg-slate-400")} />
             </div>
           </button>

          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-xs font-black text-blue-600 dark:text-blue-500 border border-slate-100 dark:border-slate-700 shadow-sm">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white truncate tracking-tight">{user?.email?.split('@')[0]}</p>
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Accès Administrateur</span>
              </div>
            </div>
          </div>
          <button 
            onClick={logOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-500 rounded-xl transition-all font-black uppercase text-[10px] tracking-[0.2em]"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </div>
    </>
  );
}

function BottomNav() {
  const location = useLocation();
  const navItems = [
    { path: "/", short: "Home", icon: LayoutDashboard },
    { path: "/dossiers", short: "Dossiers", icon: FolderOpen },
    { path: "/flotte", short: "Flotte", icon: Truck },
    { path: "/finances", short: "Finances", icon: DollarSign },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center z-40 pb-safe transition-colors duration-300">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link 
            key={item.path} 
            to={item.path} 
            className={cn(
              "flex flex-col items-center p-3 w-full transition-all", 
              isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Icon className={cn("w-5 h-5 mb-1 transition-transform", isActive && "scale-110")} />
            <span className="text-[10px] font-black uppercase tracking-widest">{item.short}</span>
          </Link>
        )
      })}
    </nav>
  );
}

function AppContent() {
  const { user, loading, signIn, signInEmail, logOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsSubmitting(true);
    try {
      await signInEmail(loginForm.username, loginForm.password);
    } catch (err: any) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setLoginError("Identifiants incorrects (admin ou transporteur / 123456)");
      } else if (err.code === "auth/operation-not-allowed") {
        setLoginError("Connexion par email non activée sur Firebase");
      } else {
        setLoginError("Une erreur est survenue lors de la connexion");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
          <Truck className="absolute inset-0 m-auto w-6 h-6 text-blue-600" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
        <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 text-center max-w-md w-full overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-blue-400 to-emerald-500" />
          
          <div className="w-20 h-20 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20 rotate-3 transition-transform hover:rotate-0">
            <Truck className="w-10 h-10 -rotate-3 transition-transform active:rotate-0" />
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter font-display">
            Trans<span className="text-blue-600">Log</span> <span className="text-slate-400 dark:text-slate-600">Pro</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-10 font-bold uppercase tracking-widest text-[10px]">Système d'exploitation logistique</p>

          <form onSubmit={handleEmailLogin} className="space-y-4 mb-8">
            <div className="space-y-2">
              <input 
                type="text" 
                placeholder="Identifiant (admin ou transporteur)"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                required
              />
              <input 
                type="password" 
                placeholder="Mot de passe"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                required
              />
            </div>

            {loginError && (
              <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                {loginError}
              </p>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 dark:bg-blue-600 text-white px-8 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Connexion..." : "Accès Plateforme"}
            </button>
          </form>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
            <div className="relative flex justify-center text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600 px-4 bg-white dark:bg-slate-900">OU</div>
          </div>

          <button 
            onClick={signIn} 
            className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 px-8 py-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3"
          >
            <div className="w-5 h-5 bg-white rounded-md flex items-center justify-center border border-slate-100">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-3 h-3" referrerPolicy="no-referrer" />
            </div>
            Continuer avec Google
          </button>
          
          <p className="mt-10 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">
            Démos : admin / 123456 | flotte / 123456 | transporteur / 123456
          </p>
        </div>
      </div>
    );
  }

  // Intercept the transporteur route
  if (user.email === 'transporteur@translog-pro.com' || user.email === 'flotte@translog-pro.com') {
    return (
      <ErrorBoundary>
        <PortailOperations />
      </ErrorBoundary>
    )
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans tracking-tight">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} logOut={logOut} user={user} theme={theme} toggleTheme={toggleTheme} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between sticky top-0 z-30 transition-colors">
            <Logo />
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -mr-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors active:scale-90">
              <Menu className="w-6 h-6" />
            </button>
          </header>
          <main className="flex-1 p-4 sm:p-10 overflow-auto pb-24 md:pb-10 custom-scrollbar">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dossiers" element={<Dossiers />} />
              <Route path="/conteneurs" element={<Conteneurs />} />
              <Route path="/flotte" element={<Camions />} />
              <Route path="/finances" element={<Finances />} />
              <Route path="/rapports" element={<Rapports />} />
              <Route path="/parametres" element={<Parametres />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </div>
    </Router>
  );
}

import { SettingsProvider } from "./hooks/useSettings";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
