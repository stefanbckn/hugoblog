// Het rekenwerk van Coach Timer, zonder scherm: trainingen, het verloop van
// een sessie, opstellingen en het wisselschema. Overgezet van de iPhone-app
// (Models.swift, Session+Flow.swift, Lineup.swift, LineupGenerator.swift).
//
// Tijden in een sessie zijn milliseconden (Date.now()); duren in seconden,
// zoals in de app. Zo blijft een opgeslagen sessie juist na herladen.

export const uid = () =>
  crypto.randomUUID ? crypto.randomUUID().toUpperCase()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 3) | 8).toString(16).toUpperCase();
      });

// MARK: - Labels en kleuren

export const BLOCK_KINDS = {
  warmup: "Opwarming",
  tussenvorm: "Tussenvorm",
  wedstrijdvorm: "Wedstrijdvorm",
  coolingDown: "Cooling-down",
  custom: "Andere",
};

export const TIMER_TYPES = { countdown: "Aftellen", intervals: "Intervallen", rotation: "Posten" };

export const ADVANCE = { manual: "Wacht op mij", automatic: "Automatisch door" };

export const PHASE_LABEL = {
  running: "Bezig", resting: "Rust", switching: "Wisselen", waiting: "Tijd om", finished: "Klaar",
};

export const TEAM_COLORS = {
  rood: "#E53935", blauw: "#1E88E5", geel: "#FDD835", groen: "#43A047",
  oranje: "#FB8C00", paars: "#8E24AA", wit: "#FFFFFF", zwart: "#212121",
};

export const colorName = (key) => key[0].toUpperCase() + key.slice(1);
export const colorKeyForHex = (hex) =>
  Object.keys(TEAM_COLORS).find((k) => TEAM_COLORS[k].toLowerCase() === String(hex).toLowerCase());
/** Op een licht shirt is witte tekst onleesbaar. */
export const shirtText = (key) => (key === "wit" || key === "geel" ? "#000" : "#fff");

// MARK: - Tijd

/** "4:05", of "1:02:30" vanaf een uur. */
export function formatClock(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600), m = Math.floor(total / 60) % 60, s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Aftellen toont "0:01" tot het echt nul is, zoals een kookwekker. */
export const formatCountdown = (seconds) => formatClock(Math.ceil(seconds - 1e-6));

/** "Op schema", "+2:15 achter" of "0:40 voor". */
export function formatDrift(drift) {
  if (Math.abs(drift) < 15) return "Op schema";
  return drift > 0 ? `+${formatClock(drift)} achter` : `${formatClock(-drift)} voor`;
}

export const blockCount = (n) => (n === 1 ? "1 blok" : `${n} blokken`);

// MARK: - Trainingen en blokken

export function blockDuration(block) {
  const t = block.timer;
  switch (t.type) {
    case "countdown": return t.duration;
    case "intervals": return t.reps * t.work + Math.max(t.reps - 1, 0) * t.rest;
    case "rotation": return rotationDuration(t.plan);
  }
  return 0;
}

export const trainingDuration = (training) =>
  training.blocks.reduce((sum, b) => sum + blockDuration(b), 0);

export const rotationDuration = (plan) =>
  plan.stations.length * plan.timePerStation + Math.max(plan.stations.length - 1, 0) * plan.switchTime;

/** Groep i start op post i en schuift elke ronde één post op. */
export function rotationAssignment(plan, round) {
  const count = plan.stations.length;
  return plan.stations.map((station, s) => {
    const g = (((s - round) % count) + count) % count;
    return { station, group: g < plan.groups.length ? plan.groups[g] : null };
  });
}

export function newRotationPlan() {
  return {
    stations: [{ id: uid(), name: "Post 1" }, { id: uid(), name: "Post 2" }],
    groups: [
      { id: uid(), name: "Rood", colorHex: TEAM_COLORS.rood, players: [] },
      { id: uid(), name: "Blauw", colorHex: TEAM_COLORS.blauw, players: [] },
    ],
    timePerStation: 300, switchTime: 30, advanceBetweenRotations: "manual",
  };
}

export function newBlock(type) {
  const base = { id: uid(), advance: "manual", warnBefore: 30, notes: null };
  if (type === "intervals")
    return { ...base, name: "Intervallen", kind: "tussenvorm", warnBefore: 10,
             timer: { type: "intervals", work: 30, rest: 30, reps: 6 } };
  if (type === "rotation")
    return { ...base, name: "Posten", kind: "tussenvorm", timer: { type: "rotation", plan: newRotationPlan() } };
  return { ...base, name: "Nieuwe blok", kind: "custom", timer: { type: "countdown", duration: 600 } };
}

