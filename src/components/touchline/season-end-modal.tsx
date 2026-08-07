"use client";

import { useEffect, useState } from "react";
import { Check, Trophy, TrendingDown, TrendingUp, X, Sparkles, PartyPopper, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore } from "@/lib/store";
import type { SeasonSummary } from "@/lib/store";
import type { Player } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { haptic, useBodyScrollLock, useEscapeToClose } from "@/hooks/touchline";
import { PlayerProfileModal } from "./player-profile-modal";

type Phase = "champion_celebration" | "summary" | "awards" | "ready";

export function SeasonEndModal({
  summary,
  onClose,
}: {
  summary: SeasonSummary;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>(summary.finalPosition === 1 ? "champion_celebration" : "summary");
  const [awardIndex, setAwardIndex] = useState(0);
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);
  useEscapeToClose(onClose);
  useBodyScrollLock(true);

  useEffect(() => {
    haptic("medium");
  }, [phase]);

  const isChampion = summary.finalPosition === 1;
  const isPromoted = summary.promoted;
  const isRelegated = summary.relegated;

  const awards = summary.playerAwards ?? [];

  // ═══ FAZ 0: Şampiyonluk Kutlaması — sadece şampiyonlara, EN BAŞTA ═══
  // v2.9.77: Kullanıcı şampiyonsa sezon sonu ekranı BÜYÜK kupasıyla açılır.
  // Konfeti yağar, "ŞAMPİYON!" başlığı gösterilir. "Devam Et" ile summary fazına geçer.
  if (phase === "champion_celebration") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
        {/* Altın renkli gradient arka plan */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/30 via-amber-900/40 to-black/95" />

        {/* Yoğun konfeti — 24 parça, çeşitli emoji'ler */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(24)].map((_, i) => {
            const emojis = ["🎉", "✨", "🎊", "⭐", "🏆", "💫", "🥳", "👑"];
            const left = (i * 4.2) % 100;
            const top = (i * 17) % 100;
            const delay = (i * 0.13) % 3;
            const dur = 2 + (i % 3) * 0.5;
            const size = 18 + (i % 4) * 8;
            return (
              <span
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  fontSize: `${size}px`,
                  animationDelay: `${delay}s`,
                  animationDuration: `${dur}s`,
                }}
              >
                {emojis[i % emojis.length]}
              </span>
            );
          })}
        </div>

        {/* Parlama efekti — altın halka */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-[360px] text-center">
          {/* "ŞAMPİYON" rozeti */}
          <div className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-amber-500/30 text-amber-200 text-[11px] font-black border border-amber-400/50 mb-4 backdrop-blur-sm">
            <Sparkles size={11} /> SEZON ŞAMPİYONU
          </div>

          {/* BÜYÜK kupa — kocaman emoji */}
          <div className="text-[140px] leading-none mb-2 animate-bounce drop-shadow-2xl">🏆</div>

          {/* Ana başlık */}
          <h2 className="text-5xl font-black text-white mb-2 drop-shadow-lg tracking-tight">
            ŞAMPİYON!
          </h2>

          {/* Alt başlık — sezon bilgisi */}
          <p className="text-sm text-amber-100/90 mb-1">
            {summary.season - 1}–{String(summary.season).slice(-2)} sezonu
          </p>
          <p className="text-xs text-white/60 mb-6">
            {summary.won}G · {summary.drawn}B · {summary.lost}M · <span className="text-amber-300 font-bold">{summary.points} puan</span>
          </p>

          {/* Devam butonu */}
          <button
            onClick={() => { haptic("success"); setPhase("summary"); }}
            className="tm-tap px-8 py-3.5 rounded-xl bg-amber-400 text-black text-sm font-black flex items-center justify-center gap-2 mx-auto shadow-2xl shadow-amber-500/50 hover:bg-amber-300 transition-colors"
          >
            <PartyPopper size={16} /> Devam Et
          </button>
        </div>
      </div>
    );
  }

  // ═══ FAZ 1: Sezon Özeti ═══
  if (phase === "summary") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/85" />
        <div className="relative w-full max-w-[360px] bg-background rounded-2xl border border-border p-5 max-h-[90vh] overflow-y-auto tm-thin-scrollbar">
          <button onClick={onClose} className="tm-tap absolute top-3 right-3 p-1 text-muted-foreground">
            <X size={16} />
          </button>

          {/* Şampiyon rozeti — küçük */}
          {isChampion && (
            <div className="text-center mb-3 -mt-2">
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                <Sparkles size={10} /> ŞAMPİYON
              </div>
            </div>
          )}

          <div className="text-center mb-4">
            <div className="text-3xl mb-2">
              {isChampion ? "🏆" : isPromoted ? "⬆️" : isRelegated ? "📉" : "⚽"}
            </div>
            <h2 className="text-lg font-bold">
              {isChampion ? "Şampiyonluk!" : "Sezon Sonu"}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {summary.season - 1}–{String(summary.season).slice(-2)} sezonu tamamlandı
            </p>
          </div>

          <div className="tm-card p-3 mb-3 text-center">
            <div className="text-[10px] uppercase text-muted-foreground mb-1">Final Sıralama</div>
            <div className={cn("text-4xl font-bold tabular-nums", isChampion && "text-amber-300")}>
              {summary.finalPosition}
            </div>
            <div className="text-[10px] text-muted-foreground">/ 18 takım</div>
            {summary.promoted && (
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                <TrendingUp size={10} /> Üst Lige Yükseldi!
              </div>
            )}
            {summary.relegated && (
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
                <TrendingDown size={10} /> Alt Lige Düştü
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3">
            <StatBox label="O" value={summary.played} />
            <StatBox label="G" value={summary.won} color="text-emerald-400" />
            <StatBox label="B" value={summary.drawn} color="text-amber-400" />
            <StatBox label="M" value={summary.lost} color="text-red-400" />
          </div>

          <div className="tm-card p-2.5 mb-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Toplam Puan</span>
            <span className="text-xl font-bold tabular-nums text-primary">{summary.points}</span>
          </div>

          {summary.topScorer && (
            <div className="tm-card p-2.5 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-amber-400" />
                <span className="text-xs text-muted-foreground">Gol Kralı</span>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold">{summary.topScorer.name}</div>
                <div className="text-[10px] text-muted-foreground">{summary.topScorer.goals} gol</div>
              </div>
            </div>
          )}

          {summary.retiredPlayers && summary.retiredPlayers.length > 0 && (
            <div className="tm-card p-2.5 mb-3">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">Emekli Olan Oyuncular</div>
              <div className="flex flex-wrap gap-1">
                {summary.retiredPlayers.slice(0, 5).map((name, i) => (
                  <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {name}
                  </span>
                ))}
                {summary.retiredPlayers.length > 5 && (
                  <span className="text-[11px] text-muted-foreground">
                    +{summary.retiredPlayers.length - 5} daha
                  </span>
                )}
              </div>
            </div>
          )}

          {/* v2.9.77: OVR artışları — futbolcuların sezon boyunca gelişimi */}
          {summary.statGains && summary.statGains.length > 0 && (
            <div className="tm-card p-2.5 mb-3">
              <div className="text-[10px] text-muted-foreground uppercase mb-2 flex items-center gap-1">
                <TrendingUp size={11} className="text-emerald-400" /> Oyuncu Gelişimleri (OVR Artışları)
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto tm-thin-scrollbar">
                {summary.statGains.map((player, i) => {
                  const totalGain = player.gains.reduce((s, g) => s + g.delta, 0);
                  // v2.9.91: Oyuncuya tıklayınca profil aç
                  const fullPlayer = useAppStore.getState().clubs
                    .flatMap(c => c.players)
                    .find(p => `${p.firstName} ${p.lastName}` === player.name);
                  return (
                    <button
                      key={i}
                      onClick={() => { haptic("light"); if (fullPlayer) setProfilePlayer(fullPlayer); }}
                      className="tm-tap w-full text-[11px] tm-card p-2 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground truncate">{player.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold tabular-nums">
                          +{totalGain}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {player.gains.map((g, j) => (
                          <span key={j} className="px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                            {g.stat} +{g.delta}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ödül varsa "Statue'leri Gör" butonu, yoksa "Devam Et" */}
          <button
            onClick={() => {
              haptic("success");
              if (awards.length > 0) {
                setPhase("awards");
                setAwardIndex(0);
              } else {
                setPhase("ready");
              }
            }}
            className="tm-tap w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold mt-2 flex items-center justify-center gap-2"
          >
            {awards.length > 0 ? (
              <>🏆 Statue'leri Gör ({awards.length}) <ArrowRight size={14} /></>
            ) : (
              <>Devam Et <ArrowRight size={14} /></>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ═══ FAZ 2: Statue Gösterimi — her statue tek tek BÜYÜK ekranda ═══
  // v2.9.77: Kocaman statue foto + altında açıklama + altında futbolcu ismi
  if (phase === "awards" && awards.length > 0) {
    const award = awards[awardIndex];
    const isLast = awardIndex === awards.length - 1;
    const tierGradient = award.tier === "gold"
      ? "from-amber-500/25 via-amber-900/30 to-black/95"
      : award.tier === "silver"
      ? "from-slate-300/20 via-slate-700/30 to-black/95"
      : "from-orange-600/20 via-orange-900/30 to-black/95";
    const tierBorderColor = award.tier === "gold"
      ? "border-amber-400/50"
      : award.tier === "silver"
      ? "border-slate-300/50"
      : "border-orange-500/50";
    const tierTextColor = award.tier === "gold"
      ? "text-amber-300"
      : award.tier === "silver"
      ? "text-slate-200"
      : "text-orange-300";
    const tierEmoji = award.tier === "gold" ? "🥇" : award.tier === "silver" ? "🥈" : "🥉";
    const tierLabel = award.tier === "gold" ? "ALTIN" : award.tier === "silver" ? "GÜMÜŞ" : "BRONZ";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
        <div className={cn("absolute inset-0 bg-gradient-to-b", tierGradient)} />

        {/* Konfeti efekti — altın için daha yoğun */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(award.tier === "gold" ? 16 : 8)].map((_, i) => {
            const emojis = ["🎉", "✨", "🎊", "⭐"];
            const left = (i * 6.5) % 100;
            const top = (i * 13) % 100;
            const delay = (i * 0.18) % 2.5;
            const dur = 2 + (i % 3) * 0.4;
            return (
              <span
                key={i}
                className="absolute animate-ping"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  fontSize: "18px",
                  animationDelay: `${delay}s`,
                  animationDuration: `${dur}s`,
                }}
              >
                {emojis[i % emojis.length]}
              </span>
            );
          })}
        </div>

        <div className="relative w-full max-w-[360px] text-center">
          {/* Tier rozeti */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-black border border-white/20 mb-3 backdrop-blur-sm">
            <span className="text-base">{tierEmoji}</span> {tierLabel} STATUE
          </div>

          {/* BÜYÜK statue görseli — kocaman */}
          <div className="mb-4 flex justify-center">
            <div className={cn(
              "relative w-56 h-56 rounded-2xl bg-white/5 backdrop-blur-sm border-2 flex items-center justify-center overflow-hidden",
              tierBorderColor
            )}>
              {/* Parlama efekti */}
              <div className={cn(
                "absolute inset-0 rounded-2xl bg-gradient-to-b opacity-30",
                award.tier === "gold" ? "from-amber-300/40 to-transparent" :
                award.tier === "silver" ? "from-slate-200/40 to-transparent" :
                "from-orange-400/40 to-transparent"
              )} />
              <img
                src={`./awards/award_${award.awardKey}_${award.tier}.webp`}
                alt={award.awardName}
                className="relative w-48 h-48 object-contain drop-shadow-2xl z-10"
                onError={(e) => {
                  // Görsel yüklenemezse büyük emoji göster
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector(".fallback-emoji")) {
                    const span = document.createElement("span");
                    span.className = "fallback-emoji text-8xl relative z-10";
                    span.textContent = "🏆";
                    parent.appendChild(span);
                  }
                }}
              />
            </div>
          </div>

          {/* Ödül adı — BÜYÜK */}
          <h2 className={cn("text-2xl font-black mb-2 drop-shadow-lg", tierTextColor)}>
            {award.awardName}
          </h2>

          {/* v2.9.77: Açıklama — statue fotoğrafının ALTINDA */}
          {award.awardDesc && (
            <p className="text-[12px] text-white/75 mb-3 px-4 leading-relaxed italic">
              {award.awardDesc}
            </p>
          )}

          {/* v2.9.91: Futbolcu ismi — tıklanabilir, profil aç */}
          <div className="mb-5">
            <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Kazanan</div>
            {(() => {
              const fullPlayer = useAppStore.getState().clubs
                .flatMap(c => c.players)
                .find(p => `${p.firstName} ${p.lastName}` === award.playerName);
              if (fullPlayer) {
                return (
                  <button
                    onClick={() => { haptic("light"); setProfilePlayer(fullPlayer); }}
                    className="tm-tap inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm hover:bg-white/20 transition-colors"
                  >
                    <span className="text-sm font-bold text-white">{award.playerName}</span>
                  </button>
                );
              }
              return (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
                  <span className="text-sm font-bold text-white">{award.playerName}</span>
                </div>
              );
            })()}
          </div>

          {/* İlerleme göstergesi */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {awards.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i === awardIndex ? "bg-white scale-125" : i < awardIndex ? "bg-white/50" : "bg-white/20"
                )}
              />
            ))}
          </div>

          {/* İleri butonu */}
          <button
            onClick={() => {
              haptic("success");
              if (awardIndex < awards.length - 1) {
                setAwardIndex(awardIndex + 1);
              } else {
                setPhase("ready");
              }
            }}
            className="tm-tap px-8 py-3 rounded-lg bg-white text-black text-sm font-bold flex items-center justify-center gap-2 mx-auto shadow-xl"
          >
            {isLast ? (
              <><PartyPopper size={16} /> Tamamla</>
            ) : (
              <>İleri ({awardIndex + 1}/{awards.length}) <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ═══ FAZ 3: Yeni sezon hazır ═══
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-black/90" />
      <div className="relative w-full max-w-[340px] bg-background rounded-2xl border border-border p-6 text-center">
        <div className="text-5xl mb-3">⚽</div>
        <h2 className="text-xl font-bold mb-1">Yeni Sezon Başlıyor</h2>
        <p className="text-[11px] text-muted-foreground mb-4">
          {summary.season - 1}–{String(summary.season).slice(-2)} sezonuna hazır mısın? Kadro yenilendi, taktikleri gözden geçir.
        </p>
        <div className="space-y-2 mb-5 text-left">
          <div className="flex items-center gap-2 text-[11px]">
            <Check size={12} className="text-emerald-400 shrink-0" />
            <span>Oyuncular yaşlandırıldı ve form sıfırlandı</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Check size={12} className="text-emerald-400 shrink-0" />
            <span>Sakatlık ve loan durumları temizlendi</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Check size={12} className="text-emerald-400 shrink-0" />
            <span>Yeni fikstür oluşturuldu</span>
          </div>
          {summary.newRegens > 0 && (
            <div className="flex items-center gap-2 text-[11px]">
              <Check size={12} className="text-emerald-400 shrink-0" />
              <span>{summary.newRegens} yeni genç oyuncu kadroya eklendi</span>
            </div>
          )}
          {awards.length > 0 && (
            <div className="flex items-center gap-2 text-[11px]">
              <Check size={12} className="text-amber-400 shrink-0" />
              <span>{awards.length} statue oyuncu başarılarına işlendi</span>
            </div>
          )}
        </div>
        <button
          onClick={() => { haptic("success"); onClose(); }}
          className="tm-tap w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2"
        >
          <Sparkles size={14} /> Yeni Sezona Başla
        </button>
      </div>

      {/* v2.9.91: Oyuncu profil modal'ı — statGains ve statue'lerden tıklanınca açılır */}
      {profilePlayer && (
        <PlayerProfileModal
          player={profilePlayer}
          teamColor="#1a3a2a"
          onClose={() => setProfilePlayer(null)}
        />
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="tm-card p-2 text-center">
      <div className={cn("text-lg font-bold tabular-nums", color)}>{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase">{label}</div>
    </div>
  );
}
