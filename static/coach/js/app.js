// De schermen van Coach Timer. Drie tabbladen (trainingen, wedstrijden,
// ploeg), instellingen, en de timer die over alles heen ligt.
//
// Elk scherm is een functie die HTML teruggeeft. Knoppen en velden krijgen
// een functie mee via act() en bind(); die worden bij elke opbouw opnieuw
// geregistreerd. Tekstvelden bewaren bij elke toets maar bouwen het scherm
// niet opnieuw op, zodat je focus niet verliest.

import * as M from "./model.js";
import * as S from "./store.js";
import * as D from "./drawing.js";
import * as P from "./media.js";

let state = S.loadState();
let session = S.loadSession();
const ui = { showPlayed: false, editingLineup: false, selected: null, installPrompt: null };

const save = () => S.saveState(state);
const team = () => state.team;

// MARK: - Registratie van knoppen en velden

function registry(prefix) {
  let n = 0;
  const map = new Map();
  return {
    reset() { map.clear(); n = 0; },
    add(fn) { const id = prefix + n++; map.set(id, fn); return id; },
    get(id) { return map.get(id); },
  };
}
const reg = { v: registry("v"), s: registry("s") };
let scope = reg.v;

/** Een klik: `data-a="…"`. Na de actie wordt bewaard en het scherm opnieuw opgebouwd. */
const act = (fn) => `data-a="${scope.add(fn)}"`;
/** Een veld: live = bij elke toets (zonder opnieuw opbouwen), anders bij "change". */
const bind = (fn, live = false) => `data-b="${scope.add(fn)}"${live ? " data-live" : ""}`;

const lookup = (id) => (id[0] === "s" ? reg.s : reg.v).get(id);

document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-a]");
  if (!el) return;
  const fn = lookup(el.dataset.a);
  if (!fn) return;
  ev.preventDefault();
  const isSession = el.dataset.a[0] === "s";
  const result = fn(el, ev);
  if (result instanceof Promise) return;
  if (!isSession) { save(); render(); }
});

document.addEventListener("input", (ev) => {
  const el = ev.target.closest("[data-b][data-live]");
  if (!el) return;
  lookup(el.dataset.b)?.(el.value, el);
  save();
});

document.addEventListener("change", (ev) => {
  const el = ev.target.closest("[data-b]");
  if (!el || el.hasAttribute("data-live")) return;
  const value = el.type === "checkbox" ? el.checked : el.value;
  lookup(el.dataset.b)?.(value, el);
  save();
  render();
});

// MARK: - Kleine hulpjes

const e = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const I = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  chev: '<path d="M9 18l6-6-6-6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  dn: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
  next: '<path d="M5 4.5v15L16 12z" fill="currentColor" stroke="none"/><rect x="16.5" y="4.5" width="3" height="15" rx="1" fill="currentColor" stroke="none"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
  repeat: '<path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4"/>',
  rotate: '<path d="M21 12a9 9 0 0 1-15.5 6.2M3 12A9 9 0 0 1 18.5 5.8"/><path d="M18.5 2v4h-4M5.5 22v-4h4"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h4"/>',
  pitch: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M12 5v14"/><circle cx="12" cy="12" r="2.5"/><path d="M3 9.5h2.5v5H3M21 9.5h-2.5v5H21"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2A5 5 0 0 1 21 19"/>',
  wand: '<path d="M4 20 16 8M14 4v3M20 10h-3M18.5 5.5l-2 2M12 2.5v0M21.5 12v0"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
  shirt: '<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z" fill="currentColor" stroke="none"/>',
  checkCircle: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" stroke-width="2.2"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
};
const icon = (name, cls = "") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name]}</svg>`;

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const tomorrowAt18 = () => { const d = new Date(startOfToday()); d.setDate(d.getDate() + 1); d.setHours(18); return d.toISOString(); };
const time = (iso) => (iso ? new Date(iso).getTime() : null);

const fmt = (iso, opts) => new Intl.DateTimeFormat("nl-BE", opts).format(new Date(iso));
const toLocalInput = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const nameOf = (id) => team().squad.find((p) => p.id === id)?.name ?? "?";

function circle(name, shirt = "blauw", size = 36, ring = null) {
  const c = `<span class="circle" style="--size:${size}px;background:${M.TEAM_COLORS[shirt]};color:${M.shirtText(shirt)}">${e(M.initials(name || "?"))}</span>`;
  return ring ? `<span class="ringed ${ring}">${c}</span>` : c;
}

function toast(text) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
  document.body.append(t);
  setTimeout(() => t.remove(), 3500);
}

/** Een vraag in een venstertje. Geeft true als je op de hoofdknop tikt. */
function ask({ title, message = "", ok, danger = false }) {
  return new Promise((resolve) => {
    const d = document.getElementById("dialog");
    d.innerHTML = `<h3>${e(title)}</h3>${message ? `<p>${e(message)}</p>` : ""}
      <button class="btn ${danger ? "danger" : ""}" value="ok">${e(ok)}</button>
      <button class="btn secondary" value="cancel">Annuleren</button>`;
    let answered = false;
    const finish = (yes) => { if (answered) return; answered = true; d.close(); resolve(yes); };
    d.onclick = (ev) => {
      const b = ev.target.closest("button");
      if (b) finish(b.value === "ok");
      else if (ev.target === d) finish(false);
    };
    d.onclose = () => finish(false);
    d.showModal();
  });
}

function select(options, value, onChange, cls = "field") {
  return `<span class="select-wrap"><select class="${cls}" ${bind(onChange)}>${options
    .map(([v, label]) => `<option value="${e(v)}"${String(v) === String(value) ? " selected" : ""}>${e(label)}</option>`)
    .join("")}</select>${icon("down")}</span>`;
}

function toggle(checked, onChange, label = "") {
  return `<label class="switch"><input type="checkbox" ${checked ? "checked" : ""} ${bind(onChange)} aria-label="${e(label)}"><span></span></label>`;
}

function stepper(value, min, max, onChange) {
  return `<span class="stepper">
    <button ${act(() => onChange(Math.max(min, value - 1)))} ${value <= min ? "disabled" : ""} aria-label="Minder">${icon("minus")}</button>
    <span class="n">${value}</span>
    <button ${act(() => onChange(Math.min(max, value + 1)))} ${value >= max ? "disabled" : ""} aria-label="Meer">${icon("plus")}</button>
  </span>`;
}

/** Minuten en seconden (per 5) kiezen met twee keuzelijsten. */
function duration(value, maxMinutes, onChange) {
  const m = Math.floor(value / 60), s = Math.floor((value % 60) / 5) * 5;
  const mins = Array.from({ length: Math.max(maxMinutes, m) + 1 }, (_, i) => `<option${i === m ? " selected" : ""}>${i}</option>`).join("");
  const secs = Array.from({ length: 12 }, (_, i) => i * 5)
    .map((v) => `<option value="${v}"${v === s ? " selected" : ""}>${String(v).padStart(2, "0")}</option>`).join("");
  return `<span class="duration">
    <select ${bind((v) => onChange(Number(v) * 60 + (value % 60)))} aria-label="Minuten">${mins}</select>:
    <select ${bind((v) => onChange(Math.floor(value / 60) * 60 + Number(v)))} aria-label="Seconden">${secs}</select>
  </span>`;
}

const row = (label, right) => `<div class="row"><span class="grow">${label}</span>${right}</div>`;

function topbar({ back, title = "", right = "" }) {
  return `<div class="topbar">
    ${back ? `<button class="text-btn" ${act(() => go(back))}>${icon("back")}Terug</button>` : ""}
    ${title ? `<span class="inline-title">${e(title)}</span>` : '<span class="spacer"></span>'}
    ${right}
  </div>`;
}

const gearButton = () => `<button class="icon-btn" ${act(() => go("#/instellingen"))} aria-label="Instellingen">${icon("gear")}</button>`;

// MARK: - Navigatie

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return { name: parts[0] || "trainingen", parts };
}

window.addEventListener("hashchange", () => {
  ui.editingLineup = false;
  ui.selected = null;
  ui.problem = null;
  render();
  window.scrollTo(0, 0);
});

function render() {
  scope = reg.v;
  reg.v.reset();
  const r = route();
  const views = {
    trainingen: viewTrainings, training: viewTraining, wedstrijden: viewMatches, wedstrijd: viewMatch,
    ploeg: viewSquad, speler: viewProfile, instellingen: viewSettings,
  };
  const view = views[r.name] ?? viewTrainings;
  const el = document.getElementById("view");
  el.innerHTML = view(r.parts);
  P.hydrate(el);
  const tab = { training: "trainingen", wedstrijd: "wedstrijden", speler: "ploeg" }[r.name] ?? r.name;
  for (const a of document.querySelectorAll(".tabs a")) a.classList.toggle("on", a.dataset.tab === tab);
}

// MARK: - Trainingen

function viewTrainings() {
  const today = startOfToday();
  const all = state.trainings;
  const planned = all.filter((t) => t.date && time(t.date) >= today).sort((a, b) => time(a.date) - time(b.date));
  const templates = all.filter((t) => !t.date);
  const past = all.filter((t) => t.date && time(t.date) < today).sort((a, b) => time(b.date) - time(a.date));

  const add = () => {
    const t = { id: M.uid(), name: "Nieuwe training", date: null, blocks: [] };
    state.trainings.push(t);
    go(`#/training/${t.id}`);
  };

  const section = (label, list, canPlan) => list.length ? `
    <div class="section-label">${label}</div>
    ${list.map((t) => trainingCard(t, canPlan)).join("")}
    ${canPlan ? '<p class="hint">Plan een sjabloon in om er een training met een datum van te maken.</p>' : ""}` : "";

  return `<div class="page">
    <div class="topbar"><span class="spacer"></span>${gearButton()}
      <button class="icon-btn" ${act(add)} aria-label="Nieuwe training">${icon("plus")}</button></div>
    <h1 class="title">Trainingen</h1>
    <p class="subtitle">${e(team().name)}</p>
    ${all.length ? "" : '<div class="empty"><strong>Nog geen trainingen</strong>Tik op + om er een te maken.</div>'}
    ${section("Gepland", planned)}
    ${section("Sjablonen", templates, true)}
    ${section("Eerder", past)}
  </div>`;
}

