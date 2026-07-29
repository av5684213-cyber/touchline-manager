"use client";

import { useState, useEffect, useCallback } from "react";
import { Trophy, Plus, Lock, Unlock, Users, Coins, Share2, Search, Loader2, X, Copy, Check } from "lucide-react";
import { useAppStore, useMyTeam } from "@/lib/store";
import { useSupabaseAuth } from "@/lib/auth/auth-context";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { haptic, useBodyScrollLock, useEscapeToClose } from "@/hooks/touchline";

type SpecialCup = {
  id: string;
  creator_id: string;
  creator_team_name: string;
  creator_team_short: string;
  creator_team_color: string;
  cup_name: string;
  size: number;
  is_password_protected: boolean;
  status: string;
  current_round: number;
  champion_team_name: string | null;
  created_at: string;
};

type Participant = {
  id: string;
  cup_id: string;
  user_id: string | null;
  team_name: string;
  team_short: string;
  team_color: string;
  is_creator: boolean;
  is_bot: boolean;
  joined_at: string;
};

type CupMatch = {
  id: string;
  round: number;
  home_team_name: string | null;
  away_team_name: string | null;
  home_team_short: string | null;
  away_team_short: string | null;
  home_team_color: string | null;
  away_team_color: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

export function SpecialCupPanel() {
  const { user } = useSupabaseAuth();
  const myTeam = useMyTeam();
  const credits = useAppStore((s) => s.credits);
  const spendCredits = useAppStore((s) => s.spendCredits);
  const addCredits = useAppStore((s) => s.addCredits);
  const [cups, setCups] = useState<SpecialCup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCup, setSelectedCup] = useState<SpecialCup | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadCups = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("special_cups")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) {
        setCups([]);
        return;
      }
      setCups(data ?? []);
    } catch {
      setCups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCups();
    // Realtime
    const channel = supabase
      .channel("special_cups_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "special_cups" }, () => loadCups())
      .on("postgres_changes", { event: "*", schema: "public", table: "special_cup_participants" }, () => loadCups())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadCups]);

  if (showCreate) {
    return (
      <CreateCupForm
        userId={user?.id ?? null}
        myTeam={myTeam}
        credits={credits}
        onSpendCredits={spendCredits}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); loadCups(); }}
      />
    );
  }

  if (selectedCup) {
    return (
      <CupDetail
        cup={selectedCup}
        userId={user?.id ?? null}
        myTeam={myTeam}
        credits={credits}
        onBack={() => { setSelectedCup(null); loadCups(); }}
        onFeedback={(msg) => setFeedback(msg)}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="tm-card p-3 bg-gradient-to-br from-purple-900/20 to-indigo-900/10 border-purple-500/30">
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={16} className="text-purple-400" />
          <h2 className="text-sm font-bold">🏆 Özel Kupa</h2>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Pazar günü özel kupa oluştur veya katıl. Davet linki ile arkadaşlarını çağır.
          Kupa oluşturma: 8 kredi · Katılım: 2 kredi
        </p>
      </div>

      {feedback && (
        <div className="tm-card p-2 text-center text-[11px] font-bold bg-amber-500/10 text-amber-300 border-amber-500/30">
          {feedback}
          <button onClick={() => setFeedback(null)} className="ml-2 text-amber-400">✕</button>
        </div>
      )}

      {/* Oluştur butonu */}
      <button
        onClick={() => { haptic("light"); setShowCreate(true); }}
        disabled={!user || !myTeam || credits < 8}
        className="tm-tap w-full py-2.5 rounded-lg bg-purple-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        <Plus size={14} /> Özel Kupa Oluştur (8 kredi)
      </button>

      {/* Açık kupalar listesi */}
      <div className="text-[10px] text-muted-foreground uppercase font-bold">Açık Kupalar</div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : cups.length === 0 ? (
        <div className="tm-card p-6 text-center text-[11px] text-muted-foreground">
          Henüz özel kupa yok. İlk kupayı sen oluştur!
        </div>
      ) : (
        <div className="space-y-2">
          {cups.map((cup) => (
            <CupCard key={cup.id} cup={cup} onSelect={() => setSelectedCup(cup)} />
          ))}
        </div>
      )}

      {!user && (
        <div className="tm-card p-2 text-center text-[10px] text-amber-400 bg-amber-500/10">
          Özel kupa için giriş yapmalısın.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Kupa Kartı
// ============================================================================
function CupCard({ cup, onSelect }: { cup: SpecialCup; onSelect: () => void }) {
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    supabase
      .from("special_cup_participants")
      .select("id", { count: "exact", head: true })
      .eq("cup_id", cup.id)
      .then(({ count }) => setParticipantCount(count ?? 0));
  }, [cup.id]);

  const statusLabel = cup.status === "waiting" ? "Bekliyor" : cup.status === "in_progress" ? "Devam ediyor" : "Tamamlandı";

  return (
    <button
      onClick={() => { haptic("light"); onSelect(); }}
      className="tm-tap w-full text-left tm-card p-3 hover:bg-accent/30 transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {cup.is_password_protected ? <Lock size={11} className="text-amber-400" /> : <Unlock size={11} className="text-emerald-400" />}
          <span className="text-xs font-bold truncate">{cup.cup_name}</span>
        </div>
        <span className={cn(
          "text-[9px] px-1.5 py-0.5 rounded font-bold",
          cup.status === "waiting" ? "bg-amber-500/20 text-amber-300" :
          cup.status === "in_progress" ? "bg-sky-500/20 text-sky-300" :
          "bg-emerald-500/20 text-emerald-300"
        )}>{statusLabel}</span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-0.5">
          <div className="w-4 h-4 rounded-sm" style={{ background: cup.creator_team_color }} />
          <span>{cup.creator_team_short}</span>
        </div>
        <span>·</span>
        <span className="flex items-center gap-0.5"><Users size={9} /> {participantCount}/{cup.size}</span>
        {cup.champion_team_name && (
          <>
            <span>·</span>
            <span className="text-amber-400">🏆 {cup.champion_team_name}</span>
          </>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// Kupa Oluşturma Formu
// ============================================================================
function CreateCupForm({
  userId, myTeam, credits, onSpendCredits, onClose, onCreated,
}: {
  userId: string | null;
  myTeam: any;
  credits: number;
  onSpendCredits: (n: number) => boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [cupName, setCupName] = useState("");
  const [size, setSize] = useState(8);
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!userId || !myTeam) return;
    if (cupName.trim().length < 3) { setError("Kupa adı en az 3 karakter olmalı."); return; }
    if (isProtected && password.length < 3) { setError("Şifre en az 3 karakter olmalı."); return; }

    setSubmitting(true);
    setError(null);

    // 8 kredi düş
    if (!onSpendCredits(8)) {
      setError("Yetersiz kredi! 8 kredi gerek.");
      setSubmitting(false);
      return;
    }

    try {
      const { data, error: rpcErr } = await supabase.rpc("rpc_create_special_cup", {
        p_creator_id: userId,
        p_cup_name: cupName.trim(),
        p_size: size,
        p_is_password_protected: isProtected,
        p_password: isProtected ? password : null,
        p_team_name: myTeam.name,
        p_team_short: myTeam.shortName,
        p_team_color: myTeam.primaryColor,
      });
      if (rpcErr) {
        setError(rpcErr.message);
        // Krediyi geri ver
        useAppStore.getState().addCredits(8);
        return;
      }
      if (!data?.success) {
        setError(data?.reason ?? "Kupa oluşturulamadı");
        useAppStore.getState().addCredits(8);
        return;
      }
      haptic("success");
      onCreated();
    } catch (e: any) {
      setError(e?.message ?? "Hata");
      useAppStore.getState().addCredits(8);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => { haptic("light"); onClose(); }} className="tm-tap p-1">
          <X size={18} />
        </button>
        <h2 className="text-sm font-bold">🏆 Özel Kupa Oluştur</h2>
      </div>

      {/* Kupa adı */}
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1">Kupa Adı</label>
        <input
          type="text"
          value={cupName}
          onChange={(e) => setCupName(e.target.value)}
          maxLength={40}
          placeholder="örn: Pazar Kupası 2026"
          className="w-full px-3 py-2.5 rounded-lg bg-card border border-border text-sm"
        />
      </div>

      {/* Takım sayısı */}
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1">Takım Sayısı</label>
        <div className="flex gap-2">
          {[4, 8, 12].map((s) => (
            <button
              key={s}
              onClick={() => { haptic("light"); setSize(s); }}
              className={cn(
                "tm-tap flex-1 py-2 rounded-lg text-xs font-bold border",
                size === s ? "bg-purple-600 text-white border-purple-600" : "bg-card border-border text-muted-foreground"
              )}
            >
              {s} takım
            </button>
          ))}
        </div>
      </div>

      {/* Şifre koruması */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { haptic("light"); setIsProtected(!isProtected); }}
          className={cn(
            "tm-tap flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border",
            isProtected ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-card border-border text-muted-foreground"
          )}
        >
          {isProtected ? <Lock size={12} /> : <Unlock size={12} />}
          {isProtected ? "Şifreli" : "Açık"}
        </button>
        {isProtected && (
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={20}
            placeholder="Şifre"
            className="flex-1 px-3 py-2 rounded-lg bg-card border border-border text-sm"
          />
        )}
      </div>

      {/* Maliyet */}
      <div className="tm-card p-2.5 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Maliyet</span>
        <span className="flex items-center gap-1 text-amber-300 font-bold text-sm">
          <Coins size={12} /> 8 kredi
        </span>
      </div>

      {error && <div className="text-[11px] text-red-400 text-center">{error}</div>}

      <button
        onClick={handleSubmit}
        disabled={submitting || !cupName.trim() || (isProtected && !password.trim())}
        className="tm-tap w-full py-2.5 rounded-lg bg-purple-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
        Kupayı Oluştur
      </button>
    </div>
  );
}

// ============================================================================
// Kupa Detayı — katılımcılar + bracket + davet
// ============================================================================
function CupDetail({
  cup, userId, myTeam, credits, onBack, onFeedback,
}: {
  cup: SpecialCup;
  userId: string | null;
  myTeam: any;
  credits: number;
  onBack: () => void;
  onFeedback: (msg: string) => void;
}) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<CupMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinPassword, setJoinPassword] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [{ data: pData }, { data: mData }] = await Promise.all([
        supabase.from("special_cup_participants").select("*").eq("cup_id", cup.id).order("joined_at"),
        supabase.from("special_cup_matches").select("*").eq("cup_id", cup.id).order("round, match_order"),
      ]);
      setParticipants(pData ?? []);
      setMatches(mData ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [cup.id]);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel(`special_cup_${cup.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "special_cup_participants", filter: `cup_id=eq.${cup.id}` }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "special_cup_matches", filter: `cup_id=eq.${cup.id}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cup.id, loadData]);

  const hasJoined = participants.some(p => p.user_id === userId);
  const isFull = participants.length >= cup.size;
  const isCreator = cup.creator_id === userId;
  const minTeamsMet = participants.length >= 4; // v2.9.40: min 4 takım
  const canStart = isCreator && minTeamsMet && cup.status === "waiting";

  const handleJoin = async () => {
    if (!userId || !myTeam) return;
    // 2 kredi düş
    if (credits < 2) { onFeedback("Yetersiz kredi! 2 kredi gerek."); return; }
    if (!useAppStore.getState().spendCredits(2)) { onFeedback("Kredi harcanamadı."); return; }

    try {
      const { data, error } = await supabase.rpc("rpc_join_special_cup", {
        p_cup_id: cup.id,
        p_user_id: userId,
        p_team_name: myTeam.name,
        p_team_short: myTeam.shortName,
        p_team_color: myTeam.primaryColor,
        p_password: cup.is_password_protected ? joinPassword : null,
      });
      if (error || !data?.success) {
        useAppStore.getState().addCredits(2); // geri ver
        onFeedback(data?.reason ?? error?.message ?? "Katılım başarısız");
        return;
      }
      haptic("success");
      onFeedback("✓ Kupaya katıldın!");
      loadData();
    } catch (e: any) {
      useAppStore.getState().addCredits(2);
      onFeedback(e?.message ?? "Hata");
    }
  };

  const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/?cup=${cup.id}`;

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      haptic("success");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: `${cup.cup_name} — Touchline Manager`,
          text: `Beni özel kupaya davet et! ${cup.cup_name}`,
          url: inviteLink,
        });
      } catch { /* user cancelled */ }
    } else {
      handleCopyLink();
    }
  };

  // v2.9.40: Kurucu kupayı başlat — bracket oluştur
  const handleStart = async () => {
    if (!isCreator || !minTeamsMet) return;
    haptic("medium");
    try {
      // Bracket eşleşmelerini oluştur
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const matchesToCreate: any[] = [];
      const rounds = Math.log2(cup.size); // 4→2, 8→3, 12→4 (approx)
      const firstRoundMatchCount = Math.floor(shuffled.length / 2);

      for (let i = 0; i < firstRoundMatchCount; i++) {
        const home = shuffled[i * 2];
        const away = shuffled[i * 2 + 1];
        if (home && away) {
          matchesToCreate.push({
            cup_id: cup.id,
            round: 1,
            match_order: i,
            home_participant_id: home.id,
            away_participant_id: away.id,
            home_team_name: home.team_name,
            away_team_name: away.team_name,
            home_team_short: home.team_short,
            away_team_short: away.team_short,
            home_team_color: home.team_color,
            away_team_color: away.team_color,
            status: "pending",
          });
        }
      }

      // Eşleşmeleri Supabase'e yaz
      if (matchesToCreate.length > 0) {
        const { error: matchErr } = await supabase.from("special_cup_matches").insert(matchesToCreate);
        if (matchErr) {
          onFeedback(`Eşleşme hatası: ${matchErr.message}`);
          return;
        }
      }

      // Kupa durumunu güncelle
      const { error: updateErr } = await supabase
        .from("special_cups")
        .update({ status: "in_progress", current_round: 1 })
        .eq("id", cup.id);

      if (updateErr) {
        onFeedback(`Durum güncelleme hatası: ${updateErr.message}`);
        return;
      }

      haptic("success");
      onFeedback("🏆 Kupa başladı! Eşleşmeler oluşturuldu.");
      loadData();
    } catch (e: any) {
      onFeedback(e?.message ?? "Kupa başlatma hatası");
    }
  };

  return (
    <div className="space-y-3">
      {/* Back + title */}
      <div className="flex items-center gap-2">
        <button onClick={() => { haptic("light"); onBack(); }} className="tm-tap p-1">
          <X size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold truncate">{cup.cup_name}</h2>
          <div className="text-[10px] text-muted-foreground">
            {cup.size} takım · {cup.is_password_protected ? "🔒 Şifreli" : "🔓 Açık"} · {cup.status === "waiting" ? "Bekliyor" : cup.status === "in_progress" ? "Devam ediyor" : "Tamamlandı"}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Katılımcılar */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1.5">
              Katılımcılar ({participants.length}/{cup.size})
            </div>
            <div className="space-y-1">
              {participants.map((p) => (
                <div key={p.id} className="tm-card p-2 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: p.team_color }}>
                    {p.team_short.slice(0, 3)}
                  </div>
                  <span className="text-xs font-semibold flex-1 truncate">{p.team_name}</span>
                  {p.is_creator && <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">KURUCU</span>}
                  {p.is_bot && <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">BOT</span>}
                </div>
              ))}
              {/* Boş slotlar */}
              {Array.from({ length: Math.max(0, cup.size - participants.length) }, (_, i) => (
                <div key={`empty-${i}`} className="tm-card p-2 flex items-center gap-2 opacity-40">
                  <div className="w-7 h-7 rounded-md bg-muted/30" />
                  <span className="text-xs text-muted-foreground">Boş slot</span>
                </div>
              ))}
            </div>
          </div>

          {/* Eşleşmeler (eğer başladıysa) */}
          {matches.length > 0 && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1.5">Eşleşmeler</div>
              <div className="space-y-1">
                {matches.map((m) => (
                  <div key={m.id} className="tm-card p-2 flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground w-12">Tur {m.round}</span>
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {m.home_team_color && <div className="w-4 h-4 rounded-sm" style={{ background: m.home_team_color }} />}
                        <span className="text-[11px] font-semibold">{m.home_team_short ?? "???"}</span>
                      </div>
                      <span className="text-[11px] font-bold tabular-nums">
                        {m.home_score ?? "-"} : {m.away_score ?? "-"}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold">{m.away_team_short ?? "???"}</span>
                        {m.away_team_color && <div className="w-4 h-4 rounded-sm" style={{ background: m.away_team_color }} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Şampiyon */}
          {cup.champion_team_name && (
            <div className="tm-card p-3 text-center bg-amber-500/10 border-amber-500/30">
              <Trophy size={24} className="text-amber-400 mx-auto mb-1" />
              <div className="text-sm font-bold text-amber-300">🏆 Şampiyon</div>
              <div className="text-xs font-bold">{cup.champion_team_name}</div>
            </div>
          )}

          {/* Katıl butonu */}
          {cup.status === "waiting" && !hasJoined && !isFull && (
            <>
              {cup.is_password_protected && (
                <input
                  type="text"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  placeholder="Kupa şifresi"
                  className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm"
                />
              )}
              <button
                onClick={handleJoin}
                disabled={!userId || !myTeam || credits < 2 || (cup.is_password_protected && !joinPassword.trim())}
                className="tm-tap w-full py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Users size={14} /> Katıl (2 kredi)
              </button>
            </>
          )}

          {/* Davet butonu */}
          {cup.status === "waiting" && hasJoined && (
            <>
              <button
                onClick={() => { haptic("light"); setShowInvite(!showInvite); }}
                className="tm-tap w-full py-2 rounded-lg bg-sky-600/20 text-sky-400 text-xs font-bold border border-sky-500/30 flex items-center justify-center gap-1.5"
              >
                <Share2 size={13} /> Davet Gönder
              </button>
              {showInvite && (
                <div className="tm-card p-3 space-y-2">
                  <div className="text-[10px] text-muted-foreground">Davet Linki:</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 px-2 py-1.5 rounded bg-muted/30 border border-border text-[10px]"
                    />
                    <button onClick={handleCopyLink} className="tm-tap p-1.5 rounded bg-card border border-border">
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <button
                    onClick={handleShare}
                    className="tm-tap w-full py-2 rounded-lg bg-sky-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Share2 size={12} /> Mesajla Gönder
                  </button>
                  <div className="text-[9px] text-muted-foreground text-center">
                    Linki kopyala veya paylaş — arkadaşın linke tıklayınca kupaya katılabilir
                  </div>
                </div>
              )}
            </>
          )}

          {/* v2.9.40: Kurucu "Kupayı Başlat" butonu — min 4 takım, bot yok */}
          {canStart && (
            <button
              onClick={handleStart}
              className="tm-tap w-full py-2.5 rounded-lg bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Trophy size={14} /> Kupayı Başlat ({participants.length} takım)
            </button>
          )}

          {/* Min 4 takım bilgilendirmesi */}
          {cup.status === "waiting" && isCreator && !minTeamsMet && (
            <div className="tm-card p-2 text-center text-[10px] text-amber-400 bg-amber-500/10">
              Kupayı başlatmak için en az 4 takım gerekli (şu an {participants.length}).
              <br />Bot katılımcı YOK — sadece gerçek kullanıcılar.
            </div>
          )}

          {/* Bekleme mesajı */}
          {cup.status === "waiting" && !hasJoined && isFull && (
            <div className="tm-card p-3 text-center text-[11px] text-muted-foreground">
              Kupa dolu. Katılım kapalı.
            </div>
          )}

          {cup.status === "waiting" && hasJoined && !isCreator && (
            <div className="tm-card p-2 text-center text-[10px] text-emerald-400 bg-emerald-500/10">
              ✓ Bu kupaya katıldın. Kupa kurucusunun onayı bekleniyor.
            </div>
          )}

          {cup.status === "waiting" && hasJoined && isCreator && !canStart && (
            <div className="tm-card p-2 text-center text-[10px] text-sky-400 bg-sky-500/10">
              ✓ Katıldın. En az 4 takım olunca "Kupayı Başlat" butonu aktif olacak.
            </div>
          )}
        </>
      )}
    </div>
  );
}
