"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { LocaleSwitcher } from "@/lib/i18n/locale-switcher";
import { useAppStore } from "@/lib/store";
import { useSupabaseAuth } from "@/lib/auth/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Trophy, Mail, Lock, User, Loader2, Shield, ChevronRight, Wifi, WifiOff, Globe, X } from "lucide-react";
import { cn } from "@/lib/utils";
// v2.9.153: haptic feedback — dev mode şifre hatası için
import { haptic } from "@/hooks/touchline";
import { getCountryList } from "@/lib/countries/countries";
import { validateTeamName, validateManagerName, validateCountryCode } from "@/lib/name-validator";

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
  // v2.9.20 GÖREV 5: Kayıt akışı — ülke + takım adı
  const [countryCode, setCountryCode] = useState("TR");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // v2.9.153: Dev mode şifre modalı — "Geliştirici Modu" butonuna basınca açılır
  const [showDevPasswordModal, setShowDevPasswordModal] = useState(false);
  const [devPasswordInput, setDevPasswordInput] = useState("");
  const [devPasswordError, setDevPasswordError] = useState("");

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

  // v2.9.153 B TEST FIX: Dev/demo mode'da sayfa yenilenince otomatik geri yükle.
  // v2.9.155 FIX: Sadece Supabase YAPILANDIRILMAMIŞSA (dev/demo mode) restore et.
  // Supabase hazır ise (kayıtlı kullanıcılar) login ekranını göster — otomatik
  // geri yükleme YAPMA, yoksa login/register ekranı kaybolur.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (supabaseReady) return; // Supabase hazır → login ekranı göster, restore yapma
    if (useAppStore.getState().isAuthed) return; // zaten giriş yapmış

    try {
      const backup = localStorage.getItem("tm_game_state_backup");
      if (backup) {
        const saved = JSON.parse(backup);
        if (saved && saved.isAuthed === true) {
          if (saved.isDevMode === true) {
            loginDemo("Geliştirici");
          } else {
            loginDemo(saved.managerName || "Menajer");
          }
          setMode("demo");
        }
      }
    } catch {
      // backup bozuksa sessizce geç
    }
  }, [loginDemo, supabaseReady]);

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
    // v2.9.20 GÖREV 5: manager_name + team_name + country_code validasyonu
    const managerResult = validateManagerName(managerName);
    if (!managerResult.valid) {
      setError(managerResult.message ?? "Geçersiz yönetici adı.");
      return;
    }
    const teamResult = validateTeamName(teamName);
    if (!teamResult.valid) {
      setError(teamResult.message ?? "Geçersiz takım adı.");
      return;
    }
    if (!validateCountryCode(countryCode)) {
      setError("Geçersiz ülke seçimi.");
      return;
    }
    // v2.9.65: Şifre politikası güçlendirildi — min 8 karakter + rakam + harf
    if (password.length < 8) {
      setError(t("auth.error.password_short"));
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Şifre en az 1 harf ve 1 rakam içermeli.");
      return;
    }
    setSubmitting(true);
    const result = await signUp(email, password, managerResult.cleaned!, teamResult.cleaned, countryCode);
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
    setMode("demo"); // v2.9.74 FIX: mode "landing" kalırsa children render edilmez
  };

  // Geliştirici/Yönetici modu — kayıtsız giriş, tüm özellikler local
  // v2.9.153: Önce şifre modalı göster — şifre 131313
  const handleDevMode = () => {
    setDevPasswordInput("");
    setDevPasswordError("");
    setShowDevPasswordModal(true);
  };

  // v2.9.153: Dev mode şifre doğrulama — 131313
  const DEV_PASSWORD = "131313";
  const handleDevModeSubmit = () => {
    if (devPasswordInput === DEV_PASSWORD) {
      setShowDevPasswordModal(false);
      setDevPasswordInput("");
      setDevPasswordError("");
      loginDemo("Geliştirici");
      setMode("demo");
    } else {
      setDevPasswordError("Yanlış şifre. Dev mode erişimi reddedildi.");
      haptic("error");
    }
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
        {/* v2.9.155: Kullanıcı ikonu — açılış ekranında göster */}
        <div className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center mb-5 shadow-lg border-2 border-white/20">
          <img src="./splash-icon.png" alt="Touchline Manager" className="w-full h-full object-cover" />
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

        {/* v2.9.153: DEV MODE ŞİFRE MODALI — 131313 */}
        {showDevPasswordModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="tm-card w-full max-w-[300px] overflow-hidden">
              <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-amber-900/40 to-purple-900/30 border-b border-border">
                <button
                  onClick={() => setShowDevPasswordModal(false)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50"
                  aria-label="Kapat"
                >
                  <X size={14} className="text-white/80" />
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={20} className="text-amber-400" />
                  <h3 className="text-sm font-bold">Geliştirici Erişimi</h3>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Dev mode'a girmek için şifre gerekli
                </p>
              </div>
              <div className="p-5 space-y-3">
                <input
                  type="password"
                  placeholder="Şifre"
                  value={devPasswordInput}
                  onChange={(e) => {
                    setDevPasswordInput(e.target.value);
                    setDevPasswordError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleDevModeSubmit();
                  }}
                  className="w-full px-3 py-2.5 rounded-lg bg-card border border-border text-sm text-center font-bold tracking-widest"
                  autoFocus
                  maxLength={20}
                  inputMode="numeric"
                />
                {devPasswordError && (
                  <p className="text-[11px] text-red-400 text-center">{devPasswordError}</p>
                )}
                <button
                  onClick={handleDevModeSubmit}
                  className="tm-tap w-full py-2.5 rounded-lg text-xs font-bold text-white shadow-md active:scale-[0.98] transition-transform"
                  style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
                >
                  Giriş Yap
                </button>
                <p className="text-[9px] text-muted-foreground/60 text-center leading-relaxed">
                  ⚠️ Bu basit bir kapı — gerçek güvenlik değil. Sadece rastgele test kullanıcısının yanlışlıkla dev paneline girmesini engeller.
                </p>
              </div>
            </div>
          </div>
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
                maxLength={254}
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
                maxLength={128}
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

        {/* REGISTER — kayıt: ülke + takım adı + yönetici adı + email + şifre */}
        {mode === "register" && (
          <div className="w-full max-w-[300px] space-y-3 mt-6">
            <h2 className="text-lg font-bold mb-2">{t("auth.register")}</h2>
            {/* Ülke seçimi */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block ml-1">Ülke / Lig</label>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-sm appearance-none cursor-pointer"
                >
                  {getCountryList().map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag_emoji} {c.name_tr}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[9px] text-muted-foreground mt-1 ml-1">
                Seçtiğin ülkenin 4. liginden başlayacaksın (otomatik takım atanır)
              </p>
            </div>
            {/* Takım adı */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block ml-1">Takım Adın</label>
              <div className="relative">
                <Trophy size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="örn: Yıldız Galataspor"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  maxLength={60}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-sm"
                />
              </div>
            </div>
            {/* Yönetici adı */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block ml-1">Yönetici Adın</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("auth.manager_name")}
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  maxLength={40}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-sm"
                />
              </div>
            </div>
            {/* Email */}
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                placeholder={t("auth.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-sm"
                autoCapitalize="none"
                maxLength={254}
              />
            </div>
            {/* Şifre */}
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                // v2.9.67: Placeholder şifre politikasıyla uyumlu
    placeholder={t("auth.password_hint")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-sm"
                maxLength={128}
              />
            </div>
            {error && <p className="text-[11px] text-red-400 text-center">{error}</p>}
            <button
              onClick={handleSignUp}
              disabled={submitting || !email || !password || !managerName || !teamName}
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