function trainingCard(t, canPlan) {
  const label = t.date
    ? fmt(t.date, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : M.blockCount(t.blocks.length);
  const plan = () => {
    const copy = structuredClone(t);
    copy.id = M.uid();
    copy.date = tomorrowAt18();
    state.trainings.push(copy);
    go(`#/training/${copy.id}`);
  };
  return `<div class="card training-card" ${act(() => go(`#/training/${t.id}`))}>
    <div class="head"><span class="label">${e(label)}</span><span class="dur">${Math.floor(M.trainingDuration(t) / 60)} min</span></div>
    <h3>${e(t.name)}</h3>
    ${blockBar(t.blocks)}
    <div class="actions">
      ${t.blocks.length ? `<button class="start" ${act(() => startSession(t))}>${icon("play")}Start</button>` : ""}
      ${canPlan ? `<button ${act(plan)}>${icon("calendar")}Inplannen</button>` : ""}
    </div>
  </div>`;
}

function blockBar(blocks) {
  if (!blocks.length) return "";
  const total = blocks.reduce((a, b) => a + M.blockDuration(b), 0) || 1;
  return `<div class="block-bar" aria-hidden="true">${blocks
    .map((b) => `<span class="kind-${b.kind} bg-kind" style="flex:${M.blockDuration(b) / total}"></span>`).join("")}</div>`;
}

function viewTraining(parts) {
  const t = state.trainings.find((x) => x.id === parts[1]);
  if (!t) return notFound("#/trainingen");
  if (parts[2] === "blok" && parts[4] === "tekening") return viewDrawingEditor(t, parts[3]);
  if (parts[2] === "blok") return viewBlock(t, parts[3]);

  const move = (i, d) => { const [b] = t.blocks.splice(i, 1); t.blocks.splice(i + d, 0, b); };
  const remove = async () => {
    if (await ask({ title: `"${t.name}" verwijderen?`, ok: "Verwijderen", danger: true })) {
      state.trainings = state.trainings.filter((x) => x.id !== t.id);
      save();
      go("#/trainingen");
    }
  };
  const addBlock = (type) => { const b = M.newBlock(type); t.blocks.push(b); };

  return `<div class="page with-action">
    ${topbar({ back: "#/trainingen", title: t.name })}
    <div class="list">
      <div class="row"><input class="field big" value="${e(t.name)}" placeholder="Naam" ${bind((v) => (t.name = v), true)}></div>
      ${row("Geplande duur", `<span class="value">${M.formatClock(M.trainingDuration(t))}</span>`)}
    </div>

    <div class="list" style="margin-top:24px">
      ${row("Ingepland", toggle(!!t.date, (on) => (t.date = on ? tomorrowAt18() : null), "Ingepland"))}
      ${t.date ? row("Wanneer", `<input class="field" type="datetime-local" value="${toLocalInput(t.date)}" ${bind((v) => { if (v) t.date = new Date(v).toISOString(); })}>`) : ""}
    </div>
    <p class="hint">${t.date ? "Staat bij Gepland in de lijst met trainingen." : "Zonder datum is dit een sjabloon: een training die je telkens opnieuw kunt inplannen."}</p>

    <div class="section-label">Blokken</div>
    <div class="list">
      ${t.blocks.map((b, i) => `<div class="row link" ${act(() => go(`#/training/${t.id}/blok/${b.id}`))}>
        <span class="kind-dot kind-${b.kind} bg-kind"></span>
        <span class="grow"><div>${e(b.name)}</div><div class="sub">${e(blockDetail(b))}</div></span>
        <span class="value">${M.formatClock(M.blockDuration(b))}</span>
        <span class="mini-btns">
          <button ${act(() => move(i, -1))} ${i === 0 ? "disabled" : ""} aria-label="Omhoog">${icon("up")}</button>
          <button ${act(() => move(i, 1))} ${i === t.blocks.length - 1 ? "disabled" : ""} aria-label="Omlaag">${icon("dn")}</button>
          <button class="del" ${act(() => t.blocks.splice(i, 1))} aria-label="Verwijderen">${icon("trash")}</button>
        </span>
      </div>`).join("")}
      <div class="add-menu">
        <button ${act(() => addBlock("countdown"))}>${icon("timer")}Aftellen</button>
        <button ${act(() => addBlock("intervals"))}>${icon("repeat")}Intervallen</button>
        <button ${act(() => addBlock("rotation"))}>${icon("rotate")}Postenrotatie</button>
      </div>
    </div>

    <div class="list" style="margin-top:24px">
      <button class="row button danger" ${act(remove)}>${icon("trash")}Training verwijderen</button>
    </div>
  </div>
  <div class="action-bar"><button class="btn" ${act(() => startSession(t))} ${t.blocks.length ? "" : "disabled"}>${icon("play")}Start training</button></div>`;
}

function blockDetail(b) {
  const t = b.timer;
  if (t.type === "intervals") return `${t.reps} × ${M.formatClock(t.work)}, rust ${M.formatClock(t.rest)}`;
  if (t.type === "rotation") return `${t.plan.stations.length} posten, ${t.plan.groups.length} groepen`;
  return M.BLOCK_KINDS[b.kind];
}

function viewBlock(training, blockId) {
  const b = training.blocks.find((x) => x.id === blockId);
  if (!b) return notFound(`#/training/${training.id}`);
  const t = b.timer;

  const setType = (type) => {
    if (type === t.type) return;
    if (type === "countdown") b.timer = { type, duration: M.blockDuration(b) };
    if (type === "intervals") b.timer = { type, work: 30, rest: 30, reps: 6 };
    if (type === "rotation") b.timer = { type, plan: M.newRotationPlan() };
  };

  let timerRows = "";
  if (t.type === "countdown") timerRows = row("Duur", duration(t.duration, 120, (v) => (t.duration = v)));
  if (t.type === "intervals") timerRows = row("Werken", duration(t.work, 30, (v) => (t.work = v)))
    + row("Rust", duration(t.rest, 30, (v) => (t.rest = v)))
    + row("Herhalingen", stepper(t.reps, 1, 50, (v) => (t.reps = v)));

  return `<div class="page">
    ${topbar({ back: `#/training/${training.id}`, title: b.name })}
    <div class="list">
      <div class="row"><input class="field big" value="${e(b.name)}" placeholder="Naam" ${bind((v) => (b.name = v), true)}></div>
      ${row("Soort", select(Object.entries(M.BLOCK_KINDS), b.kind, (v) => (b.kind = v)))}
    </div>

    <div class="section-label">Timer</div>
    <div class="list">
      <div class="row"><div class="segmented" style="flex:1">${Object.entries(M.TIMER_TYPES).map(([k, label]) =>
        `<button class="${t.type === k ? "on" : ""}" ${act(() => setType(k))}>${label}</button>`).join("")}</div></div>
      ${timerRows}
      ${row("Totaal", `<span class="value">${M.formatClock(M.blockDuration(b))}</span>`)}
    </div>

    ${t.type === "rotation" ? rotationEditor(t.plan) : ""}

    <div class="section-label">Einde</div>
    <div class="list">
      ${row("Als de tijd om is", select(Object.entries(M.ADVANCE), b.advance, (v) => (b.advance = v)))}
      ${row("Waarschuwing vooraf", duration(b.warnBefore, 5, (v) => (b.warnBefore = v)))}
    </div>
    <p class="hint">Een signaal zoveel tijd voor het einde van elke rep of post. Zet op 0:00 om uit te schakelen.</p>

    ${drawingAndPhoto(training, b)}

    <div class="section-label">Notities</div>
    <div class="list"><div class="row"><textarea class="field" rows="4" placeholder="Oefenstof, aandachtspunten…" ${bind((v) => (b.notes = v || null), true)}>${e(b.notes ?? "")}</textarea></div></div>
  </div>`;
}

function rotationEditor(plan) {
  const addGroup = () => {
    const used = new Set(plan.groups.map((g) => g.colorHex.toLowerCase()));
    const key = Object.keys(M.TEAM_COLORS).find((k) => !used.has(M.TEAM_COLORS[k].toLowerCase())) ?? "rood";
    plan.groups.push({ id: M.uid(), name: M.colorName(key), colorHex: M.TEAM_COLORS[key], players: [] });
  };
  const colorOptions = (g) => Object.entries(M.TEAM_COLORS)
    .map(([k, hex]) => `<option value="${hex}"${hex.toLowerCase() === g.colorHex.toLowerCase() ? " selected" : ""}>${M.colorName(k)}</option>`).join("");
  const extra = plan.groups.length - plan.stations.length;

  return `<div class="section-label">Rotatie</div>
    <div class="list">
      ${row("Tijd per post", duration(plan.timePerStation, 30, (v) => (plan.timePerStation = v)))}
      ${row("Wisseltijd", duration(plan.switchTime, 5, (v) => (plan.switchTime = v)))}
      ${row("Na elke post", select(Object.entries(M.ADVANCE), plan.advanceBetweenRotations, (v) => (plan.advanceBetweenRotations = v)))}
    </div>
    <p class="hint">Elke groep passeert elke post één keer: ${plan.stations.length} rondes.</p>

    <div class="section-label">Posten</div>
    <div class="list">
      ${plan.stations.map((s, i) => `<div class="row">
        <input class="field" value="${e(s.name)}" placeholder="Naam van de post" ${bind((v) => (s.name = v), true)}>
        <span class="mini-btns"><button class="del" ${act(() => plan.stations.splice(i, 1))} aria-label="Verwijderen">${icon("trash")}</button></span>
      </div>`).join("")}
      <button class="row button" ${act(() => plan.stations.push({ id: M.uid(), name: `Post ${plan.stations.length + 1}` }))}>${icon("plus")}Post toevoegen</button>
    </div>

    <div class="section-label">Groepen</div>
    <div class="list">
      ${plan.groups.map((g, i) => `<div class="row">
        <span class="color-dot" style="background:${e(g.colorHex)}"><select ${bind((v) => (g.colorHex = v))} aria-label="Kleur">${colorOptions(g)}</select></span>
        <span class="grow">
          <input class="field" value="${e(g.name)}" placeholder="Naam" ${bind((v) => (g.name = v), true)}>
          <input class="field sub" value="${e(g.players.join(", "))}" placeholder="Spelers, gescheiden door komma's"
            ${bind((v) => (g.players = v.split(",").map((x) => x.trim()).filter(Boolean)), true)}>
        </span>
        <span class="mini-btns"><button class="del" ${act(() => plan.groups.splice(i, 1))} aria-label="Verwijderen">${icon("trash")}</button></span>
      </div>`).join("")}
      <button class="row button" ${act(addGroup)}>${icon("plus")}Groep toevoegen</button>
    </div>
    ${extra > 0 ? `<p class="hint warn">Meer groepen dan posten: de laatste ${extra} groep(en) krijgen geen post.</p>` : ""}

    ${plan.stations.length ? `<div class="section-label">Schema</div>
    <div class="list schedule">${plan.stations.map((_, round) => `<div class="round">
      <div class="label">Ronde ${round + 1}</div>
      ${M.rotationAssignment(plan, round).map((it) => `<div class="item">
        <span class="dot" style="background:${it.group ? e(it.group.colorHex) : "transparent"}"></span>
        <span class="grow">${e(it.station.name)}</span><span class="muted">${e(it.group?.name ?? "leeg")}</span>
      </div>`).join("")}
    </div>`).join("")}</div>` : ""}`;
}

function notFound(back) {
  return `<div class="page">${topbar({ back })}<div class="empty"><strong>Niet gevonden</strong>Dit bestaat niet (meer).</div></div>`;
}

// MARK: - Tekening en foto bij een blok

/** Alle foto's waar nog een blok naar verwijst, ook in een lopende training. */
const photoIds = () => [...state.trainings, ...(session ? [session.training] : [])]
  .flatMap((t) => t.blocks.map((b) => b.photoId)).filter(Boolean);

function drawingAndPhoto(training, b) {
  const editor = `#/training/${training.id}/blok/${b.id}/tekening`;
  const removeDrawing = async () => {
    if (await ask({ title: "Tekening verwijderen?", ok: "Verwijderen", danger: true })) { b.drawing = null; save(); render(); }
  };
  const removePhoto = async () => {
    if (await ask({ title: "Foto verwijderen?", ok: "Verwijderen", danger: true })) {
      b.photoId = null;
      save();
      render();
      P.prune(new Set(photoIds()));
    }
  };
  return `<div class="section-label">Tekening</div>
    ${D.hasDrawing(b) ? `<div class="card drawing-card" ${act(() => go(editor))}>${D.drawingSVG(b.drawing)}</div>` : ""}
    <div class="list" ${D.hasDrawing(b) ? 'style="margin-top:12px"' : ""}>
      <button class="row button" ${act(() => go(editor))}>${icon("pencil")}${D.hasDrawing(b) ? "Tekening aanpassen" : "Tekening maken"}</button>
      ${D.hasDrawing(b) ? `<button class="row button danger" ${act(removeDrawing)}>${icon("trash")}Tekening verwijderen</button>` : ""}
    </div>

    <div class="section-label">Foto</div>
    ${b.photoId ? `<div class="card photo-card"><img data-photo="${e(b.photoId)}" alt="Foto bij ${e(b.name)}"></div>` : ""}
    <div class="list" ${b.photoId ? 'style="margin-top:12px"' : ""}>
      <label class="row button" style="cursor:pointer">${icon("camera")}${b.photoId ? "Andere foto kiezen" : "Foto toevoegen"}
        <input type="file" accept="image/*" hidden data-photo-for="${training.id}/${b.id}"></label>
      ${b.photoId ? `<button class="row button danger" ${act(removePhoto)}>${icon("trash")}Foto verwijderen</button>` : ""}
    </div>
    <p class="hint">Een schets op papier of een oefening uit een boek: neem er een foto van. Je ziet hem tijdens de training bij dit blok.</p>`;
}

document.addEventListener("change", async (ev) => {
  const input = ev.target.closest("input[data-photo-for]");
  if (!input?.files?.length) return;
  const [tid, bid] = input.dataset.photoFor.split("/");
  const block = state.trainings.find((t) => t.id === tid)?.blocks.find((b) => b.id === bid);
  if (!block) return;
  try {
    const blob = await P.compress(input.files[0]);
    const id = M.uid();
    await P.putPhoto(id, blob);
    block.photoId = id;
    save();
    render();
    P.prune(new Set(photoIds()));
  } catch (err) {
    toast(err.message || "Die foto kon ik niet bewaren.");
  }
});

// MARK: - De tekeneditor

const TOOLS = [
  ["move", "Verplaats", '<path d="M12 3v18M3 12h18M12 3 9.5 5.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5"/>'],
  ["player", "Speler", null],
  ["ball", "Bal", '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/>'],
  ["cone", "Kegel", '<path d="M12 4 18.5 19h-13z" fill="#FB8C00" stroke="none"/>'],
  ["goal", "Doeltje", '<rect x="4" y="9" width="16" height="6" rx="1"/>'],
  ["run", "Lopen", '<path d="M4 19 18 6M18 6h-6M18 6v6"/>'],
  ["pass", "Pass", '<path d="M4 19 18 6" stroke-dasharray="2.5 2.5"/><path d="M18 6h-6M18 6v6"/>'],
  ["dribble", "Dribbel", '<path d="M3 15c2-4 3 4 5 0s3 4 5 0 3 4 5 0"/><path d="M18 15l-3-2M18 15l-2 3"/>'],
  ["row", "Kegelrij", '<path d="M5 9 7.5 14h-5zM12 9l2.5 5h-5zM19 9l2.5 5h-5z" fill="#FB8C00" stroke="none"/><path d="M3 18h18" stroke-dasharray="2 2"/>'],
  ["erase", "Gum", '<path d="M8 20h12M5 15l8-8 5 5-6 6H8z"/>'],
];

const TOOL_HINTS = {
  move: "Sleep een figuur om ze te verplaatsen; net ernaast drukken mag ook. Tik erop om ze te kiezen. Knijp met twee vingers om in te zoomen.",
  player: "Tik op het veld om een speler te zetten.",
  ball: "Tik op het veld om een bal te zetten.",
  cone: "Tik op het veld om een kegel te zetten.",
  goal: "Tik op het veld om een doeltje te zetten. Draaien doe je met Verplaats.",
  run: "Teken met je vinger hoe een speler loopt. Bijna recht wordt recht.",
  pass: "Teken met je vinger waar de bal naartoe gaat.",
  dribble: "Teken met je vinger waar een speler met de bal loopt.",
  row: "Trek een lijn: er komen kegels op. Het aantal pas je daarna aan.",
  erase: "Tik op een figuur om ze weg te halen.",
};

/** Wat de editor onthoudt terwijl je tekent: gereedschap, keuze, en "terug". */
const ed = {
  blockId: null, target: null, tool: "move", color: D.BIB_COLORS[1], selected: null, undo: [],
  drag: null, line: null, guides: [], lastRow: null,
  view: null, pan: null, pinch: null,   // ingezoomd: welk stuk van het veld je ziet
};

function viewDrawingEditor(training, blockId) {
  const b = training.blocks.find((x) => x.id === blockId);
  if (!b) return notFound(`#/training/${training.id}`);
  b.drawing ??= { field: "half", items: [] };
  if (ed.blockId !== b.id) Object.assign(ed, { blockId: b.id, selected: null, undo: [], tool: "move", view: null, lastRow: null });
  ed.target = b.drawing;
  const dr = b.drawing;
  const sel = dr.items.find((i) => i.id === ed.selected);

  const swatches = (current, pick) => `<div class="swatches">${D.BIB_COLORS.map((c) =>
    `<button class="${c === current ? "on" : ""}" style="background:${c}" ${act(() => pick(c))} aria-label="Kleur"></button>`).join("")}</div>`;

  // De laatst getrokken kegelrij: het aantal kegels kun je nog aanpassen.
  const row = ed.tool === "row" && ed.lastRow && ed.lastRow.ids.every((id) => dr.items.some((i) => i.id === id)) ? ed.lastRow : null;
  const setRowCount = (n) => {
    pushUndo();
    dr.items = dr.items.filter((i) => !row.ids.includes(i.id));
    const cones = Array.from({ length: n }, (_, i) => ({
      id: M.uid(), type: "cone",
      x: Math.round((row.a[0] + ((row.b[0] - row.a[0]) * i) / (n - 1)) * 10) / 10,
      y: Math.round((row.a[1] + ((row.b[1] - row.a[1]) * i) / (n - 1)) * 10) / 10,
    }));
    dr.items.push(...cones);
    row.ids = cones.map((c) => c.id);
  };

  let context;
  if (row) {
    context = `<div class="ctx-row"><span class="grow">Kegels in deze rij</span>${stepper(row.ids.length, 2, 30, setRowCount)}</div>`;
  } else if (ed.tool === "player") {
    context = `<div class="label">Kleur van het hesje</div>${swatches(ed.color, (c) => (ed.color = c))}`;
  } else if (ed.tool === "move" && sel) {
    context = `<div class="ctx-row">
      ${sel.type === "player" ? swatches(sel.color, (c) => { pushUndo(); sel.color = c; ed.color = c; }) : ""}
      ${sel.type === "goal" ? `<button class="pill-btn" ${act(() => { pushUndo(); sel.rot = ((sel.rot ?? 0) + 45) % 180; })}>${icon("rotate")}Draaien</button>` : ""}
      <button class="pill-btn danger" ${act(() => { pushUndo(); dr.items = dr.items.filter((i) => i !== sel); ed.selected = null; })}>${icon("trash")}Verwijderen</button>
    </div>`;
  } else {
    context = `<p class="hint" style="margin:0">${TOOL_HINTS[ed.tool]}</p>`;
  }

  const clearAll = async () => {
    if (await ask({ title: "Alles wissen?", ok: "Wissen", danger: true })) { pushUndo(); dr.items = []; ed.selected = null; save(); render(); }
  };

  return `<div class="page">
    ${topbar({ back: `#/training/${training.id}/blok/${b.id}`, title: `Tekening · ${b.name}` })}
    <div class="segmented">
      <button class="${dr.field === "half" ? "on" : ""}" ${act(() => { dr.field = "half"; ed.view = null; })}>Half veld</button>
      <button class="${dr.field === "full" ? "on" : ""}" ${act(() => { dr.field = "full"; ed.view = null; })}>Heel veld</button>
    </div>
    <div class="card drawing-card editor" style="margin-top:12px">
      ${D.drawingSVG(dr, { selected: ed.selected, id: "draw-svg", viewBox: viewBoxOf(dr) })}
      <div class="zoom-btns">
        <button ${act(() => zoomBy(1.6))} aria-label="Inzoomen">${icon("plus")}</button>
        <button ${act(() => zoomBy(1 / 1.6))} ${ed.view ? "" : "disabled"} aria-label="Uitzoomen">${icon("minus")}</button>
        ${ed.view ? `<button ${act(() => (ed.view = null))} aria-label="Heel veld tonen">${icon("expand")}</button>` : ""}
      </div>
    </div>
    <div class="tools" style="margin-top:12px">${TOOLS.map(([key, label, glyph]) => `<button class="${ed.tool === key ? "on" : ""}" ${act(() => { ed.tool = key; ed.selected = null; })}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyph ?? `<circle cx="12" cy="12" r="7" fill="${ed.color}" stroke="#fff" stroke-width="1.5"/>`}</svg>${label}</button>`).join("")}
      <button ${act(undo)} ${ed.undo.length ? "" : "disabled"}>${icon("back")}Terug</button>
    </div>
    <div class="ctx">${context}</div>
    <div class="list" style="margin-top:16px">
      <button class="row button danger" ${act(clearAll)} ${dr.items.length ? "" : "disabled"}>${icon("trash")}Alles wissen</button>
    </div>
  </div>`;
}

function pushUndo() {
  if (!ed.target) return;
  ed.undo.push(JSON.stringify(ed.target.items));
  if (ed.undo.length > 50) ed.undo.shift();
}

function undo() {
  const prev = ed.undo.pop();
  if (prev && ed.target) { ed.target.items = JSON.parse(prev); ed.selected = null; }
}

/** Tijdens het slepen of tekenen alleen de figuren opnieuw tekenen, niet de hele pagina. */
function redrawItems() {
  if (!ed.target) return;
  const g = document.getElementById("draw-svg-items");
  if (g) g.innerHTML = D.itemsSVG(ed.target, ed.selected);
  const guides = document.getElementById("draw-svg-guides");
  if (guides) guides.innerHTML = D.guidesSVG(ed.target, ed.guides);
}

// MARK: Zoomen

const baseView = (dr) => (D.FIELDS[dr.field] ?? D.FIELDS.half).vb.split(" ").map(Number);
const viewBoxOf = (dr) => (ed.view ?? baseView(dr)).map((n) => Math.round(n * 100) / 100).join(" ");

/** Toon dit stuk van het veld: nooit groter dan het hele veld, nooit meer dan 5 keer ingezoomd. */
function setView([x, y, w]) {
  const base = baseView(ed.target);
  w = Math.min(base[2], Math.max(base[2] / 5, w));
  const h = (w * base[3]) / base[2];
  x = Math.min(base[0] + base[2] - w, Math.max(base[0], x));
  y = Math.min(base[1] + base[3] - h, Math.max(base[1], y));
  ed.view = w >= base[2] - 0.01 ? null : [x, y, w, h];
  document.getElementById("draw-svg")?.setAttribute("viewBox", viewBoxOf(ed.target));
}

function zoomBy(factor) {
  const v = ed.view ?? baseView(ed.target);
  const w = v[2] / factor, h = v[3] / factor;
  setView([v[0] + (v[2] - w) / 2, v[1] + (v[3] - h) / 2, w, h]);
}

/** Schermpunt → veldmeters, zonder begrenzing. */
function toField(svg, x, y) {
  const p = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM().inverse());
  return [p.x, p.y];
}

/** Schuif het beeld zodat veldpunt `fieldPt` weer onder schermpunt `screenPt` ligt. */
function keepUnder(svg, fieldPt, screenPt) {
  const now = toField(svg, ...screenPt);
  const v = ed.view ?? baseView(ed.target);
  setView([v[0] + fieldPt[0] - now[0], v[1] + fieldPt[1] - now[1], v[2]]);
}

// MARK: Vingers

function svgPoint(svg, ev) {
  const [x, y] = toField(svg, ev.clientX, ev.clientY);
  const f = D.FIELDS[ed.target.field] ?? D.FIELDS.half;
  return [Math.min(Math.max(x, -3), f.w + 3), Math.min(Math.max(y, -4), f.h + 4)];
}

const fingers = new Map();
const midpoint = () => { const [a, b] = [...fingers.values()]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
const spread = () => { const [a, b] = [...fingers.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };

/** Een tweede vinger: wat de eerste begon (figuur zetten, lijn trekken) telt niet, we gaan zoomen. */
function cancelAction() {
  if (ed.line || ed.drag) {
    const prev = ed.undo.pop();
    if (prev) ed.target.items = JSON.parse(prev);
  }
  ed.line = null;
  ed.drag = null;
  ed.pan = null;
  ed.guides = [];
}

document.addEventListener("pointerdown", (ev) => {
  const svg = ev.target.closest("#draw-svg");
  if (!svg || !ed.target) return;
  ev.preventDefault();
  try { svg.setPointerCapture(ev.pointerId); } catch { /* niet erg */ }
  fingers.set(ev.pointerId, [ev.clientX, ev.clientY]);
  if (fingers.size === 2) {
    cancelAction();
    const mid = midpoint();
    ed.pinch = { spread: spread(), width: (ed.view ?? baseView(ed.target))[2], field: toField(svg, ...mid) };
    redrawItems();
    return;
  }
  if (fingers.size > 2 || ed.pinch) return;

  const p = svgPoint(svg, ev);
  const hit = ev.target.closest("[data-item]")?.dataset.item;
  const tool = ed.tool;
  if (tool === "move") {
    ed.selected = hit ?? null;
    if (hit) {
      pushUndo();
      const item = ed.target.items.find((i) => i.id === hit);
      ed.drag = { id: hit, last: p, moved: false, raw: [item.x, item.y] };
    } else {
      ed.pan = { field: toField(svg, ev.clientX, ev.clientY), moved: false };
    }
  } else if (tool === "erase") {
    if (hit) { pushUndo(); ed.target.items = ed.target.items.filter((i) => i.id !== hit); save(); render(); }
  } else if (["player", "ball", "cone", "goal"].includes(tool)) {
    pushUndo();
    const item = { id: M.uid(), type: tool, x: p[0], y: p[1] };
    if (tool === "player") item.color = ed.color;
    if (tool === "goal") item.rot = 0;
    const snapped = D.snap(ed.target, item, item.x, item.y);
    Object.assign(item, { x: snapped.x, y: snapped.y });
    ed.guides = snapped.guides;
    ed.target.items.push(item);
    ed.drag = { id: item.id, last: p, moved: true, raw: [p[0], p[1]] };
  } else {
    pushUndo();
    ed.line = { id: M.uid(), type: "line", style: tool, points: [p] };
    ed.target.items.push(ed.line);
  }
  redrawItems();
});

document.addEventListener("pointermove", (ev) => {
  if (!fingers.has(ev.pointerId)) return;
  fingers.set(ev.pointerId, [ev.clientX, ev.clientY]);
  const svg = document.getElementById("draw-svg");
  if (!svg || !ed.target) return;

  if (ed.pinch) {
    if (fingers.size !== 2) return;
    setView([0, 0, (ed.pinch.width * ed.pinch.spread) / spread()]);
    keepUnder(svg, ed.pinch.field, midpoint());
    return;
  }
  if (ed.pan) {
    keepUnder(svg, ed.pan.field, [ev.clientX, ev.clientY]);
    ed.pan.moved = true;
    return;
  }
  if (!ed.drag && !ed.line) return;
  const p = svgPoint(svg, ev);
  if (ed.drag) {
    const item = ed.target.items.find((i) => i.id === ed.drag.id);
    const [dx, dy] = [p[0] - ed.drag.last[0], p[1] - ed.drag.last[1]];
    if (!item || (dx === 0 && dy === 0)) return;
    ed.drag.last = p;
    ed.drag.moved = true;
    if (item.type === "line") {
      item.points = item.points.map(([x, y]) => [x + dx, y + dy]);
    } else {
      // De figuur volgt de beweging van je vinger, en springt op één lijn met een andere als ze er bijna op staat.
      ed.drag.raw = [ed.drag.raw[0] + dx, ed.drag.raw[1] + dy];
      const snapped = D.snap(ed.target, item, ...ed.drag.raw);
      item.x = snapped.x;
      item.y = snapped.y;
      ed.guides = snapped.guides;
    }
  } else {
    const pts = ed.line.points, last = pts[pts.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.4) pts.push(p);
  }
  redrawItems();
});

function fingerUp(ev) {
  if (!fingers.delete(ev.pointerId)) return;
  if (ed.pinch) {
    if (fingers.size === 0) ed.pinch = null; // pas verder als alle vingers los zijn
    return;
  }
  if (ed.pan) {
    const tapped = !ed.pan.moved;
    ed.pan = null;
    if (tapped) render(); // tik naast de figuren: niets meer gekozen
    return;
  }
  endDrawing();
}
document.addEventListener("pointerup", fingerUp);
document.addEventListener("pointercancel", fingerUp);

/** Loslaten: een te korte lijn telt niet, een getekende lijn wordt opgekuist, een kegelrij wordt kegels. */
function endDrawing() {
  if (!ed.drag && !ed.line) return;
  if (ed.line) {
    const line = ed.line;
    ed.target.items = ed.target.items.filter((i) => i !== line);
    if (D.lineLength(line.points) < 2) {
      ed.undo.pop();
    } else if (line.style === "row") {
      const [a, b] = [line.points[0], line.points[line.points.length - 1]];
      const cones = D.rowPositions(a, b).map(([x, y]) => ({ id: M.uid(), type: "cone", x, y }));
      ed.target.items.push(...cones);
      ed.lastRow = { a, b, ids: cones.map((c) => c.id) };
    } else {
      line.points = D.finishLine(line.points);
      ed.target.items.push(line);
    }
  }
  if (ed.drag && !ed.drag.moved) ed.undo.pop(); // alleen gekozen, niet verplaatst
  const r = (n) => Math.round(n * 10) / 10;
  for (const item of ed.target.items) {
    if (item.type === "line") item.points = item.points.map(([x, y]) => [r(x), r(y)]);
    else { item.x = r(item.x); item.y = r(item.y); }
  }
  ed.drag = null;
  ed.line = null;
  ed.guides = [];
  save();
  render();
}

// MARK: - Wedstrijden

function viewMatches() {
  const today = startOfToday();
  const matches = ui.showPlayed
    ? team().matches.filter((m) => time(m.date) < today).sort((a, b) => time(b.date) - time(a.date))
    : team().matches.filter((m) => time(m.date) >= today).sort((a, b) => time(a.date) - time(b.date));

  const add = () => {
    const previous = [...team().matches].sort((a, b) => time(b.date) - time(a.date))[0];
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    const m = {
      id: M.uid(), title: "Nieuwe wedstrijd", date: d.toISOString(),
      settings: previous ? { ...previous.settings } : M.defaultMatchSettings(),
      selection: team().squad.map((p) => p.id), overrides: {}, plan: null, selectedBlock: 0,
      isHome: null, score: null, played: null,
    };
    team().matches.push(m);
    ui.showPlayed = false;
    go(`#/wedstrijd/${m.id}`);
  };

  return `<div class="page">
    <div class="topbar"><span class="spacer"></span>${gearButton()}
      <button class="icon-btn" ${act(add)} aria-label="Nieuwe wedstrijd">${icon("plus")}</button></div>
    <h1 class="title">Wedstrijden</h1>
    <p class="subtitle">${e(team().name)}</p>
    <div class="segmented">
      <button class="${ui.showPlayed ? "" : "on"}" ${act(() => (ui.showPlayed = false))}>Komend</button>
      <button class="${ui.showPlayed ? "on" : ""}" ${act(() => (ui.showPlayed = true))}>Gespeeld</button>
    </div>
    <div class="stack" style="margin-top:16px">${matches.map(matchCard).join("")}</div>
    ${matches.length ? "" : `<div class="empty"><strong>${ui.showPlayed ? "Nog geen gespeelde wedstrijden" : "Geen komende wedstrijden"}</strong>${ui.showPlayed ? "" : "Tik op + om er een te maken."}</div>`}
  </div>`;
}

function matchCard(m) {
  const f = M.formationById(m.settings.formationID);
  const players = M.matchPlayers(m, team().squad).length;
  const meta = `${M.isHome(m) ? "Thuis" : "Uit"} · ${fmt(m.date, { hour: "2-digit", minute: "2-digit" })} · ${f.format}v${f.format} · ${players} spelers`;
  let status;
  if (m.score) status = `<span class="pill">${M.isHome(m) ? `${m.score.us} – ${m.score.them}` : `${m.score.them} – ${m.score.us}`}</span>`;
  else if (M.currentPlan(m, team().squad)) status = '<span class="pill">✓ Schema klaar</span>';
  else status = `<span class="pill dark">${m.selection.length ? "Maak schema" : "Kies selectie"}</span>`;
  return `<div class="card match-card" ${act(() => go(`#/wedstrijd/${m.id}`))}>
    <div class="date-tile"><span class="w">${fmt(m.date, { weekday: "short" })}</span><span class="d">${fmt(m.date, { day: "numeric" })}</span><span class="m">${fmt(m.date, { month: "short" })}</span></div>
    <div class="grow"><h3>${e(m.title)}</h3><div class="meta">${e(meta)}</div>${status}</div>
  </div>`;
}

function viewMatch(parts) {
  const m = team().matches.find((x) => x.id === parts[1]);
  if (!m) return notFound("#/wedstrijden");
  if (parts[2] === "schema") return viewLineup(m);
  if (parts[2] === "speler") return viewOverride(m, parts[3]);

  const squad = team().squad;
  const s = m.settings;
  const formation = M.formationById(s.formationID);
  const teamName = team().name || "Wij";
  const showResult = time(m.date) < Date.now() || m.score;
  const setScore = (side, v) => { m.score = { us: 0, them: 0, ...m.score, [side]: v }; };

  const remove = async () => {
    if (await ask({ title: `"${m.title}" verwijderen?`, ok: "Verwijderen", danger: true })) {
      team().matches = team().matches.filter((x) => x.id !== m.id);
      save();
      go("#/wedstrijden");
    }
  };

  const formats = [[5, "5 tegen 5"], [8, "8 tegen 8"], [11, "11 tegen 11"]];
  const setFormat = (v) => { m.settings.formationID = M.FORMATIONS.find((f) => f.format === Number(v)).id; };
  const setMinutes = (v) => { s.minutes = v; if (s.switchEvery >= v) s.switchEvery = 0; };
  const switchOptions = [[0, "Alleen tussen de periodes"],
    ...M.SWITCH_OPTIONS.filter((x) => x < s.minutes).map((x) => [x, `Om de ${x} minuten`])];

  const plan = M.currentPlan(m, squad);
  const make = () => {
    ui.problem = M.makePlan(m, squad);
    if (!ui.problem) go(`#/wedstrijd/${m.id}/schema`);
  };
  const remake = async () => {
    if (!plan.edited || await ask({ title: "Nieuw voorstel maken?", message: "Je aanpassingen gaan verloren.", ok: "Nieuw voorstel", danger: true })) {
      make();
      save();
      render();
    }
  };
  const everyone = squad.length > 0 && m.selection.length === squad.length;

  return `<div class="page">
    ${topbar({ back: "#/wedstrijden", title: m.title })}
    <div class="list">
      <div class="row"><input class="field big" value="${e(m.title)}" placeholder="Tegenstander" ${bind((v) => (m.title = v), true)}></div>
      ${row("Datum", `<input class="field" type="datetime-local" value="${toLocalInput(m.date)}" ${bind((v) => { if (v) m.date = new Date(v).toISOString(); })}>`)}
      <div class="row"><div class="segmented" style="flex:1">
        <button class="${M.isHome(m) ? "on" : ""}" ${act(() => (m.isHome = true))}>Thuis</button>
        <button class="${M.isHome(m) ? "" : "on"}" ${act(() => (m.isHome = false))}>Uit</button>
      </div></div>
    </div>

    ${showResult ? `<div class="section-label">Uitslag</div>
    <div class="list">
      ${row(e(teamName), stepper(m.score?.us ?? 0, 0, 99, (v) => setScore("us", v)))}
      ${row(e(m.title), stepper(m.score?.them ?? 0, 0, 99, (v) => setScore("them", v)))}
    </div>
    ${m.played ? '<p class="hint">De speeltijd in de profielen komt uit wat er echt gespeeld is, met de wissels die je later deed.</p>' : ""}` : ""}

    <div class="section-label">De wedstrijd</div>
    <div class="list">
      ${row("Spelvorm", select(formats, formation.format, setFormat))}
      ${row("Opstelling", select(M.FORMATIONS.filter((f) => f.format === formation.format).map((f) => [f.id, f.name]), s.formationID, (v) => (s.formationID = v)))}
      ${row("Periodes", select([1, 2, 3, 4].map((n) => [n, n]), s.periods, (v) => (s.periods = Number(v))))}
      ${row("Minuten per periode", stepper(s.minutes, 5, 60, setMinutes))}
      ${row("Wisselen", select(switchOptions, s.switchEvery, (v) => (s.switchEvery = Number(v))))}
    </div>
    <p class="hint">${s.periods} × ${s.minutes}' = ${s.periods * s.minutes} minuten, in ${M.blockCount(M.makeBlocks(s).length)}. De keeper wisselt alleen tussen de periodes.</p>

    <div class="section-label">Selectie ${squad.length ? `<button class="text-btn right" ${act(() => (m.selection = everyone ? [] : squad.map((p) => p.id)))}>${everyone ? "Niemand" : "Iedereen"}</button>` : ""}</div>
    ${squad.length ? `<div class="list">${squad.map((p) => matchPlayerRow(m, p)).join("")}</div>
      <p class="hint">Vink aan wie er meedoet. Tik op een naam om zijn posities voor deze wedstrijd aan te passen.</p>
      <p class="hint">${e(countText(m, squad))}</p>`
      : `<div class="card muted">Je ploeg is nog leeg. Voeg spelers toe in het tabblad <a href="#/ploeg">Ploeg</a>.</div>`}

    <div class="section-label">Het schema</div>
    ${ui.problem ? `<p class="hint error">${e(ui.problem)}</p>` : M.isPlanOutdated(m, squad)
      ? '<p class="hint warn">De selectie of de wedstrijd is veranderd sinds het schema. Maak een nieuw voorstel.</p>' : ""}
    <div class="list">
      ${plan ? `
        <button class="row button" ${act(() => go(`#/wedstrijd/${m.id}/schema`))}>${icon("pitch")}Bekijk schema</button>
        <button class="row button" ${act(() => startMatch(m))}>${icon("play")}Start wedstrijd</button>
        <button class="row button" ${act(remake)}>${icon("rotate")}Nieuw voorstel</button>`
        : `<button class="row button" ${act(make)}>${icon("wand")}Maak wisselschema</button>`}
    </div>
    <p class="hint">Het schema verdeelt de speeltijd zo eerlijk mogelijk, houdt spelers zoveel mogelijk op hun plek en zegt bij elke wissel wie erin komt voor wie.</p>

    <div class="list" style="margin-top:24px">
      <button class="row button danger" ${act(remove)}>${icon("trash")}Wedstrijd verwijderen</button>
    </div>
  </div>`;
}

function countText(m, squad) {
  const players = M.matchPlayers(m, squad);
  const needed = M.formationById(m.settings.formationID).positions.length + 1;
  let text = `${players.length} geselecteerd, ${needed} op het veld`;
  if (players.length > needed) text += `, dus ${players.length - needed} op de bank per blok.`;
  else if (players.length === needed) text += ", dus niemand op de bank.";
  else { const short = needed - players.length; text += `: er ${short === 1 ? "is" : "zijn"} er nog ${short} te weinig.`; }
  const keepers = players.filter(M.canKeep).length;
  if (keepers === 0) text += " Nog geen keeper aangeduid.";
  else if (keepers > 1) text += ` De keeper roteert over ${keepers} spelers.`;
  return text;
}

/** De posities van een speler aanpassen voor deze wedstrijd; terug zoals in de ploeg = geen aanpassing. */
function setRoles(m, player, roles) {
  const same = (a, b) => [...a].sort().join() === [...b].sort().join();
  m.overrides ??= {};
  if (same(roles.lines, player.lines) && same(roles.positions, player.positions)) delete m.overrides[player.id];
  else m.overrides[player.id] = roles;
}

function matchPlayerRow(m, profile) {
  const today = M.applyOverride(m, profile);
  const on = m.selection.includes(profile.id);
  const toggleSel = () => { m.selection = on ? m.selection.filter((x) => x !== profile.id) : [...m.selection, profile.id]; };
  return playerRow(today, {
    selected: on, onSelect: toggleSel,
    caption: m.overrides?.[profile.id] ? "Aangepast voor deze wedstrijd" : null,
    onOpen: () => go(`#/wedstrijd/${m.id}/speler/${profile.id}`),
    onRoles: (roles) => setRoles(m, profile, roles),
  });
}

/** Naam, posities (K V M A) en, in een wedstrijd, een vinkje "doet mee". */
function playerRow(player, { selected, onSelect, caption, detail, onOpen, onRoles }) {
  const off = selected === false;
  const lineChip = (l) => {
    const isOn = player.lines.includes(l);
    const partial = !isOn && player.positions.some((p) => M.LINES[l].positions.includes(p));
    const flip = () => onRoles(isOn
      ? { lines: player.lines.filter((x) => x !== l), positions: [...player.positions] }
      : { lines: [...player.lines, l], positions: player.positions.filter((p) => !M.LINES[l].positions.includes(p)) });
    return `<button class="line-chip ${isOn ? "on" : partial ? "partial" : ""}" ${act(flip)} aria-label="${M.LINES[l].name}" aria-pressed="${isOn}">${l}</button>`;
  };
  const extra = player.positions.length
    ? `<div class="sub">${player.lines.filter((l) => l !== "K").length ? "Ook " : "Alleen "}${e([...player.positions].sort(M.positionOrder).join(", "))}</div>` : "";
  return `<div class="row player-row ${off ? "off" : ""}">
    ${selected != null ? `<button class="check ${selected ? "on" : ""}" ${act(onSelect)} aria-label="${selected ? "Doet mee" : "Doet niet mee"}">${selected ? icon("check") : ""}</button>` : ""}
    <span class="name-block" ${act(onOpen)}>
      <div class="name">${e(player.name || "Naamloos")}</div>
      ${caption ? `<div class="caption">${e(caption)}</div>` : ""}
      ${detail ? `<div class="detail">${e(detail)}</div>` : ""}
      ${extra}
    </span>
    <span class="line-chips">${M.LINE_KEYS.map(lineChip).join("")}</span>
  </div>`;
}

function viewOverride(m, playerId) {
  const profile = team().squad.find((p) => p.id === playerId);
  if (!profile) return notFound(`#/wedstrijd/${m.id}`);
  const today = M.applyOverride(m, profile);
  return `<div class="page">
    ${topbar({ back: `#/wedstrijd/${m.id}`, title: `${profile.name} · deze wedstrijd` })}
    <div class="card muted">Alleen voor deze wedstrijd. In je ploeg blijft ${e(profile.name)} staan zoals hij stond.</div>
    ${m.overrides?.[profile.id] ? `<div class="list" style="margin-top:12px"><button class="row button" ${act(() => delete m.overrides[profile.id])}>${icon("back")}Terug zoals in de ploeg</button></div>` : ""}
    ${positionSections(today, (roles) => setRoles(m, profile, roles))}
  </div>`;
}

/** Keeper, en per linie "overal" of losse posities. */
function positionSections(player, onRoles) {
  const setLine = (l, on) => onRoles(on
    ? { lines: [...new Set([...player.lines, l])], positions: player.positions.filter((p) => !M.LINES[l].positions.includes(p)) }
    : { lines: player.lines.filter((x) => x !== l), positions: [...player.positions] });
  const flipPos = (pos) => onRoles({ lines: [...player.lines],
    positions: player.positions.includes(pos) ? player.positions.filter((p) => p !== pos) : [...player.positions, pos] });

  let html = `<div class="section-label">Posities</div>
    <div class="list">${row("Kan keeper", toggle(player.lines.includes("K"), (on) => setLine("K", on), "Kan keeper"))}</div>
    <p class="hint">De keeper wisselt alleen tussen de periodes en roteert over iedereen met K.</p>`;
  for (const l of ["V", "M", "A"]) {
    const on = player.lines.includes(l);
    html += `<div class="section-label">${M.LINES[l].name}</div>
      <div class="list">${row(`Overal in de ${M.LINES[l].name}`, toggle(on, (v) => setLine(l, v), M.LINES[l].name))}
      ${on ? "" : `<div class="pos-grid">${M.LINES[l].positions.map((pos) =>
        `<button class="${player.positions.includes(pos) ? "on" : ""}" ${act(() => flipPos(pos))}>${pos}</button>`).join("")}</div>`}
      </div>`;
  }
  const nowhere = !M.playsField(player) && !M.canKeep(player);
  html += nowhere
    ? '<p class="hint error">Kies minstens één plek, anders kan hij nergens spelen.</p>'
    : '<p class="hint">Een positie die niet in de gekozen opstelling zit, telt gewoon niet mee. Wie alleen LV kan, speelt in een 2-4-1 dus niet.</p>';
  return html;
}

// MARK: - Het wisselschema

function viewLineup(m) {
  const squad = team().squad;
  const plan = M.currentPlan(m, squad);
  if (!plan) return `<div class="page">${topbar({ back: `#/wedstrijd/${m.id}`, title: "Wisselschema" })}
    <div class="empty"><strong>Geen schema</strong>De selectie of de wedstrijd is veranderd. Maak een nieuw voorstel.</div></div>`;

  const lineup = plan.lineup;
  const index = Math.min(Math.max(m.selectedBlock ?? 0, 0), lineup.blocks.length - 1);
  const players = M.matchPlayers(m, squad);
  const f = M.formationById(m.settings.formationID);
  const goTo = (i) => { if (lineup.blocks[i]) { m.selectedBlock = i; ui.selected = null; } };

  const choose = (id) => {
    if (!ui.selected) { ui.selected = id; return; }
    if (ui.selected === id) { ui.selected = null; return; }
    if (M.swapPlayers(lineup, ui.selected, id, index)) { plan.edited = true; ui.selected = null; }
    else ui.selected = id; // twee bankzitters: kies opnieuw
  };
  const editing = ui.editingLineup;

  const benched = players.filter((p) => lineup.assignments[index][p.id] == null);
  const nextSubs = M.changesAt(lineup, index + 1).substitutions;
  const comingIn = new Set(nextSubs.map((s) => s.into).filter(Boolean));

  const momentsPicker = `<div class="moments">${Array.from({ length: lineup.periods }, (_, period) => `
    <div class="group">${lineup.periods > 1 ? `<div class="label">${M.periodName(lineup, period)}</div>` : ""}
      <div class="seg">${lineup.blocks.map((b, i) => b.period !== period ? "" :
        `<button class="${i === index ? "on" : ""}" ${act(() => goTo(i))} aria-label="${e(M.momentName(lineup, i))}">${b.from}'</button>`).join("")}</div>
    </div>`).join("")}</div>`;

  const bench = `<div class="section-label">Op de bank
      ${nextSubs.length ? `<span class="right"><b class="in-c">↑ ${nextSubs.length} erin</b> · <b class="out-c">↓ ${nextSubs.length} eruit</b></span>` : ""}</div>
    ${benched.length ? `<div class="bench">${benched.map((p) => {
      const sel = ui.selected === p.id;
      const ring = sel ? "sel" : comingIn.has(p.id) ? "in" : null;
      return `<div class="who ${sel || comingIn.has(p.id) ? "hi" : ""}" ${editing ? act(() => choose(p.id)) : ""}>${circle(p.name, team().shirt, 32, ring)}<span>${e(p.name)}</span></div>`;
    }).join("")}</div>` : '<p class="hint">Niemand.</p>'}`;

  const hint = editing
    ? `<div class="edit-hint">${ui.selected ? `<b>${e(nameOf(ui.selected))}</b> gekozen. Tik op de speler of bankzitter waarmee hij wisselt.`
      : `Tik twee spelers aan om ze te wisselen in <b>${e(M.blockName(lineup, index))}</b>.`}</div>`
    : plan.edited ? '<p class="hint">Je hebt dit voorstel aangepast.</p>' : "";

  const total = lineup.blocks.reduce((a, b) => a + M.dur(b), 0) || 1;
  const ptime = `<div class="section-label">Speeltijd per wissel<span class="right">
      <span class="legend"><i style="background:var(--ink)"></i>Gespeeld</span><span class="legend"><i style="background:var(--planned)"></i>Gepland</span></span></div>
    <div class="card ptime">${players.map((p) => {
      const pos = lineup.assignments[index][p.id];
      const line = pos ? M.lineupPosition(lineup, pos)?.line : null;
      return `<div class="prow">
        <span class="ln ${line === "K" ? "k" : ""}">${line ?? "–"}</span>
        <span class="pn">${e(p.name)}</span>
        <span class="segs">${lineup.blocks.map((b, i) => `<span class="${lineup.assignments[i][p.id] == null ? "" : i <= index ? "played" : "planned"}" style="flex:${M.dur(b) / total}"></span>`).join("")}</span>
        <span class="pm">${M.minutesOf(lineup, p.id)}'</span>
      </div>`;
    }).join("")}</div>`;

  const firstChange = lineup.blocks.length > 1 ? (lineup.blocks[1].from > 0 ? `op ${lineup.blocks[1].from}'` : "bij de volgende periode") : "";
  const allMoments = lineup.blocks.length > 1 ? `<div class="section-label">Alle wisselmomenten</div>
    <div class="card">${lineup.blocks.slice(1).map((_, k) => {
      const i = k + 1;
      return `<div class="moment-row ${i === index ? "on" : ""}" ${act(() => { goTo(i); window.scrollTo({ top: 0, behavior: "smooth" }); })}>
        <h4>${e(M.momentName(lineup, i))}</h4>${changesList(M.changesAt(lineup, i))}</div>`;
    }).join("")}</div>` : "";

  return `<div class="page with-action">
    ${topbar({ back: `#/wedstrijd/${m.id}`, title: "Wisselschema",
      right: `<button class="text-btn" ${act(() => { ui.editingLineup = !editing; ui.selected = null; })}>${icon(editing ? "check" : "pencil")}${editing ? "Klaar" : "Aanpassen"}</button>` })}
    <p class="subtitle">${f.format} tegen ${f.format} · ${e(f.name)}</p>
    ${momentsPicker}
    <div style="margin-top:12px" data-swipe="${scope.add((dir) => goTo(index + dir))}">
      ${pitchHTML(lineup, index, nameOf, team().shirt, team().keeperShirt, editing ? { selected: ui.selected, onTap: choose } : {})}
    </div>
    ${bench}
    <div style="margin-top:12px">${hint}</div>
    <div class="section-label">${index === 0 ? "Aftrap" : `Wissels · ${e(M.momentName(lineup, index))}`}</div>
    <div class="card">${index === 0
      ? `<span class="muted">${lineup.blocks.length > 1 ? `Startopstelling. De eerste wissel komt ${firstChange}.` : "Startopstelling."}</span>`
      : changesList(M.changesAt(lineup, index))}</div>
    ${ptime}
    ${allMoments}
  </div>
  <div class="action-bar"><button class="btn" ${act(() => startMatch(m))}>${icon("play")}Start wedstrijd</button></div>`;
}

/** "↑ Noah ↓ Wout · LV", met wie daarvoor opschuift. */
function changesList(changes, name = nameOf) {
  if (M.changesEmpty(changes)) return '<span class="muted">Geen wissels.</span>';
  const moveText = (mv) => `${name(mv.player)} ${mv.from}→${mv.to}`;
  return `<div class="changes">${changes.substitutions.map((s) => `<div>
      <div class="sub-line"><span class="in-c">↑ ${e(s.into ? name(s.into) : "?")}</span><span class="out-c">↓ ${e(name(s.out))}</span>
        <span class="grow"></span><span class="pos-tag">${e(s.position)}</span></div>
      ${s.moves.length ? `<div class="moves">${e(s.moves.map(moveText).join(", "))}</div>` : ""}
    </div>`).join("")}
    ${changes.moves.length ? `<div class="moves">Schuiven: ${e(changes.moves.map(moveText).join(", "))}</div>` : ""}
  </div>`;
}

/** Het veld liggend: eigen doel links, aanval naar rechts. Wie straks naar de bank gaat, krijgt een rode ring. */
function pitchHTML(lineup, block, name, shirt, keeperShirt, { selected = null, onTap = null } = {}) {
  const assignment = lineup.assignments[block] ?? {};
  const goingOut = new Set(M.changesAt(lineup, block + 1).substitutions.map((s) => s.out));
  const markers = Object.entries(assignment).map(([player, posId]) => {
    const pos = M.lineupPosition(lineup, posId);
    if (!pos) return "";
    const x = ((140 - pos.y) / 140) * 100, y = (pos.x / 100) * 100;
    const ring = selected === player ? "sel" : goingOut.has(player) ? "out" : null;
    return `<div class="marker" style="left:${x}%;top:${y}%" ${onTap ? act(() => onTap(player)) : ""}
        aria-label="${e(name(player))}, ${posId}${goingOut.has(player) ? ", gaat er straks uit" : ""}">
      ${circle(name(player), posId === "K" ? keeperShirt : shirt, 36, ring)}<span class="nm">${e(name(player))}</span></div>`;
  }).join("");
  return `<div class="pitch ${onTap ? "editing" : ""}">${PITCH_LINES}${markers}</div>`;
}

const PITCH_LINES = (() => {
  let stripes = "";
  for (let x = 36, i = 1; x < 370; x += 36, i++) if (i % 2) stripes += `<rect x="${x}" y="0" width="36" height="232" fill="var(--grass-stripe)"/>`;
  return `<svg class="lines" viewBox="0 0 370 232" preserveAspectRatio="none" aria-hidden="true">${stripes}
    <g fill="none" stroke="var(--chalk)" stroke-width="2">
      <rect x="10" y="10" width="350" height="212"/><path d="M185 10v212"/><circle cx="185" cy="116" r="32"/>
      <rect x="10" y="66" width="44" height="100"/><rect x="316" y="66" width="44" height="100"/>
      <rect x="6" y="98" width="4" height="36"/><rect x="360" y="98" width="4" height="36"/>
    </g><circle cx="185" cy="116" r="2.5" fill="var(--chalk)"/></svg>`;
})();

// Vegen over het veld: naar het vorige of volgende wisselmoment.
let swipeStart = null;
document.addEventListener("touchstart", (ev) => {
  const el = ev.target.closest("[data-swipe]");
  swipeStart = el ? { el, x: ev.touches[0].clientX, y: ev.touches[0].clientY } : null;
}, { passive: true });
document.addEventListener("touchend", (ev) => {
  if (!swipeStart || ui.editingLineup) return;
  const dx = ev.changedTouches[0].clientX - swipeStart.x, dy = ev.changedTouches[0].clientY - swipeStart.y;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
    lookup(swipeStart.el.dataset.swipe)?.(dx < 0 ? 1 : -1);
    save();
    render();
  }
  swipeStart = null;
});

// MARK: - Ploeg

function viewSquad() {
  const squad = team().squad;
  const addFrom = (text) => {
    const names = text.split(/[\n\r,;]+/).map((x) => x.trim()).filter(Boolean);
    squad.push(...names.map(M.newPlayer));
    return names.length;
  };
  const submit = () => {
    const field = document.getElementById("new-player");
    if (addFrom(field.value)) { save(); render(); document.getElementById("new-player")?.focus(); }
  };
  const summary = (id) => {
    const st = M.playerStats(team(), id);
    if (!st.matchCount) return null;
    return `${st.matchCount === 1 ? "1 wedstrijd" : `${st.matchCount} wedstrijden`} · gem. ${Math.round(st.averageMinutes)}'`;
  };

  return `<div class="page">
    <div class="topbar"><span class="spacer"></span>${gearButton()}</div>
    <h1 class="title">Ploeg</h1>
    <p class="subtitle">${e(team().name)}</p>
    <div class="list"><div class="add-player">
      <textarea id="new-player" class="field" rows="1" placeholder="Naam van een speler" enterkeyhint="done"
        ${bind((v) => { if (v.includes("\n")) setTimeout(submit); }, true)}></textarea>
      <button ${act(submit)} aria-label="Toevoegen">${icon("plus")}</button>
    </div></div>
    <p class="hint">Een lijst plakken met één naam per regel kan ook.</p>

    ${squad.length ? `<div class="list" style="margin-top:16px">${squad.map((p) => playerRow(p, {
      detail: summary(p.id), onOpen: () => go(`#/speler/${p.id}`),
      onRoles: (roles) => { p.lines = roles.lines; p.positions = roles.positions; },
    })).join("")}</div>
    <p class="hint">Tik aan waar iemand gewoonlijk speelt: K keeper, V verdediging, M middenveld, A aanval. Tik op een naam voor zijn profiel: speeltijd, posities, en vaste plekken zoals alleen LV of LCV.</p>`
      : '<div class="empty"><strong>Nog geen spelers</strong>Typ hierboven een naam.</div>'}
  </div>`;
}