export function sampleTraining() {
  const b = (name, kind, timer, extra = {}) => ({ id: uid(), name, kind, timer, advance: "manual", warnBefore: 30, notes: null, ...extra });
  return {
    id: uid(), name: "Keeperstraining U13", date: null, blocks: [
      b("Opwarming", "warmup", { type: "countdown", duration: 600 }),
      b("Reactiesprints", "tussenvorm", { type: "intervals", work: 30, rest: 30, reps: 6 }, { warnBefore: 10 }),
      b("Postentraining", "tussenvorm", { type: "rotation", plan: {
        stations: [{ id: uid(), name: "Duiken laag" }, { id: uid(), name: "Uitballen" }, { id: uid(), name: "Hoge ballen" }],
        groups: [
          { id: uid(), name: "Rood", colorHex: TEAM_COLORS.rood, players: [] },
          { id: uid(), name: "Blauw", colorHex: TEAM_COLORS.blauw, players: [] },
          { id: uid(), name: "Geel", colorHex: TEAM_COLORS.geel, players: [] },
        ],
        timePerStation: 300, switchTime: 30, advanceBetweenRotations: "manual",
      } }, { notes: "Elke post: 3 reeksen van 5. Wissel keeper en aangever." }),
      b("Wedstrijdje", "wedstrijdvorm", { type: "countdown", duration: 900 }),
      b("Cooling-down", "coolingDown", { type: "countdown", duration: 300 }, { advance: "automatic" }),
    ],
  };
}

// MARK: - Verloop van een sessie
//
// Elke blok is een reeks stappen. Een stap is een "running"-fase; tussen
// twee stappen zit eventueel een tussenfase (rust of wisselen). Fasen met een
// eindtijd lopen vanzelf af; daarna automatisch door, of "waiting" tot de
// coach "volgende" drukt. Automatische overgangen starten op de geplande
// eindtijd van de vorige fase, niet op "nu": zo blijft het schema exact, ook
// als de browser het tabblad even stillegde.

const runDuration = (t) =>
  t.type === "countdown" ? t.duration : t.type === "intervals" ? t.work : t.plan.timePerStation;

const lastStep = (t) =>
  t.type === "countdown" ? 0 : t.type === "intervals" ? Math.max(t.reps, 1) - 1 : Math.max(t.plan.stations.length, 1) - 1;

const gap = (t) =>
  t.type === "intervals" ? { phase: "resting", duration: t.rest }
    : t.type === "rotation" ? { phase: "switching", duration: t.plan.switchTime } : null;

const advanceBetweenSteps = (t) => (t.type === "rotation" ? t.plan.advanceBetweenRotations : "automatic");

export const currentBlock = (s) => s.training.blocks[s.blockIndex] ?? null;

export function startSession(training, now = Date.now(), score = null) {
  const s = {
    training: structuredClone(training), startedAt: now, blockIndex: 0, blockStartedAt: now,
    step: 0, phase: "running", phaseStartedAt: null, phaseEndsAt: null,
    pausedAt: null, pausedTotal: 0, score, substitutionDone: null,
  };
  enterBlock(s, 0, now);
  return s;
}

export const isPaused = (s) => s.pausedAt != null;

export function pause(s, now = Date.now()) {
  if (s.pausedAt == null && s.phase !== "finished") s.pausedAt = now;
}

/** Bij hervatten schuiven alle tijdstippen op met de duur van de pauze. */
export function resume(s, now = Date.now()) {
  if (s.pausedAt == null) return;
  const p = now - s.pausedAt;
  s.blockStartedAt += p;
  if (s.phaseStartedAt != null) s.phaseStartedAt += p;
  if (s.phaseEndsAt != null) s.phaseEndsAt += p;
  s.pausedTotal += p;
  s.pausedAt = null;
}

/** Resterende seconden van de fase; null als die geen eindtijd heeft. */
export function remaining(s, now = Date.now()) {
  if (s.phaseEndsAt == null) return null;
  return Math.max(0, (s.phaseEndsAt - (s.pausedAt ?? now)) / 1000);
}

export function elapsedInPhase(s, now = Date.now()) {
  if (s.phaseStartedAt == null) return 0;
  return Math.max(0, ((s.pausedAt ?? now) - s.phaseStartedAt) / 1000);
}

/** 0...1, hoeveel van de fase voorbij is. */
export function progress(s, now = Date.now()) {
  if (s.phaseStartedAt == null || s.phaseEndsAt == null) return 1;
  const total = s.phaseEndsAt - s.phaseStartedAt;
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, ((s.pausedAt ?? now) - s.phaseStartedAt) / total));
}

/** Positief = je loopt achter op je planning (seconden). Pauzes tellen niet mee. */
export function drift(s, now = Date.now()) {
  const plannedDone = s.training.blocks.slice(0, s.blockIndex).reduce((a, b) => a + blockDuration(b), 0);
  const doneDrift = (s.blockStartedAt - s.startedAt - s.pausedTotal) / 1000 - plannedDone;
  const block = currentBlock(s);
  if (!block) return doneDrift;
  const clock = s.pausedAt ?? now;
  return doneDrift + Math.max(0, (clock - s.blockStartedAt) / 1000 - blockDuration(block));
}

