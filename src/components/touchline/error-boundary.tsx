"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

// v2.9.147: Sentry'ye capture etmek için lazy import — Sentry yüklü değilse sessizce atla
async function captureToSentry(error: Error, errorInfo: ErrorInfo, screenTag?: string) {
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
      tags: {
        source: "error_boundary",
        screen: screenTag ?? "unknown",
        app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
      },
    });
  } catch {
    // Sentry SDK yüklü değil ya da DSN yok — console.log fallback (zaten aşağıda)
  }
}

/**
 * Error Boundary — component crash olursa uygulama yerine hata mesajı göster.
 *
 * v2.9.147: componentDidCatch artık Sentry'ye de rapor ediyor.
 * PII scrubbing sentry.client.config.ts'in beforeSend hook'unda yapılır
 * (email/JWT/Authorization header otomatik temizlenir).
 */
type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  resetKey?: string; // bu değer değişince boundary reset olur
  locale?: "tr" | "en"; // v2.9.74: i18n için
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
    // v2.9.147: Sentry'ye gönder (PII scrubbing otomatik)
    captureToSentry(error, errorInfo, this.props.resetKey);
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
            {/* v2.9.74 FIX Y12: i18n — class component olduğu için useI18n kullanılamaz.
                props.locale üzerinden al, fallback TR. */}
            {this.props.locale === "en" ? "An error occurred" : "Bir hata oluştu"}
          </div>
          <div className="text-[11px] text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
            {this.props.locale === "en"
              ? "A problem occurred while loading this screen. App data is preserved. Press the button below to retry."
              : "Bu ekran yüklenirken bir sorun yaşandı. Uygulama verileri korunuyor. Aşağıdaki butona basıp tekrar deneyin."}
          </div>
          <div className="text-[10px] text-muted-foreground/60 max-w-[280px] mx-auto break-all bg-muted/30 rounded p-2 mt-2">
            {this.state.error?.message ?? (this.props.locale === "en" ? "Unknown error" : "Bilinmeyen hata")}
          </div>
          <button
            onClick={this.reset}
            className="tm-tap mt-3 px-5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold"
          >
            {this.props.locale === "en" ? "Retry" : "Tekrar Dene"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
