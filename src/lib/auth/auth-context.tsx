"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { initCloudSave, stopCloudSave, flushGameState } from "@/lib/cloud-save";
import { loadBlockedUsersFromSupabase } from "@/components/touchline/match-chat";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, managerName: string, teamName?: string, countryCode?: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { loginDemo } = useAppStore();

  useEffect(() => {
    // BULGU #2 DÜZELTME (v2.9.3): setTimeout cleanup için ref'lerde tut
    const pendingTimeouts: ReturnType<typeof setTimeout>[] = [];

    // Mevcut session'ı al — hata durumunda da loading'i kapat
    supabase.auth.getSession()
      .then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);

        // Kullanıcı giriş yapmışsa cloud save başlat
        if (data.session?.user) {
          initCloudSave(data.session.user.id);
          // P0 FIX BUG #14: Engellenen kullanıcıları Supabase'ten yükle
          // BULGU #7 DÜZELTME (v2.9.1): loadBlockedUsersFromSupabase merge yaptığından
          // initCloudSave sonrası çağrılması güvenli — cloud-save'in yüklediği yerel
          // guest ID'leri overwrite etmez, sadece Supabase'ten gelen auth ID'lerini ekler.
          // Yine de 500ms gecikme ile çağıralım — loadGameState'in bitme şansı tanıyalım.
          pendingTimeouts.push(
            setTimeout(() => loadBlockedUsersFromSupabase(data.session!.user.id), 500)
          );
        }
      })
      .catch(() => {
        // Supabase erişilemezse — demo moduna düş
        setLoading(false);
      });

    // Auth değişikliklerini dinle
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      // Kullanıcı giriş yaptı ama local store'da auth yoksa — local login (demo) yap
      if (newSession?.user && !useAppStore.getState().isAuthed) {
        const email = newSession.user.email ?? "Menajer";
        const managerName =
          (newSession.user.user_metadata as any)?.full_name ??
          (newSession.user.user_metadata as any)?.manager_name ??
          email.split("@")[0];
        const metaCountryCode = (newSession.user.user_metadata as any)?.country_code ?? "TR";
        loginDemo(managerName, metaCountryCode); // v2.9.38: countryCode geçir

        // Cloud save başlat
        initCloudSave(newSession.user.id);

        // v2.9.20 GÖREV 5: İlk kez giriş yapıyorsa — ülke + takım adı ile takım ata
        // user_metadata'da team_name varsa rpc_assign_team_to_user_v2 çağır
        const metadata = newSession.user.user_metadata as any ?? {};
        const teamName = metadata.team_name;
        const countryCode = metadata.country_code ?? "TR";
        if (teamName && typeof teamName === "string" && teamName.length >= 3) {
          pendingTimeouts.push(
            setTimeout(async () => {
              try {
                const { supabase: supabaseClient } = await import("@/lib/supabase/client");
                const { data: assignResult, error: assignErr } = await supabaseClient().rpc(
                  "rpc_assign_team_to_user_v2",
                  {
                    p_user_id: newSession!.user.id,
                    p_team_name: teamName,
                    p_country_code: countryCode,
                    p_preferred_tier: 4,
                  }
                );
                if (assignErr) {
                  console.warn("[auth] rpc_assign_team_to_user_v2 error:", assignErr.message);
                } else if (assignResult?.success) {
                  console.log("[auth] Team assigned:", assignResult);
                  // multiplayer state'i yeniden yükle (yeni takım gösterilsin)
                  await useAppStore.getState().loadMultiplayerState(newSession!.user.id);
                }
              } catch (e: any) {
                console.warn("[auth] Team assignment exception:", e?.message ?? e);
              }
            }, 1500)  // cloud-save load bitmesini bekle
          );
        }

        // P0 FIX BUG #14: Engellenen kullanıcıları Supabase'ten yükle
        // BULGU #7 DÜZELTME (v2.9.1): merge yapıldığından sıralı çağırmaya gerek yok,
        // ama 500ms gecikme yine de race'i minimize eder.
        pendingTimeouts.push(
          setTimeout(() => loadBlockedUsersFromSupabase(newSession!.user.id), 500)
        );
      }

      // Kullanıcı çıkış yaptıysa cloud save'i durdur
      if (!newSession?.user) {
        stopCloudSave();
      }
    });

    return () => {
      // BULGU #2 DÜZELTME: Bekleyen tüm setTimeout'ları temizle — unmount sırasında
      // loadBlockedUsersFromSupabase çağrılmaz, gereksiz setState önlenir
      for (const id of pendingTimeouts) clearTimeout(id);
      listener.subscription.unsubscribe();
    };
  }, [loginDemo]);

  // Sayfa kapatılırken/yenilenirken cloud'a kaydet
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        // beforeunload'da async çalışmaz, ama en azından deneyelim
        flushGameState(user.id);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [user]);

  const signUp = async (
    email: string,
    password: string,
    managerName: string,
    teamName?: string,
    countryCode?: string
  ) => {
    // Supabase yapılandırılmamışsa — placeholder URL'e istek atmasın
    if (!isSupabaseConfigured()) {
      return { error: "Supabase yapılandırılmamış. Geliştirici Modu ile devam edin." };
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            manager_name: managerName,
            full_name: managerName,
            // v2.9.20 GÖREV 5: Kayıt akışı — ülke + takım adı metadata'ya gömülür
            team_name: teamName ?? null,
            country_code: countryCode ?? "TR",
          },
        },
      });
      if (error) return { error: error.message };
      if (data.user && !data.session) {
        return { error: "EMAIL_CONFIRM_REQUIRED" };
      }
      return {};
    } catch (e: any) {
      return { error: e?.message ?? "Bağlantı hatası" };
    }
  };

  const signIn = async (email: string, password: string) => {
    // Supabase yapılandırılmamışsa — placeholder URL'e istek atmasın (crash önlenir)
    if (!isSupabaseConfigured()) {
      return { error: "Supabase yapılandırılmamış. Geliştirici Modu ile devam edin." };
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };
      return {};
    } catch (e: any) {
      return { error: e?.message ?? "Bağlantı hatası" };
    }
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured()) {
      return { error: "Supabase yapılandırılmamış. Geliştirici Modu ile devam edin." };
    }
    try {
      const redirectTo = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) return { error: error.message };
      return {};
    } catch (e: any) {
      return { error: e?.message ?? "Bağlantı hatası" };
    }
  };

  const signOut = async () => {
    // Çıkıştan önce state'i cloud'a kaydet
    if (user) {
      await flushGameState(user.id);
    }
    stopCloudSave();
    await supabase.auth.signOut();
    // Local store'dan da çıkış
    useAppStore.getState().logout();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useSupabaseAuth must be used within AuthProvider");
  return ctx;
}