function viewProfile(parts) {
  const p = team().squad.find((x) => x.id === parts[1]);
  if (!p) return notFound("#/ploeg");
  const st = M.playerStats(team(), p.id);

  const remove = async () => {
    if (await ask({ title: `${p.name} uit de ploeg verwijderen?`, message: "Hij verdwijnt ook uit de selectie van je wedstrijden.", ok: "Verwijderen", danger: true })) {
      team().squad = team().squad.filter((x) => x.id !== p.id);
      for (const m of team().matches) {
        m.selection = m.selection.filter((x) => x !== p.id);
        if (m.overrides) delete m.overrides[p.id];
      }
      save();
      go("#/ploeg");
    }
  };

  const most = st.positionMinutes[0]?.minutes || 1;
  return `<div class="page">
    ${topbar({ back: "#/ploeg", title: p.name || "Speler" })}
    <div class="list"><div class="row">${circle(p.name || "?", team().shirt, 56)}
      <input class="field big" value="${e(p.name)}" placeholder="Naam" ${bind((v) => (p.name = v), true)}></div></div>

    <div class="section-label">Speeltijd</div>
    <div class="tiles">
      <div class="tile"><div class="v">${st.matchCount}</div><div class="label">${st.matchCount === 1 ? "Wedstrijd" : "Wedstrijden"}</div></div>
      <div class="tile"><div class="v">${st.totalMinutes}'</div><div class="label">Totaal</div></div>
      <div class="tile"><div class="v">${st.matchCount ? `${Math.round(st.averageMinutes)}'` : "–"}</div><div class="label">Gemiddeld</div></div>
    </div>
    <p class="hint">Uit de schema's van gespeelde wedstrijden: met een schema en een datum die voorbij is. Het gemiddelde telt alleen wedstrijden waarin ${e(p.name)} in de selectie zat.</p>

    ${st.positionMinutes.length ? `<div class="section-label">Meest gespeeld</div>
    <div class="card">${st.positionMinutes.slice(0, 5).map((it, i) => `<div class="bar-row">
      <span class="k">${it.position}</span>
      <span class="track"><span class="${i === 0 ? "top" : ""}" style="width:${(it.minutes / most) * 100}%"></span></span>
      <span class="n">${it.minutes}'</span></div>`).join("")}</div>` : ""}

    ${st.entries.length ? `<div class="section-label">Wedstrijden</div>
    <div class="list">${st.entries.slice(0, 10).map((en) => `<div class="row">
      <span class="grow"><div><b>${e(en.title)}</b></div><div class="sub">${fmt(en.date, { weekday: "short", day: "numeric", month: "short" })}</div></span>
      <span style="text-align:right"><div><b>${en.minutes}'</b></div><div class="sub">${e(Object.keys(en.positions).sort(M.positionOrder).join(", "))}</div></span>
    </div>`).join("")}</div>` : ""}

    ${positionSections(p, (roles) => { p.lines = roles.lines; p.positions = roles.positions; })}

    <div class="list" style="margin-top:24px">
      <button class="row button danger" ${act(remove)}>${icon("trash")}Speler verwijderen</button>
    </div>
  </div>`;
}

// MARK: - Instellingen

function viewSettings() {
  const shirtPicker = (key) => `<div class="shirts">${Object.keys(M.TEAM_COLORS).map((c) =>
    `<button class="${team()[key] === c ? "on" : ""}" style="color:${M.TEAM_COLORS[c]}" ${act(() => (team()[key] = c))} aria-label="${M.colorName(c)}">${icon("shirt")}</button>`).join("")}</div>`;

  const exportBackup = async () => {
    const url = URL.createObjectURL(S.backupBlob(state, await P.exportPhotos(photoIds())));
    const a = document.createElement("a");
    a.href = url;
    a.download = S.backupFileName();
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    state.lastBackup = new Date().toISOString();
    save();
    render();
  };

  const install = async () => {
    ui.installPrompt.prompt();
    await ui.installPrompt.userChoice;
    ui.installPrompt = null;
    render();
  };

  const last = state.lastBackup ? fmt(state.lastBackup, { day: "numeric", month: "long", year: "numeric" }) : null;
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;

  return `<div class="page">
    ${topbar({ back: "#/trainingen", title: "Instellingen" })}
    <div class="section-label">Ploegnaam</div>
    <div class="list"><div class="row"><input class="field" value="${e(team().name)}" placeholder="Bv. U11 KVC Heide" ${bind((v) => (team().name = v), true)}></div></div>
    <p class="hint">Staat bovenaan de lijsten en bij de stand tijdens een wedstrijd.</p>

    <div class="section-label">Shirts</div>
    <div class="list">
      <div class="row" style="display:block"><div>Spelers</div>${shirtPicker("shirt")}</div>
      <div class="row" style="display:block"><div>Keeper</div>${shirtPicker("keeperShirt")}</div>
    </div>

    <div class="section-label">Timer</div>
    <div class="list">${row("Geluid", toggle(state.settings.sound, (on) => (state.settings.sound = on), "Geluid"))}</div>
    <p class="hint">Het scherm blijft aan tijdens een training. Zet je toestel niet op slot: dan legt de browser de geluiden stil. Tik tijdens een training op het slotje voor de veldmodus: een zwart scherm met alleen de klok, waarop tikken niets doet. Zo kan je gsm in je zak of op de bank.</p>

    <div class="section-label">Je gegevens</div>
    <div class="list">
      <button class="row button" ${act(exportBackup)}>${icon("download")}Back-up downloaden</button>
      <label class="row button" style="cursor:pointer">${icon("upload")}Back-up of iPhone-bestand inladen
        <input type="file" accept=".json,application/json" multiple hidden id="import-file"></label>
    </div>
    <p class="hint">Alles staat alleen in deze browser op dit toestel: er is geen account en niets gaat naar een server. Maak af en toe een back-up, en zet hem zo over naar een ander toestel. ${last ? `Laatste back-up: ${e(last)}.` : "Je hebt nog geen back-up gemaakt."}</p>
    <p class="hint">Van de iPhone-app kun je <b>trainings.json</b> en <b>team.json</b> inladen, of een losse training.</p>

    ${standalone ? "" : `<div class="section-label">Op je beginscherm</div>
    ${ui.installPrompt ? `<div class="list"><button class="row button" ${act(install)}>${icon("home")}Installeren als app</button></div>` : ""}
    <p class="hint">Zet Coach Timer op je beginscherm, dan opent hij als een app en werkt hij ook zonder internet. iPhone: Deel → Zet op beginscherm. Android: menu ⋮ → App installeren.</p>`}
  </div>`;
}

document.addEventListener("change", async (ev) => {
  if (ev.target.id !== "import-file") return;
  const files = [...ev.target.files];
  ev.target.value = "";
  for (const file of files) {
    try {
      const json = JSON.parse(await file.text());
      const replaces = json?.app === "coach-timer" || Array.isArray(json?.squad);
      if (replaces && !(await ask({
        title: `${file.name} inladen?`,
        message: json.app === "coach-timer" ? "Alles op dit toestel wordt vervangen door deze back-up." : "Je ploeg en wedstrijden op dit toestel worden vervangen.",
        ok: "Inladen", danger: true,
      }))) continue;
      toast(S.applyImport(state, json));
      if (json?.media) await P.importPhotos(json.media);
      save();
    } catch (err) {
      toast(err instanceof SyntaxError ? `${file.name} is geen geldig JSON-bestand.` : err.message);
    }
  }
  render();
});

window.addEventListener("beforeinstallprompt", (ev) => {
  ev.preventDefault();
  ui.installPrompt = ev;
  if (route().name === "instellingen") render();
});

// MARK: - De timer

const sound = { ctx: null, buffers: {} };

/** Geluid mag pas na een tik van de gebruiker: daarom bij het starten. */
function unlockAudio() {
  try {
    // Safari 17+: geluid ook als de stilteschakelaar aan staat.
    if (navigator.audioSession) navigator.audioSession.type = "playback";
    if (!sound.ctx) {
      sound.ctx = new (window.AudioContext || window.webkitAudioContext)();
      for (const name of ["warning", "start", "stop", "whistle", "finish"]) {
        fetch(`sounds/${name}.wav`).then((r) => r.arrayBuffer())
          .then((b) => sound.ctx.decodeAudioData(b)).then((buf) => (sound.buffers[name] = buf)).catch(() => {});
      }
    }
    if (sound.ctx.state !== "running") sound.ctx.resume();
  } catch { /* zonder geluid gaat het ook */ }
}

function signal(kind) {
  const name = { warning: "warning", running: "start", resting: "stop", switching: "stop", waiting: "whistle", finished: "finish" }[kind];
  if (state.settings.sound && sound.ctx && sound.buffers[name]) {
    const src = sound.ctx.createBufferSource();
    src.buffer = sound.buffers[name];
    src.connect(sound.ctx.destination);
    src.start();
  }
  navigator.vibrate?.(kind === "warning" ? [120, 80, 120] : [300]);
}

let wakeLock = null;
async function keepAwake() {
  try { wakeLock = await navigator.wakeLock?.request("screen"); } catch { /* niet erg */ }
}

let warnedKey = null;
let renderedKey = null;
let ticker = null;

const phaseKey = (s) => `${s.blockIndex}/${s.step}/${s.phase}`;

function startSession(training, score = null) {
  if (session) return;
  unlockAudio();
  session = M.startSession(training, Date.now(), score);
  warnedKey = null;
  S.saveSession(session);
  openSession();
}

function startMatch(m) {
  const training = M.matchTraining(m, team());
  if (training) startSession(training, m.score ? { ...m.score } : null);
}

function openSession() {
  keepAwake();
  document.body.style.overflow = "hidden";
  renderedKey = null;
  tick();
  clearInterval(ticker);
  ticker = setInterval(tick, 250);
}

function closeSession() {
  if (session?.training.match) { M.recordSession(team(), session); save(); }
  session = null;
  S.saveSession(null);
  clearInterval(ticker);
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
  document.body.style.overflow = "";
  document.getElementById("session").hidden = true;
  render();
}

/** Een signaal heeft alleen zin als de fase net begon, niet na het inhalen van een onderbreking. */
const isFresh = (now) => session.phaseStartedAt == null || now - session.phaseStartedAt < 3000;

function tick() {
  if (!session) return;
  const now = Date.now();
  const before = phaseKey(session);
  M.update(session, now);
  if (phaseKey(session) !== before) {
    if (isFresh(now)) signal(session.phase);
    S.saveSession(session);
  }
  checkWarning(now);
  const key = structureKey(now);
  if (key !== renderedKey) renderSession(now, key);
  else updateDynamic(now);
}

/** Eén waarschuwing per running-fase, `warnBefore` seconden voor het einde. */
function checkWarning(now) {
  const s = session, block = M.currentBlock(s);
  if (s.phase !== "running" || M.isPaused(s) || !block || !(block.warnBefore > 0)) return;
  if (s.phaseStartedAt == null || s.phaseEndsAt == null) return;
  const total = (s.phaseEndsAt - s.phaseStartedAt) / 1000, left = (s.phaseEndsAt - now) / 1000;
  if (total <= block.warnBefore || left > block.warnBefore) return;
  const key = phaseKey(s) + "@" + s.phaseStartedAt;
  if (warnedKey === key) return;
  warnedKey = key;
  signal("warning");
}

function canDelay(now) {
  const copy = structuredClone(session);
  return M.delaySubstitution(copy, now);
}

/** Alles wat de opbouw van het scherm verandert; de klok zelf niet. */
function structureKey(now) {
  const s = session;
  return JSON.stringify([phaseKey(s), M.isPaused(s), !!s.fieldMode, s.training.match ? M.isSubstituting(s, now) : 0,
    s.score, s.substitutionDone, state.settings.sound, s.training.match ? canDelay(now) : 0,
    s.phaseEndsAt == null, s.training.match?.lineup.blocks.map((b) => b.from).join()]);
}

const sAct = (fn) => {
  const id = reg.s.add((...args) => { fn(...args); S.saveSession(session); if (session) { renderedKey = null; tick(); } });
  return `data-a="${id}"`;
};

const PHASE_VAR = { running: "--running", resting: "--rest", switching: "--switch", waiting: "--timeup", finished: "--paused" };

function ringColor(now) {
  if (M.isPaused(session)) return "var(--paused)";
  if (session.training.match && M.isSubstituting(session, now)) return "var(--switch)";
  return `var(${PHASE_VAR[session.phase]})`;
}

function renderSession(now, key) {
  const s = session;
  renderedKey = key;
  reg.s.reset();
  scope = reg.s;
  const match = s.training.match;
  const el = document.getElementById("session");
  el.hidden = false;

  const close = async () => {
    if (s.phase === "finished" || await ask({ title: match ? "Wedstrijd stoppen?" : "Training stoppen?", ok: "Stoppen", danger: true })) closeSession();
  };

  const head = `<div class="s-head">
    <button class="icon-btn" data-a="${reg.s.add(() => close())}" aria-label="Sluiten">${icon("x")}</button>
    <div class="s-title"><b>${e(s.training.name)}</b>${s.phase === "finished" ? "" : `<span id="s-sub">${e(subtitle(now))}</span>`}</div>
    <button class="icon-btn" ${sAct(() => { state.settings.sound = !state.settings.sound; save(); })} aria-label="${state.settings.sound ? "Geluid uit" : "Geluid aan"}">${icon(state.settings.sound ? "sound" : "mute")}</button>
  </div>`;

  if (s.phase === "finished") {
    const total = (s.blockStartedAt - s.startedAt - s.pausedTotal) / 1000;
    el.innerHTML = `${head}<div class="finished">
      ${icon("checkCircle", "check")}
      <h2>${match ? "Wedstrijd gedaan" : "Training klaar"}</h2>
      ${match && s.score ? `<p class="muted"><b>${e(scoreLine(match, s))}</b></p>` : ""}
      <p class="muted">Duur ${M.formatClock(total)} · gepland ${M.formatClock(M.trainingDuration(s.training))}</p>
      <div style="width:100%;max-width:400px;margin-top:16px"><button class="btn" data-a="${reg.s.add(() => closeSession())}">Sluiten</button></div>
    </div>`;
    scope = reg.v;
    return;
  }

  const block = M.currentBlock(s);
  if (s.fieldMode) {
    el.innerHTML = fieldModeHTML(now, block);
    scope = reg.v;
    updateDynamic(now);
    return;
  }
  el.innerHTML = `${head}
    ${match ? `<div class="score-wrap">${scoreBar(match, s)}</div>` : ""}
    <div class="s-body">
      ${match ? "" : `<div class="block-head"><span class="block-chip kind-${block.kind}">${M.BLOCK_KINDS[block.kind]}</span><h2>${e(block.name)}</h2></div>`}
      ${ringHTML(now, block)}
      ${block.timer.type === "rotation" ? stationsHTML(block.timer.plan) : ""}
      ${match ? matchInfo(match, now) : nextHint(block)}
      ${D.hasDrawing(block) ? `<div class="card drawing-card">${D.drawingSVG(block.drawing)}</div>` : ""}
      ${block.photoId ? `<div class="card photo-card"><img data-photo="${e(block.photoId)}" alt="Foto bij ${e(block.name)}"></div>` : ""}
      ${block.notes ? `<div class="card notes">${e(block.notes)}</div>` : ""}
    </div>
    <div class="s-controls">
      <button class="round-btn" ${sAct(() => (s.fieldMode = true))} aria-label="Veldmodus: zwart scherm, vergrendeld">${icon("lock")}</button>
      <button class="round-btn big" ${sAct(() => (M.isPaused(s) ? M.resume(s) : M.pause(s)))} aria-label="${M.isPaused(s) ? "Hervatten" : "Pauzeren"}">${icon(M.isPaused(s) ? "play" : "pause")}</button>
      <button class="round-btn ${s.phase === "waiting" ? "alert" : ""}" ${sAct(() => { M.next(s); signal(s.phase); })} aria-label="Volgende: ${e(M.nextStepDescription(s))}">${icon("next")}</button>
    </div>`;
  scope = reg.v;
  P.hydrate(el);
  updateDynamic(now);
}

// MARK: Veldmodus

/**
 * Zwart scherm met alleen de klok, voor in je zak of op de bank. De pagina
 * blijft lopen, dus geluid en trillen werken; tikken doet niets, behalve
 * lang drukken op het slotje onderaan.
 */
function fieldModeHTML(now, block) {
  const s = session, match = s.training.match;
  const label = M.isPaused(s) ? "Pauze" : match && M.isSubstituting(s, now) ? "Wisselen" : M.PHASE_LABEL[s.phase];
  let info = "";
  if (match) {
    const lineup = match.lineup, name = (id) => match.names[id] ?? "?";
    const subs = M.isSubstituting(s, now) ? M.changesAt(lineup, s.blockIndex).substitutions : [];
    info = `<div class="f-score">${e(scoreLine(match, s))}</div>`
      + (subs.length ? `<div class="f-subs">${subs.map((x) => `<div><span class="in-c">↑ ${e(x.into ? name(x.into) : "?")}</span> <span class="out-c">↓ ${e(name(x.out))}</span></div>`).join("")}</div>` : "");
  } else {
    info = `<div class="f-block">${e(block.name)}</div>`;
  }
  const step = stepText(now, block);
  return `<div class="field-mode">
    <div class="f-inner" id="f-inner">
      <span class="f-phase" style="color:${ringColor(now)}">${label}</span>
      <span class="clock f-clock" id="s-clock"></span>
      ${step ? `<span class="f-step">${e(step)}</span>` : ""}
      ${info}
    </div>
    <div class="f-unlock" id="f-unlock">
      <span class="f-lock">${icon("lock")}<svg class="f-progress" viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" pathLength="100"/></svg></span>
      <span>Houd ingedrukt om te ontgrendelen</span>
    </div>
  </div>`;
}

let unlockTimer = null;
document.addEventListener("pointerdown", (ev) => {
  const el = ev.target.closest("#f-unlock");
  if (!el || !session) return;
  el.classList.add("holding");
  unlockTimer = setTimeout(() => {
    unlockTimer = null;
    session.fieldMode = false;
    S.saveSession(session);
    renderedKey = null;
    tick();
  }, 1200);
});
const cancelUnlock = () => {
  clearTimeout(unlockTimer);
  unlockTimer = null;
  document.getElementById("f-unlock")?.classList.remove("holding");
};
for (const type of ["pointerup", "pointercancel", "pointerleave"]) document.addEventListener(type, cancelUnlock);
document.addEventListener("contextmenu", (ev) => { if (ev.target.closest(".field-mode")) ev.preventDefault(); });

/** "Blok 2 van 4 · op schema", of bij een wedstrijd "Q2 · 13:24". */
function subtitle(now) {
  const s = session, mb = M.matchBlock(s);
  if (s.training.match && mb) {
    const per = M.periodName(s.training.match.lineup, mb.period);
    const t = M.formatClock(M.matchTime(s, now) ?? 0);
    return per ? `${per} · ${t}` : t;
  }
  return `Blok ${s.blockIndex + 1} van ${s.training.blocks.length} · ${M.formatDrift(M.drift(s, now)).toLowerCase()}`;
}

function ringHTML(now, block) {
  const s = session, match = s.training.match;
  const pb = match ? M.periodBlocks(match.lineup, s.blockIndex) : { count: 1, position: 0 };
  const lw = 7.5, r = 50 - lw / 2;
  const gap = pb.count > 1 ? (2 + lw) / 2 / (Math.PI * 2 * r) : 0;
  let segs = "";
  for (let i = 0; i < pb.count; i++) {
    const from = (i + gap) / pb.count, to = (i + 1 - gap) / pb.count;
    const fill = i < pb.position ? 0 : 1;
    const arc = (len, extra = "") => `<circle cx="50" cy="50" r="${r}" pathLength="100" stroke-width="${lw}"
      stroke-dasharray="${len * 100} 200" stroke-dashoffset="${-from * 100}" ${extra}/>`;
    segs += arc(to - from, `stroke="${ringColor(now)}" opacity="0.16"`);
    segs += arc((to - from) * fill, `stroke="${ringColor(now)}" ${i === pb.position ? 'id="s-arc"' : ""} data-len="${to - from}" ${fill < 0.001 ? 'opacity="0"' : ""}`);
  }
  const label = M.isPaused(s) ? "Pauze" : match && M.isSubstituting(s, now) ? "Wisselen" : M.PHASE_LABEL[s.phase];
  const dark = !M.isPaused(s) && (s.phase === "switching" || (match && M.isSubstituting(s, now)));
  const step = stepText(now, block);
  return `<div class="ring-wrap ${match ? "match" : ""}" id="s-ring">
    <svg viewBox="0 0 100 100" aria-hidden="true">${segs}</svg>
    <div class="ring-center">
      <span class="phase-chip ${dark ? "dark" : ""}" style="background:${ringColor(now)}">${label}</span>
      <span class="clock" id="s-clock"></span>
      ${step ? `<span class="step-text">${e(step)}</span>` : ""}
    </div>
  </div>`;
}

function updateDynamic(now) {
  const s = session;
  const sub = document.getElementById("s-sub");
  if (sub) sub.textContent = subtitle(now);
  const clock = document.getElementById("s-clock");
  if (clock) {
    const rem = M.remaining(s, now);
    clock.textContent = rem != null ? M.formatCountdown(rem) : "+" + M.formatClock(M.elapsedInPhase(s, now));
    clock.classList.toggle("over", rem == null);
  }
  const arc = document.getElementById("s-arc");
  if (arc) {
    const left = s.phaseEndsAt == null ? 1 : 1 - M.progress(s, now);
    const len = Number(arc.dataset.len) * left;
    arc.setAttribute("stroke-dasharray", `${len * 100} 200`);
    arc.setAttribute("opacity", len > 0.001 ? "1" : "0");
  }
  const inner = document.getElementById("f-inner");
  if (inner) {
    // Elke minuut een beetje verschuiven, zodat er niets inbrandt.
    const m = Math.floor(now / 60000);
    inner.style.transform = `translate(${((m * 37) % 41) - 20}px, ${((m * 53) % 61) - 30}px)`;
  }
  const ring = document.getElementById("s-ring");
  if (ring) {
    const rem = M.remaining(s, now) ?? 0;
    ring.classList.toggle("pulse", !M.isPaused(s) && rem > 0 && rem <= 10 && Math.floor(rem) % 2 === 0);
  }
}

function stepText(now, block) {
  const s = session, match = s.training.match;
  if (match) {
    const lineup = match.lineup;
    if (M.isSubstituting(s, now)) return `Wissel ${s.blockIndex} van ${lineup.blocks.length - 1}`;
    const next = lineup.blocks[s.blockIndex + 1];
    if (next) return next.period === lineup.blocks[s.blockIndex].period ? `Volgende wissel op ${next.from}'` : "Daarna rust";
    return "Laatste blok";
  }
  const t = block.timer;
  if (t.type === "intervals") return `Rep ${s.step + 1} van ${t.reps}`;
  if (t.type === "rotation") return `Ronde ${s.step + 1} van ${t.plan.stations.length}`;
  return null;
}

