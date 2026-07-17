"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  Briefcase,
  Check,
  ChevronRight,
  Clock,
  Eye,
  Heart,
  Plus,
  TrendingUp,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { getInflationMultiplier, removeInflation } from "@/lib/fm/inflation";
import { isTransferWindowOpen, transferWindowStatus } from "@/lib/mock/season";
import {
  NATIONALITIES,
  calculateBuyerCost,
  getPositionGroup,
  type IncomingOffer,
  type TransferListing,
} from "@/lib/mock/transfer";
import {
  POSITION_GROUP,
  type Player,
  type PositionGroup,
} from "@/lib/mock/data";
import { ClubBadge, PlayerAvatar, PositionPill, RatingBadge, StatGrowth } from "../ui-bits";
import { PlayerProfileModal } from "../player-profile-modal";
// ADDED: Gelişmiş pazarlık modal'ı
import { TransferNegotiationModal } from "../transfer-negotiation-modal";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

type SubTab = "market" | "freeagents" | "loan" | "watchlist" | "incoming" | "mylisted";

export function TransferScreen() {
  const { t } = useI18n();
  const team = useMyTeam();
  const transfer = useAppStore((s) => s.transfer);
  const [sub, setSub] = useState<SubTab>("market");
  const [filter, setFilter] = useState<PositionGroup | "ALL">("ALL");
  const [offerModal, setOfferModal] = useState<Player | null>(null);
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);
  // ADDED: Gelişmiş pazarlık modal'ı state
  const [negotiationModal, setNegotiationModal] = useState<{ player: Player; askingPrice: number } | null>(null);

  const filteredListings = useMemo(() => {
    if (filter === "ALL") return transfer.freeAgents;
    return transfer.freeAgents.filter(
      (l) => getPositionGroup(l.player.specificPosition) === filter
    );
  }, [transfer.freeAgents, filter]);

  const watchlistPlayers = useMemo(() => {
    return transfer.watchlist
      .map((id) => transfer.freeAgents.find((l) => l.player.id === id))
      .filter(Boolean) as TransferListing[];
  }, [transfer.watchlist, transfer.freeAgents]);

  if (!team) return null;

  const transferWindowOpen = isTransferWindowOpen();
  const windowStatus = transferWindowStatus();

  return (
    <div className="px-4 py-4 pb-24 space-y-3">
      {/* Budget header */}
      <div className="tm-card p-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">{t("transfer.title")}</h1>
          <p className="text-[11px] text-muted-foreground">
            {transfer.freeAgents.length} {t("transfer.players_count")}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t("transfer.budget")}
          </div>
          <div className="text-base font-bold tabular-nums text-emerald-700">
            {formatEuro(team.budget)}
          </div>
        </div>
      </div>

      {/* Transfer penceresi durumu */}
      <div className={cn(
        "tm-card p-2.5 flex items-center gap-2 text-[11px] font-bold",
        transferWindowOpen ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
      )}>
        <span>{transferWindowOpen ? "🟢" : "🔴"}</span>
        <span className="flex-1">{transferWindowOpen ? t("transfer.window_open") : t("transfer.window_closed")}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {windowStatus.week}/{windowStatus.totalWeeks}
        </span>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1.5 overflow-x-auto tm-no-scrollbar">
        {(
          [
            { key: "market", label: t("transfer.tab.market"), count: transfer.freeAgents.length },
            { key: "freeagents", label: "Takımsız", count: transfer.freeAgentListings?.length ?? 0 },
            { key: "loan", label: "Kiralık", count: transfer.loanListings?.length ?? 0 },
            { key: "watchlist", label: t("transfer.tab.watchlist"), count: transfer.watchlist.length },
            { key: "incoming", label: t("transfer.tab.incoming"), count: transfer.incomingOffers.length },
            { key: "mylisted", label: t("transfer.tab.mylisted"), count: transfer.myListedPlayers.length },
          ] as { key: SubTab; label: string; count: number }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => { haptic("light"); setSub(tab.key); }}
            className={cn(
              "tm-tap px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors border flex items-center gap-1.5",
              sub === tab.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:bg-accent"
            )}
           
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={cn(
                  "px-1 py-0 rounded text-[11px] tabular-nums",
                  sub === tab.key ? "bg-white/20" : "bg-muted"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Market tab */}
      {sub === "market" && (
        <>
          {/* Filter */}
          <div className="flex gap-1.5 overflow-x-auto tm-no-scrollbar">
            {(["ALL", "GK", "DEF", "MID", "FWD"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setFilter(g)}
                className={cn(
                  "tm-tap px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap border",
                  filter === g
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card border-border"
                )}
               
              >
                {g === "ALL" ? t("transfer.filter.all") : t(`transfer.filter.${g.toLowerCase()}`)}
              </button>
            ))}
          </div>

          {/* Player list */}
          <div className="tm-card divide-y divide-border">
            {filteredListings.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {t("common.loading")}
              </div>
            )}
            {filteredListings.map((listing) => (
              <PlayerCard
                key={listing.player.id}
                player={listing.player}
                askingPrice={listing.askingPrice}
                daysListed={listing.daysListed}
                offers={listing.offers}
                isWatched={transfer.watchlist.includes(listing.player.id)}
                onToggleWatch={() => useAppStore.getState().toggleWatchlist(listing.player.id)}
                onMakeOffer={() => setOfferModal(listing.player)}
                onOpenProfile={() => setProfilePlayer(listing.player)}
                onNegotiate={() => setNegotiationModal({ player: listing.player, askingPrice: listing.askingPrice })}
              />
            ))}
          </div>

          {/* Tax note */}
          <div className="text-[10px] text-muted-foreground text-center px-2">
            {t("transfer.tax_note")}
          </div>
        </>
      )}

      {/* Takımsız (serbest) oyuncular tab */}
      {sub === "freeagents" && (
        <div className="tm-card divide-y divide-border">
          {(transfer.freeAgentListings ?? []).length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Takımsız oyuncu yok
            </div>
          )}
          {(transfer.freeAgentListings ?? []).map((listing) => {
            const p = listing.player;
            const isWatched = transfer.watchlist.includes(p.id);
            return (
              <div key={p.id} className="py-1.5 px-3 flex items-center gap-2.5">
                <button
                  onClick={() => setProfilePlayer(p)}
                  className="tm-tap shrink-0"
                  aria-label="Profil"
                >
                  <PlayerAvatar initials={p.specificPosition} size={36} />
                </button>
                <button
                  onClick={() => setProfilePlayer(p)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold truncate">{p.firstName} {p.lastName}</span>
                    <PositionPill label={p.specificPosition} group={POSITION_GROUP[p.specificPosition]} />
                    <span className="text-xs">{p.nationality === "TR" ? "🇹🇷" : "🌍"}</span>
                    <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">TAKIMSIZ</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span>{p.age}{t("common.year")}</span>
                    {p.archetype && <><span>·</span><span className="truncate max-w-[100px]">{p.archetype}</span></>}
                    <span>·</span>
                    <span className="text-emerald-400 font-bold">Bedelsiz</span>
                  </div>
                  {/* Stats — güvenli fallback */}
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                    <StatChip label="Hız" value={safeStat(p, "pace")} growth={<StatGrowth playerId={p.id} statKey="speed" currentValue={safeStat(p, "pace")} />} />
                    <StatChip label="Pas" value={safeStat(p, "passing")} growth={<StatGrowth playerId={p.id} statKey="passing" currentValue={safeStat(p, "passing")} />} />
                    <StatChip label="Şut" value={safeStat(p, "shooting")} growth={<StatGrowth playerId={p.id} statKey="shooting" currentValue={safeStat(p, "shooting")} />} />
                    <StatChip label="Def" value={safeStat(p, "defending")} growth={<StatGrowth playerId={p.id} statKey="defending" currentValue={safeStat(p, "defending")} />} />
                  </div>
                </button>
                <div className="flex flex-col items-end gap-1">
                  <RatingBadge value={p.rating} />
                  {/* P2: Maaş göstergesi kaldırıldı — oyunda maaş yok */}
                </div>
                <button
                  onClick={() => {
                    haptic("success");
                    // Bedelsiz transfer — sadece maaş öde, serbest listeden çıkar, bildirim ekle
                    if (team) {
                      const state = useAppStore.getState();
                      // P0 FIX: Kadro limiti kontrolü
                      if (team.players.length >= 25) {
                        useAppStore.setState({
                          transfer: {
                            ...state.transfer,
                            messages: [
                              {
                                id: `msg-${Date.now()}`,
                                kind: "transfer_rejected",
                                fromTeamName: "Serbest Oyuncu",
                                message: `Kadro dolu (25/25). ${p.firstName} ${p.lastName} imzalanamadı.`,
                                at: Date.now(),
                                read: false,
                              },
                              ...state.transfer.messages,
                            ],
                          },
                        });
                        return;
                      }
                      // P0 FIX: Kaleci limiti — max 3 kaleci
                      if (p.specificPosition === "GK") {
                        const gkCount = team.players.filter(pl => pl.specificPosition === "GK").length;
                        if (gkCount >= 3) {
                          useAppStore.setState({
                            transfer: {
                              ...state.transfer,
                              messages: [
                                {
                                  id: `msg-${Date.now()}`,
                                  kind: "transfer_rejected",
                                  fromTeamName: "Serbest Oyuncu",
                                  message: `3 kaleci zaten var. ${p.firstName} ${p.lastName} imzalanamadı.`,
                                  at: Date.now(),
                                  read: false,
                                },
                                ...state.transfer.messages,
                              ],
                            },
                          });
                          return;
                        }
                      }
                      const signingFee = (listing.wageDemand ?? 0) * 4; // 4 haftalık maaş = imza bonusu
                      if (signingFee > team.budget) {
                        // Bütçe yetersiz — bildirim
                        useAppStore.setState({
                          transfer: {
                            ...state.transfer,
                            messages: [
                              {
                                id: `msg-${Date.now()}`,
                                kind: "transfer_rejected",
                                fromTeamName: "Serbest Oyuncu",
                                message: `${p.firstName} ${p.lastName} için yeterli bütçeniz yok (gerekli: ${formatEuro(signingFee)}).`,
                                at: Date.now(),
                                read: false,
                              },
                              ...state.transfer.messages,
                            ],
                          },
                        });
                        return;
                      }
                      const updatedClubs = state.clubs.map((c) =>
                        c.id === team.id
                          ? { ...c, players: [...c.players, { ...p, is_free_agent: false, weeklyWage: listing.wageDemand ?? p.weeklyWage }], budget: c.budget - signingFee }
                          : c
                      );
                      // Serbest listeden kaldır
                      const updatedFreeAgentListings = (state.transfer.freeAgentListings ?? []).filter(
                        (l) => l.player.id !== p.id
                      );
                      useAppStore.setState({
                        clubs: updatedClubs,
                        transfer: {
                          ...state.transfer,
                          freeAgentListings: updatedFreeAgentListings,
                          messages: [
                            {
                              id: `msg-${Date.now()}`,
                              kind: "transfer_accepted",
                              fromTeamName: "Serbest Oyuncu",
                              fromTeamShort: "SER",
                              message: `${p.firstName} ${p.lastName} takımınıza katıldı (bedelsiz transfer). İmza bonusu: ${formatEuro(signingFee)}.`,
                              at: Date.now(),
                              read: false,
                              playerId: p.id,
                              amount: signingFee,
                            },
                            ...state.transfer.messages,
                          ],
                        },
                      });
                      // ADDED: Transfer başarım tetikleyici
                      try {
                        const { incrementTransferCount } = require("@/components/touchline/achievements");
                        incrementTransferCount();
                      } catch (e) { console.warn("[achievements] transfer tetikleyici hatası:", e); }
                      setProfilePlayer(null);
                    }
                  }}
                  className="tm-tap px-2 py-1.5 rounded text-[10px] font-bold bg-emerald-600 text-white whitespace-nowrap"
                >
                  Kontrat İmzala
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Kiralık oyuncular tab */}
      {sub === "loan" && (
        <div className="tm-card divide-y divide-border">
          {(transfer.loanListings ?? []).length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Kiralık oyuncu yok
            </div>
          )}
          {(transfer.loanListings ?? []).map((listing, idx) => {
            const p = listing.player;
            return (
              <div key={`${p.id}-${idx}`} className="py-2 px-3">
                <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setProfilePlayer(p)}
                  className="tm-tap shrink-0"
                  aria-label="Profil"
                >
                  <PlayerAvatar initials={p.specificPosition} size={36} />
                </button>
                <button
                  onClick={() => setProfilePlayer(p)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold truncate">{p.firstName} {p.lastName}</span>
                    <PositionPill label={p.specificPosition} group={POSITION_GROUP[p.specificPosition]} />
                    <span className="text-[10px] px-1 py-0.5 rounded font-bold" style={{ background: listing.lenderTeamColor, color: "#fff" }}>
                      {listing.lenderTeamShort}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {p.age}{t("common.year")} · {listing.lenderTeamName}
                  </div>
                  <div className="text-[10px] mt-0.5">
                    <span className="text-sky-400 font-bold">{formatEuro(listing.dailyFee)}/gün</span>
                    <span className="text-muted-foreground"> · {listing.durationWeeks} hafta</span>
                    {listing.buyOption && (
                      <span className="text-amber-400 font-bold"> · Opsiyon: {formatEuro(listing.buyOption)}</span>
                    )}
                  </div>
                </button>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <RatingBadge value={p.rating} />
                </div>
                </div>
                {/* P2 FIX: Kiralık oyuncular için stat chip'ler */}
                <div className="flex items-center gap-1 mt-1.5 ml-9 text-[11px]">
                  <StatChip label="Hız" value={safeStat(p, "pace")} />
                  <StatChip label="Pas" value={safeStat(p, "passing")} />
                  <StatChip label="Şut" value={safeStat(p, "shooting")} />
                  <StatChip label="Def" value={safeStat(p, "defending")} />
                </div>
                <button
                  onClick={() => {
                    haptic("success");
                    // P0 FIX: makeLoanOffer action'ını çağır — çift takım bug'ını önler
                    // Oyuncu satıcıdan çıkartılır, _loaned/_loanWeeks/_loanFrom flag'leri set edilir
                    // Kadro limiti (25), bütçe kontrolü, kaleci limiti (3) action içinde yapılır
                    const totalLoanFee = listing.dailyFee * listing.durationWeeks * 7;
                    const result = useAppStore.getState().makeLoanOffer(p.id, totalLoanFee, listing.durationWeeks);
                    if (!result.success) {
                      const reason = result.reason === "budget" ? "Yeterli bütçeniz yok"
                        : result.reason === "squad-full" ? "Kadro dolu (25/25)"
                        : result.reason === "free-agent" ? "Serbest oyuncu kiralanamaz"
                        : result.reason === "not-found" ? "Oyuncu bulunamadı"
                        : result.reason === "no-team" ? "Takım yok"
                        : "Kiralama başarısız";
                      // Basit feedback — toast yerine alert
                      if (typeof window !== "undefined") alert(reason);
                    }
                  }}
                  className="tm-tap px-2 py-1.5 rounded text-[10px] font-bold bg-sky-600 text-white whitespace-nowrap"
                >
                  Kirala
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Watchlist tab */}
      {sub === "watchlist" && (
        <div className="tm-card divide-y divide-border">
          {watchlistPlayers.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {t("transfer.watchlist.empty")}
            </div>
          )}
          {watchlistPlayers.map((listing) => (
            <PlayerCard
              key={listing.player.id}
              player={listing.player}
              askingPrice={listing.askingPrice}
              daysListed={listing.daysListed}
              offers={listing.offers}
              isWatched={true}
              onToggleWatch={() => useAppStore.getState().toggleWatchlist(listing.player.id)}
              onMakeOffer={() => setOfferModal(listing.player)}
              onOpenProfile={() => setProfilePlayer(listing.player)}
              onNegotiate={() => setNegotiationModal({ player: listing.player, askingPrice: listing.askingPrice })}
            />
          ))}
        </div>
      )}

      {/* Incoming offers tab */}
      {sub === "incoming" && (() => {
        // P0 FIX: Stale teklifleri temizle — kadroda olmayan oyunculara gelen teklifleri sil
        const currentPlayerIds = new Set(team.players.map(p => p.id));
        const validOffers = transfer.incomingOffers.filter(o => currentPlayerIds.has(o.myPlayerId));
        // Eğer stale teklif varsa, store'u güncelle
        if (validOffers.length !== transfer.incomingOffers.length) {
          useAppStore.setState({
            transfer: { ...transfer, incomingOffers: validOffers },
          });
        }
        return (
        <div className="space-y-2">
          {validOffers.length === 0 && (
            <div className="tm-card p-8 text-center text-xs text-muted-foreground">
              {t("transfer.incoming.empty")}
            </div>
          )}
          {validOffers.map((offer) => {
            const player = team.players.find((p) => p.id === offer.myPlayerId);
            if (!player) return null; // P0 FIX: stale teklif render etme
            return (
              <IncomingOfferCard
                key={offer.id}
                offer={offer}
                player={player}
                onOpenProfile={() => setProfilePlayer(player)}
              />
            );
          })}
        </div>
        );
      })()}

      {/* My listed tab */}
      {sub === "mylisted" && (
        <div className="space-y-2">
          {transfer.myListedPlayers.length === 0 && (
            <div className="tm-card p-6 text-center text-xs text-muted-foreground">
              {t("transfer.mylisted.empty")}
            </div>
          )}
          {transfer.myListedPlayers.map((listed) => {
            const player = team.players.find((p) => p.id === listed.playerId);
            if (!player) return null;
            return (
              <div key={listed.playerId} className="tm-card py-2 px-3">
                <div className="flex items-center gap-3">
                  <PlayerAvatar
                    initials={player.specificPosition ?? "—"}
                    color={team.primaryColor}
                    size={36}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">
                        {player.firstName} {player.lastName}
                      </span>
                      <PositionPill label={player.specificPosition} group={POSITION_GROUP[player.specificPosition]} />
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {t("transfer.mylisted.listed_for")}:{" "}
                      <span className="font-bold text-foreground">
                        {formatEuro(listed.askingPrice)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => useAppStore.getState().unlistPlayer(player.id)}
                    className="tm-tap px-2 py-1 rounded text-[10px] font-bold border border-border"
                  >
                    {t("transfer.mylisted.unlist")}
                  </button>
                </div>
                {/* P2 FIX: My listed için stat chip'ler */}
                <div className="flex items-center gap-1 mt-1.5 ml-9 text-[11px]">
                  <StatChip label="Hız" value={safeStat(player, "pace")} />
                  <StatChip label="Pas" value={safeStat(player, "passing")} />
                  <StatChip label="Şut" value={safeStat(player, "shooting")} />
                  <StatChip label="Def" value={safeStat(player, "defending")} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Offer modal */}
      {offerModal && (
        <OfferModal
          player={offerModal}
          onClose={() => setOfferModal(null)}
        />
      )}

      {/* Player profile modal */}
      {profilePlayer && (
        <PlayerProfileModal
          player={profilePlayer}
          teamColor={team?.primaryColor ?? "#1a3a2a"}
          onClose={() => setProfilePlayer(null)}
        />
      )}

      {/* ADDED: Gelişmiş pazarlık modal'ı */}
      {negotiationModal && (
        <TransferNegotiationModal
          player={negotiationModal.player}
          askingPrice={negotiationModal.askingPrice}
          onClose={() => setNegotiationModal(null)}
        />
      )}
    </div>
  );
}

// ===== Player card =====
function PlayerCard({
  player,
  askingPrice,
  daysListed,
  offers,
  isWatched,
  onToggleWatch,
  onMakeOffer,
  onOpenProfile,
  onNegotiate,
}: {
  player: Player;
  askingPrice: number;
  daysListed: number;
  offers: number;
  isWatched: boolean;
  onToggleWatch: () => void;
  onMakeOffer: () => void;
  onOpenProfile: () => void;
  // ADDED: Gelişmiş pazarlık modal'ı aç
  onNegotiate?: () => void;
}) {
  const { t } = useI18n();
  const nat = NATIONALITIES.find((n) =>
    player.nationality === "TR" ? n.code === "TR" : n.code !== "TR"
  );
  const flag = player.nationality === "TR"
    ? "🇹🇷"
    : (NATIONALITIES.find((n) => n.code !== "TR") ?? NATIONALITIES[0]).flag;
  const isAboveValue = askingPrice > player.marketValue;

  return (
    <div className="py-2 px-3">
      {/* Üst satır: avatar + isim/pos/arketip + rating/fiyat + heart + teklif */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenProfile}
          className="tm-tap shrink-0"
          aria-label="Profil"
        >
          <PlayerAvatar
            initials={player.specificPosition ?? "—"}
            size={32}
          />
        </button>
        <button
          onClick={onOpenProfile}
          className="flex-1 min-w-0 text-left"
        >
          {/* Satır 1: İsim + pozisyon + sakat icon */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold truncate">
              {player.firstName} {player.lastName}
            </span>
            <PositionPill label={player.specificPosition} group={POSITION_GROUP[player.specificPosition]} />
            {player.is_injured && (
              <span className="text-[11px] shrink-0" title={`Sakat${player.injury?.remaining_days ? ` · ${player.injury.remaining_days}g` : ""}`}>🤕</span>
            )}
          </div>
          {/* Satır 2: Arketip + yaş */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 min-w-0">
            {player.archetype && <span className="text-amber-300 truncate max-w-[80px]">{player.archetype}</span>}
            {player.archetype && <span className="shrink-0">·</span>}
            <span className="shrink-0">{player.age}{t("common.year")}</span>
          </div>
        </button>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <RatingBadge value={player.rating} />
          <div className="text-[11px] font-bold tabular-nums text-emerald-400">{formatEuro(askingPrice)}</div>
        </div>
        <button
          onClick={onToggleWatch}
          className={cn(
            "tm-tap p-0.5 rounded-full shrink-0",
            isWatched ? "text-red-500" : "text-muted-foreground"
          )}
          aria-label={isWatched ? t("transfer.watchlist.remove") : t("transfer.watchlist.add")}
        >
          <Heart size={14} fill={isWatched ? "currentColor" : "none"} />
        </button>
        <button
          onClick={onMakeOffer}
          className="tm-tap px-2 py-1.5 rounded text-[10px] font-bold bg-primary text-primary-foreground whitespace-nowrap shrink-0"
        >
          {t("transfer.make_offer")}
        </button>
      </div>
      {/* Alt satır: 4 stat chip — tam genişlik, iç içe geçmesin */}
      <div className="flex items-center gap-1 mt-1.5 ml-9 text-[11px]">
        <StatChip label="Hız" value={safeStat(player, "pace")} growth={<StatGrowth playerId={player.id} statKey="speed" currentValue={safeStat(player, "pace")} />} />
        <StatChip label="Pas" value={safeStat(player, "passing")} growth={<StatGrowth playerId={player.id} statKey="passing" currentValue={safeStat(player, "passing")} />} />
        <StatChip label="Şut" value={safeStat(player, "shooting")} growth={<StatGrowth playerId={player.id} statKey="shooting" currentValue={safeStat(player, "shooting")} />} />
        <StatChip label="Def" value={safeStat(player, "defending")} growth={<StatGrowth playerId={player.id} statKey="defending" currentValue={safeStat(player, "defending")} />} />
      </div>
    </div>
  );
}

// ===== Incoming offer card =====
function IncomingOfferCard({
  offer,
  player,
  onOpenProfile,
}: {
  offer: IncomingOffer;
  player?: Player;
  onOpenProfile?: () => void;
}) {
  const { t } = useI18n();
  const team = useMyTeam();

  const recColor =
    offer.recommended === "accept"
      ? "bg-emerald-100 text-emerald-700"
      : offer.recommended === "reject"
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";
  const recText =
    offer.recommended === "accept"
      ? t("transfer.incoming.recommended.accept")
      : offer.recommended === "reject"
      ? t("transfer.incoming.recommended.reject")
      : t("transfer.incoming.recommended.negotiate");

  return (
    <div className="tm-card py-2.5 px-3">
      <div className="flex items-center gap-3 mb-2">
        {player && (
          <button
            onClick={onOpenProfile}
            className="tm-tap shrink-0"
            aria-label="Profil"
          >
            <PlayerAvatar
              initials={player.specificPosition ?? "—"}
              color={team?.primaryColor}
              size={36}
            />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <button
            onClick={onOpenProfile}
            className="tm-tap text-sm font-semibold truncate text-left hover:text-primary hover:underline transition-colors"
          >
            {player ? `${player.firstName} ${player.lastName}` : "—"}
          </button>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock size={10} />
            {offer.expiresHours}{t("transfer.incoming.hours")} {t("transfer.incoming.expires")}
          </div>
        </div>
        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", recColor)}>
          {recText}
        </span>
      </div>

      {/* Buyer info */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <ClubBadge short={offer.buyerTeamShort} primaryColor={offer.buyerTeamColor} size={24} />
        <span className="text-xs font-medium">{offer.buyerTeamName}</span>
      </div>

      {/* Offer details — P2: Sadece transfer ücreti, maaş/sözleşme yok */}
      <div className="mb-3 text-center">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t("transfer.offer_modal.transfer_fee")}
          </div>
          <div className="text-sm font-bold tabular-nums">{formatEuro(offer.offerAmount)}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            haptic("success");
            useAppStore.getState().acceptOffer(offer.id);
          }}
          className="tm-tap flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-md bg-emerald-600 text-white text-xs font-bold"
        >
          <Check size={14} /> {t("transfer.incoming.accept")}
        </button>
        <button
          onClick={() => {
            haptic("light");
            useAppStore.getState().rejectOffer(offer.id);
          }}
          className="tm-tap flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-md border border-border text-xs font-bold"
        >
          <X size={14} /> {t("transfer.incoming.reject")}
        </button>
      </div>
    </div>
  );
}

// ===== Offer modal =====
function OfferModal({
  player,
  onClose,
}: {
  player: Player;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const team = useMyTeam();
  const transfer = useAppStore((s) => s.transfer);
  const listing = transfer.freeAgents.find((l) => l.player.id === player.id);

  const initialFee = listing?.askingPrice ?? player.marketValue;
  const [fee, setFee] = useState(initialFee);
  // P2: Maaş ve sözleşme yılı artık kullanıcıdan alınmıyor — sabit değerler
  const wage = player.weeklyWage ?? 0;
  const years = 3;
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  if (!team || !listing) return null;

  const cost = calculateBuyerCost(fee);
  const overBudget = cost.total > team.budget;
  const tooLow = fee < listing.askingPrice * 0.85;

  const handleSubmit = () => {
    haptic("medium");
    const result = useAppStore.getState().buyPlayer(player.id, fee, wage, years);
    if (result.success) {
      haptic("success");
      setFeedback({ type: "success", msg: t("transfer.offer_modal.accepted") });
      setTimeout(() => onClose(), 1500);
    } else {
      haptic("error");
      const reason =
        result.reason === "budget"
          ? t("transfer.offer_modal.budget_low")
          : result.reason === "too-low"
          ? t("transfer.offer_modal.too_low")
          : t("transfer.offer_modal.rejected");
      setFeedback({ type: "error", msg: reason });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="close" />
      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border tm-safe-bottom max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold">{t("transfer.offer_modal.title")}</h3>
          <button onClick={onClose} className="tm-tap p-1" aria-label={t("common.close")}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto tm-thin-scrollbar p-4 space-y-3">
          {/* Player summary */}
          <div className="flex items-center gap-3">
            <PlayerAvatar
              initials={player.specificPosition ?? "—"}
              size={44}
            />
            <div className="flex-1">
              <div className="text-sm font-bold">{player.firstName} {player.lastName}</div>
              <div className="text-[11px] text-muted-foreground">
                {player.specificPosition} · {player.age} {t("common.year")} · OVR {player.rating}
              </div>
            </div>
            <RatingBadge value={player.rating} />
          </div>

          {/* Asking price info */}
          <div className="tm-card p-2.5 bg-muted/30 flex justify-between text-xs">
            <div>
              <div className="text-[10px] text-muted-foreground">{t("transfer.asking_price")}</div>
              <div className="font-bold tabular-nums">{formatEuro(listing.askingPrice)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">{t("transfer.market_value")}</div>
              <div className="font-bold tabular-nums">{formatEuro(player.marketValue)}</div>
              {(() => {
                const seasonNumber = useAppStore.getState().seasonNumber ?? 1;
                const mult = getInflationMultiplier(seasonNumber);
                if (mult <= 1.0) return null;
                const baseValue = removeInflation(player.marketValue, seasonNumber);
                return (
                  <div className="text-[10px] text-yellow-400/70 mt-0.5">
                    Baz: {formatEuro(baseValue)} · +%{Math.round((mult - 1) * 100)} enflasyon
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Fee input */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {t("transfer.offer_modal.transfer_fee")}
            </label>
            <div className="mt-1 flex items-center gap-2">
              <button
                onClick={() => setFee(Math.max(0, fee - 50000))}
                className="tm-tap w-8 h-8 rounded-md border border-border text-sm font-bold"
              >−</button>
              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm font-bold tabular-nums text-center"
              />
              <button
                onClick={() => setFee(fee + 50000)}
                className="tm-tap w-8 h-8 rounded-md border border-border text-sm font-bold"
              >+</button>
            </div>
          </div>

          {/* P2: Maaş input KALDIRILDI — oyunda maaş yok */}

          {/* P2: Sözleşme yılı KALDIRILDI — oyunda sözleşme yok */}

          {/* Cost breakdown */}
          <div className="tm-card p-3 space-y-1.5 bg-muted/30">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("transfer.offer_modal.transfer_fee")}</span>
              <span className="tabular-nums">{formatEuro(cost.transferFee)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("transfer.offer_modal.agent_fee")}</span>
              <span className="tabular-nums">{formatEuro(cost.agentFee)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("transfer.offer_modal.signing_bonus")}</span>
              <span className="tabular-nums">{formatEuro(cost.signingBonus)}</span>
            </div>
            <div className="border-t border-border pt-1.5 flex justify-between">
              <span className="text-xs font-bold">{t("transfer.offer_modal.total_cost")}</span>
              <span className={cn(
                "text-sm font-bold tabular-nums",
                overBudget ? "text-red-600" : "text-emerald-700"
              )}>
                {formatEuro(cost.total)}
              </span>
            </div>
          </div>

          {/* Budget check */}
          {overBudget && (
            <div className="tm-card p-2.5 bg-red-50 border-red-200 text-center text-xs font-bold text-red-700">
              {t("transfer.offer_modal.budget_low")}
            </div>
          )}
          {tooLow && !overBudget && (
            <div className="tm-card p-2.5 bg-amber-50 border-amber-200 text-center text-xs font-bold text-amber-700">
              {t("transfer.offer_modal.too_low")}
            </div>
          )}

          {feedback && (
            <div className={cn(
              "tm-card p-2.5 text-center text-xs font-bold",
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            )}>
              {feedback.msg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-3 flex gap-2">
          <button
            onClick={onClose}
            className="tm-tap flex-1 py-2.5 rounded-md border border-border text-sm font-bold"
          >
            {t("transfer.offer_modal.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={overBudget || tooLow}
            className={cn(
              "tm-tap flex-1 py-2.5 rounded-md text-sm font-bold text-white",
              overBudget || tooLow
                ? "bg-muted-foreground cursor-not-allowed"
                : "bg-primary active:scale-[0.98]"
            )}
          >
            {t("transfer.offer_modal.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Mini stat chip — transfer kartındaki 4 temel stat
function StatChip({ label, value, growth }: { label: string; value: number; growth?: React.ReactNode }) {
  // P2 FIX: value undefined/null/NaN ise 50 göster
  const safeValue = (typeof value === "number" && !isNaN(value)) ? value : 50;
  const color = safeValue >= 80 ? "text-emerald-400" : safeValue >= 65 ? "text-amber-400" : "text-red-400";
  return (
    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-muted/40">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-bold tabular-nums", color)}>{safeValue}</span>
      {growth}
    </span>
  );
}

// P2 FIX: Güvenli stat okuma — stats objesi eksikse/undefined ise fallback
function safeStat(player: any, statKey: "pace" | "passing" | "shooting" | "defending"): number {
  // Önce player.stats.statKey
  const fromStats = player?.stats?.[statKey];
  if (typeof fromStats === "number" && !isNaN(fromStats)) return fromStats;
  // Fallback: player.statKey (eski alan)
  const fromPlayer = player?.[statKey];
  if (typeof fromPlayer === "number" && !isNaN(fromPlayer)) return fromPlayer;
  // Son fallback: 50
  return 50;
}
