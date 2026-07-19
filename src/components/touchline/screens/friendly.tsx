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
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { useMatchEngine } from "@/hooks/use-match-engine";
import { POSITION_GROUP } from "@/lib/mock/data";
import { ClubBadge, PositionPill, RatingBadge } from "../ui-bits";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import { joinFriendlyQueue, type QueueUser, type MatchmakingCallbacks } from "@/lib/matchmaking";
import { useSupabaseAuth } from "@/lib/auth/auth-context";
import type { TabKey } from "../bottom-nav";
import { MatchChatPanel } from "../match-chat";

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
  // Guest kullanıcı "Online Sohbet + Maç" butonuna her tıklayışında farklı ID ile presence'a katılıyordu.
  // localStorage'da persistent guest ID tut → aynı kullanıcı hep aynı ID.
  const [stableGuestUserId] = useState(() => {
    if (typeof window === "undefined") return `guest_${Date.now()}`;
    if (user?.id) return user.id;
    const existing = localStorage.getItem("tm_guest_id");
    if (existing) return existing;
    const newId = `guest_${Date.now()}`;
    localStorage.setItem("tm_guest_id", newId);
    return newId;
  });
  const stableUserId = user?.id ?? stableGuestUserId;
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [matchStarted, setMatchStarted] = useState(false);
  const [matchResult, setMatchResult] = useState<{ home: number; away: number } | null>(null);
  const [search, setSearch] = useState("");
  const [queueStatus, setQueueStatus] = useState<"idle" | "searching" | "matched">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const cleanupRef = useRef<(() => void) | null>(null);

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

  const engine = useMatchEngine(
    team ?? (clubs[0] as any),
    opponent ?? (clubs[1] as any),
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
        // P0 FIX BUG #12: Dürüst mesaj — gerçek online maç değil, sohbet + bot maçı
        setFeedback("Online rakip aranıyor... Bulunursa sohbet edebilirsiniz. Maç her zaman bot takıma karşı oynanır (30 sn içinde bulunmazsa rastgele bot).");
      },
      onMatched: (oppUser: QueueUser) => {
        haptic("success");
        // P0 FIX BUG #12: Dürüst etiketleme — gerçek online maç DEĞİL
        // Bulunan online rakiple sadece sohbet edilebilir; maç benzer güçte bir bot'a karşı oynanır
        setFeedback(`✓ Online oyuncu bulundu: ${oppUser.teamName} (OVR ${oppUser.teamOvr}). Sohbet açıktır! Maç, benzer güçte bir bot takıma karşı oynanır (gerçek online maç henüz desteklenmiyor).`);
        setQueueStatus("matched");
        // Rakibin OVR'sine yakın bir bot bul
        const targetOvr = oppUser.teamOvr ?? 70;
        const sortedOpps = [...opponents].sort((a, b) => {
          const aOvr = Math.round(a.players.reduce((s, p) => s + p.rating, 0) / a.players.length);
          const bOvr = Math.round(b.players.reduce((s, p) => s + p.rating, 0) / b.players.length);
          return Math.abs(aOvr - targetOvr) - Math.abs(bOvr - targetOvr);
        });
        const randomOpp = sortedOpps[0] ?? opponents[Math.floor(Math.random() * opponents.length)];
        if (randomOpp) {
          setSelectedOppId(randomOpp.id);
          setTimeout(() => {
            setMatchStarted(true);
            engine.reset();
            engine.start();
          }, 800);
        }
      },
      onTimeout: () => {
        haptic("light");
        // P0 FIX BUG #12: Dürüst mesaj
        setFeedback("Online oyuncu bulunamadı — bot ile oynanıyor...");
        const randomOpp = opponents[Math.floor(Math.random() * opponents.length)];
        if (randomOpp) {
          setSelectedOppId(randomOpp.id);
          setQueueStatus("matched");
          setTimeout(() => {
            setMatchStarted(true);
            engine.reset();
            engine.start();
          }, 600);
        } else {
          setQueueStatus("idle");
          setFeedback("Rakip bulunamadı, tekrar dene.");
        }
      },
      onError: (msg) => {
        if (msg === "NO_SUPABASE") {
          // P0 FIX BUG #12: Dürüst mesaj — yanıltıcı "Eşleşme bulundu" DEĞİL
          setFeedback("Online mod kullanılamıyor — bot ile oynanıyor...");
          const delay = 1500 + Math.random() * 1000;
          setTimeout(() => {
            const randomOpp = opponents[Math.floor(Math.random() * opponents.length)];
            if (randomOpp) {
              setSelectedOppId(randomOpp.id);
              setQueueStatus("matched");
              haptic("success");
              setFeedback(`Bot rakip: ${randomOpp.name}`);
              setTimeout(() => {
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

  // Cleanup — component unmount olursa queue'dan çık
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
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

  // P0: Hemen Maç — 2 kredi, anında rastgele rakip
  const handleInstantMatch = () => {
    haptic("medium");
    const ok = spendCredits(2);
    if (!ok) {
      haptic("error");
      setFeedback("✗ Yetersiz kredi! Sıraya girerek ücretsiz maç yapabilirsin.");
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    // Anında rastgele rakip seç ve başlat
    const randomOpp = opponents[Math.floor(Math.random() * opponents.length)];
    if (randomOpp) {
      setSelectedOppId(randomOpp.id);
      setFeedback(`✓ 2 kredi harcandı — ${randomOpp.name} ile maç başlıyor!`);
      haptic("success");
      setTimeout(() => {
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

  // Maç başlatıldıysa canlı izleme ekranı
  if (matchStarted && opponent) {
    return (
      <FriendlyLiveView
        team={team}
        opponent={opponent}
        engine={engine}
        onFinish={(home, away) => {
          setMatchResult({ home, away });
          setMatchStarted(false);
        }}
        onCancel={() => {
          engine.reset();
          setMatchStarted(false);
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
          <h1 className="text-base font-bold">Hazırlık Maçı</h1>
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
          {queueStatus === "searching" ? "Aranıyor..." : "Online Sohbet + Maç"}
        </button>
        <button
          onClick={handleInstantMatch}
          disabled={queueStatus === "searching"}
          className="tm-tap flex flex-col items-center gap-1 p-3 rounded-lg bg-sky-600 text-white text-xs font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          <Search size={20} />
          <span className="flex items-center gap-1">
            Hemen Maç
            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-amber-500/30">
              <Coins size={10} /> 2
            </span>
          </span>
        </button>
      </div>

      {/* P0 FIX BUG #12: Dürüst açıklama — online mod gerçekte nedir? */}
      <div className="tm-card p-2.5 bg-sky-500/5 border-sky-500/20 text-[10px] text-muted-foreground leading-relaxed">
        ℹ️ <strong className="text-foreground">Online Sohbet + Maç:</strong> Diğer online oyuncularla eşleşir, maç sırasında sohbet edebilirsiniz. Maç, rakibin OVR'sine yakın bir <strong className="text-foreground">bot takıma</strong> karşı oynanır (gerçek online maç henüz desteklenmiyor).
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
          Rakip Seç ({opponents.length})
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
              setTimeout(() => engine.start(), 100);
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
  onFinish: (home: number, away: number) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const s = engine.state;
  const { user } = useSupabaseAuth();
  const [showChat, setShowChat] = useState(false);
  // BULGU #3 DÜZELTME (v2.9.1): matchId her render'da yeniden üretiliyordu
  // (Date.now() her render'da yeni değer döner). Bu, MatchChatPanel useEffect'ini
  // her engine state update (800ms'de bir) tetikliyordu → chat kanalı sürekli
  // unsubscribe + re-subscribe döngüsü → "Sohbet bağlanıyor..." döngüsü.
  // useState initializer ile matchId'yi BİR KEZ oluştur.
  const [matchId] = useState(() => `friendly_${team.id}_${opponent.id}_${Date.now()}`);
  // BULGU #4 DÜZELTME (v2.9.1): guest userId her render'da yeniden üretiliyordu.
  // Kullanıcının kendi gönderdiği mesajlar "başka kullanıcı" görünüyordu (isMe kontrolü fail).
  // localStorage'da persistent guest ID tut — parent FriendlyScreen ile aynı ID'yi kullan.
  const [stableUserId] = useState(() => {
    if (typeof window === "undefined") return `guest_${Date.now()}`;
    if (user?.id) return user.id;
    const existing = localStorage.getItem("tm_guest_id");
    if (existing) return existing;
    const newId = `guest_${Date.now()}`;
    localStorage.setItem("tm_guest_id", newId);
    return newId;
  });

  // P0 FIX: useMemo içinde side-effect YASAK — useEffect kullan
  useEffect(() => {
    if (s.status === "finished") {
      onFinish(s.homeScore, s.awayScore);
    }
  }, [s.status, s.homeScore, s.awayScore, onFinish]);

  return (
    <div className="px-3 py-3 pb-24 space-y-3">
      {/* Top bar — takımlar + skor */}
      <div className="tm-card p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-amber-600 px-2 py-0.5 rounded-full bg-amber-100">
            Hazırlık Maçı
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

      {/* Pause / Resume */}
      {s.status !== "finished" && (
        <div className="flex gap-2">
          {s.status === "live" ? (
            <button
              onClick={() => { haptic("light"); engine.pause(); }}
              className="tm-tap flex-1 py-2 rounded-md bg-amber-600 text-white text-xs font-bold"
            >
              Duraklat
            </button>
          ) : (
            <button
              onClick={() => { haptic("medium"); engine.start(); }}
              className="tm-tap flex-1 py-2 rounded-md bg-emerald-600 text-white text-xs font-bold"
            >
              Devam Et
            </button>
          )}
        </div>
      )}

      {/* Event feed */}
      <div className="tm-card p-2">
        <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2 px-1">
          Olaylar
        </div>
        <div className="space-y-1 max-h-72 overflow-y-auto tm-thin-scrollbar">
          {s.events.length === 0 && (
            <div className="text-[10px] text-muted-foreground text-center py-4">
              Maç başlıyor...
            </div>
          )}
          {s.events.map((ev: any, i: number) => (
            <div key={i} className="flex items-center gap-2 p-1.5 rounded-md text-[10px]">
              <span className="text-muted-foreground tabular-nums w-7">{ev.minute}'</span>
              <span className="flex-1">{ev.text ?? ev.type}</span>
              {ev.teamSide === "home" && <span className="text-xs">{team.shortName}</span>}
              {ev.teamSide === "away" && <span className="text-xs">{opponent.shortName}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* P0: Sohbet — rakip ile mesajlaşma */}
      {s.status !== "finished" && (
        <div>
          <button
            onClick={() => { haptic("light"); setShowChat(!showChat); }}
            className="tm-tap w-full py-2 rounded-md bg-sky-600/20 text-sky-400 text-xs font-bold border border-sky-500/30 flex items-center justify-center gap-1.5"
          >
            {showChat ? "Sohbeti Gizle" : "💬 Rakip ile Sohbet"}
          </button>
          {showChat && (
            <div className="mt-2">
              <MatchChatPanel
                matchId={matchId}
                userId={stableUserId}
                userName={team?.name ?? "Menajer"}
                onClose={() => setShowChat(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Maç sonucu =====
function FriendlyResultView({
  team,
  opponent,
  homeScore,
  awayScore,
  onPlayAgain,
  onChangeOpponent,
}: {
  team: any;
  opponent: any;
  homeScore: number;
  awayScore: number;
  onPlayAgain: () => void;
  onChangeOpponent: () => void;
}) {
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
    </div>
  );
}