/** "Daarna rust 0:30", met het woord in de kleur van die fase. */
function nextHint(block) {
  const s = session;
  const g = M.stepInfo.gap(block.timer);
  if (s.phase === "running" && s.step < M.stepInfo.lastStep(block.timer) && g && g.duration > 0) {
    return `<p class="next-hint">Daarna <b style="color:var(${PHASE_VAR[g.phase]})">${M.PHASE_LABEL[g.phase].toLowerCase()}</b> ${M.formatClock(g.duration)}</p>`;
  }
  const next = M.nextStepDescription(s);
  return next ? `<p class="next-hint">Daarna: ${e(next)}</p>` : "";
}

/** Welke groep staat waar. Tijdens het wisselen: waar ze naartoe moeten. */
function stationsHTML(plan) {
  const s = session;
  const round = s.phase === "switching" ? s.step + 1 : s.step;
  return `<div><div class="label" style="margin:0 4px 8px">${s.phase === "switching" ? "Naar" : "Nu"}</div>
    <div class="stations">${M.rotationAssignment(plan, round).map((it) => `<div class="card station">
      <span class="bib" style="background:${it.group ? e(it.group.colorHex) : "var(--fill2)"}"></span>
      <div style="min-width:0"><b>${e(it.group?.name ?? "Leeg")}</b><span>${e(it.station.name)}</span></div>
    </div>`).join("")}</div></div>`;
}

