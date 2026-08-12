"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  Coins,
  Play,
  RotateCcw,
  Search,
  Settings,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
// v2.9.147 ONBOARDING: ilk hazırlık maçında kolay rakip seçimi
import { completeOnboardingStep, useOnboardingStepCompleted } from "@/components/touchline/welcome-modal";
import { useMatchEngine } from "@/hooks/use-match-engine";
import { POSITION_GROUP } from "@/lib/mock/data";
import { ClubBadge, PositionPill, RatingBadge } from "../ui-bits";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import { joinFriendlyQueue, type QueueUser, type MatchmakingCallbacks } from "@/lib/matchmaking";
import { useSupabaseAuth } from "@/lib/auth/auth-context";
import type { TabKey } from "../bottom-nav";
import { MatchChatPanel } from "../match-chat";
// v2.9.57: Maçı İzle — MatchReplayModal stored events ile açılır
import { MatchReplayModal } from "../match-replay-modal";
// v2.9.87: Resmi maçın EventFeed'i (spiker yorumları + event ikonları) — friendly'de de kullan
import { EventFeed } from "./match";
import { MatchScreen } from "./match";
import type { Locale } from "@/lib/i18n/types";

/**
 * Hazırlık Maçı sekmesi.
 *
 * Bot takımlarla dostluk maçı oynama akışı:
 * 1. Rakip seç (ligdeki bot takımlar listesi)
 * 2. "Hazırlık Maçı Başlat" → canlı simülasyon
 * 3. Maç sonucu: kondisyon/form/moral etkiler, ama PUAN/FİKSTÜR etkilemez
 */