export function nextStepDescription(s) {
  const block = currentBlock(s);
  if (!block) return "";
  if (s.phase === "resting") return "Volgende rep";
  if (s.phase === "switching") return "Start post";
  if (s.phase === "finished") return "";
  if (s.step < lastStep(block.timer)) return gap(block.timer)?.phase === "switching" ? "Wisselen" : "Volgende rep";
  return s.training.blocks[s.blockIndex + 1]?.name ?? "Einde training";
}

/** Verwerk alle fasen die intussen afgelopen zijn. */
export function update(s, now = Date.now()) {
  let guard = 0;
  while (!isPaused(s) && s.phaseEndsAt != null && s.phaseEndsAt <= now && guard++ < 1000) {
    completePhase(s, s.phaseEndsAt, false);
  }
}

/** De coach drukt "volgende": de fase stopt nu, een wachtmoment erna wordt overgeslagen. */
export function next(s, now = Date.now()) {
  resume(s, now);
  update(s, now);
  if (s.phase === "finished") return;
  completePhase(s, now, true);
}

function completePhase(s, time, coachConfirmed) {
  const block = currentBlock(s);
  if (!block) return;
  const timer = block.timer;
  switch (s.phase) {
    case "running":
      if (s.step < lastStep(timer)) {
        if (advanceBetweenSteps(timer) === "manual" && !coachConfirmed) wait(s, time);
        else startGap(s, timer, time);
      } else if (block.advance === "manual" && !coachConfirmed) {
        wait(s, time);
      } else {
        enterBlock(s, s.blockIndex + 1, time);
      }
      break;
    case "resting":
    case "switching":
      s.step += 1;
      enter(s, "running", runDuration(timer), time);
      break;
    case "waiting":
      if (s.step < lastStep(timer)) startGap(s, timer, time);
      else enterBlock(s, s.blockIndex + 1, time);
      break;
  }
}

function enterBlock(s, index, time) {
  s.blockIndex = index;
  s.blockStartedAt = time;
  s.step = 0;
  const block = currentBlock(s);
  if (block) {
    enter(s, "running", runDuration(block.timer), time);
  } else {
    s.phase = "finished";
    s.phaseStartedAt = time;
    s.phaseEndsAt = null;
  }
}

function startGap(s, timer, time) {
  const g = gap(timer);
  if (g && g.duration > 0) {
    enter(s, g.phase, g.duration, time);
  } else {
    s.step += 1;
    enter(s, "running", runDuration(timer), time);
  }
}

function wait(s, time) {
  s.phase = "waiting";
  s.phaseStartedAt = time;
  s.phaseEndsAt = null;
}

function enter(s, phase, duration, time) {
  s.phase = phase;
  s.phaseStartedAt = time;
  s.phaseEndsAt = time + duration * 1000;
}

export const stepInfo = { lastStep, gap };

// MARK: - Linies en posities

export const LINES = {
  K: { name: "keeper", positions: ["K"] },
  V: { name: "verdediging", positions: ["LV", "LCV", "CV", "RCV", "RV"] },
  M: { name: "middenveld", positions: ["LM", "LCM", "CVM", "CM", "CAM", "RCM", "RM"] },
  A: { name: "aanval", positions: ["LA", "LSP", "SP", "RSP", "RA"] },
};
export const LINE_KEYS = ["K", "V", "M", "A"];
const ALL_POSITIONS = LINE_KEYS.flatMap((l) => LINES[l].positions);

/** Posities sorteren zoals op het veld: linie per linie, van links naar rechts. */
export const positionOrder = (a, b) => {
  const i = (p) => { const x = ALL_POSITIONS.indexOf(p); return x < 0 ? 999 : x; };
  return i(a) - i(b);
};

// Het veld is 100 breed en 140 lang, met het eigen doel onderaan.
const KEEPER = { id: "K", line: "K", x: 50, y: 126 };
const p = (id, line, x, y) => ({ id, line, x, y });