function scoreLine(match, s) {
  const us = match.teamName || "Wij", sc = s.score ?? { us: 0, them: 0 };
  return (match.isHome ?? true) ? `${us} ${sc.us} – ${sc.them} ${s.training.name}` : `${s.training.name} ${sc.them} – ${sc.us} ${us}`;
}

/** De stand, met de thuisploeg links. */
function scoreBar(match, s) {
  const home = match.isHome ?? true;
  const us = match.teamName || "Wij";
  const sc = s.score ?? { us: 0, them: 0 };
  const change = (side, d) => { s.score = { us: 0, them: 0, ...s.score }; s.score[side] = Math.max(0, s.score[side] + d); };
  const side = (name, value, key, isUs) => `<div class="side">
    <span class="label ${isUs ? "us" : ""}">${e(name)}</span>
    <div class="ctrl">
      <button ${sAct(() => change(key, -1))} ${value === 0 ? "disabled" : ""} aria-label="Min één">${icon("minus")}</button>
      <span class="num">${value}</span>
      <button ${sAct(() => change(key, 1))} aria-label="Plus één">${icon("plus")}</button>
    </div></div>`;
  return `<div class="card score">
    ${home ? side(us, sc.us, "us", true) : side(s.training.name, sc.them, "them", false)}
    <span class="dash">–</span>
    ${home ? side(s.training.name, sc.them, "them", false) : side(us, sc.us, "us", true)}
  </div>`;
}

