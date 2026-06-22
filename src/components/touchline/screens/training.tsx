"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Dumbbell,
  GraduationCap,
  Heart,
  Play,
  Sparkles,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import {
  canBeMentee,
  canBeMentor,
  CATEGORY_LABELS,
  TRAINING_PROGRAMS,
  todayKey,
  type TrainingCategoryId,
  type TrainingProgram,
} from "@/lib/training/engine";
import { POSITION_GROUP, type Player, type PositionGroup } from "@/lib/mock/data";
import { PlayerAvatar, PositionPill } from "../ui-bits";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

export function TrainingScreen() {
  const { t, locale } = useI18n();
  const team = useMyTeam();
  const { training, facilities, runSession } = useAppStore();
  const [filter, setFilter] = useState<PositionGroup | "ALL">("ALL");
  const [pickerFor, setPickerFor] = useState<Player | null>(null);
  const [mentorModal, setMentorModal] = useState(false);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const today = todayKey();
  const todayCount = training.lastTrainingDate === today ? training.dailyCount : 0;
  const canTrain = todayCount < 2 && training.assignments.length > 0;

  const filteredPlayers = useMemo(() => {
    if (!team) return [];
    if (filter === "ALL") return team.players;
    return team.players.filter((p) => POSITION_GROUP[p.specificPosition] === filter);
  }, [team, filter]);

  if (!team) return null;

  const facilityMult = (1.0 + facilities.levels.pitch * 0.1).toFixed(1);

  const handleRun = () => {
    if (!canTrain) return;
    setRunning(true);
    haptic("medium");
    setTimeout(() => {
      const result = runSession(1.0);
      setRunning(false);
      if (result.success) {
        haptic("success");
        setFeedback({ type: "success", msg: t("training.run_session") + " ✓" });
      } else {
        haptic("error");
        const msg = result.reason === "daily-limit" ? t("training.limit_full") : "Hata";
        setFeedback({ type: "error", msg });
      }
      setTimeout(() => setFeedback(null), 2500);
    }, 600);
  };

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
      {/* Header */}
      <div className="tm-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-base font-bold">{t("training.title")}</h1>
            <p className="text-[11px] text-muted-foreground">
              {t("training.daily_limit")} · {t("training.facility_level")} {facilities.levels.pitch} (×{facilityMult})
            </p>
          </div>
          <div className="text-right">
            <div className="flex gap-1 mb-1">
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "w-3 h-3 rounded-full",
                    i < todayCount ? "bg-emerald-500" : "bg-muted"
                  )}
                />
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {todayCount}/2 {t("training.daily_count")}
            </div>
          </div>
        </div>
        <button
          onClick={handleRun}
          disabled={!canTrain || running}
          className={cn(
            "tm-tap w-full py-2.5 rounded-md text-sm font-bold flex items-center justify-center gap-2",
            !canTrain || running
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground active:scale-[0.98]"
          )}
        >
          <Play size={14} />
          {running
            ? t("training.running")
            : todayCount >= 2
            ? t("training.limit_full")
            : todayCount === 0
            ? t("training.session.morning")
            : t("training.session.afternoon")}
        </button>
      </div>

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

      {/* Last session results */}
      {training.lastSessionResults.length > 0 && (
        <div className="tm-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-emerald-600" />
            <span className="text-xs font-bold">{t("training.results.title")}</span>
          </div>
          <div className="max-h-40 overflow-y-auto tm-thin-scrollbar space-y-1.5">
            {training.lastSessionResults.map((r) => {
              const player = team.players.find((p) => p.id === r.playerId);
              const program = TRAINING_PROGRAMS.find((p) => p.id === r.programId);
              if (!player) return null;
              return (
                <div key={r.playerId} className="flex items-center gap-2 text-xs py-1">
                  <PlayerAvatar
                    initials={`${player.firstName[0]}${player.lastName[0]}`}
                    color={team.primaryColor}
                    size={24}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {player.firstName} {player.lastName}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {program?.icon} {program?.name[locale]}
                    </div>
                  </div>
                  <div className="text-right">
                    {Object.entries(r.statGains).map(([stat, val]) => (
                      val && val > 0 ? (
                        <div key={stat} className="text-[10px] text-emerald-700 font-semibold tabular-nums">
                          +{val.toFixed(1)} {stat.slice(0, 3)}
                        </div>
                      ) : null
                    ))}
                    {r.condChange !== 0 && (
                      <div className={cn(
                        "text-[10px] font-semibold tabular-nums",
                        r.condChange > 0 ? "text-emerald-700" : "text-amber-700"
                      )}>
                        {r.condChange > 0 ? "+" : ""}{r.condChange} {t("training.results.cond_change")}
                      </div>
                    )}
                    {r.moraleChange > 0 && (
                      <div className="text-[10px] text-emerald-700 font-semibold tabular-nums">
                        +{r.moraleChange} {t("training.results.morale_change")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Programs grid */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Dumbbell size={14} className="text-muted-foreground" />
          <h2 className="text-sm font-bold">{t("training.programs.title")}</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TRAINING_PROGRAMS.map((p) => (
            <ProgramCard key={p.id} program={p} locale={locale} />
          ))}
        </div>
      </div>

      {/* Squad list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <User size={14} className="text-muted-foreground" />
            <h2 className="text-sm font-bold">{t("training.squad.title")}</h2>
          </div>
          <button
            onClick={() => { haptic("light"); setMentorModal(true); }}
            className="tm-tap inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border border-border"
          >
            <GraduationCap size={12} />
            {t("training.mentor.title")}
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto tm-no-scrollbar">
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
              {g === "ALL" ? t("training.filter.all") : t(`training.filter.${g.toLowerCase()}`)}
            </button>
          ))}
        </div>

        {/* Players */}
        <div className="tm-card divide-y divide-border">
          {filteredPlayers.map((p) => {
            const assignment = training.assignments.find((a) => a.playerId === p.id);
            const program = assignment
              ? TRAINING_PROGRAMS.find((prog) => prog.id === assignment.programId)
              : null;
            const mentorship = training.mentorAssignments.find((m) => m.menteeId === p.id);
            return (
              <div key={p.id} className="p-3 flex items-center gap-3">
                <PlayerAvatar
                  initials={`${p.firstName[0]}${p.lastName[0]}`}
                  color={team.primaryColor}
                  size={36}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold truncate">
                      {p.firstName} {p.lastName}
                    </span>
                    <PositionPill label={p.specificPosition} group={POSITION_GROUP[p.specificPosition]} />
                    <span className="text-[10px] text-muted-foreground">{p.age}{t("common.year")}</span>
                    {mentorship && <Sparkles size={11} className="text-amber-500" />}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Heart size={9} className={p.condition > 60 ? "text-emerald-500" : "text-amber-500"} />
                    <span>{p.condition}%</span>
                    {program && (
                      <>
                        <span>·</span>
                        <span>{program.icon} {program.name[locale]}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { haptic("light"); setPickerFor(p); }}
                  className={cn(
                    "tm-tap px-2 py-1 rounded text-[10px] font-bold border",
                    program ? "bg-primary/10 border-primary text-primary" : "border-border"
                  )}
                >
                  {program ? program.icon : "+"}
                </button>
                {assignment && (
                  <button
                    onClick={() => useAppStore.getState().unassignPlayer(p.id)}
                    className="tm-tap p-1 text-muted-foreground"
                    aria-label={t("training.squad.unassign")}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Program picker modal */}
      {pickerFor && (
        <ProgramPicker
          player={pickerFor}
          onClose={() => setPickerFor(null)}
        />
      )}

      {/* Mentor modal */}
      {mentorModal && (
        <MentorModal onClose={() => setMentorModal(false)} />
      )}
    </div>
  );
}

function ProgramCard({
  program,
  locale,
}: {
  program: TrainingProgram;
  locale: "tr" | "en";
}) {
  const { t } = useI18n();
  const category = program.category;
  const catColor: Record<TrainingCategoryId, string> = {
    fitness: "bg-red-100 text-red-700",
    midfield: "bg-emerald-100 text-emerald-700",
    defense: "bg-sky-100 text-sky-700",
    attack: "bg-amber-100 text-amber-700",
    gk: "bg-purple-100 text-purple-700",
    mixed: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="tm-card p-2.5">
      <div className="flex items-start justify-between mb-1">
        <span className="text-xl">{program.icon}</span>
        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold", catColor[category])}>
          {CATEGORY_LABELS[category][locale]}
        </span>
      </div>
      <div className="text-xs font-bold leading-tight mb-1">{program.name[locale]}</div>
      <div className="text-[10px] text-muted-foreground leading-tight mb-1.5">
        {program.desc[locale]}
      </div>
      <div className="flex items-center justify-between text-[9px]">
        <span className="text-muted-foreground">
          {t("training.facility_bonus") === "çarpan" ? "Yoğunluk" : "Intensity"}: {program.intensity}
        </span>
        <span className={cn("font-bold", program.condCost > 0 ? "text-emerald-700" : "text-amber-700")}>
          {program.condCost > 0 ? "+" : ""}{program.condCost} {t("training.results.cond_change")}
        </span>
      </div>
    </div>
  );
}

function ProgramPicker({
  player,
  onClose,
}: {
  player: Player;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const { assignProgram } = useAppStore();

  // Hangi programlar bu oyuncu için uygun?
  const eligible = TRAINING_PROGRAMS.filter((p) => {
    if (p.allowedPositions === "ALL") return true;
    if (p.allowedPositions === "FIELD") return player.specificPosition !== "GK";
    return p.allowedPositions.includes(player.specificPosition);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="close" />
      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border tm-safe-bottom max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold">
            {player.firstName} {player.lastName}
          </h3>
          <button onClick={onClose} className="tm-tap p-1">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto tm-thin-scrollbar p-3 space-y-1.5">
          {eligible.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                haptic("success");
                assignProgram(player.id, p.id);
                onClose();
              }}
              className="tm-tap w-full flex items-center gap-3 p-2.5 rounded-md border border-border bg-card hover:bg-accent text-left"
            >
              <span className="text-xl">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{p.name[locale]}</div>
                <div className="text-[10px] text-muted-foreground">{p.desc[locale]}</div>
              </div>
              <div className="text-right text-[10px]">
                <div className="text-muted-foreground">Yoğunluk</div>
                <div className="font-bold">{p.intensity}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MentorModal({ onClose }: { onClose: () => void }) {
  const { t, locale } = useI18n();
  const team = useMyTeam()!;
  const { training, assignMentor, removeMentor } = useAppStore();
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [selectedMentee, setSelectedMentee] = useState<string | null>(null);

  const mentors = team.players.filter(canBeMentor);
  const mentees = team.players.filter(canBeMentee);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="close" />
      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border tm-safe-bottom max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} />
            <h3 className="text-sm font-bold">{t("training.mentor.title")}</h3>
          </div>
          <button onClick={onClose} className="tm-tap p-1">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto tm-thin-scrollbar p-4 space-y-4">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t("training.mentor.desc")}
          </p>

          {/* Active mentorships */}
          {training.mentorAssignments.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold mb-2 uppercase tracking-wide text-muted-foreground">
                {t("training.mentor.active")}
              </div>
              <div className="space-y-1.5">
                {training.mentorAssignments.map((m) => {
                  const mentor = team.players.find((p) => p.id === m.mentorId);
                  const mentee = team.players.find((p) => p.id === m.menteeId);
                  if (!mentor || !mentee) return null;
                  return (
                    <div key={m.menteeId} className="tm-card p-2.5 flex items-center gap-2 text-xs">
                      <PlayerAvatar initials={`${mentor.firstName[0]}${mentor.lastName[0]}`} size={24} />
                      <span className="font-semibold truncate">{mentor.firstName} {mentor.lastName}</span>
                      <span className="text-muted-foreground">→</span>
                      <PlayerAvatar initials={`${mentee.firstName[0]}${mentee.lastName[0]}`} size={24} />
                      <span className="font-semibold truncate flex-1">{mentee.firstName} {mentee.lastName}</span>
                      <span className="text-emerald-700 font-bold">+{Math.round(m.bonusRate * 100)}%</span>
                      <button
                        onClick={() => { haptic("light"); removeMentor(m.menteeId); }}
                        className="tm-tap text-[10px] text-red-600 font-semibold"
                      >
                        {t("training.mentor.remove")}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* New assignment */}
          {mentors.length > 0 && mentees.length > 0 ? (
            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">
                  {t("training.mentor.mentor")}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {mentors.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMentor(selectedMentor === m.id ? null : m.id)}
                      className={cn(
                        "tm-tap flex items-center gap-1.5 p-2 rounded-md border text-left",
                        selectedMentor === m.id ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <PlayerAvatar
                        initials={`${m.firstName[0]}${m.lastName[0]}`}
                        size={22}
                        color={team.primaryColor}
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold truncate">{m.firstName} {m.lastName}</div>
                        <div className="text-[9px] text-muted-foreground">{m.age}{t("common.year")}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold mb-1.5 uppercase tracking-wide text-muted-foreground">
                  {t("training.mentor.mentee")}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {mentees.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMentee(selectedMentee === m.id ? null : m.id)}
                      className={cn(
                        "tm-tap flex items-center gap-1.5 p-2 rounded-md border text-left",
                        selectedMentee === m.id ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <PlayerAvatar
                        initials={`${m.firstName[0]}${m.lastName[0]}`}
                        size={22}
                        color={team.primaryColor}
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold truncate">{m.firstName} {m.lastName}</div>
                        <div className="text-[9px] text-muted-foreground">{m.age}{t("common.year")}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  if (selectedMentor && selectedMentee) {
                    haptic("success");
                    assignMentor(selectedMentor, selectedMentee);
                    setSelectedMentor(null);
                    setSelectedMentee(null);
                  }
                }}
                disabled={!selectedMentor || !selectedMentee}
                className={cn(
                  "tm-tap w-full py-2.5 rounded-md text-sm font-bold",
                  !selectedMentor || !selectedMentee
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {t("training.mentor.confirm")}
              </button>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-4">
              {t("training.mentor.none_eligible")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