export const FORMATIONS = [
  { format: 5, name: "1-2-1", positions: [p("CV", "V", 50, 100), p("LM", "M", 20, 72), p("RM", "M", 80, 72), p("SP", "A", 50, 38)] },
  { format: 5, name: "2-2", positions: [p("LV", "V", 30, 98), p("RV", "V", 70, 98), p("LSP", "A", 32, 44), p("RSP", "A", 68, 44)] },
  { format: 8, name: "3-3-1", positions: [
    p("LV", "V", 17, 100), p("CV", "V", 50, 104), p("RV", "V", 83, 100),
    p("LM", "M", 17, 66), p("CM", "M", 50, 74), p("RM", "M", 83, 66), p("SP", "A", 50, 30)] },
  { format: 8, name: "2-4-1", positions: [
    p("LCV", "V", 32, 104), p("RCV", "V", 68, 104), p("CVM", "M", 50, 86), p("LM", "M", 15, 66),
    p("RM", "M", 85, 66), p("CAM", "M", 50, 54), p("SP", "A", 50, 28)] },
  { format: 8, name: "3-2-2", positions: [
    p("LV", "V", 17, 100), p("CV", "V", 50, 104), p("RV", "V", 83, 100),
    p("LCM", "M", 32, 74), p("RCM", "M", 68, 74), p("LSP", "A", 30, 36), p("RSP", "A", 70, 36)] },
  { format: 8, name: "2-3-2", positions: [
    p("LCV", "V", 32, 104), p("RCV", "V", 68, 104), p("LM", "M", 15, 70), p("CM", "M", 50, 78), p("RM", "M", 85, 70),
    p("LSP", "A", 32, 36), p("RSP", "A", 68, 36)] },
  { format: 8, name: "3-1-3", positions: [
    p("LV", "V", 17, 100), p("CV", "V", 50, 104), p("RV", "V", 83, 100), p("CM", "M", 50, 74),
    p("LA", "A", 17, 40), p("SP", "A", 50, 30), p("RA", "A", 83, 40)] },
  { format: 11, name: "4-3-3", positions: [
    p("LV", "V", 13, 98), p("LCV", "V", 37, 106), p("RCV", "V", 63, 106), p("RV", "V", 87, 98),
    p("LCM", "M", 28, 68), p("CVM", "M", 50, 84), p("RCM", "M", 72, 68),
    p("LA", "A", 16, 36), p("SP", "A", 50, 26), p("RA", "A", 84, 36)] },
  { format: 11, name: "4-4-2", positions: [
    p("LV", "V", 13, 98), p("LCV", "V", 37, 106), p("RCV", "V", 63, 106), p("RV", "V", 87, 98),
    p("LM", "M", 13, 66), p("LCM", "M", 38, 74), p("RCM", "M", 62, 74), p("RM", "M", 87, 66),
    p("LSP", "A", 36, 32), p("RSP", "A", 64, 32)] },
  { format: 11, name: "4-4-2 ruit", positions: [
    p("LV", "V", 13, 98), p("LCV", "V", 37, 106), p("RCV", "V", 63, 106), p("RV", "V", 87, 98),
    p("CVM", "M", 50, 86), p("LCM", "M", 28, 70), p("RCM", "M", 72, 70), p("CAM", "M", 50, 56),
    p("LSP", "A", 36, 30), p("RSP", "A", 64, 30)] },
  { format: 11, name: "4-2-3-1", positions: [
    p("LV", "V", 13, 98), p("LCV", "V", 37, 106), p("RCV", "V", 63, 106), p("RV", "V", 87, 98),
    p("LCM", "M", 36, 84), p("RCM", "M", 64, 84), p("LM", "M", 14, 56), p("CAM", "M", 50, 60), p("RM", "M", 86, 56),
    p("SP", "A", 50, 26)] },
  { format: 11, name: "4-1-4-1", positions: [
    p("LV", "V", 13, 98), p("LCV", "V", 37, 106), p("RCV", "V", 63, 106), p("RV", "V", 87, 98),
    p("CVM", "M", 50, 86), p("LM", "M", 13, 62), p("LCM", "M", 37, 66), p("RCM", "M", 63, 66), p("RM", "M", 87, 62),
    p("SP", "A", 50, 28)] },
  { format: 11, name: "3-5-2", positions: [
    p("LCV", "V", 25, 102), p("CV", "V", 50, 106), p("RCV", "V", 75, 102),
    p("LM", "M", 10, 66), p("LCM", "M", 32, 72), p("CVM", "M", 50, 84), p("RCM", "M", 68, 72), p("RM", "M", 90, 66),
    p("LSP", "A", 36, 32), p("RSP", "A", 64, 32)] },
  { format: 11, name: "3-4-3", positions: [
    p("LCV", "V", 25, 102), p("CV", "V", 50, 106), p("RCV", "V", 75, 102),
    p("LM", "M", 12, 70), p("LCM", "M", 38, 78), p("RCM", "M", 62, 78), p("RM", "M", 88, 70),
    p("LA", "A", 18, 38), p("SP", "A", 50, 28), p("RA", "A", 82, 38)] },
  { format: 11, name: "5-3-2", positions: [
    p("LV", "V", 9, 92), p("LCV", "V", 30, 104), p("CV", "V", 50, 108), p("RCV", "V", 70, 104), p("RV", "V", 91, 92),
    p("LCM", "M", 28, 70), p("CM", "M", 50, 76), p("RCM", "M", 72, 70),
    p("LSP", "A", 36, 34), p("RSP", "A", 64, 34)] },
].map((f) => ({ ...f, id: `${f.format}:${f.name}`, allPositions: [KEEPER, ...f.positions] }));

