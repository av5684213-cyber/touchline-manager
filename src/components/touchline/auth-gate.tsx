"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { LocaleSwitcher } from "@/lib/i18n/locale-switcher";
import { useAppStore } from "@/lib/store";
import { useSupabaseAuth } from "@/lib/auth/auth-context";
import { Trophy, Mail, Lock, User, Loader2, Shield, ChevronRight } from "lucide-react";
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

  // Supabase oturumu varsa children göster
  const isSupabaseAuthed = !!session && !!user;

  // Yönetici kontrolü
  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;

  useEffect(() => {
    if (isSupabaseAuthed) {
      // Cloud save zaten auth-context'te başlatılıyor
      // Eğer local store'da auth yoksa demo login yap (oyun state'i kur)
      if (!useAppStore.getState().isAuthed) {
        const name =
          (user.user_metadata as any)?.manager_name ??
          (user.user_metadata as any)?.full_name ??
          user.email?.split("@")[0] ??
          "Menajer";
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
        setError("Email veya şifre hatalı");
      } else {
        setError(result.error);
      }
    }
  };

  const handleSignUp = async () => {
    setError("");
    if (!managerName.trim()) {
      setError("Menajer adı gerekli");
      return;
    }
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı");
      return;
    }
    setSubmitting(true);
    const result = await signUp(email, password, managerName);
    setSubmitting(false);
    if (result.error) {
      if (result.error === "EMAIL_CONFIRM_REQUIRED") {
        setError("Email onayı gerekli. Emailini kontrol et.");
      } else if (result.error.includes("already")) {
        setError("Bu email zaten kayıtlı");
      } else {
        setError(result.error);
      }
    }
  };

  const handleDemo = () => {
    loginDemo();
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
          <LocaleSwitcher />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "var(--primary)" }}>
          <Trophy size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Touchline Manager</h1>

        {/* LANDING — giriş seçenekleri */}
        {mode === "landing" && (
          <>
            <p className="text-sm text-muted-foreground mb-8 max-w-[260px]">
              Futbol menajerliği senin elinde. Takımını kur, taktik ver, şampiyon ol.
            </p>

            <div className="w-full max-w-[280px] space-y-2.5">
              <button
                onClick={() => { setError(""); setMode("login"); }}
                className="tm-tap w-full py-3 rounded-xl text-sm font-bold text-white shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                style={{ background: "var(--primary)" }}
              >
                Giriş Yap <ChevronRight size={16} />
              </button>
              <button
                onClick={() => { setError(""); setMode("register"); }}
                className="tm-tap w-full py-3 rounded-xl text-sm font-bold border border-border bg-card active:scale-[0.98] transition-transform"
              >
                Kayıt Ol
              </button>
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground">veya</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <button
                onClick={handleDemo}
                className="tm-tap w-full py-2.5 rounded-xl text-xs font-semibold text-muted-foreground border border-border/50 active:scale-[0.98] transition-transform"
              >
                Misafir olarak dene
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-6 max-w-[240px]">
              Hesabın yoksa misafir olarak başla, ileride kayıt olup ilerlemeni koruyabilirsin.
            </p>
          </>
        )}

        {/* LOGIN — email/şifre */}
        {mode === "login" && (
          <div className="w-full max-w-[280px] space-y-3 mt-6">
            <h2 className="text-lg font-bold mb-2">Giriş Yap</h2>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email"
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
                placeholder="Şifre"
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
              {submitting ? <Loader2 size={16} className="animate-spin" /> : "Giriş Yap"}
            </button>
            <button
              onClick={() => { setError(""); setMode("landing"); }}
              className="tm-tap w-full py-2 text-xs text-muted-foreground"
            >
              ← Geri
            </button>
          </div>
        )}

        {/* REGISTER — kayıt */}
        {mode === "register" && (
          <div className="w-full max-w-[280px] space-y-3 mt-6">
            <h2 className="text-lg font-bold mb-2">Kayıt Ol</h2>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Menajer adı"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-sm"
              />
            </div>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email"
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
              {submitting ? <Loader2 size={16} className="animate-spin" /> : "Kayıt Ol"}
            </button>
            <button
              onClick={() => { setError(""); setMode("landing"); }}
              className="tm-tap w-full py-2 text-xs text-muted-foreground"
            >
              ← Geri
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
