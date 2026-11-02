// Opslag: alles staat in de browser van dit toestel (localStorage), zonder
// account of server. Met een back-upbestand zet je het over naar een ander
// toestel, en je kunt de JSON-bestanden van de iPhone-app inlezen.

import { uid, sampleTraining, defaultMatchSettings } from "./model.js";

const KEY = "coach-timer";
const SESSION_KEY = "coach-timer-session";

const emptyState = () => ({
  trainings: [sampleTraining()],
  team: { name: "", shirt: "blauw", keeperShirt: "geel", squad: [], matches: [] },
  settings: { sound: true },
  lastBackup: null,
});

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function write(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error("Opslaan mislukt", e);
    return false;
  }
}

export function loadState() {
  const saved = read(KEY);
  if (!saved) return emptyState();
  const base = emptyState();
  return {
    ...base, ...saved,
    team: { ...base.team, ...saved.team },
    settings: { ...base.settings, ...saved.settings },
  };
}

export const saveState = (state) => write(KEY, state);
export const loadSession = () => read(SESSION_KEY);
export const saveSession = (session) => write(SESSION_KEY, session);

/** Vraag de browser om de gegevens niet zomaar op te ruimen. */
export function askPersistence() {
  try { navigator.storage?.persist?.(); } catch { /* niet erg */ }
}

// MARK: - Back-up

export function backupBlob(state) {
  const data = { app: "coach-timer", version: 1, exportedAt: new Date().toISOString(),
                 trainings: state.trainings, team: state.team, settings: state.settings };
  return new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
}

export function backupFileName() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `coach-timer-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

/**
 * Leest één bestand en past het toe op `state`. Geeft een korte omschrijving
 * terug van wat er gebeurde, of gooit een fout met uitleg.
 *
 * Herkent: een back-up van deze website (vervangt alles), trainings.json en
 * team.json van de iPhone-app, en een losse training van de iPhone-app.
 */
export function applyImport(state, json) {
  if (json && json.app === "coach-timer") {
    state.trainings = json.trainings ?? [];
    state.team = { ...emptyState().team, ...json.team };
    state.settings = { ...state.settings, ...json.settings };
    return `Back-up teruggezet: ${state.trainings.length} trainingen, ${state.team.squad.length} spelers, ${state.team.matches.length} wedstrijden.`;
  }
  if (Array.isArray(json) && json.every(isSwiftTraining)) {
    const n = mergeTrainings(state, json.map(fromSwiftTraining));
    return `${n} training(en) van de iPhone-app ingelezen.`;
  }
  if (isSwiftTraining(json)) {
    mergeTrainings(state, [fromSwiftTraining(json)]);
    return `Training "${json.name}" ingelezen.`;
  }
  if (json && Array.isArray(json.squad)) {
    state.team = fromSwiftTeam(json);
    return `Ploeg van de iPhone-app ingelezen: ${state.team.squad.length} spelers, ${state.team.matches.length} wedstrijden.`;
  }
  throw new Error("Dit bestand herken ik niet. Kies een back-up van deze site, of trainings.json of team.json van de iPhone-app.");
}

function mergeTrainings(state, trainings) {
  for (const t of trainings) {
    const i = state.trainings.findIndex((x) => x.id === t.id);
    if (i >= 0) state.trainings[i] = t; else state.trainings.push(t);
  }
  return trainings.length;
}

// MARK: - Van de iPhone-app
//
// De app bewaart met Swift's JSONEncoder: datums als seconden sinds 1 januari
// 2001, enums met waarden als {"countdown": {"duration": 180}}, en
// woordenboeken met een UUID als sleutel als platte lijst [sleutel, waarde, …].

const SWIFT_EPOCH = Date.UTC(2001, 0, 1);

const swiftDate = (v) =>
  v == null ? null : typeof v === "number" ? new Date(SWIFT_EPOCH + v * 1000).toISOString() : new Date(v).toISOString();

/** [k1, v1, k2, v2] of {k1: v1} → {k1: v1}. */
function swiftDict(v) {
  if (!v) return {};
  if (!Array.isArray(v)) return { ...v };
  const out = {};
  for (let i = 0; i + 1 < v.length; i += 2) out[v[i]] = v[i + 1];
  return out;
}

const isSwiftTraining = (x) => x && typeof x === "object" && typeof x.name === "string" && Array.isArray(x.blocks);

function fromSwiftTimer(t) {
  if (t.type) return t; // al in het formaat van de website
  if (t.countdown) return { type: "countdown", duration: t.countdown.duration };
  if (t.intervals) return { type: "intervals", ...t.intervals };
  if (t.rotation) {
    const p = t.rotation.plan;
    return { type: "rotation", plan: {
      stations: p.stations.map((s) => ({ id: s.id ?? uid(), name: s.name })),
      groups: p.groups.map((g) => ({ id: g.id ?? uid(), name: g.name, colorHex: g.colorHex, players: g.players ?? [] })),
      timePerStation: p.timePerStation, switchTime: p.switchTime ?? 30,
      advanceBetweenRotations: p.advanceBetweenRotations ?? "manual",
    } };
  }
  return { type: "countdown", duration: 600 };
}

function fromSwiftTraining(t) {
  return {
    id: t.id ?? uid(), name: t.name, date: swiftDate(t.date),
    blocks: t.blocks.map((b) => ({
      id: b.id ?? uid(), name: b.name, kind: b.kind ?? "custom", timer: fromSwiftTimer(b.timer),
      advance: b.advance ?? "manual", warnBefore: b.warnBefore ?? 30, notes: b.notes ?? null,
    })),
  };
}

function fromSwiftLineup(l) {
  if (!l) return null;
  return {
    positions: l.positions.map((p) => ({ id: p.id, line: p.line, x: p.x, y: p.y })),
    periods: l.periods,
    blocks: l.blocks.map((b) => ({ period: b.period, from: b.from, to: b.to })),
    assignments: l.assignments.map(swiftDict),
  };
}

function fromSwiftTeam(st) {
  const squad = st.squad.map((p) => ({ id: p.id, name: p.name, lines: p.lines ?? [], positions: p.positions ?? [] }));
  const matches = (st.matches ?? []).map((m) => {
    const overrides = {};
    for (const [id, r] of Object.entries(swiftDict(m.overrides))) overrides[id] = { lines: r.lines, positions: r.positions };
    const match = {
      id: m.id, title: m.title, date: swiftDate(m.date),
      settings: { ...defaultMatchSettings(), ...m.settings },
      selection: m.selection ?? [], overrides, plan: null, selectedBlock: m.selectedBlock ?? 0,
      isHome: m.isHome ?? null, score: m.score ?? null, played: fromSwiftLineup(m.played),
    };
    if (m.plan) {
      // Het schema blijft geldig als het gemaakt is voor dezelfde spelers en instellingen.
      const k = m.plan.key;
      const key = JSON.stringify({
        s: [k.settings.formationID, k.settings.periods, k.settings.minutes, k.settings.switchEvery],
        p: k.players.map((pl) => [pl.id, [...pl.lines].sort(), [...pl.positions].sort()]),
      });
      match.plan = { key, lineup: fromSwiftLineup(m.plan.lineup), edited: !!m.plan.edited };
    }
    return match;
  });
  return { name: st.teamName ?? "", shirt: st.shirt ?? "blauw", keeperShirt: st.keeperShirt ?? "geel", squad, matches };
}
