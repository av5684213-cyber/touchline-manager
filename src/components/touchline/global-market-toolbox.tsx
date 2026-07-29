"use client";

import { useEffect, useState } from "react";
import { Globe, Filter, Loader2, Search, X, ChevronRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useSupabaseAuth } from "@/lib/auth/auth-context";
import { getCountryList } from "@/lib/countries/countries";
import { cn } from "@/lib/utils";
import { formatEuro } from "@/lib/format";
import { haptic } from "@/hooks/touchline";
import { PositionPill, RatingBadge } from "./ui-bits";

/**
 * v2.9.20 GÖREV 9 — Global Transfer Pazarı.
 *
 * Küresel oyuncu arama:
 *   - Ülke seçimi (TR, GB, ES, IT, DE, FR, PT, NL, BR, AR)
 *   - Tier seçimi (1-4)
 *   - Departman seçimi (country+tier'a göre dinamik)
 *   - Pozisyon grubu (GK/DEF/MID/FWD/ALL)
 *   - Min rating
 *   - Max fiyat
 *
 * Supabase RPC rpc_search_global_market çağırır.
 * Bot takımların satılık oyuncularını listeler.
 *
 * Kullanıcı oyuncu seçince pazarlık modal'ı açılır (transfer-negotiation-modal).
 */

type GlobalPlayer = {
  player_id: string;
  first_name: string;
  last_name: string;
  name: string;
  position: string;
  position_group: string;
  age: number;
  rating: number;
  potential: number;
  nationality: string;
  preferred_foot: string;
  market_value: number;
  is_for_sale: boolean;
  sale_price: number | null;
  is_free_agent: boolean;
  team_id: string;
  team_name: string;
  team_short_name: string;
  team_country_code: string;
  team_league_tier: number;
  team_department_id: number;
  is_user_team: boolean;
  is_bot: boolean;
};

type DeptInfo = {
  department_id: number;
  department_number: number;
  name_tr: string;
  league_id: number;
  league_tier: number;
  league_name: string;
  country_code: string;
  team_count: number;
  user_team_count: number;
};