export const formationById = (id) => FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[0];
export const SWITCH_OPTIONS = [3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45];
export const defaultMatchSettings = () => ({ formationID: "8:3-3-1", periods: 4, minutes: 20, switchEvery: 10 });

// MARK: - Spelers

export const newPlayer = (name) => ({ id: uid(), name, lines: ["V", "M", "A"], positions: [] });
export const canPlay = (player, pos) => player.lines.includes(pos.line) || player.positions.includes(pos.id);
export const canKeep = (player) => player.lines.includes("K");
export const playsField = (player) => player.lines.some((l) => l !== "K") || player.positions.length > 0;

// MARK: - Het schema

export function makeBlocks({ periods, minutes, switchEvery }) {
  const blocks = [];
  for (let period = 0; period < Math.max(periods, 0); period++) {
    let t = 0;
    while (t < minutes) {
      const end = switchEvery > 0 ? Math.min(t + switchEvery, minutes) : minutes;
      blocks.push({ period, from: t, to: end });
      t = end;
    }
  }
  return blocks;
}

export const dur = (block) => block.to - block.from;
export const lineupPosition = (lineup, id) => lineup.positions.find((p) => p.id === id);

/** Speeltijd in minuten; met `before` alleen de blokken vóór dat blok. */
export function minutesOf(lineup, player, before = lineup.blocks.length) {
  let total = 0;
  for (let i = 0; i < Math.min(before, lineup.blocks.length); i++) {
    if (lineup.assignments[i][player] != null) total += dur(lineup.blocks[i]);
  }
  return total;
}

export function periodBlocks(lineup, index) {
  const block = lineup.blocks[index];
  if (!block) return { count: 1, position: 0 };
  const indices = lineup.blocks.map((b, i) => (b.period === block.period ? i : -1)).filter((i) => i >= 0);
  return { count: indices.length, position: Math.max(0, indices.indexOf(index)) };
}

/** "Q1", "2e helft", "P2", of leeg bij één periode. */
export function periodName(lineup, period) {
  if (lineup.periods === 4) return `Q${period + 1}`;
  if (lineup.periods === 2) return `${period + 1}e helft`;
  if (lineup.periods === 1) return "";
  return `P${period + 1}`;
}

export function blockName(lineup, index, short = false) {
  const b = lineup.blocks[index];
  const time = `${b.from}-${b.to}'`;
  const per = periodName(lineup, b.period);
  return short || !per ? time : `${per} · ${time}`;
}

/** "Start Q2", "Q1 · op 10'", of "Aftrap". */
export function momentName(lineup, index) {
  const b = lineup.blocks[index];
  const per = periodName(lineup, b.period);
  if (b.from === 0) return per ? `Start ${per}` : "Aftrap";
  return (per ? `${per} · ` : "") + `op ${b.from}'`;
}

/**
 * Wie gaat eruit, wie komt erin, en wie schuift daarvoor op, bij de start van
 * blok `index`. Vanuit de vrijgekomen plek van wie eruit gaat volg je wie daar
 * nu staat; stond die al op het veld, dan volg je zijn oude plek, tot je bij
 * een speler uitkomt die van de bank komt.
 */
export function changesAt(lineup, index) {
  const empty = { substitutions: [], moves: [] };
  if (index <= 0 || index >= lineup.assignments.length) return empty;
  const before = lineup.assignments[index - 1];
  const now = lineup.assignments[index];
  const order = lineup.positions.map((p) => p.id);
  const rank = (pos) => { const i = order.indexOf(pos); return i < 0 ? order.length : i; };

  const atPosition = {};
  for (const [player, pos] of Object.entries(now)) atPosition[pos] = player;

  const named = new Set();
  const leaving = Object.keys(before).filter((pl) => now[pl] == null).sort((a, b) => rank(before[a]) - rank(before[b]));

  const substitutions = leaving.map((out) => {
    let who = atPosition[before[out]];
    const moves = [];
    let steps = 0;
    while (who != null && before[who] != null && now[who] != null && steps < 30) {
      steps++;
      moves.push({ player: who, from: before[who], to: now[who] });
      named.add(who);
      who = atPosition[before[who]];
    }
    if (who != null) named.add(who);
    return { out, into: who ?? null, position: who != null ? now[who] : "", moves };
  });

  const moves = Object.entries(now)
    .filter(([pl, pos]) => before[pl] != null && before[pl] !== pos && !named.has(pl))
    .map(([pl, pos]) => ({ player: pl, from: before[pl], to: pos }))
    .sort((a, b) => rank(a.from) - rank(b.from));

  return { substitutions, moves };
}

export const changesEmpty = (c) => c.substitutions.length === 0 && c.moves.length === 0;

/** Twee spelers wisselen in een blok. Twee bankzitters: er gebeurt niets (false). */
export function swapPlayers(lineup, a, b, index) {
  if (a === b || !lineup.assignments[index]) return false;
  const map = lineup.assignments[index];
  const pa = map[a], pb = map[b];
  if (pa == null && pb == null) return false;
  if (pb == null) delete map[a]; else map[a] = pb;
  if (pa == null) delete map[b]; else map[b] = pa;
  return true;
}

