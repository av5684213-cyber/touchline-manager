"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

/**
 * Error Boundary — component crash olursa uygulama yerine hata mesajı göster.
 *
 * Next.js static export'ta client-side exception oluştuğunda "Application error:
 * a client-side exception has occurred" gösterilir. Bu boundary, hatayı yakalayıp
 * kullanıcıya dostane bir mesaj + yeniden dene butonu gösterir.
 *
 * Kullanım:
 * <ErrorBoundary fallback={<HataMesaji />}>
 *   <DashboardScreen />
 * </ErrorBoundary>
 */
type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  resetKey?: string; // bu değer değişince boundary reset olur
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Console'a yaz — geliştirici görebilsin
    console.error("[ErrorBoundary] caught:", error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    // resetKey değişince boundary reset olur
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="px-4 py-8 text-center space-y-3">
          <div className="text-4xl mb-2">⚠️</div>
          <div className="text-sm font-bold text-red-400">
            Bir hata oluştu
          </div>
          <div className="text-[11px] text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
            Bu ekran yüklenirken bir sorun yaşandı. Uygulama verileri korunuyor.
            Aşağıdaki butona basıp tekrar deneyin.
          </div>
          <div className="text-[10px] text-muted-foreground/60 max-w-[280px] mx-auto break-all bg-muted/30 rounded p-2 mt-2">
            {this.state.error?.message ?? "Bilinmeyen hata"}
          </div>
          <button
            onClick={this.reset}
            className="tm-tap mt-3 px-5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold"
          >
            Tekrar Dene
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
