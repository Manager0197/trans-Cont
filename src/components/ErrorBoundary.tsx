import React from "react";

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-rose-200 max-w-lg w-full">
            <h2 className="text-xl font-bold text-rose-600 mb-4">Une erreur est survenue</h2>
            <p className="text-slate-600 mb-4">L'application a rencontré un problème inattendu.</p>
            <pre className="bg-slate-100 p-4 rounded text-sm text-slate-800 overflow-auto max-h-64 mb-6">
              {this.state.error?.message}
            </pre>
            <button
              className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
              onClick={() => window.location.reload()}
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
