import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReset: () => void;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  // Fix: State is initialized in the constructor for broader compatibility.
  public state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
    // Fix: Bind the 'this' context of handleReset to the component instance.
    this.handleReset = this.handleReset.bind(this);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  // Fix: Converted to a standard class method. 'this' is bound in the constructor.
  private handleReset() {
    this.props.onReset();
    this.setState({ hasError: false, error: null });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center text-white bg-slate-900" role="alert">
          <div className="bg-slate-800 p-8 rounded-lg shadow-xl max-w-lg w-full">
            <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-red-300">Something went wrong.</h1>
            <p className="mt-2 text-slate-300">
              {this.props.fallbackMessage || "An unexpected error occurred. Please try again."}
            </p>
            {this.state.error && (
                 <details className="mt-4 text-left bg-slate-900/50 p-3 rounded-md text-sm">
                    <summary className="cursor-pointer text-slate-400 hover:text-white">Error Details</summary>
                    <pre className="mt-2 text-slate-400 whitespace-pre-wrap break-all">
                        <code>{this.state.error.message}</code>
                    </pre>
                </details>
            )}
            <button
              onClick={this.handleReset}
              className="mt-6 py-2 px-6 rounded-md bg-sky-500 hover:bg-sky-600 transition-colors font-bold"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