// MARK: - Een wedstrijd

/** Een speler zoals hij vandaag kan spelen. */
export function applyOverride(match, player) {
  const roles = match.overrides?.[player.id];
  return roles ? { ...player, lines: [...roles.lines], positions: [...roles.positions] } : player;
}

/** De geselecteerde spelers, in de volgorde van de ploeg, met de posities van vandaag. */
export const matchPlayers = (match, squad) =>
  squad.filter((p) => match.selection.includes(p.id)).map((p) => applyOverride(match, p));

/** Alles wat het schema beïnvloedt. Namen niet: een tikfout mag het schema niet weggooien. */
export function planKey(match, squad) {
  const s = match.settings;
  return JSON.stringify({
    s: [s.formationID, s.periods, s.minutes, s.switchEvery],
    p: matchPlayers(match, squad).map((pl) => [pl.id, [...pl.lines].sort(), [...pl.positions].sort()]),
  });
}

export function currentPlan(match, squad) {
  return match.plan && match.plan.key === planKey(match, squad) ? match.plan : null;
}

export const isPlanOutdated = (match, squad) => match.plan != null && currentPlan(match, squad) == null;

/** Maakt een nieuw voorstel. Geeft de foutmelding terug als het niet lukt. */
export function makePlan(match, squad) {
  const result = generateLineup(matchPlayers(match, squad), match.settings);
  if (result.error) {
    match.plan = null;
    return result.error;
  }
  match.plan = { key: planKey(match, squad), lineup: result.lineup, edited: false };
  match.selectedBlock = 0;
  return null;
}

export const isHome = (match) => match.isHome ?? true;

/**
 * Het schema als training voor de timer: één aftelblok per blok van het schema.
 * Binnen een periode loopt de klok vanzelf door; aan het einde van een periode
 * wacht hij tot je "volgende" drukt (de rust).
 */
export function matchTraining(match, team) {
  const plan = currentPlan(match, team.squad);
  if (!plan) return null;
  const lineup = plan.lineup;
  const blocks = lineup.blocks.map((b, i) => {
    const continues = lineup.blocks[i + 1]?.period === b.period;
    return {
      id: uid(), name: blockName(lineup, i), kind: "wedstrijdvorm",
      timer: { type: "countdown", duration: dur(b) * 60 },
      advance: continues ? "automatic" : "manual", warnBefore: 60, notes: null,
    };
  });
  const names = {};
  for (const pl of matchPlayers(match, team.squad)) names[pl.id] = pl.name;
  return {
    id: match.id, name: match.title, date: null, blocks,
    match: {
      lineup: structuredClone(lineup), names, shirt: team.shirt, keeperShirt: team.keeperShirt,
      teamName: team.name || null, isHome: isHome(match),
    },
  };
}

// MARK: - Een lopende wedstrijd

export const timeInBlock = (s, now = Date.now()) => Math.max(0, ((s.pausedAt ?? now) - s.blockStartedAt) / 1000);

export const matchBlock = (s) => s.training.match?.lineup.blocks[s.blockIndex] ?? null;

/** Tijd sinds de aftrap van de periode, in seconden. */
export function matchTime(s, now = Date.now()) {
  const b = matchBlock(s);
  return b ? b.from * 60 + timeInBlock(s, now) : null;
}

/** De eerste twee minuten van een nieuw blok: tijd om te wisselen, tot "Wissel gedaan". */
export const isSubstituting = (s, now = Date.now()) =>
  matchBlock(s) != null && s.blockIndex > 0 && s.phase === "running" && timeInBlock(s, now) < 120
  && s.substitutionDone !== s.blockIndex;

/**
 * "1 minuut later": de ploeg op het veld speelt nog even door. De grens tussen de
 * twee blokken schuift op met hele minuten, tot ze minstens even in de toekomst ligt.
 */
export function delaySubstitution(s, now = Date.now()) {
  const match = s.training.match;
  if (!match || !isSubstituting(s, now) || isPaused(s)) return false;
  const i = s.blockIndex;
  const lineup = match.lineup;
  if (!lineup.blocks[i] || lineup.blocks[i - 1].period !== lineup.blocks[i].period) return false;
  const shift = Math.floor(timeInBlock(s, now) / 60) + 1;
  if (dur(lineup.blocks[i]) <= shift) return false;

  lineup.blocks[i - 1].to += shift;
  lineup.blocks[i].from += shift;
  for (const j of [i - 1, i]) {
    s.training.blocks[j].name = blockName(lineup, j);
    s.training.blocks[j].timer = { type: "countdown", duration: dur(lineup.blocks[j]) * 60 };
  }
  const end = s.blockStartedAt + shift * 60000;
  const start = end - blockDuration(s.training.blocks[i - 1]) * 1000;
  s.blockIndex = i - 1;
  s.blockStartedAt = start;
  s.step = 0;
  s.phase = "running";
  s.phaseStartedAt = start;
  s.phaseEndsAt = end;
  return true;
}

