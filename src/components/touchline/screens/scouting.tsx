"use client";

import { useState } from "react";
import { Database, Eye, Filter, Lock, Search, Sparkles, Star, UserPlus, X, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { generateFreeAgents, type TransferListing } from "@/lib/mock/transfer";
import { POSITION_GROUP, type PositionGroup } from "@/lib/mock/data";
import { PlayerAvatar, PositionPill, RatingBadge } from "../ui-bits";
import { PlayerProfileModal } from "../player-profile-modal";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

const SCOUT_LEVELS = [
  { level: 1, label: "Temel Arama", desc: "İsim, pozisyon, yaş", icon: Search },
  { level: 2, label: "Genişletilmiş", desc: "+ OVR aralığı, nadirlik", icon: Filter },
  { level: 3, label: "Detaylı Arama", desc: "+ Arketip, yetenekler", icon: Database },
];

const ARCHETYPE_OPTIONS = [
  "Refleks Canavarı", "Güvenli Eller", "Süpürücü Kaleci", "Penaltı Uzmanı",
  "Duvar", "Lider Stoper", "Top Çıkan Stoper", "Hava Hakimi", "Baskı Ustası",
  "Kanat Beki", "Hücumcu Bek", "Defansif Bek", "Ters Bek",
  "Yıkıcı", "Regista", "Ekran Oyuncusu", "Duvar Orta Saha",
  "Motor", "Truva Atı", "Pas Ustası", "Box-to-Box", "Tempo Kontrolcüsü",
  "Playmaker", "Numara 10", "Yaratıcı", "Oyun Kurucu",
  "Hızlı Kanat", "İçeri Dönen", "Dripling Ustası",
  "Gol Makinesi", "Bitirici", "Hedef Adam", "Fırsatçı", "Hızlı Forvet",
  "İkinci Forvet", "Yaratıcı Forvet",
];

export function ScoutingScreen() {
  const { t } = useI18n();
  const team = useMyTeam();
  const { facilities, transfer, toggleWatchlist } = useAppStore();
  const [scoutLevel, setScoutLevel] = useState(1);
  const [results, setResults] = useState<TransferListing[]>([]);
  const [searching, setSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [profilePlayer, setProfilePlayer] = useState<any>(null);

  // Filtreler
  const [nameFilter, setNameFilter] = useState("");
  const [posFilter, setPosFilter] = useState<PositionGroup | "ALL">("ALL");
  const [ageMin, setAgeMin] = useState(0);
  const [ageMax, setAgeMax] = useState(0);
  const [ovrMin, setOvrMin] = useState(0);
  const [ovrMax, setOvrMax] = useState(0);
  const [archetypeFilter, setArchetypeFilter] = useState<string>("");

  if (!team) return null;

  const scoutCount = facilities.staff.filter((s) => s.type === "scout").length;
  const hasScouts = scoutCount > 0;
  const maxScoutLevel = Math.min(3, scoutCount);

  const handleSearch = () => {
    if (!hasScouts) return;
    haptic("medium");
    setSearching(true);
    setTimeout(() => {
      let pool = generateFreeAgents(50);

      // Seviyeye göre filtrele
      if (scoutLevel >= 1) {
        // Temel: isim, pozisyon, yaş
        if (nameFilter) {
          pool = pool.filter((l) =>
            `${l.player.firstName} ${l.player.lastName}`.toLowerCase().includes(nameFilter.toLowerCase())
          );
        }
        if (posFilter !== "ALL") {
          pool = pool.filter((l) => POSITION_GROUP[l.player.specificPosition] === posFilter);
        }
        if (ageMin > 0) pool = pool.filter((l) => l.player.age >= ageMin);
        if (ageMax > 0) pool = pool.filter((l) => l.player.age <= ageMax);
      }
      if (scoutLevel >= 2) {
        // Genişletilmiş: + OVR aralığı
        if (ovrMin > 0) pool = pool.filter((l) => l.player.rating >= ovrMin);
        if (ovrMax > 0) pool = pool.filter((l) => l.player.rating <= ovrMax);
      }
      if (scoutLevel >= 3) {
        // Detaylı: + arketip
        if (archetypeFilter) {
          pool = pool.filter((l) => l.player.archetype === archetypeFilter);
        }
      }

      setResults(pool.slice(0, 20));
      setSearching(false);
    }, 800);
  };

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
      <h1 className="text-base font-bold">{t("scouting.title")}</h1>

      {/* Scout slotları */}
      <div className="tm-card p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold">{t("scouting.slots")}</span>
          <span className="text-[10px] text-muted-foreground">{scoutCount}/3</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "flex-1 h-10 rounded-md border flex items-center justify-center text-[10px] font-bold",
                i < scoutCount
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-muted border-border text-muted-foreground"
              )}
            >
              {i < scoutCount ? `Scout ${i + 1}` : <Lock size={12} />}
            </div>
          ))}
        </div>
        {!hasScouts && (
          <div className="text-[10px] text-amber-400 mt-2 text-center">
            {t("scouting.no_scouts")}
          </div>
        )}
      </div>

      {/* Scout seviyesi seçici */}
      <div className="tm-card p-3">
        <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">{t("scouting.tier")}</div>
        <div className="space-y-1.5">
          {SCOUT_LEVELS.map((s) => {
            const locked = s.level > maxScoutLevel;
            const Icon = s.icon;
            return (
              <button
                key={s.level}
                onClick={() => { if (!locked) { haptic("light"); setScoutLevel(s.level); } }}
                disabled={locked}
                className={cn(
                  "tm-tap w-full flex items-center gap-2.5 p-2.5 rounded-md border text-left",
                  scoutLevel === s.level ? "bg-primary/10 border-primary" : "bg-card border-border",
                  locked && "opacity-40"
                )}
              >
                <Icon size={16} className={scoutLevel === s.level ? "text-primary" : "text-muted-foreground"} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold flex items-center gap-1">
                    {s.label}
                    {locked && <Lock size={10} />}
                  </div>
                  <div className="text-[9px] text-muted-foreground">{s.desc}</div>
                </div>
                <span className="text-[9px] font-bold text-muted-foreground">Lv.{s.level}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtreler — scout seviyesine göre */}
      <div className="tm-card p-3 space-y-2.5">
        <button
          onClick={() => { haptic("light"); setShowFilters(!showFilters); }}
          className="tm-tap w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <span className="text-xs font-bold">Filtreler</span>
          </div>
          <span className="text-[10px] text-muted-foreground">{showFilters ? "▲" : "▼"}</span>
        </button>

        {showFilters && (
          <div className="space-y-2 pt-1">
            {/* İsim — seviye 1 */}
            <div>
              <div className="text-[9px] text-muted-foreground mb-0.5">İsim</div>
              <input
                type="text"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Oyuncu ara..."
                className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-[11px]"
              />
            </div>

            {/* Pozisyon — seviye 1 */}
            <div>
              <div className="text-[9px] text-muted-foreground mb-0.5">Pozisyon</div>
              <div className="flex gap-1 overflow-x-auto tm-no-scrollbar">
                {(["ALL", "GK", "DEF", "MID", "FWD"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setPosFilter(g)}
                    className={cn(
                      "tm-tap px-2 py-1 rounded-full text-[10px] font-semibold border whitespace-nowrap",
                      posFilter === g ? "bg-foreground text-background border-foreground" : "bg-card border-border"
                    )}
                  >
                    {g === "ALL" ? t("common.all") : t(`pos.${g.toLowerCase()}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Yaş aralığı — seviye 1 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[9px] text-muted-foreground mb-0.5">Min. Yaş</div>
                <input
                  type="number"
                  value={ageMin || ""}
                  onChange={(e) => setAgeMin(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-[11px]"
                />
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground mb-0.5">Maks. Yaş</div>
                <input
                  type="number"
                  value={ageMax || ""}
                  onChange={(e) => setAgeMax(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-[11px]"
                />
              </div>
            </div>

            {/* OVR aralığı — seviye 2 */}
            {scoutLevel >= 2 && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[9px] text-muted-foreground mb-0.5">Min. OVR</div>
                  <input
                    type="number"
                    value={ovrMin || ""}
                    onChange={(e) => setOvrMin(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-[11px]"
                  />
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground mb-0.5">Maks. OVR</div>
                  <input
                    type="number"
                    value={ovrMax || ""}
                    onChange={(e) => setOvrMax(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-[11px]"
                  />
                </div>
              </div>
            )}

            {/* Arketip — seviye 3 */}
            {scoutLevel >= 3 && (
              <div>
                <div className="text-[9px] text-muted-foreground mb-0.5">Arketip</div>
                <select
                  value={archetypeFilter}
                  onChange={(e) => setArchetypeFilter(e.target.value)}
                  className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-[11px]"
                >
                  <option value="">Tümü</option>
                  {ARCHETYPE_OPTIONS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Arama butonu */}
      <button
        onClick={handleSearch}
        disabled={!hasScouts || searching}
        className={cn(
          "tm-tap w-full py-2.5 rounded-md text-sm font-bold flex items-center justify-center gap-2",
          !hasScouts || searching ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
        )}
      >
        <Search size={14} />
        {searching ? "Aranıyor…" : t("scouting.search")}
      </button>

      {/* Sonuçlar */}
      <div>
        <div className="text-xs font-bold mb-2">{t("scouting.results")} ({results.length})</div>
        {results.length === 0 && !searching && (
          <div className="tm-card p-6 text-center text-xs text-muted-foreground">
            {t("scouting.no_results")}
          </div>
        )}
        <div className="space-y-1.5">
          {results.map((listing) => {
            const isHidden = listing.player.hidden_potential > listing.player.rating + 10;
            const isWatched = transfer.watchlist.includes(listing.player.id);
            return (
              <div
                key={listing.player.id}
                onClick={() => { haptic("light"); setProfilePlayer(listing.player); }}
                className="tm-tap tm-card p-2.5 flex items-center gap-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <PlayerAvatar
                  initials={listing.player.specificPosition ?? "—"}
                  size={32}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold truncate">
                      {listing.player.firstName} {listing.player.lastName}
                    </span>
                    <PositionPill label={listing.player.specificPosition} group={POSITION_GROUP[listing.player.specificPosition]} />
                    {isHidden && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold flex items-center gap-0.5">
                        <Sparkles size={8} /> {t("scouting.hidden_gem")}
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {listing.player.age}{t("common.year")} · OVR {listing.player.rating}
                    {listing.player.archetype && ` · ${listing.player.archetype}`}
                    {" · "}{formatEuro(listing.askingPrice)}
                  </div>
                </div>
                <RatingBadge value={listing.player.formRating} />
                <button
                  onClick={(e) => { e.stopPropagation(); haptic("light"); toggleWatchlist(listing.player.id); }}
                  className={cn(
                    "tm-tap p-1.5 rounded-full",
                    isWatched ? "text-red-400" : "text-muted-foreground"
                  )}
                >
                  <UserPlus size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Oyuncu profil modalı */}
      {profilePlayer && team && (
        <PlayerProfileModal
          player={profilePlayer}
          teamColor={team.primaryColor}
          onClose={() => setProfilePlayer(null)}
        />
      )}
    </div>
  );
}
