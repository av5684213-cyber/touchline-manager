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
import { ClubBadge, PlayerAvatar, PositionPill, RatingBadge } from "../ui-bits";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

type SubTab = "market" | "watchlist" | "incoming" | "mylisted";

export function TransferScreen() {
  const { t } = useI18n();
  const team = useMyTeam();
  const { transfer } = useAppStore();
  const [sub, setSub] = useState<SubTab>("market");
  const [filter, setFilter] = useState<PositionGroup | "ALL">("ALL");
  const [offerModal, setOfferModal] = useState<Player | null>(null);

  const filteredListings = useMemo(() => {
    if (filter === "ALL") return transfer.freeAgents;
    return transfer.freeAgents.filter(
      (l) => getPositionGroup(l.player.position) === filter
    );
  }, [transfer.freeAgents, filter]);

  const watchlistPlayers = useMemo(() => {
    return transfer.watchlist
      .map((id) => transfer.freeAgents.find((l) => l.player.id === id))
      .filter(Boolean) as TransferListing[];
  }, [transfer.watchlist, transfer.freeAgents]);

  if (!team) return null;

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
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

      {/* Sub-tabs */}
      <div className="flex gap-1.5 overflow-x-auto tm-no-scrollbar">
        {(
          [
            { key: "market", label: t("transfer.tab.market"), count: transfer.freeAgents.length },
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
            style={{ minHeight: 32 }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={cn(
                  "px-1 py-0 rounded text-[9px] tabular-nums",
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
                style={{ minHeight: 28 }}
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
              />
            ))}
          </div>

          {/* Tax note */}
          <div className="text-[10px] text-muted-foreground text-center px-2">
            {t("transfer.tax_note")}
          </div>
        </>
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
            />
          ))}
        </div>
      )}

      {/* Incoming offers tab */}
      {sub === "incoming" && (
        <div className="space-y-2">
          {transfer.incomingOffers.length === 0 && (
            <div className="tm-card p-8 text-center text-xs text-muted-foreground">
              {t("transfer.incoming.empty")}
            </div>
          )}
          {transfer.incomingOffers.map((offer) => {
            const player = team.players.find((p) => p.id === offer.myPlayerId);
            return (
              <IncomingOfferCard
                key={offer.id}
                offer={offer}
                player={player}
              />
            );
          })}
        </div>
      )}

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
              <div key={listed.playerId} className="tm-card p-3">
                <div className="flex items-center gap-3">
                  <PlayerAvatar
                    initials={`${player.firstName[0]}${player.lastName[0]}`}
                    color={team.primaryColor}
                    size={36}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">
                        {player.firstName} {player.lastName}
                      </span>
                      <PositionPill label={player.position} group={POSITION_GROUP[player.position]} />
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
}: {
  player: Player;
  askingPrice: number;
  daysListed: number;
  offers: number;
  isWatched: boolean;
  onToggleWatch: () => void;
  onMakeOffer: () => void;
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
    <div className="p-3 flex items-center gap-3">
      <PlayerAvatar
        initials={`${player.firstName[0]}${player.lastName[0]}`}
        size={36}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold truncate">
            {player.firstName} {player.lastName}
          </span>
          <PositionPill label={player.position} group={POSITION_GROUP[player.position]} />
          <span className="text-xs">{flag}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
          <span>{player.age} {t("common.year")}</span>
          {player.archetype && (
            <>
              <span>·</span>
              <span className="truncate max-w-[120px]">{player.archetype}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <RatingBadge value={player.rating} />
        <button
          onClick={onToggleWatch}
          className={cn(
            "tm-tap p-1 rounded-full",
            isWatched ? "text-red-500" : "text-muted-foreground"
          )}
          aria-label={isWatched ? t("transfer.watchlist.remove") : t("transfer.watchlist.add")}
        >
          <Heart size={14} fill={isWatched ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="flex flex-col items-end gap-1 w-20">
        <div className="text-xs font-bold tabular-nums">{formatEuro(askingPrice)}</div>
        <div className={cn(
          "text-[9px] flex items-center gap-0.5",
          isAboveValue ? "text-red-500" : "text-emerald-600"
        )}>
          {isAboveValue ? <TrendingUp size={9} className="rotate-90" /> : <TrendingUp size={9} className="-rotate-90" />}
          {Math.round(((askingPrice - player.marketValue) / player.marketValue) * 100)}%
        </div>
        <button
          onClick={onMakeOffer}
          className="tm-tap w-full px-2 py-1 rounded text-[10px] font-bold bg-primary text-primary-foreground"
        >
          {t("transfer.make_offer")}
        </button>
      </div>
    </div>
  );
}

// ===== Incoming offer card =====
function IncomingOfferCard({
  offer,
  player,
}: {
  offer: IncomingOffer;
  player?: Player;
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
    <div className="tm-card p-3">
      <div className="flex items-center gap-3 mb-2">
        {player && (
          <PlayerAvatar
            initials={`${player.firstName[0]}${player.lastName[0]}`}
            color={team?.primaryColor}
            size={36}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">
            {player ? `${player.firstName} ${player.lastName}` : "—"}
          </div>
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

      {/* Offer details */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div>
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
            {t("transfer.offer_modal.transfer_fee")}
          </div>
          <div className="text-sm font-bold tabular-nums">{formatEuro(offer.offerAmount)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
            {t("transfer.offer_modal.wage")}
          </div>
          <div className="text-sm font-bold tabular-nums">{formatEuro(offer.wageOffer)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
            {t("transfer.offer_modal.contract")}
          </div>
          <div className="text-sm font-bold tabular-nums">{offer.contractYears}y</div>
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
  const { transfer } = useAppStore();
  const listing = transfer.freeAgents.find((l) => l.player.id === player.id);

  const initialFee = listing?.askingPrice ?? player.marketValue;
  const [fee, setFee] = useState(initialFee);
  const [wage, setWage] = useState(player.weeklyWage);
  const [years, setYears] = useState(3);
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
              initials={`${player.firstName[0]}${player.lastName[0]}`}
              size={44}
            />
            <div className="flex-1">
              <div className="text-sm font-bold">{player.firstName} {player.lastName}</div>
              <div className="text-[11px] text-muted-foreground">
                {player.position} · {player.age} {t("common.year")} · OVR {player.ovr}
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

          {/* Wage */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {t("transfer.offer_modal.wage")}
            </label>
            <input
              type="number"
              value={wage}
              onChange={(e) => setWage(Number(e.target.value))}
              className="mt-1 w-full bg-card border border-border rounded-md px-3 py-2 text-sm font-bold tabular-nums"
            />
          </div>

          {/* Contract years */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {t("transfer.offer_modal.contract")}
            </label>
            <div className="mt-1 flex gap-1.5">
              {[2, 3, 4, 5].map((y) => (
                <button
                  key={y}
                  onClick={() => setYears(y)}
                  className={cn(
                    "tm-tap flex-1 py-2 rounded-md text-sm font-bold border",
                    years === y
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border"
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

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
