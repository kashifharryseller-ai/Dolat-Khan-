import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong. Please try again later.";
      
      try {
        // Try to parse Firestore error info if it exists
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Firestore ${parsed.operationType} error: ${parsed.error}`;
            if (parsed.error.includes('permission-denied')) {
              errorMessage = "You don't have permission to perform this action. Please make sure you are signed in.";
            }
          }
        }
      } catch (e) {
        // Not a JSON error, use default or original message
        if (this.state.error?.message && !this.state.error.message.startsWith('{')) {
          errorMessage = this.state.error.message;
        }
      }

      return (
        <div className="min-h-screen bg-midnight flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate border border-gold/20 rounded-[2.5rem] p-10 text-center space-y-8 shadow-2xl">
            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-accent" />
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-serif text-white">Oops! Something went wrong</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="w-full bg-gold text-midnight py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gold-bright transition-colors"
            >
              <RefreshCw className="w-5 h-5" /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
