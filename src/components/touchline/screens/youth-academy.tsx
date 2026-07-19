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
  const facilities = useAppStore((s) => s.facilities);
  const academyLevel = facilities.levels.academy || 0;

  // BULGU #13 DÜZELTME (v2.9.2): Store'dan oku — localStorage DEĞİL.
  // Cloud-save otomatik dahil, cihazlar arası senkron.
  const seasonNumber = useAppStore((s) => s.seasonNumber ?? 1);
  const youthAcademy = useAppStore((s) => s.youthAcademy);
  const youthPlayers = youthAcademy.players;
  const storedSeason = youthAcademy.seasonNumber;

  // Sezon değişince veya ilk açılışta (boş liste) yeni genç oyuncular üret
  useEffect(() => {
    if (storedSeason !== seasonNumber || youthPlayers.length === 0) {
      const count = 3 + academyLevel;
      const positions: string[] = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];
      const newPlayers = Array.from({ length: Math.min(count, 8) }, () => {
        const pos = positions[Math.floor(Math.random() * positions.length)] as any;
        const p = generatePlayer(pos, { min: 40, max: 60 });
        p.age = 15 + Math.floor(Math.random() * 4);
        p.potential = p.rating + 10 + Math.floor(Math.random() * 25);
        p.hidden_potential = p.potential;
        return p;
      });
      useAppStore.setState({
        youthAcademy: { seasonNumber, players: newPlayers },
      });
    }
  }, [seasonNumber, storedSeason, youthPlayers.length, academyLevel]);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);

  if (!team) return null;

  const handlePromote = (player: Player) => {
    // P1 FIX: Kadro limiti (25) ve kaleci limiti (3) kontrolü
    const state = useAppStore.getState();
    const myTeam = state.clubs.find(c => c.id === team.id);
    if (!myTeam) return;
    if (myTeam.players.length >= 25) {
      haptic("error");
      setFeedback("✗ Kadro dolu (25/25) — oyuncu terfi edilemedi");
      setTimeout(() => setFeedback(null), 2500);
      return;
    }
    if (player.specificPosition === "GK") {
      const gkCount = myTeam.players.filter(p => p.specificPosition === "GK").length;
      if (gkCount >= 3) {
        haptic("error");
        setFeedback("✗ 3 kaleci zaten var — oyuncu terfi edilemedi");
        setTimeout(() => setFeedback(null), 2500);
        return;
      }
    }
    haptic("success");
    // Oyuncuyu A takıma ekle — immutable update
    const updatedClubs = state.clubs.map((c) =>
      c.id === team.id
        ? { ...c, players: [...c.players, player] }
        : c
    );
    // BULGU #13 DÜZELTME: setYouthPlayers yerine store update
    const updatedYouth = youthPlayers.filter((p) => p.id !== player.id);
    useAppStore.setState({
      clubs: updatedClubs,
      youthAcademy: { seasonNumber, players: updatedYouth },
    });
    setFeedback(`✓ ${player.firstName} ${player.lastName} A takıma terfi etti`);
    setTimeout(() => setFeedback(null), 2500);
  };

  return (
    <div className="px-4 py-4 pb-24 space-y-3">
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
                <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <span>{p.age}{t("common.year")}</span>
                  <span>· OVR {p.rating}</span>
                  <span className="flex items-center gap-0.5 text-amber-300">
                    <Sparkles size={8} /> {t("youth.potential")}: {p.potential}
                  </span>
                </div>
              </button>
              <RatingBadge value={p.rating} />
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