export function GlobalMarketToolbox() {
  const { user } = useSupabaseAuth();
  const myTeam = useAppStore((s) => s.clubs.find((c) => c.id === s.myTeamId));

  // Filtre state
  const [countryCode, setCountryCode] = useState<string>("");
  const [tier, setTier] = useState<number | "">("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [positionGroup, setPositionGroup] = useState<string>("ALL");
  const [minRating, setMinRating] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [showFilters, setShowFilters] = useState(false);

  // Sonuç state
  const [players, setPlayers] = useState<GlobalPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Departman listesi (country + tier'a göre dinamik)
  const [departments, setDepartments] = useState<DeptInfo[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);

  // Departman listesini getir (country + tier değişince)
  useEffect(() => {
    let active = true;
    async function fetchDepartments() {
      setLoadingDepts(true);
      try {
        const { supabase } = await import("@/lib/supabase/client");
        const { data, error: deptErr } = await supabase().rpc("rpc_list_departments_for_filter", {
          p_country_code: countryCode || null,
          p_tier: tier || null,
        });
        if (!active) return;
        if (deptErr) {
          setDepartments([]);
        } else {
          setDepartments(data?.departments ?? []);
        }
      } catch {
        if (active) setDepartments([]);
      } finally {
        if (active) setLoadingDepts(false);
      }
    }
    fetchDepartments();
    return () => { active = false; };
  }, [countryCode, tier]);

  // İlk açılışta otomatik arama
  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      // v2.9.36: Supabise RPC yerine frontend'de üret — bot takımlar Supabase'te yok
      // Tüm ülkelerin tüm liglerinden oyuncu üret + filtre uygula
      const { generateClubsForLeague } = await import("@/lib/mock/data");
      const { COUNTRIES } = await import("@/lib/countries/countries");

      const allPlayers: GlobalPlayer[] = [];

      // Hangi ülkeleri tara?
      const countriesToSearch = countryCode
        ? COUNTRIES.filter(c => c.code === countryCode)
        : COUNTRIES;

      for (const country of countriesToSearch) {
        // Hangi tier'ları tara?
        const tiersToSearch = tier === "" ? [1, 2, 3, 4] : [tier];

        for (const t of tiersToSearch) {
          // Hangi departmanları tara?
          const deptCount = t === 4 ? 5 : 1;
          const deptsToSearch = departmentId === "" ? Array.from({ length: deptCount }, (_, i) => i + 1) : [departmentId];

          for (const d of deptsToSearch) {
            const clubs = generateClubsForLeague(t as any, d as any, country.code);
            for (const club of clubs) {
              for (const p of club.players) {
                // Pozisyon grubu hesapla
                const posGroup = p.specificPosition === "GK" ? "GK"
                  : ["CB", "LB", "RB", "LWB", "RWB"].includes(p.specificPosition) ? "DEF"
                  : ["CDM", "CM", "CAM", "LM", "RM"].includes(p.specificPosition) ? "MID"
                  : "FWD";

                // Filtreleri uygula
                if (positionGroup !== "ALL" && posGroup !== positionGroup) continue;
                if (minRating !== "" && p.rating < Number(minRating)) continue;
                const askingPrice = p.marketValue ?? p.market_value ?? 500000;
                if (maxPrice !== "" && askingPrice > Number(maxPrice)) continue;

                allPlayers.push({
                  player_id: p.id,
                  first_name: p.firstName,
                  last_name: p.lastName,
                  name: p.name,
                  position: p.specificPosition,
                  position_group: posGroup,
                  age: p.age,
                  rating: p.rating,
                  potential: p.potential,
                  nationality: p.nationality ?? "TR",
                  preferred_foot: p.preferred_foot ?? p.foot ?? "Right",
                  market_value: askingPrice,
                  is_for_sale: true,
                  sale_price: p.sale_price ?? null,
                  is_free_agent: false,
                  team_id: club.id,
                  team_name: club.name,
                  team_short_name: club.shortName,
                  team_country_code: country.code,
                  team_league_tier: t,
                  team_department_id: d,
                  is_user_team: false,
                  is_bot: true,
                });
              }
            }
          }
        }
      }

      // Rating'e göre sırala, en iyi 50'yi al
      allPlayers.sort((a, b) => b.rating - a.rating);
      setPlayers(allPlayers.slice(0, 50));
    } catch (e: any) {
      setError(e?.message ?? "Arama hatası");
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCountryCode("");
    setTier("");
    setDepartmentId("");
    setPositionGroup("ALL");
    setMinRating("");
    setMaxPrice("");
    haptic("light");
    setTimeout(handleSearch, 100);
  };

  const activeFilterCount = [
    countryCode,
    tier !== "" ? String(tier) : "",
    departmentId !== "" ? String(departmentId) : "",
    positionGroup !== "ALL" ? positionGroup : "",
    minRating !== "" ? String(minRating) : "",
    maxPrice !== "" ? String(maxPrice) : "",
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="tm-card p-3 bg-gradient-to-br from-sky-900/20 to-indigo-900/10 border-sky-500/30">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-sky-400" />
            <h3 className="text-sm font-bold">Küresel Transfer Pazarı</h3>
          </div>
          <button
            onClick={() => { haptic("light"); setShowFilters(!showFilters); }}
            className={cn(
              "tm-tap flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors",
              showFilters ? "bg-sky-500 text-white" : "bg-card border border-border text-muted-foreground"
            )}
          >
            <Filter size={11} />
            Filtreler
            {activeFilterCount > 0 && (
              <span className="bg-white/30 px-1 rounded text-[9px] tabular-nums">{activeFilterCount}</span>
            )}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Tüm dünyadan satılık oyuncular — ülke, lig, departman, pozisyon ve fiyata göre filtrele.
        </p>
      </div>

      {/* Filter Toolbox */}
      {showFilters && (
        <div className="tm-card p-3 space-y-2.5">
          {/* Ülke */}
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Ülke</label>
            <select
              value={countryCode}
              onChange={(e) => { setCountryCode(e.target.value); setDepartmentId(""); }}
              className="w-full px-2.5 py-2 rounded-lg bg-card border border-border text-xs"
            >
              <option value="">🌍 Tüm Ülkeler</option>
              {getCountryList().map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag_emoji} {c.name_tr}
                </option>
              ))}
            </select>
          </div>

          {/* Tier */}
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Lig Tier'ı</label>
            <select
              value={tier}
              onChange={(e) => { setTier(e.target.value === "" ? "" : Number(e.target.value)); setDepartmentId(""); }}
              className="w-full px-2.5 py-2 rounded-lg bg-card border border-border text-xs"
            >
              <option value="">Tüm Tier'lar</option>
              <option value={1}>1 — Süper Lig</option>
              <option value={2}>2 — İkinci Lig</option>
              <option value={3}>3 — Üçüncü Lig</option>
              <option value={4}>4 — Dördüncü Lig</option>
            </select>
          </div>

          {/* Departman — country + tier seçilince dinamik */}
          {(countryCode || tier !== "") && (
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">
                Departman {loadingDepts && <Loader2 size={10} className="inline animate-spin ml-1" />}
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-lg bg-card border border-border text-xs"
                disabled={loadingDepts || departments.length === 0}
              >
                <option value="">Tüm Departmanlar</option>
                {departments.map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.name_tr} ({d.team_count} takım{d.user_team_count > 0 ? `, ${d.user_team_count} kullanıcı` : ""})
                  </option>
                ))}
              </select>
              {departments.length === 0 && !loadingDepts && (
                <p className="text-[9px] text-muted-foreground mt-1">Bu filtrede departman bulunamadı</p>
              )}
            </div>
          )}

          {/* Pozisyon */}
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Pozisyon</label>
            <div className="grid grid-cols-5 gap-1">
              {(["ALL", "GK", "DEF", "MID", "FWD"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => { haptic("light"); setPositionGroup(p); }}
                  className={cn(
                    "tm-tap py-1.5 rounded text-[10px] font-bold transition-colors",
                    positionGroup === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-muted-foreground"
                  )}
                >
                  {p === "ALL" ? "Tümü" : p}
                </button>
              ))}
            </div>
          </div>

          {/* Min rating + Max price */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">Min Rating</label>
              <input
                type="number"
                min={40}
                max={99}
                placeholder="40-99"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-lg bg-card border border-border text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">Max Fiyat (€)</label>
              <input
                type="number"
                min={0}
                step={1000000}
                placeholder="örn: 50000000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-lg bg-card border border-border text-xs"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleReset}
              className="tm-tap flex-1 py-2 rounded-lg text-xs font-semibold text-muted-foreground border border-border"
            >
              Sıfırla
            </button>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="tm-tap flex-[2] py-2 rounded-lg text-xs font-bold text-white shadow-md active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{ background: "var(--primary)" }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Ara
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="tm-card p-2.5 text-center text-[11px] text-red-400 bg-red-500/10 border-red-500/30">
          {error}
        </div>
      )}

      {/* Results */}
      {!showFilters && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{players.length} oyuncu bulundu</span>
          {activeFilterCount > 0 && (
            <button onClick={() => setShowFilters(true)} className="text-sky-400 font-semibold">
              {activeFilterCount} filtre aktif →
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">Aranıyor...</p>
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-12 px-4">
          <Globe size={32} className="mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground mb-1">
            {hasSearched ? "Filtrelere uygun oyuncu bulunamadı" : "Arama yapmak için 'Ara' butonuna bas"}
          </p>
          {hasSearched && (
            <button onClick={handleReset} className="text-[11px] text-sky-400 font-semibold">
              Filtreleri sıfırla
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {players.slice(0, 50).map((p) => (
            <GlobalPlayerRow key={p.player_id} player={p} myTeamCountryCode={myTeam?.leagueTier ? "TR" : "TR"} />
          ))}
          {players.length > 50 && (
            <p className="text-center text-[10px] text-muted-foreground py-2">
              İlk 50 oyuncu gösteriliyor (toplam {players.length})
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function GlobalPlayerRow({ player, myTeamCountryCode }: { player: GlobalPlayer; myTeamCountryCode: string }) {
  const isSameCountry = player.team_country_code === myTeamCountryCode;
  const askingPrice = player.sale_price ?? player.market_value ?? 0;

  return (
    <div className="tm-card p-2.5 flex items-center gap-2.5">
      {/* Rating + position */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <RatingBadge value={player.rating} />
        <PositionPill label={player.position} group={player.position_group as "GK" | "DEF" | "MID" | "FWD"} />
      </div>

      {/* Name + info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold truncate">{player.name}</p>
          {player.is_user_team && (
            <span className="bg-amber-500/20 text-amber-400 px-1 rounded text-[9px] font-bold">KULLANICI</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>{player.age} yaş</span>
          <span>•</span>
          <span className="truncate">{player.team_name}</span>
          {player.team_country_code && (
            <span className={cn("px-1 rounded text-[9px]", isSameCountry ? "bg-emerald-500/20 text-emerald-400" : "bg-sky-500/20 text-sky-400")}>
              {player.team_country_code}
            </span>
          )}
          <span className="text-[9px] opacity-60">T{player.team_league_tier}</span>
        </div>
      </div>

      {/* Price + action */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <p className="text-xs font-bold text-amber-300">{formatEuro(askingPrice)}</p>
        <button
          onClick={() => haptic("light")}
          className="tm-tap flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold text-white"
          style={{ background: "var(--primary)" }}
        >
          Teklif <ChevronRight size={10} />
        </button>
      </div>
    </div>
  );
}