export function FriendlyScreen({ onGoToMatch }: { onGoToMatch?: () => void }) {
  const { t, locale } = useI18n();
  const team = useMyTeam();
  const clubs = useAppStore((s) => s.clubs);
  const credits = useAppStore((s) => s.credits);
  const spendCredits = useAppStore((s) => s.spendCredits);
  const managerName = useAppStore((s) => s.managerName);
  const { user } = useSupabaseAuth();
  // BULGU #14 DÜZELTME (v2.9.1): Guest userId her handleJoinQueue çağrısında yeniden üretiliyordu.
  // BULGU #3 DÜZELTME (v2.9.3): SSR sırasında Date.now() kullanmak hydration mismatch yaratırdı.
  // useEffect içinde (client-only) hesapla, useState null başlat.
  const [stableGuestUserId, setStableGuestUserId] = useState<string | null>(null);
  useEffect(() => {
    if (user?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStableGuestUserId(user.id); return;
    }
    const existing = localStorage.getItem("tm_guest_id");
    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStableGuestUserId(existing); return;
    }
    const newId = `guest_${Date.now()}`;
    localStorage.setItem("tm_guest_id", newId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStableGuestUserId(newId);
  }, [user?.id]);
  // user varsa onu kullan, yoksa stableGuestUserId (henüz set edilmemişse geçici fallback)
  const stableUserId = user?.id ?? stableGuestUserId ?? `guest_pending`;
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [matchStarted, setMatchStarted] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    home: number;
    away: number;
    // v2.9.57: Maçı sonradan "İzle" için event'ler + motm + stats
    replayData?: { events?: any[]; motmId?: string; stats?: any };
  } | null>(null);
  const [search, setSearch] = useState("");
  const [queueStatus, setQueueStatus] = useState<"idle" | "searching" | "matched">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  // BULGU #12 DÜZELTME (v2.9.2): Tüm setTimeout'ları bir Set içinde topla,
  // component unmount olunca hepsini clearTimeout yap.
  const timeoutRefs = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const safeTimeout = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timeoutRefs.current.delete(id);
      fn();
    }, ms);
    timeoutRefs.current.add(id);
    return id;
  };

  const opponents = useMemo(() => {
    if (!team) return [];
    return clubs.filter(
      (c) => c.id !== team.id && c.is_bot !== false &&
        (search === "" || c.name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [clubs, team, search]);

  const opponent = useMemo(
    () => clubs.find((c) => c.id === selectedOppId) ?? null,
    [clubs, selectedOppId]
  );

  // v2.9.47 Faz 3: clubs boşsa useMatchEngine'e undefined gitmesin
  const safeHomeTeam = team ?? (clubs.length > 0 ? clubs[0] : null) ?? null;
  const safeAwayTeam = opponent ?? (clubs.length > 1 ? clubs[1] : null) ?? null;

  const engine = useMatchEngine(
    safeHomeTeam as any,
    safeAwayTeam as any,
    locale,
    true // P0#2 FIX: Hazırlık maçı — fikstüre yazma
  );

  // P0: Sıraya gir — multiplayer eşleşme (kullanıcı-kullanıcı)
  // Supabase yoksa veya timeout olursa bot fallback
  const handleJoinQueue = () => {
    haptic("medium");
    setQueueStatus("searching");
    setFeedback(null);

    // Kullanıcı bilgisi hazırla — BULGU #14 DÜZELTME: stable guest userId kullan
    const userId = stableUserId;
    const queueUser: QueueUser = {
      userId,
      managerName: managerName || "Menajer",
      teamName: team?.name ?? "Takım",
      teamShort: team?.shortName ?? "TM",
      teamColor: team?.primaryColor ?? "#1a3a2a",
      teamOvr: team ? Math.round(team.players.reduce((s, p) => s + p.rating, 0) / team.players.length) : 70,
      joinedAt: Date.now(),
    };

    const callbacks: MatchmakingCallbacks = {
      onSearching: () => {
        // v2.9.17: Hazırlık maçları SADECE online kullanıcılar arası
        setFeedback("Online rakip aranıyor... 30 sn içinde bulunamazsa tekrar deneyin.");
      },
      onMatched: (oppUser: QueueUser) => {
        haptic("success");
        // v2.9.65 FIX: Dürüst mesaj — maç bot'a karşı oynanıyor, online sohbet var
        setFeedback(`✓ Online rakiple eşleştin: ${oppUser.teamName} (OVR ${oppUser.teamOvr}). Sohbet açıldı — maç bot takıma karşı oynanacak.`);
        setQueueStatus("matched");
        // Rakibin OVR'sine yakın bir bot bul (geçici — gerçek online maç için sunucu tarafı simülasyon gerekir)
        const targetOvr = oppUser.teamOvr ?? 70;
        const sortedOpps = [...opponents].sort((a, b) => {
          const aOvr = Math.round(a.players.reduce((s, p) => s + p.rating, 0) / a.players.length);
          const bOvr = Math.round(b.players.reduce((s, p) => s + p.rating, 0) / b.players.length);
          return Math.abs(aOvr - targetOvr) - Math.abs(bOvr - targetOvr);
        });
        const randomOpp = sortedOpps[0] ?? opponents[Math.floor(Math.random() * opponents.length)];
        if (randomOpp) {
          setSelectedOppId(randomOpp.id);
          safeTimeout(() => {
            setMatchStarted(true);
            engine.reset();
            engine.start();
          }, 800);
        }
      },
      onTimeout: () => {
        haptic("light");
        // v2.9.17: Bot fallback YOK — online oyuncu bulunamadı
        setFeedback("Online oyuncu bulunamadı. Tekrar deneyin veya 'Hemen Maç' ile bot'a karşı oynayın.");
        setQueueStatus("idle");
      },
      onError: (msg) => {
        if (msg === "NO_SUPABASE") {
          // P0 FIX BUG #12: Dürüst mesaj — yanıltıcı "Eşleşme bulundu" DEĞİL
          setFeedback("Online mod kullanılamıyor — bot ile oynanıyor...");
          const delay = 1500 + Math.random() * 1000;
          safeTimeout(() => {
            const randomOpp = opponents[Math.floor(Math.random() * opponents.length)];
            if (randomOpp) {
              setSelectedOppId(randomOpp.id);
              setQueueStatus("matched");
              haptic("success");
              setFeedback(`Bot rakip: ${randomOpp.name}`);
              safeTimeout(() => {
                setMatchStarted(true);
                engine.reset();
                engine.start();
              }, 800);
            } else {
              setQueueStatus("idle");
              setFeedback("Rakip bulunamadı, tekrar dene.");
            }
          }, delay);
        } else {
          setQueueStatus("idle");
          setFeedback(`Hata: ${msg}`);
        }
      },
    };

    // Multiplayer queue'ya katıl
    joinFriendlyQueue(queueUser, callbacks).then((cleanup) => {
      cleanupRef.current = cleanup;
    });
  };

  // Cleanup — component unmount olursa queue'dan çık + tüm setTimeout'ları temizle
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      // BULGU #12 DÜZELTME (v2.9.2): Bekleyen tüm setTimeout'ları iptal et
      // (engine.reset/engine.start unmount edilmiş component'te state update yapmasın)
      for (const id of timeoutRefs.current) {
        clearTimeout(id);
      }
      timeoutRefs.current.clear();
    };
  }, []);

  // Cancel queue
  const handleCancelQueue = () => {
    haptic("light");
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setQueueStatus("idle");
    setFeedback(null);
  };

  // P0: Hemen Maç — 2 kredi, anında rakip
  // v2.9.147 ONBOARDING FIX: İlk hazırlık maçında (onboarding.stepsCompleted'da
  // 'first_friendly' YOKSA) en zayıf rakibi seç — kullanıcı ilk galibiyetini
  // yaşasın. 'first_friendly' tamamlandıktan sonra rastgele/rakip-OVR seçimi.
  const isFirstFriendly = !useOnboardingStepCompleted("first_friendly");
  // v2.9.149: Grace period boyunca (ilk 7 gün) de kolay rakip seç.
  const isGraceActive = useAppStore((s) => {
    if (!s.onboarding?.gracePeriodEndsAt) return false;
    return Date.now() < s.onboarding.gracePeriodEndsAt;
  });
  const easyOpponentPool = isFirstFriendly || isGraceActive;

  const handleInstantMatch = () => {
    haptic("medium");
    const ok = spendCredits(2);
    if (!ok) {
      haptic("error");
      setFeedback("✗ Yetersiz kredi! Sıraya girerek ücretsüz maç yapabilirsin.");
      safeTimeout(() => setFeedback(null), 3000);
      return;
    }

    let chosenOpp;
    if (easyOpponentPool) {
      // İlk maç VEYA grace period boyunca: en zayıf rakip seç
      const oppsWithOvr = opponents.map((c) => ({
        club: c,
        ovr: Math.round(c.players.reduce((s, p) => s + p.rating, 0) / c.players.length),
      }));
      oppsWithOvr.sort((a, b) => a.ovr - b.ovr);
      const pool = oppsWithOvr.slice(0, Math.min(5, oppsWithOvr.length));
      chosenOpp = pool[Math.floor(Math.random() * pool.length)]?.club;
      if (chosenOpp && isFirstFriendly) {
        completeOnboardingStep("first_friendly");
      }
    } else {
      // Grace bittikten sonra: tam rastgele
      chosenOpp = opponents[Math.floor(Math.random() * opponents.length)];
    }

    if (chosenOpp) {
      setSelectedOppId(chosenOpp.id);
      setFeedback(
        isFirstFriendly
          ? `✓ İlk maçın! ${chosenOpp.name} ile kolay bir başlangıç yapıyorsun.`
          : isGraceActive
          ? `✓ 2 kredi harcandı — ${chosenOpp.name} ile maç başlıyor. (Kolay rakip — grace period)`
          : `✓ 2 kredi harcandı — ${chosenOpp.name} ile maç başlıyor!`
      );
      haptic("success");
      safeTimeout(() => {
        setMatchStarted(true);
        engine.reset();
        engine.start();
      }, 600);
    }
  };

  if (!team) {
    return (
      <div className="px-4 py-16 text-center text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  // v2.9.92: Hazırlık maçı artık MatchScreen'i kullanır — resmi maçla aynı ekran
  if (matchStarted && opponent && team) {
    return (
      <MatchScreen
        isFriendly={true}
        friendlyHomeTeam={team}
        friendlyAwayTeam={opponent}
        onFriendlyFinish={(home, away, replayData) => {
          if (home === 0 && away === 0 && !replayData) {
            // İptal edildi
            setMatchStarted(false);
            engine.reset();
          } else {
            setMatchResult({ home, away, replayData });
            setMatchStarted(false);
            // v2.9.147: FirstWinCelebration için sonucu store'a yaz
            useAppStore.getState().setLastFriendlyResult({
              homeScore: home,
              awayScore: away,
              homeName: team?.name,
              awayName: opponent?.name,
            });
          }
        }}
      />
    );
  }

  // Maç sonucu ekranı
  if (matchResult && opponent) {
    return (
      <FriendlyResultView
        team={team}
        opponent={opponent}
        homeScore={matchResult.home}
        awayScore={matchResult.away}
        replayData={matchResult.replayData}
        onPlayAgain={() => {
          setMatchResult(null);
          engine.reset();
        }}
        onChangeOpponent={() => {
          setMatchResult(null);
          setSelectedOppId(null);
          engine.reset();
        }}
      />
    );
  }

  // Rakip seçim ekranı
  return (
    <div className="px-4 py-4 pb-24 space-y-3">
      {/* Header */}
      <div className="tm-card p-3 bg-amber-50/40 border-amber-200">
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={16} className="text-amber-600" />
          <h1 className="text-base font-bold">{t("friendly.title")}</h1>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Bot takımlarla dostluk maçı oyna. Sonuçlar <strong className="text-foreground">lig puanını etkilemez</strong> ama oyuncuların formu ve morali <strong className="text-emerald-400">her zaman pozitif</strong> yönde etkilenir (antrenman niteliğinde).
        </p>
      </div>

      {/* Feedback mesajı */}
      {feedback && (
        <div className="tm-card p-2.5 text-center text-xs font-bold bg-amber-50 border-amber-200 text-amber-800">
          {feedback}
        </div>
      )}

      {/* İki ana buton */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleJoinQueue}
          disabled={queueStatus === "searching"}
          className="tm-tap flex flex-col items-center gap-1 p-3 rounded-lg bg-emerald-600 text-white text-xs font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          <Users size={20} />
          {queueStatus === "searching" ? "Hazırlanıyor..." : "Sıraya Gir"}
        </button>
        <button
          onClick={handleInstantMatch}
          disabled={queueStatus === "searching"}
          className="tm-tap flex flex-col items-center gap-1 p-3 rounded-lg bg-sky-600 text-white text-xs font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          <Search size={20} />
          {/* v2.9.145 M6 FIX: badge ile simge çakışmasın diye ayrı flex yapısı */}
          <span className="flex items-center gap-1 flex-wrap justify-center">
            <span>Hemen Maç Başlat</span>
            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-amber-500/30 shrink-0">
              <Coins size={10} /> 2
            </span>
          </span>
        </button>
      </div>

      {/* v2.9.85: Dürüst açıklama — gerçek kullanıcı ile hazırlık maçı */}
      <div className="tm-card p-2.5 bg-sky-500/5 border-sky-500/20 text-[10px] text-muted-foreground leading-relaxed">
        ℹ️ <strong className="text-foreground">Sıraya Gir:</strong> Sıradaki gerçek kullanıcı ile dostluk maçı oynarsın. Sonuç kaydedilmez, sadece pratik. Maç sırasında rakip ile sohbet edebilirsin.
      </div>

      {/* Queue searching indicator */}
      {queueStatus === "searching" && (
        <div className="tm-card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <div className="text-xs font-bold text-emerald-700">Online oyuncu aranıyor...</div>
          <div className="text-[10px] text-muted-foreground mt-1">Sohbet için diğer kullanıcı aranılıyor (max 30 sn). Bulunmazsa bot ile oynanır.</div>
          <button
            onClick={handleCancelQueue}
            className="tm-tap mt-3 px-4 py-1.5 rounded-md bg-muted text-muted-foreground text-xs font-bold border border-border"
          >
            İptal Et
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rakip ara..."
          className="w-full bg-card border border-border rounded-md pl-8 pr-3 py-2 text-xs"
        />
      </div>

      {/* Rakip listesi */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
          {t("friendly.select_opponent")} ({opponents.length})
        </div>
        <div className="tm-card divide-y divide-border">
          {opponents.slice(0, 30).map((opp) => {
            const avgOvr = Math.round(
              opp.players.reduce((s, p) => s + p.rating, 0) / opp.players.length
            );
            const isSelected = selectedOppId === opp.id;
            return (
              <button
                key={opp.id}
                onClick={() => {
                  haptic("light");
                  setSelectedOppId(opp.id);
                }}
                className={cn(
                  "tm-tap w-full flex items-center gap-3 p-2.5 text-left transition-colors",
                  isSelected && "bg-primary/5"
                )}
              >
                <ClubBadge short={opp.shortName} primaryColor={opp.primaryColor} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{opp.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Lig {opp.leagueTier} · Ort. OVR {avgOvr} · {opp.players.length} oyuncu
                  </div>
                </div>
                {isSelected && (
                  <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                    Seçildi
                  </span>
                )}
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>
            );
          })}
          {opponents.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Rakip bulunamadı.
            </div>
          )}
        </div>
      </div>

      {/* Başlat butonu */}
      {opponent && (
        <div className="sticky bottom-16 z-20">
          <button
            onClick={() => {
              haptic("medium");
              engine.reset();
              setMatchStarted(true);
              safeTimeout(() => engine.start(), 100);
            }}
            className="tm-tap w-full py-3 rounded-lg bg-amber-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
          >
            <Play size={16} />
            {opponent.name} ile Hazırlık Maçı Başlat
          </button>
        </div>
      )}
    </div>
  );
}

// ===== Canlı maç izleme =====
// v2.9.57: Friendly maç online olacağı için DURAKLAT butonu YOK
// Taktik butonu her zaman aktif (modal olarak açılır, pause gerektirmez)
// Maç bitince events/motm/stats'i onFinish ile taşı — sonradan "İzle" için
function FriendlyLiveView({
  team,
  opponent,
  engine,
  onFinish,
  onCancel,
}: {
  team: any;
  opponent: any;
  engine: ReturnType<typeof useMatchEngine>;
  onFinish: (home: number, away: number, replayData?: { events?: any[]; motmId?: string; stats?: any }) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useI18n();
  const s = engine.state;
  const { user } = useSupabaseAuth();
  const [showChat, setShowChat] = useState(false);
  const [showTactics, setShowTactics] = useState(false);
  const [matchTab, setMatchTab] = useState<"feed" | "stats">("feed");
  const matchIdRef = useRef<string | null>(null);
  if (matchIdRef.current === null) {
    matchIdRef.current = `friendly_${team.id}_${opponent.id}_${Date.now()}`;
  }
  const matchId = matchIdRef.current;
  const userIdRef = useRef<string | null>(null);
  if (userIdRef.current === null) {
    if (user?.id) {
      userIdRef.current = user.id;
    } else if (typeof window !== "undefined") {
      const existing = localStorage.getItem("tm_guest_id");
      if (existing) {
        userIdRef.current = existing;
      } else {
        const newId = `guest_${Date.now()}`;
        localStorage.setItem("tm_guest_id", newId);
        userIdRef.current = newId;
      }
    } else {
      userIdRef.current = `guest_ssr`;
    }
  }
  const stableUserId = userIdRef.current;

  // v2.9.56: Taktik ayarları
  const tactics = useAppStore((s) => s.tactics);
  const setSlider = useAppStore((s) => s.setSlider);
  const updateActiveTactic = useAppStore((s) => s.updateActiveTactic);

  useEffect(() => {
    if (s.status === "finished") {
      // v2.9.57: Engine'in tüm event'lerini + MOTM + stats'i topla — sonradan "İzle" için
      const replayData = {
        events: (s.events || []).map((ev: any) => ({
          minute: ev.minute,
          type: ev.type,
          team: ev.teamSide ?? ev.team,
          side: ev.teamSide ?? ev.team,
          player: ev.playerName ?? ev.player ?? ev.text,
          playerName: ev.playerName ?? ev.player,
          playerId: ev.playerId,
          description: ev.description ?? ev.text,
        })),
        motmId: (s as any).motmPlayerId,
        stats: s.stats,
      };
      onFinish(s.homeScore, s.awayScore, replayData);
    }
  }, [s.status, s.homeScore, s.awayScore, s.events, onFinish]);

  return (
    <div className="px-3 py-3 pb-24 space-y-3">
      {/* Top bar — takımlar + skor */}
      <div className="tm-card p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-amber-600 px-2 py-0.5 rounded-full bg-amber-100">
            {t("friendly.title")}
          </span>
          <button
            onClick={() => {
              if (confirm("Maçı iptal et? Sonuç kaydedilmez.")) {
                haptic("light");
                onCancel();
              }
            }}
            className="tm-tap text-[10px] text-muted-foreground hover:text-red-500"
          >
            İptal
          </button>
        </div>
        <div className="flex items-center justify-center gap-3 py-2">
          <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
            <ClubBadge short={team.shortName} primaryColor={team.primaryColor} size={44} />
            <span className="text-[10px] font-semibold truncate w-full text-center">
              {team.name}
            </span>
          </div>
          <div className="text-center px-3">
            <div className="text-2xl font-bold tabular-nums">
              {s.homeScore}<span className="text-muted-foreground mx-1">-</span>{s.awayScore}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {s.status === "live" ? `${s.minute}'` : s.status === "paused" ? "Duraklatıldı" : "Bitti"}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
            <ClubBadge short={opponent.shortName} primaryColor={opponent.primaryColor} size={44} />
            <span className="text-[10px] font-semibold truncate w-full text-center">
              {opponent.name}
            </span>
          </div>
        </div>
      </div>

      {/* v2.9.57: DURAKLAT BUTONU YOK — online maç olduğu için pause edilemez
          Sadece Taktik değiştir butonu var, her zaman aktif (modal olarak açılır) */}
      {s.status !== "finished" && (
        <div className="flex gap-2">
          <button
            onClick={() => { haptic("light"); setShowTactics(!showTactics); }}
            className={cn(
              "tm-tap flex-1 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-1.5",
              showTactics
                ? "bg-primary text-primary-foreground"
                : "bg-amber-600 text-white"
            )}
          >
            <Settings size={12} />
            {showTactics ? "Kapat" : "Taktik Değiştir"}
          </button>
        </div>
      )}

      {/* v2.9.57: Taktik paneli — her zaman açılabilir (pause gerektirmez) */}
      {showTactics && s.status !== "finished" && (
        <div className="tm-card p-3 space-y-3">
          <div className="text-[10px] font-bold uppercase text-muted-foreground">Taktik Ayarları</div>
          {/* Slider'lar */}
          <TacticSlider
            label="Hücum Presi"
            value={tactics.sliders.attackingPressure}
            onChange={(v) => setSlider("attackingPressure", v)}
          />
          <TacticSlider
            label="Defansif Hat"
            value={tactics.sliders.defensiveLine}
            onChange={(v) => setSlider("defensiveLine", v)}
          />
          <TacticSlider
            label="Tempo"
            value={tactics.sliders.tempo}
            onChange={(v) => setSlider("tempo", v)}
          />
          <TacticSlider
            label="Kanat Oyunu"
            value={tactics.sliders.wingPlay}
            onChange={(v) => setSlider("wingPlay", v)}
          />
          {/* Mentalite */}
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">Mentalite</div>
            <div className="flex gap-1">
              {([1, 2, 3, 4, 5] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { haptic("light"); updateActiveTactic({ mentality: m }); }}
                  className={cn(
                    "tm-tap flex-1 py-1 rounded text-[10px] font-bold",
                    (tactics.active?.mentality ?? 3) === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {m === 1 ? "Çok Def" : m === 2 ? "Def" : m === 3 ? "Dengeli" : m === 4 ? "Hüc" : "Çok Hüc"}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => { haptic("light"); setShowTactics(false); }}
            className="tm-tap w-full py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold"
          >
            Tamam
          </button>
        </div>
      )}

      {/* Sekme seçici — Olaylar / İstatistik */}
      {(s.status === "live" || s.status === "paused" || s.status === "finished") && (
        <div className="flex gap-1 p-1 bg-muted rounded-md">
          <button
            onClick={() => { haptic("light"); setMatchTab("feed"); }}
            className={cn("flex-1 py-1.5 rounded text-[10px] font-bold", matchTab === "feed" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            📋 Olaylar
          </button>
          <button
            onClick={() => { haptic("light"); setMatchTab("stats"); }}
            className={cn("flex-1 py-1.5 rounded text-[10px] font-bold", matchTab === "stats" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            📊 İstatistik
          </button>
        </div>
      )}

      {/* v2.9.87: Olaylar sekmesi — resmi maçtaki spiker/event feed kullanılır */}
      {matchTab === "feed" && (
        <EventFeed
          events={s.events}
          emptyText="Maç başlıyor..."
          locale={locale as Locale}
          homeTeam={team}
          awayTeam={opponent}
        />
      )}

      {/* İstatistik sekmesi — v2.9.57: Resmi maçlar gibi detaylı (goller, kartlar, MOTM, istatistikler) */}
      {matchTab === "stats" && (
        <div className="space-y-2">
          {/* Maç istatistikleri — v2.9.91: Resmi maç kadar detaylı */}
          <div className="tm-card p-3 space-y-2">
            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">İstatistikler</div>
            <SimpleStatBar label="Topla Oynama %" home={s.stats?.possession?.[0] ?? 50} away={s.stats?.possession?.[1] ?? 50} />
            <SimpleStatBar label="İsabetli Şut" home={s.stats?.shotsOnTarget?.[0] ?? 0} away={s.stats?.shotsOnTarget?.[1] ?? 0} />
            <SimpleStatBar label="Korner" home={s.stats?.corners?.[0] ?? 0} away={s.stats?.corners?.[1] ?? 0} />
            <SimpleStatBar label="Faul" home={s.stats?.fouls?.[0] ?? 0} away={s.stats?.fouls?.[1] ?? 0} />
            {/* v2.9.91: Ek istatistikler — event'lerden hesapla */}
            {(() => {
              const events = s.events || [];
              const homeShots = events.filter((e: any) => (e.type === "shot_saved" || e.type === "shot_wide" || e.type === "shot_post" || e.type === "goal") && (e.team === "home" || e.teamSide === "home")).length;
              const awayShots = events.filter((e: any) => (e.type === "shot_saved" || e.type === "shot_wide" || e.type === "shot_post" || e.type === "goal") && (e.team === "away" || e.teamSide === "away")).length;
              const homeSaves = events.filter((e: any) => (e.type === "shot_saved" || e.type === "save") && (e.team === "away" || e.teamSide === "away")).length;
              const awaySaves = events.filter((e: any) => (e.type === "shot_saved" || e.type === "save") && (e.team === "home" || e.teamSide === "home")).length;
              const homeOffside = events.filter((e: any) => e.type === "offside" && (e.team === "home" || e.teamSide === "home")).length;
              const awayOffside = events.filter((e: any) => e.type === "offside" && (e.team === "away" || e.teamSide === "away")).length;
              return (
                <>
                  <SimpleStatBar label="Toplam Şut" home={homeShots} away={awayShots} />
                  <SimpleStatBar label="Kurtarış" home={homeSaves} away={awaySaves} />
                  <SimpleStatBar label="Ofsayt" home={homeOffside} away={awayOffside} />
                </>
              );
            })()}
          </div>

          {/* Goller — resmi maçlar gibi gol scorers listesi */}
          {(() => {
            const goals = (s.events || []).filter((ev: any) => ev.type === "goal" || ev.text?.includes("GOL") || ev.text?.includes("GOOOL"));
            if (goals.length === 0) return null;
            return (
              <div className="tm-card p-3">
                <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">⚽ Goller</div>
                <div className="space-y-1.5">
                  {goals.map((g: any, i: number) => {
                    const isHome = g.teamSide === "home" || g.team === "home";
                    const scorerName = g.playerName ?? g.player ?? g.text ?? "Bilinmiyor";
                    return (
                      <div key={i} className={cn("flex items-center gap-2 text-[10px]", !isHome && "flex-row-reverse text-right")}>
                        <span className="font-bold tabular-nums text-muted-foreground w-8">{g.minute}'</span>
                        <span className="text-base">⚽</span>
                        <span className="font-semibold flex-1 truncate text-left">{scorerName}</span>
                        <span className={cn("text-[11px] px-1 py-0.5 rounded font-bold", isHome ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300")}>
                          {isHome ? team.shortName : opponent.shortName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Kartlar */}
          {(() => {
            const cards = (s.events || []).filter((ev: any) =>
              ev.type === "yellow_card" || ev.type === "red_card" ||
              ev.type === "yellow" || ev.type === "red" ||
              ev.text?.includes("sarı kart") || ev.text?.includes("kırmızı kart")
            );
            if (cards.length === 0) return null;
            return (
              <div className="tm-card p-3">
                <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">🟨🟥 Kartlar</div>
                <div className="space-y-1.5">
                  {cards.map((c: any, i: number) => {
                    const isHome = c.teamSide === "home" || c.team === "home";
                    const isRed = c.type === "red_card" || c.type === "red" || c.text?.includes("kırmızı");
                    const playerName = c.playerName ?? c.player ?? c.text ?? "Bilinmiyor";
                    return (
                      <div key={i} className={cn("flex items-center gap-2 text-[10px]", !isHome && "flex-row-reverse text-right")}>
                        <span className="font-bold tabular-nums text-muted-foreground w-8">{c.minute}'</span>
                        <span className="text-base">{isRed ? "🟥" : "🟨"}</span>
                        <span className="font-semibold flex-1 truncate text-left">{playerName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Maçın Adamı — maç bittikten sonra göster */}
          {s.status === "finished" && (s as any).motmPlayerId && (() => {
            const motm = [...team.players, ...opponent.players].find(p => p.id === (s as any).motmPlayerId);
            if (!motm) return null;
            const isHome = team.players.some(p => p.id === motm.id);
            return (
              <div className="tm-card p-3 bg-amber-500/10 border-amber-500/30">
                <div className="text-[10px] font-bold text-amber-300 mb-1.5">⭐ Maçın Adamı</div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[10px] font-bold text-white shrink-0"
                    style={{ background: isHome ? team.primaryColor : opponent.primaryColor }}
                  >
                    {motm.specificPosition}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate">{motm.firstName} {motm.lastName}</div>
                    <div className="text-[11px] text-muted-foreground">{motm.specificPosition} · {isHome ? team.name : opponent.name}</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* v2.9.22 Y10: Boşluk — chat butonu için sabit alan */}
      {s.status !== "finished" && <div className="h-16" />}

      {/* v2.9.22 Y10: Sabit chat box — fixed en altta, açılınca yukarı doğru */}
      {s.status !== "finished" && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pointer-events-none">
          {/* Chat panel — yukarı doğru açılır */}
          {showChat && (
            <div className="pointer-events-auto mb-2 max-h-[300px] overflow-y-auto tm-thin-scrollbar bg-card border border-border rounded-t-lg shadow-lg">
              <MatchChatPanel
                matchId={matchId}
                userId={stableUserId}
                userName={team?.name ?? "Menajer"}
                onClose={() => setShowChat(false)}
              />
            </div>
          )}
          {/* Sabit chat toggle butonu — her zaman görünür */}
          <button
            onClick={() => { haptic("light"); setShowChat(!showChat); }}
            className="pointer-events-auto tm-tap w-full py-2.5 rounded-md bg-sky-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg"
          >
            {showChat ? t("friendly.chat_close") : t("friendly.chat_with_opponent")}
          </button>
        </div>
      )}
    </div>
  );
}

// ===== Maç sonucu =====
// v2.9.57: "Maçı İzle" butonu eklendi — MatchReplayModal açar
// Stored events ile açıldığı için spiker yorumları birebir aynı olur
function FriendlyResultView({
  team,
  opponent,
  homeScore,
  awayScore,
  replayData,
  onPlayAgain,
  onChangeOpponent,
}: {
  team: any;
  opponent: any;
  homeScore: number;
  awayScore: number;
  replayData?: { events?: any[]; motmId?: string; stats?: any };
  onPlayAgain: () => void;
  onChangeOpponent: () => void;
}) {
  const { t } = useI18n();
  const [showReplay, setShowReplay] = useState(false);
  const won = homeScore > awayScore;
  const drew = homeScore === awayScore;
  const resultText = won ? "Kazandın!" : drew ? "Berabere" : "Kaybettin";
  const resultColor = won
    ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : drew
    ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-red-600 bg-red-50 border-red-200";

  return (
    <div className="px-4 py-4 pb-24 space-y-3">
      {/* Sonuç kartı */}
      <div className={cn("tm-card p-5 text-center border-2", resultColor)}>
        <div className="text-[10px] font-bold uppercase tracking-wide mb-2 opacity-70">
          Hazırlık Maçı Sonucu
        </div>
        <div className="text-2xl font-bold mb-3">{resultText}</div>
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
            <ClubBadge short={team.shortName} primaryColor={team.primaryColor} size={40} />
            <span className="text-[10px] font-semibold truncate w-full text-center">
              {team.name}
            </span>
          </div>
          <div className="text-3xl font-bold tabular-nums">
            {homeScore}<span className="text-muted-foreground mx-1">-</span>{awayScore}
          </div>
          <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
            <ClubBadge short={opponent.shortName} primaryColor={opponent.primaryColor} size={40} />
            <span className="text-[10px] font-semibold truncate w-full text-center">
              {opponent.name}
            </span>
          </div>
        </div>
      </div>

      {/* Bilgi kartı */}
      <div className="tm-card p-3 bg-muted/30">
        <div className="text-[10px] text-muted-foreground leading-relaxed">
          💡 Hazırlık maçları lig puanını etkilemez. Oyuncuların formu ve morali her zaman pozitif yönde gelişti. Bir sonraki resmi maçta taze kadro kullanmak için kondisyonlarını takip et.
        </div>
      </div>

      {/* Aksiyon butonları */}
      <div className="space-y-2">
        {/* v2.9.57: Maçı İzle butonu — MatchReplayModal açar */}
        {replayData?.events && replayData.events.length > 0 && (
          <button
            onClick={() => { haptic("medium"); setShowReplay(true); }}
            className="tm-tap w-full py-2.5 rounded-md bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            <Play size={14} />
            Maçı İzle (Spiker Yorumlarıyla)
          </button>
        )}
        <button
          onClick={() => { haptic("medium"); onPlayAgain(); }}
          className="tm-tap w-full py-2.5 rounded-md bg-amber-600 text-white text-sm font-bold flex items-center justify-center gap-2"
        >
          <RotateCcw size={14} />
          Aynı Rakiple Tekrar Oyna
        </button>
        <button
          onClick={() => { haptic("light"); onChangeOpponent(); }}
          className="tm-tap w-full py-2.5 rounded-md bg-card border border-border text-sm font-bold flex items-center justify-center gap-2"
        >
          <Users size={14} />
          Başka Rakip Seç
        </button>
      </div>

      {/* v2.9.57: Maç tekrar izleme modal'ı — stored events ile */}
      {showReplay && (
        <MatchReplayModal
          homeTeam={team}
          awayTeam={opponent}
          homeScore={homeScore}
          awayScore={awayScore}
          storedEvents={replayData?.events}
          storedMotmId={replayData?.motmId}
          storedStats={replayData?.stats}
          onClose={() => setShowReplay(false)}
        />
      )}
    </div>
  );
}

// v2.9.56: Basit taktik slider'ı — friendly maçta taktik değiştirme
function TacticSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[10px] font-bold tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

// v2.9.56: Basit istatistik bar'ı
function SimpleStatBar({ label, home, away }: { label: string; home: number; away: number }) {
  const total = Math.max(1, home + away);
  const homePct = Math.round((home / total) * 100);
  const awayPct = 100 - homePct;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-0.5">
        <span className="font-bold tabular-nums">{home}</span>
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold tabular-nums">{away}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
        <div className="bg-emerald-500" style={{ width: `${homePct}%` }} />
        <div className="bg-sky-500" style={{ width: `${awayPct}%` }} />
      </div>
    </div>
  );
}
