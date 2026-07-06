"use client";

import { useState, useEffect } from "react";
import { ArrowUp, GraduationCap, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { generatePlayer, POSITION_GROUP, type Player } from "@/lib/mock/data";
import { PlayerAvatar, PositionPill, RatingBadge } from "../ui-bits";
import { PlayerProfileModal } from "../player-profile-modal";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

export function YouthAcademyScreen() {
  const { t } = useI18n();
  const team = useMyTeam();
  const { facilities } = useAppStore();
  const academyLevel = facilities.levels.academy || 0;

  // P1#9 FIX: Store'da sakla — her açılışta YENİ oyuncular üretme
  // localStorage ile persist et, sezon değişince yenile
  const STORAGE_KEY = "tm_youth_academy";
  const seasonNumber = useAppStore((s) => s.seasonNumber ?? 1);

  const [youthPlayers, setYouthPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_${seasonNumber}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Eski kayıttaki oyuncuları filtrele — terfi edilenler listeden çıkar
        return parsed;
      }
    } catch {}
    // İlk kez — üret
    const count = 3 + academyLevel;
    const positions: string[] = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];
    return Array.from({ length: Math.min(count, 8) }, () => {
      const pos = positions[Math.floor(Math.random() * positions.length)] as any;
      const p = generatePlayer(pos, { min: 40, max: 60 });
      p.age = 15 + Math.floor(Math.random() * 4);
      p.potential = p.rating + 10 + Math.floor(Math.random() * 25);
      p.hidden_potential = p.potential;
      return p;
    });
  });

  // localStorage'a kaydet
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_${seasonNumber}`, JSON.stringify(youthPlayers));
    } catch {}
  }, [youthPlayers, seasonNumber]);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);

  if (!team) return null;

  const handlePromote = (player: Player) => {
    haptic("success");
    // Oyuncuyu A takıma ekle — immutable update
    const state = useAppStore.getState();
    const updatedClubs = state.clubs.map((c) =>
      c.id === team.id
        ? { ...c, players: [...c.players, player] }
        : c
    );
    useAppStore.setState({ clubs: updatedClubs });
    setYouthPlayers((prev) => prev.filter((p) => p.id !== player.id));
    setFeedback(`✓ ${player.firstName} ${player.lastName} A takıma terfi etti`);
    setTimeout(() => setFeedback(null), 2500);
  };

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
      <div className="tm-card p-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">{t("youth.title")}</h1>
          <p className="text-[11px] text-muted-foreground">
            {t("youth.academy_level")}: {academyLevel}/10
          </p>
        </div>
        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
          <GraduationCap size={20} className="text-primary" />
        </div>
      </div>

      {feedback && (
        <div className="tm-card p-2.5 text-center text-xs font-bold bg-emerald-500/20 text-emerald-300">
          {feedback}
        </div>
      )}

      <div>
        <div className="text-xs font-bold mb-2">
          {t("youth.players")} ({youthPlayers.length})
        </div>
        {youthPlayers.length === 0 && (
          <div className="tm-card p-6 text-center text-xs text-muted-foreground">
            {t("youth.empty")}
          </div>
        )}
        <div className="space-y-1.5">
          {youthPlayers.map((p) => (
            <div key={p.id} className="tm-card p-2.5 flex items-center gap-2.5">
              <button
                onClick={() => { haptic("light"); setProfilePlayer(p); }}
                className="tm-tap shrink-0"
                aria-label="Profil"
              >
                <PlayerAvatar
                  initials={p.specificPosition}
                  color={team.primaryColor}
                  size={32}
                />
              </button>
              <button
                onClick={() => { haptic("light"); setProfilePlayer(p); }}
                className="flex-1 min-w-0 text-left"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold truncate">{p.firstName} {p.lastName}</span>
                  <PositionPill label={p.specificPosition} group={POSITION_GROUP[p.specificPosition]} />
                </div>
                <div className="text-[9px] text-muted-foreground flex items-center gap-2">
                  <span>{p.age}{t("common.year")}</span>
                  <span>· OVR {p.rating}</span>
                  <span className="flex items-center gap-0.5 text-amber-300">
                    <Sparkles size={8} /> {t("youth.potential")}: {p.potential}
                  </span>
                </div>
              </button>
              <RatingBadge value={p.formRating} />
              <button
                onClick={() => handlePromote(p)}
                className="tm-tap px-2 py-1.5 rounded text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1"
              >
                <ArrowUp size={10} /> {t("youth.promote")}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Player profile modal */}
      {profilePlayer && (
        <PlayerProfileModal
          player={profilePlayer}
          teamColor={team.primaryColor}
          onClose={() => setProfilePlayer(null)}
        />
      )}
    </div>
  );
}
