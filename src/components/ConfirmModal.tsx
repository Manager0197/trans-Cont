import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  variant = "danger"
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 mb-20 sm:mb-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
          >
            <div className="p-8 sm:p-10">
              <div className="flex items-start justify-between mb-8">
                <div className={`p-4 rounded-2xl ${
                  variant === "danger" ? "bg-rose-500/10 text-rose-500" : 
                  variant === "warning" ? "bg-amber-500/10 text-amber-500" : 
                  "bg-blue-500/10 text-blue-500"
                }`}>
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">
                {title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-10">
                {message}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-1 py-4 sm:py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg ${
                    variant === "danger" ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20" :
                    variant === "warning" ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20" :
                    "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                  }`}
                >
                  {confirmText}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-4 sm:py-5 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-slate-800"
                >
                  {cancelText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