// MARK: - Het algoritme
//
// Per blok kiest het schema wie speelt en waar, met een toewijzing (Hongaarse
// methode) over alle veldposities en alle beschikbare spelers tegelijk. De kost
// van een speler is vooral zijn speeltijd tot dan toe; daarbovenop een kleine
// kost om van plaats te veranderen en wat toeval. Dat gebeurt 300 keer en de
// beste poging wint. De keeper wisselt alleen tussen de periodes.

const ATTEMPTS = 300;
const IMPOSSIBLE = 1e7;

export function lineupProblem(players, formation) {
  const needed = formation.positions.length + 1;
  if (players.length < needed)
    return `Er zijn ${players.length} spelers aanwezig, maar er moeten er ${needed} op het veld staan.`;
  if (!players.some(canKeep)) return "Niemand heeft K aangevinkt. Duid minstens één keeper aan.";
  const empty = formation.positions.filter((pos) => !players.some((pl) => canPlay(pl, pos)));
  if (empty.length)
    return `Niemand kan ${empty.map((e) => e.id).join(", ")} spelen in ${formation.name}. Duid bij meer spelers meer posities aan.`;
  const nowhere = players.filter((pl) => !canKeep(pl) && !formation.positions.some((pos) => canPlay(pl, pos)));
  if (nowhere.length)
    return `${nowhere.map((n) => n.name).join(", ")} kan in ${formation.name} nergens staan. Pas de posities aan of zet op afwezig.`;
  return null;
}

export function generateLineup(players, settings, rng = Math.random) {
  const formation = formationById(settings.formationID);
  const problem = lineupProblem(players, formation);
  if (problem) return { error: problem };
  const blocks = makeBlocks(settings);
  let best = null;
  for (let i = 0; i < ATTEMPTS; i++) {
    const assignments = attempt(blocks, formation, players, settings.periods, rng);
    if (!assignments) continue;
    const sc = scoreLineup(assignments, blocks, players);
    if (!best || sc < best.score) best = { assignments, score: sc };
  }
  if (!best) return { error: "Met deze posities lukt geen geldige opstelling. Duid bij meer spelers meer posities aan." };
  return { lineup: { positions: formation.allPositions, periods: settings.periods, blocks, assignments: best.assignments } };
}

function attempt(blocks, formation, players, periods, rng) {
  const minutes = {}, benched = {}, lastPosition = {};
  const keeperCount = {};
  const candidatesK = players.filter(canKeep);
  const keepers = [];
  for (let k = 0; k < periods; k++) {
    let bestK = null, bestV = Infinity;
    for (const c of candidatesK) {
      const v = (keeperCount[c.id] ?? 0) + rng() * 0.5;
      if (v < bestV) { bestV = v; bestK = c.id; }
    }
    keeperCount[bestK] = (keeperCount[bestK] ?? 0) + 1;
    keepers.push(bestK);
  }
  const lineOf = Object.fromEntries(formation.allPositions.map((p) => [p.id, p.line]));

  const result = [];
  let previous = null;
  for (const block of blocks) {
    const keeper = keepers[block.period];
    const candidates = players.filter((pl) => pl.id !== keeper);
    const d = dur(block);
    const cost = formation.positions.map((pos) => candidates.map((pl) => {
      let c = canPlay(pl, pos) ? 0 : IMPOSSIBLE;
      c += ((minutes[pl.id] ?? 0) - (benched[pl.id] ?? 0) * d) * 10;
      const was = lastPosition[pl.id];
      if (was != null && was !== pos.id) {
        const stays = previous?.[pl.id] != null;
        const sameLine = lineOf[was] === pos.line;
        c += sameLine ? (stays ? 20 : 10) : (stays ? 45 : 25);
      }
      return c + rng() * 30;
    }));

    const map = { [keeper]: "K" };
    const chosen = hungarian(cost);
    for (let row = 0; row < chosen.length; row++) {
      const pl = candidates[chosen[row]];
      const pos = formation.positions[row];
      if (!canPlay(pl, pos)) return null;
      map[pl.id] = pos.id;
      lastPosition[pl.id] = pos.id;
    }
    for (const pl of players) {
      if (map[pl.id] != null) {
        minutes[pl.id] = (minutes[pl.id] ?? 0) + d;
        benched[pl.id] = 0;
      } else {
        benched[pl.id] = (benched[pl.id] ?? 0) + 1;
      }
    }
    result.push(map);
    previous = map;
  }
  return result;
}