/** De wissels van nu (of straks), het veld en de bank. */
function matchInfo(match, now) {
  const s = session, lineup = match.lineup, index = s.blockIndex;
  if (!lineup.blocks[index]) return "";
  const name = (id) => match.names[id] ?? "?";
  const shirt = match.shirt ?? "blauw";
  let top = "";
  if (M.isSubstituting(s, now)) {
    const delay = canDelay(now);
    top = inOutCard(`Nu wisselen · ${M.momentName(lineup, index)}`, M.changesAt(lineup, index), match, index, shirt)
      + `<div class="btn-row" style="margin-top:12px">
        <button class="btn" ${sAct(() => (s.substitutionDone = s.blockIndex))}>Wissel gedaan</button>
        <button class="btn secondary" ${sAct(() => M.delaySubstitution(s, Date.now()))} ${delay ? "" : "disabled"}>1 minuut later</button>
      </div>`;
  } else if (lineup.blocks[index + 1]) {
    top = inOutCard(`${s.phase === "waiting" ? "Na de rust · " : "Volgende wissel · "}${M.momentName(lineup, index + 1)}`,
      M.changesAt(lineup, index + 1), match, index + 1, shirt);
  }
  const players = Object.keys(match.names).sort((a, b) => name(a).localeCompare(name(b), "nl"));
  const benched = players.filter((p) => lineup.assignments[index][p] == null);
  return `<div>${top}</div>
    ${pitchHTML(lineup, index, name, shirt, match.keeperShirt ?? "geel")}
    ${benched.length ? `<div><div class="label" style="margin:0 4px 8px">Op de bank</div><p class="muted" style="margin:0 4px">${e(benched.map(name).join(", "))}</p></div>` : ""}`;
}

