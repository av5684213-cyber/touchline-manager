"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { LocaleSwitcher } from "@/lib/i18n/locale-switcher";
import { useAppStore } from "@/lib/store";
import { useSupabaseAuth } from "@/lib/auth/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Trophy, Mail, Lock, User, Loader2, Shield, ChevronRight, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Yönetici hesapları — hardcoded (Supabase auth'da bu emailler varsa yönetici modu)
const ADMIN_EMAILS = [
  "admin@touchline.gg",
  "yönetici@touchline.gg",
];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const isAuthed = useAppStore((s) => s.isAuthed);
  const loginDemo = useAppStore((s) => s.loginDemo);
  const { user, session, loading, signUp, signIn, signOut } = useSupabaseAuth();

  const [mode, setMode] = useState<"landing" | "login" | "register" | "demo">("landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [managerName, setManagerName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Supabase yapılandırma durumu
  const supabaseReady = isSupabaseConfigured();

  // Supabase oturumu varsa children göster
  const isSupabaseAuthed = !!session && !!user;

  // Yönetici kontrolü
  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;

  useEffect(() => {
    if (isSupabaseAuthed) {
      if (!useAppStore.getState().isAuthed) {
        const name =
          (user.user_metadata as any)?.manager_name ??
          (user.user_metadata as any)?.full_name ??
          user.email?.split("@")[0] ??
          t("auth.manager_name");
        loginDemo(name);
      }
    }
  }, [isSupabaseAuthed, user, loginDemo]);

  // Supabase auth varsa veya demo mode'da ise çocukları göster
  if (isSupabaseAuthed || (isAuthed && mode !== "landing")) {
    return <>{children}</>;
  }

  const handleSignIn = async () => {
    setError("");
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) {
      if (result.error === "Invalid login credentials") {
        setError(t("auth.error.invalid"));
      } else if (result.error.includes("Supabase yapılandırılmamış")) {
        setError("Supabase bağlı değil. Geliştirici Modu ile oyna.");
      } else {
        setError(result.error);
      }
    }
  };

  const handleSignUp = async () => {
    setError("");
    if (!managerName.trim()) {
      setError(t("auth.error.name_required"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.error.password_short"));
      return;
    }
    setSubmitting(true);
    const result = await signUp(email, password, managerName);
    setSubmitting(false);
    if (result.error) {
      if (result.error === "EMAIL_CONFIRM_REQUIRED") {
        setError(t("auth.error.email_confirm"));
      } else if (result.error.includes("already")) {
        setError(t("auth.error.email_exists"));
      } else if (result.error.includes("Supabase yapılandırılmamış")) {
        setError("Supabase bağlı değil. Geliştirici Modu ile oyna.");
      } else {
        setError(result.error);
      }
    }
  };

  const handleDemo = () => {
    loginDemo();
  };

  // Geliştirici/Yönetici modu — kayıtsız giriş, tüm özellikler local
  const handleDevMode = () => {
    loginDemo("Geliştirici");
  };

  // Loading ekranı
  if (loading) {
    return (
      <div className="tm-app-shell flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="tm-app-shell flex flex-col">
      <header className="tm-safe-top text-white" style={{ background: "var(--primary)" }}>
        <div className="px-4 pt-3 pb-4 flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">
            {t("app.name")}
          </div>
          <div className="flex items-center gap-2">
            {/* Supabase durum rozeti */}
            <div className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold",
              supabaseReady
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-amber-500/20 text-amber-300"
            )}>
              {supabaseReady ? <Wifi size={9} /> : <WifiOff size={9} />}
              {supabaseReady ? "Online" : "Çevrimdışı"}
            </div>
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "var(--primary)" }}>
          <Trophy size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-1">{t("auth.title")}</h1>

        {/* LANDING — giriş seçenekleri */}
        {mode === "landing" && (
          <>
            <p className="text-sm text-muted-foreground mb-8 max-w-[260px]">
              {t("auth.subtitle")}
            </p>

            <div className="w-full max-w-[280px] space-y-2.5">
              {/* Geliştirici Modu — en üstte, büyük ve belirgin */}
              <button
                onClick={handleDevMode}
                className="tm-tap w-full py-3 rounded-xl text-sm font-bold text-white shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
              >
                <Shield size={16} /> Geliştirici Modu (Kayıtsız) <ChevronRight size={16} />
              </button>
              <p className="text-[10px] text-amber-400/70 mb-3">
                Supabase/şifre olmadan direkt oyna — tüm veriler cihazında kalır
              </p>

              {/* Supabase bağlıysa giriş/kayıt butonları */}
              {supabaseReady ? (
                <>
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted-foreground">veya hesabınla giriş yap</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <button
                    onClick={() => { setError(""); setMode("login"); }}
                    className="tm-tap w-full py-3 rounded-xl text-sm font-bold text-white shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                    style={{ background: "var(--primary)" }}
                  >
                    {t("auth.login")} <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => { setError(""); setMode("register"); }}
                    className="tm-tap w-full py-3 rounded-xl text-sm font-bold border border-border bg-card active:scale-[0.98] transition-transform"
                  >
                    {t("auth.register")}
                  </button>
                </>
              ) : (
                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300/80 leading-relaxed">
                  ℹ️ Supabase bağlanmadı — giriş/kayıt devre dışı. Geliştirici Modu ile oyna, .env dosyasına Supabase bilgilerini ekleyince online özellikler açılır.
                </div>
              )}

              {/* Misafir modu — en altta, küçük */}
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground">veya</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <button
                onClick={handleDemo}
                className="tm-tap w-full py-2.5 rounded-xl text-xs font-semibold text-muted-foreground border border-border/50 active:scale-[0.98] transition-transform"
              >
                {t("auth.guest")}
              </button>
            </div>
          </>
        )}

        {/* LOGIN — email/şifre */}
        {mode === "login" && (
          <div className="w-full max-w-[280px] space-y-3 mt-6">
            <h2 className="text-lg font-bold mb-2">{t("auth.login")}</h2>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                placeholder={t("auth.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-sm"
                autoCapitalize="none"
              />
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                placeholder={t("auth.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-sm"
              />
            </div>
            {error && <p className="text-[11px] text-red-400 text-center">{error}</p>}
            <button
              onClick={handleSignIn}
              disabled={submitting || !email || !password}
              className="tm-tap w-full py-3 rounded-xl text-sm font-bold text-white shadow-md active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "var(--primary)" }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : t("auth.login")}
            </button>
            <button
              onClick={() => { setError(""); setMode("landing"); }}
              className="tm-tap w-full py-2 text-xs text-muted-foreground"
            >
              {t("auth.back")}
            </button>
          </div>
        )}

        {/* REGISTER — kayıt */}
        {mode === "register" && (
          <div className="w-full max-w-[280px] space-y-3 mt-6">
            <h2 className="text-lg font-bold mb-2">{t("auth.register")}</h2>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("auth.manager_name")}
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-sm"
              />
            </div>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                placeholder={t("auth.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-sm"
                autoCapitalize="none"
              />
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                placeholder="Şifre (en az 6 karakter)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-sm"
              />
            </div>
            {error && <p className="text-[11px] text-red-400 text-center">{error}</p>}
            <button
              onClick={handleSignUp}
              disabled={submitting || !email || !password || !managerName}
              className="tm-tap w-full py-3 rounded-xl text-sm font-bold text-white shadow-md active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "var(--primary)" }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : t("auth.register")}
            </button>
            <button
              onClick={() => { setError(""); setMode("landing"); }}
              className="tm-tap w-full py-2 text-xs text-muted-foreground"
            >
              {t("auth.back")}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