/** Lager = beter: eerlijke minuten eerst, dan weinig lange bankbeurten, verschuivingen en drukke wissels. */
function scoreLineup(assignments, blocks, players) {
  const mins = players.filter(playsField).map((pl) =>
    blocks.reduce((sum, b, i) => sum + (assignments[i][pl.id] != null ? dur(b) : 0), 0));
  const mean = mins.reduce((a, b) => a + b, 0) / Math.max(mins.length, 1);
  const fairness = mins.reduce((a, m) => a + (m - mean) ** 2, 0);
  const spread = mins.length ? Math.max(...mins) - Math.min(...mins) : 0;

  let longBench = 0;
  for (const pl of players) {
    let streak = 0;
    for (const map of assignments) {
      if (map[pl.id] != null) streak = 0;
      else { streak++; if (streak > 1) longBench += streak - 1; }
    }
  }

  let shifts = 0, busy = 0;
  for (let i = 1; i < assignments.length; i++) {
    const before = assignments[i - 1];
    let subs = 0;
    for (const [pl, pos] of Object.entries(assignments[i])) {
      if (before[pl] != null) { if (before[pl] !== pos) shifts++; } else subs++;
    }
    const atBreak = blocks[i].period !== blocks[i - 1].period;
    busy += subs * subs * (atBreak ? 2 : 8);
  }
  return fairness * 10 + spread * 40 + longBench * 300 + shifts * 25 + busy;
}

/** Toewijzing met de laagste kost: n rijen (posities) <= m kolommen (spelers). Per rij de gekozen kolom. */
export function hungarian(cost) {
  const n = cost.length;
  if (!n) return [];
  const m = cost[0].length;
  const u = new Array(n + 1).fill(0), v = new Array(m + 1).fill(0);
  const pp = new Array(m + 1).fill(0), way = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    pp[0] = i;
    let j0 = 0;
    const minv = new Array(m + 1).fill(Infinity);
    const used = new Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = pp[j0];
      let delta = Infinity, j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let k = 0; k <= m; k++) {
        if (used[k]) { u[pp[k]] += delta; v[k] -= delta; } else minv[k] -= delta;
      }
      j0 = j1;
    } while (pp[j0] !== 0);
    do { const j1 = way[j0]; pp[j0] = pp[j1]; j0 = j1; } while (j0 !== 0);
  }
  const result = new Array(n).fill(0);
  for (let col = 1; col <= m; col++) if (pp[col] !== 0) result[pp[col] - 1] = col - 1;
  return result;
}

// MARK: - Speeltijd per speler

export const isPlayed = (match, now = Date.now()) =>
  new Date(match.date).getTime() < now && (match.plan != null || match.played != null);

/** Wat een speler gespeeld heeft, uit de schema's van gespeelde wedstrijden (nieuwste eerst). */
export function playerStats(team, playerId, now = Date.now()) {
  const entries = team.matches
    .filter((m) => isPlayed(m, now))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((m) => {
      const lineup = m.played ?? m.plan?.lineup;
      if (!lineup) return null;
      const selected = m.plan ? JSON.parse(m.plan.key).p.some((x) => x[0] === playerId)
        : lineup.assignments.some((a) => a[playerId] != null);
      if (!selected) return null;
      const positions = {};
      lineup.blocks.forEach((b, i) => {
        const pos = lineup.assignments[i][playerId];
        if (pos) positions[pos] = (positions[pos] ?? 0) + dur(b);
      });
      return { id: m.id, title: m.title, date: m.date, minutes: minutesOf(lineup, playerId), positions };
    })
    .filter(Boolean);
  const total = entries.reduce((a, e) => a + e.minutes, 0);
  const posTotal = {};
  for (const e of entries) for (const [pos, mi] of Object.entries(e.positions)) posTotal[pos] = (posTotal[pos] ?? 0) + mi;
  const positionMinutes = Object.entries(posTotal)
    .map(([position, minutes]) => ({ position, minutes }))
    .sort((a, b) => b.minutes - a.minutes || positionOrder(a.position, b.position));
  return { entries, matchCount: entries.length, totalMinutes: total,
           averageMinutes: entries.length ? total / entries.length : 0, positionMinutes };
}

/** Bewaart wat er echt gespeeld is, en de stand, als een wedstrijd stopt. */
export function recordSession(team, s) {
  const lineup = s.training.match?.lineup;
  const match = team.matches.find((m) => m.id === s.training.id);
  if (!lineup || !match) return;
  const reached = s.phase === "finished" ? lineup.blocks.length : s.blockIndex;
  if (reached > 0 && reached >= (match.played?.blocks.length ?? 0)) {
    match.played = { ...structuredClone(lineup), blocks: lineup.blocks.slice(0, reached).map((b) => ({ ...b })),
                     assignments: lineup.assignments.slice(0, reached).map((a) => ({ ...a })) };
  }
  if (s.score) match.score = { ...s.score };
}

/** "Jan Peeters" → "JP", "Mila" → "MI". */
export function initials(name) {
  const words = String(name).trim().split(/\s+/);
  if (words.length > 1) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  return String(name).slice(0, 2).toUpperCase();
}