/** Links wie erin komt (met zijn positie), rechts wie eruit gaat (met zijn minuten tot nu). */
function inOutCard(title, changes, match, block, shirt) {
  const name = (id) => match.names[id] ?? "?";
  if (M.changesEmpty(changes)) return `<div class="card"><div class="label">${e(title)}</div><p class="muted" style="margin:8px 0 0">Geen wissels.</p></div>`;
  const col = (isIn) => `<div class="col"><span class="inout-chip ${isIn ? "in" : "out"}">${isIn ? "↑ Erin" : "↓ Eruit"}</span>
    ${changes.substitutions.map((sub) => {
      const p = isIn ? sub.into : sub.out;
      return `<div class="who">${circle(p ? name(p) : "?", shirt, 32, isIn ? "in" : "out")}
        <div><b>${e(p ? name(p) : "?")}</b><span>${isIn ? e(sub.position) : `${p ? M.minutesOf(match.lineup, p, block) : 0}' gespeeld`}</span></div></div>`;
    }).join("")}</div>`;
  const moves = [...changes.substitutions.flatMap((x) => x.moves), ...changes.moves].map((mv) => `${name(mv.player)} ${mv.from}→${mv.to}`);
  return `<div class="card inout"><div class="label" style="margin-bottom:12px">${e(title)}</div>
    <div class="cols">${col(true)}<span class="divider"></span>${col(false)}</div>
    ${moves.length ? `<p class="moves" style="margin:12px 0 0">Schuiven: ${e(moves.join(", "))}</p>` : ""}
  </div>`;
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && session) { keepAwake(); unlockAudio(); tick(); }
});
// Na herladen kan het geluid pas weer na een tik.
document.addEventListener("pointerdown", () => { if (session) unlockAudio(); }, { capture: true });

// MARK: - Start

S.askPersistence();
render();
P.prune(new Set(photoIds()));
if (session) openSession();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
