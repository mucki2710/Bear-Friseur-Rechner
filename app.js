// =====================
// DOM
// =====================
const calcType = document.getElementById("calcType");
const output = document.getElementById("output");

const taskCategory = document.getElementById("taskCategory");
const taskSelect = document.getElementById("taskSelect");
const taskMode = document.getElementById("taskMode");
const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const taskPrompt = document.getElementById("taskPrompt");

const loadTaskBtn = document.getElementById("loadTaskBtn");
const toggleSolutionBtn = document.getElementById("toggleSolutionBtn");
const taskSolution = document.getElementById("taskSolution");
const taskSolutionContent = document.getElementById("taskSolutionContent");

const exampleBtn = document.getElementById("exampleBtn");
const clearBtn = document.getElementById("clearBtn");
const calcBtn = document.getElementById("calcBtn");

const fields = Array.from({ length: 8 }, (_, i) => ({
  wrapper: document.getElementById(`field${i + 1}`),
  label: document.getElementById(`label${i + 1}`),
  input: document.getElementById(`input${i + 1}`)
}));

// =====================
// STATE
// =====================
let TASK_DATA = { exam_tasks: {} };

// =====================
// RECHENARTEN
// =====================
const calcTypes = [
  "Mischungsrechner",
  "Verhältnis",
  "Konzentration",
  "Deckungsbeitrag",
  "Wareneinsatzquote",
  "Warenrabatt",
  "Preisberechnung",
  "Bezugskalkulation",
  "Verkaufskalkulation",
  "Umweltschutz",
  "Marketing Vormonat",
  "Marketing Umsatz"
];

function initCalcTypes() {
  calcType.innerHTML = "";
  calcTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    calcType.appendChild(option);
  });
}

// =====================
// HILFSFUNKTIONEN
// =====================
function parseNum(value) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!normalized) {
    throw new Error("Bitte alle benötigten Felder ausfüllen.");
  }
  const num = Number(normalized);
  if (Number.isNaN(num)) {
    throw new Error("Ungültige Zahl eingegeben.");
  }
  return num;
}

function clearAllInputs() {
  fields.forEach((field) => {
    field.input.value = "";
    field.input.disabled = false;
    field.input.placeholder = "";
  });
}

function hideAllFields() {
  fields.forEach((field) => {
    field.wrapper.classList.add("hidden");
    field.label.textContent = "";
  });
}

function showField(index, label, placeholder = "") {
  const field = fields[index];
  if (!field) return;
  field.wrapper.classList.remove("hidden");
  field.label.textContent = label;
  field.input.placeholder = placeholder;
  field.input.disabled = false;
}

function setOutputDefault() {
  output.textContent = "Noch keine Berechnung.";
}

function formatCategoryName(key) {
  const map = {
    mixing: "Mischung",
    concentration: "Konzentration",
    deckungsbeitrag: "Deckungsbeitrag",
    wareneinsatzquote: "Wareneinsatzquote",
    warenrabatt: "Warenrabatt",
    preisberechnung: "Preisberechnung",
    bezugskalkulation: "Bezugskalkulation",
    verkaufskalkulation: "Verkaufskalkulation",
    umweltschutz: "Umweltschutz",
    marketing_vormonat: "Marketing Vormonat",
    marketing_umsatz: "Marketing Umsatz"
  };
  return map[key] || key;
}

function getCurrentTask() {
  const category = taskCategory.value;
  const index = Number(taskSelect.value);

  if (!TASK_DATA.exam_tasks?.[category]) return null;
  if (Number.isNaN(index)) return null;

  return TASK_DATA.exam_tasks[category][index] || null;
}

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

function normalizeRatio(a, b) {
  const scale = 10;
  const aa = Math.round(a * scale);
  const bb = Math.round(b * scale);
  const g = aa && bb ? gcd(aa, bb) : Math.max(aa, bb, 1);
  return [aa / g, bb / g];
}

// =====================
// RECHNER-UI
// =====================
function applyMode(mode) {
  calcType.value = mode;
  clearAllInputs();
  hideAllFields();

  if (mode === "Mischungsrechner") {
    showField(0, "Starke Lösung (%)", "z. B. 12");
    showField(1, "Schwache Lösung (%)", "z. B. 3");
    showField(2, "Zielkonzentration (%)", "z. B. 6");
    showField(3, "Gesamtmenge (ml)", "z. B. 40");
  } else if (mode === "Verhältnis") {
    showField(0, "Starke Lösung (%)", "z. B. 12");
    showField(1, "Schwache Lösung (%)", "z. B. 2");
    showField(2, "Zielkonzentration (%)", "z. B. 4");
  } else if (mode === "Konzentration") {
    showField(0, "Menge Entwickler (ml)", "z. B. 40");
    showField(1, "Konzentration (%)", "z. B. 12");
    showField(2, "Wasser (ml)", "z. B. 20");
    showField(3, "Farbcreme (ml)", "z. B. 60");
  } else if (mode === "Deckungsbeitrag") {
    showField(0, "Umsatz (€)", "z. B. 20");
    showField(1, "Variable Kosten (€)", "z. B. 6");
  } else if (mode === "Wareneinsatzquote") {
    showField(0, "Wareneinsatz (€)", "z. B. 6");
    showField(1, "Umsatz (€)", "z. B. 20");
  } else if (mode === "Warenrabatt") {
    showField(0, "Preis Artikel 1 (€)", "z. B. 110");
    showField(1, "Rabatt Artikel 1 (%)", "z. B. 18");
    showField(2, "Preis Artikel 2 (€)", "z. B. 9.8");
    showField(3, "Rabatt Artikel 2 (%)", "z. B. 7");
  } else if (mode === "Preisberechnung") {
    showField(0, "Stückpreis (€)", "z. B. 7.5");
    showField(1, "Menge 1", "z. B. 50");
    showField(2, "Rabatt 1 (%)", "z. B. 3");
    showField(3, "Menge 2", "z. B. 100");
    showField(4, "Rabatt 2 (%)", "z. B. 10");
  } else if (mode === "Bezugskalkulation") {
    showField(0, "Stückpreis (€)", "z. B. 2.1");
    showField(1, "Menge", "z. B. 50");
    showField(2, "Rabatt (%)", "z. B. 3");
    showField(3, "Skonto (%)", "z. B. 2");
    showField(4, "Bezugskosten (€)", "z. B. 7.5");
  } else if (mode === "Verkaufskalkulation") {
    showField(0, "Listenpreis (€)", "z. B. 5.8");
    showField(1, "Rabatt (%)", "z. B. 8.5");
    showField(2, "Skonto (%)", "z. B. 3");
    showField(3, "Bezugskosten (€)", "z. B. 4.7");
    showField(4, "Handlungskosten (%)", "z. B. 30");
    showField(5, "Gewinn (%)", "z. B. 35");
    showField(6, "MwSt (%)", "z. B. 19");
  } else if (mode === "Umweltschutz") {
    showField(0, "Rest pro Tube (ml)", "z. B. 8");
    showField(1, "Tuben pro Tag", "z. B. 5");
    showField(2, "Arbeitstage pro Monat", "z. B. 20");
  } else if (mode === "Marketing Vormonat") {
    showField(0, "Aktuelle Kunden", "z. B. 876");
    showField(1, "Steigerung (%)", "z. B. 20");
  } else if (mode === "Marketing Umsatz") {
    showField(0, "Kunden", "z. B. 876");
    showField(1, "Umsatz pro Kunde (€)", "z. B. 29.5");
  }

  setOutputDefault();
}

function modeFromTask(task) {
  if (!task) return "Mischungsrechner";

  const map = {
    mixing: task.total_ml != null ? "Mischungsrechner" : "Verhältnis",
    ratio: "Verhältnis",
    concentration: "Konzentration",
    deckungsbeitrag: "Deckungsbeitrag",
    wareneinsatzquote: "Wareneinsatzquote",
    warenrabatt: "Warenrabatt",
    preisberechnung: "Preisberechnung",
    bezugskalkulation: "Bezugskalkulation",
    verkaufskalkulation: "Verkaufskalkulation",
    umweltschutz: "Umweltschutz",
    marketing_vormonat: "Marketing Vormonat",
    marketing_umsatz: "Marketing Umsatz"
  };

  return map[task.type] || "Mischungsrechner";
}

function loadTaskIntoCalculator(task) {
  if (!task) return;

  applyMode(modeFromTask(task));

  if (task.type === "mixing" || task.type === "ratio") {
    fields[0].input.value = task.high ?? "";
    fields[1].input.value = task.low ?? "";
    fields[2].input.value = task.target ?? "";
    fields[3].input.value = task.total_ml ?? "";
  } else if (task.type === "concentration") {
    fields[0].input.value = task.strong_ml ?? "";
    fields[1].input.value = task.strong_pct ?? "";
    fields[2].input.value = task.water_ml ?? "";
    fields[3].input.value = task.extra_ml ?? "";
  } else if (task.type === "deckungsbeitrag") {
    fields[0].input.value = task.umsatz ?? "";
    fields[1].input.value = task.variable_kosten ?? "";
  } else if (task.type === "wareneinsatzquote") {
    fields[0].input.value = task.wareneinsatz ?? "";
    fields[1].input.value = task.umsatz ?? "";
  } else if (task.type === "warenrabatt") {
    fields[0].input.value = task.preis1 ?? "";
    fields[1].input.value = task.rabatt1 ?? "";
    fields[2].input.value = task.preis2 ?? "";
    fields[3].input.value = task.rabatt2 ?? "";
  } else if (task.type === "preisberechnung") {
    fields[0].input.value = task.stueckpreis ?? "";
    fields[1].input.value = task.menge1 ?? "";
    fields[2].input.value = task.rabatt1 ?? "";
    fields[3].input.value = task.menge2 ?? "";
    fields[4].input.value = task.rabatt2 ?? "";
  } else if (task.type === "bezugskalkulation") {
    fields[0].input.value = task.stueckpreis ?? "";
    fields[1].input.value = task.menge ?? "";
    fields[2].input.value = task.rabatt ?? "";
    fields[3].input.value = task.skonto ?? "";
    fields[4].input.value = task.bezugskosten ?? "";
  } else if (task.type === "verkaufskalkulation") {
    fields[0].input.value = task.listenpreis ?? "";
    fields[1].input.value = task.rabatt ?? "";
    fields[2].input.value = task.skonto ?? "";
    fields[3].input.value = task.bezugskosten ?? "";
    fields[4].input.value = task.handlungskosten ?? "";
    fields[5].input.value = task.gewinn ?? "";
    fields[6].input.value = task.mwst ?? "";
  } else if (task.type === "umweltschutz") {
    fields[0].input.value = task.rest_ml ?? "";
    fields[1].input.value = task.tuben_pro_tag ?? "";
    fields[2].input.value = task.arbeitstage_pro_monat ?? "";
  } else if (task.type === "marketing_vormonat") {
    fields[0].input.value = task.aktuelle_kunden ?? "";
    fields[1].input.value = task.steigerung ?? "";
  } else if (task.type === "marketing_umsatz") {
    fields[0].input.value = task.kunden ?? "";
    fields[1].input.value = task.umsatz_pro_kunde ?? "";
  }
}

// =====================
// AUFGABEN LADEN
// =====================
async function initTasks() {
  try {
    const response = await fetch("task_templates.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    TASK_DATA = data;

    const categories = Object.keys(data.exam_tasks || {});
    taskCategory.innerHTML = "";

    categories.forEach((key) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = formatCategoryName(key);
      taskCategory.appendChild(option);
    });

    if (categories.length > 0) {
      updateTaskList();
    }
  } catch (err) {
    console.error("Fehler beim Laden der Aufgaben:", err);
    taskMode.textContent = "Fehler";
    taskTitle.textContent = "Aufgaben konnten nicht geladen werden";
    taskDescription.textContent = String(err.message || err);
    taskPrompt.textContent = "Prüfe Pfad und JSON-Datei.";
  }
}

function updateTaskList() {
  const category = taskCategory.value;
  const tasks = TASK_DATA.exam_tasks?.[category] || [];

  taskSelect.innerHTML = "";

  tasks.forEach((task, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = task.title;
    taskSelect.appendChild(option);
  });

  showTask();
}

function showTask() {
  const task = getCurrentTask();

  if (!task) {
    taskMode.textContent = "Keine Aufgabe";
    taskTitle.textContent = "Noch keine Aufgabe gewählt";
    taskDescription.textContent = "Wähle oben eine Aufgabe aus.";
    taskPrompt.textContent = "Wähle eine Aufgabe aus, übernimm die Werte und rechne dann selbst.";
    taskSolution.classList.add("hidden");
    toggleSolutionBtn.textContent = "Musterlösung anzeigen";
    taskSolutionContent.textContent = "Noch keine Musterlösung geladen.";
    return;
  }

  taskMode.textContent = formatCategoryName(taskCategory.value);
  taskTitle.textContent = task.title || "Ohne Titel";
  taskDescription.textContent = task.description || "";
  taskPrompt.textContent = task.prompt || "";

  loadTaskIntoCalculator(task);

  taskSolution.classList.add("hidden");
  toggleSolutionBtn.textContent = "Musterlösung anzeigen";
  taskSolutionContent.textContent = "Noch keine Musterlösung geladen.";
}

// =====================
// RECHENLOGIK
// =====================
function solveMixing(strong, weak, target, totalMl = null) {
  if (weak > strong) {
    throw new Error("Die schwache Lösung darf nicht größer als die starke sein.");
  }
  if (!(weak <= target && target <= strong)) {
    throw new Error("Die Zielkonzentration muss zwischen starker und schwacher Lösung liegen.");
  }

  const diffStrong = strong - target;
  const diffWeak = target - weak;
  const [ratioStrong, ratioWeak] = normalizeRatio(diffWeak, diffStrong);

  const steps = [
    "Mischkreuz:",
    `Starke Lösung: ${strong}%`,
    `Schwache Lösung: ${weak}%`,
    `Zielkonzentration: ${target}%`,
    "",
    "1. Starke Lösung minus Ziel:",
    `   ${strong} - ${target} = ${diffStrong}`,
    "",
    "2. Ziel minus schwache Lösung:",
    `   ${target} - ${weak} = ${diffWeak}`,
    "",
    "3. Anteile zuordnen KREUZEN: Anteil stark = Ziel minus SCWACH - Anteil schwach = STARK minus Ziel",
    `   Anteil stark = ${diffWeak}`,
    `   Anteil schwach = ${diffStrong}`,
    "",
    "4. Verhältnis bilden:",
    `   ${diffWeak} : ${diffStrong} = ${ratioStrong} : ${ratioWeak}`
  ];

  if (totalMl == null) {
    return {
      fullOutput: [
        "ERGEBNIS:",
        `Verhältnis: ${ratioStrong} : ${ratioWeak}`,
        "",
        "--------------------------------",
        "",
        "RECHENWEG:",
        ...steps,
        "",
        "5. Keine Gesamtmenge angegeben.",
        "   Deshalb wird nur das Verhältnis berechnet."
      ].join("\n")
    };
  }

  const parts = ratioStrong + ratioWeak;
  const onePart = totalMl / parts;
  const strongMl = Number((onePart * ratioStrong).toFixed(1));
  const weakMl = Number((onePart * ratioWeak).toFixed(1));

  return {
    fullOutput: [
      "ERGEBNIS:",
      `Starke Lösung (${strong}%): ${strongMl.toFixed(1)} ml`,
      `Schwache Lösung (${weak}%): ${weakMl.toFixed(1)} ml`,
      `Verhältnis: ${ratioStrong} : ${ratioWeak}`,
      `Gesamtmenge: ${totalMl} ml`,
      "",
      "--------------------------------",
      "",
      "RECHENWEG:",
      ...steps,
      "",
      "5. Gesamtteile berechnen:",
      `   ${ratioStrong} + ${ratioWeak} = ${parts} Teile`,
      "",
      "6. Einen Teil berechnen:",
      `   ${totalMl} ml ÷ ${parts} = ${onePart.toFixed(2)} ml`,
      "",
      "7. Mengen berechnen:",
      `   Starke Lösung: ${ratioStrong} × ${onePart.toFixed(2)} = ${strongMl.toFixed(1)} ml`,
      `   Schwache Lösung: ${ratioWeak} × ${onePart.toFixed(2)} = ${weakMl.toFixed(1)} ml`,
      "",
      "8. Kontrolle:",
      `   ${strongMl.toFixed(1)} ml + ${weakMl.toFixed(1)} ml = ${(strongMl + weakMl).toFixed(1)} ml`
    ].join("\n")
  };
}

function solveConcentration(strongMl, strongPct, waterMl, extraMl) {
  const active = strongMl * strongPct / 100;
  const total = strongMl + waterMl + extraMl;
  const resultPct = active / total * 100;

  return {
    fullOutput: [
      "ERGEBNIS:",
      `Endkonzentration: ${resultPct.toFixed(2)} %`,
      "",
      "--------------------------------",
      "",
      "RECHENWEG:",
      "Gegeben:",
      `   Entwickler: ${strongMl} ml mit ${strongPct} %`,
      `   Wasser: ${waterMl} ml (0 %)`,
      `   Farbcreme: ${extraMl} ml (0 %)`,
      "",
      "1. Wirkstoffmenge im Entwickler berechnen:",
      `   ${strongMl} × ${strongPct} / 100 = ${active.toFixed(2)} ml`,
      "",
      "2. Gesamtmenge berechnen:",
      `   ${strongMl} + ${waterMl} + ${extraMl} = ${total} ml`,
      "",
      "3. Endkonzentration berechnen:",
      `   ${active.toFixed(2)} / ${total} × 100 = ${resultPct.toFixed(2)} %`
    ].join("\n")
  };
}

function solveDeckungsbeitrag(umsatz, variableKosten) {
  const db = umsatz - variableKosten;
  return {
    fullOutput: [
      "ERGEBNIS:",
      `Deckungsbeitrag: ${db.toFixed(2)} €`,
      "",
      "--------------------------------",
      "",
      "RECHENWEG:",
      "1. Formel:",
      "   Deckungsbeitrag = Umsatz - variable Kosten",
      "",
      "2. Werte einsetzen:",
      `   ${umsatz} - ${variableKosten} = ${db.toFixed(2)}`
    ].join("\n")
  };
}

function solveWareneinsatzquote(wareneinsatz, umsatz) {
  if (umsatz === 0) {
    throw new Error("Der Umsatz darf nicht 0 sein.");
  }

  const quote = wareneinsatz / umsatz * 100;
  return {
    fullOutput: [
      "ERGEBNIS:",
      `Wareneinsatzquote: ${quote.toFixed(2)} %`,
      "",
      "--------------------------------",
      "",
      "RECHENWEG:",
      "1. Formel:",
      "   Wareneinsatzquote = Wareneinsatz / Umsatz × 100",
      "",
      "2. Werte einsetzen:",
      `   ${wareneinsatz} / ${umsatz} × 100 = ${quote.toFixed(2)} %`
    ].join("\n")
  };
}

function solveWarenrabatt(preis1, rabatt1, preis2, rabatt2) {
  const rabattBetrag1 = preis1 * rabatt1 / 100;
  const rabattBetrag2 = preis2 * rabatt2 / 100;
  const zahlbetrag1 = preis1 - rabattBetrag1;
  const zahlbetrag2 = preis2 - rabattBetrag2;
  const gesamt = zahlbetrag1 + zahlbetrag2;

  return {
    fullOutput: [
      "ERGEBNIS:",
      `Zahlbetrag Artikel 1: ${zahlbetrag1.toFixed(2)} €`,
      `Zahlbetrag Artikel 2: ${zahlbetrag2.toFixed(2)} €`,
      `Gesamtbetrag: ${gesamt.toFixed(2)} €`,
      "",
      "--------------------------------",
      "",
      "RECHENWEG:",
      "1. Rabatt für Artikel 1 berechnen:",
      `   ${preis1} × ${rabatt1} / 100 = ${rabattBetrag1.toFixed(2)} €`,
      "",
      "2. Zahlbetrag Artikel 1:",
      `   ${preis1} - ${rabattBetrag1.toFixed(2)} = ${zahlbetrag1.toFixed(2)} €`,
      "",
      "3. Rabatt für Artikel 2 berechnen:",
      `   ${preis2} × ${rabatt2} / 100 = ${rabattBetrag2.toFixed(2)} €`,
      "",
      "4. Zahlbetrag Artikel 2:",
      `   ${preis2} - ${rabattBetrag2.toFixed(2)} = ${zahlbetrag2.toFixed(2)} €`,
      "",
      "5. Gesamtbetrag:",
      `   ${zahlbetrag1.toFixed(2)} + ${zahlbetrag2.toFixed(2)} = ${gesamt.toFixed(2)} €`
    ].join("\n")
  };
}

function solvePreisberechnung(stueckpreis, menge1, rabatt1, menge2, rabatt2) {
  const listenpreis1 = stueckpreis * menge1;
  const rabattBetrag1 = listenpreis1 * rabatt1 / 100;
  const endpreis1 = listenpreis1 - rabattBetrag1;

  const listenpreis2 = stueckpreis * menge2;
  const rabattBetrag2 = listenpreis2 * rabatt2 / 100;
  const endpreis2 = listenpreis2 - rabattBetrag2;

  return {
    fullOutput: [
      "ERGEBNIS:",
      `Fall 1 Gesamtpreis: ${endpreis1.toFixed(2)} €`,
      `Fall 2 Gesamtpreis: ${endpreis2.toFixed(2)} €`,
      "",
      "--------------------------------",
      "",
      "RECHENWEG:",
      "Fall 1:",
      `1. Listenpreis: ${stueckpreis} × ${menge1} = ${listenpreis1.toFixed(2)} €`,
      `2. Rabatt: ${listenpreis1.toFixed(2)} × ${rabatt1} / 100 = ${rabattBetrag1.toFixed(2)} €`,
      `3. Endpreis: ${listenpreis1.toFixed(2)} - ${rabattBetrag1.toFixed(2)} = ${endpreis1.toFixed(2)} €`,
      "",
      "Fall 2:",
      `1. Listenpreis: ${stueckpreis} × ${menge2} = ${listenpreis2.toFixed(2)} €`,
      `2. Rabatt: ${listenpreis2.toFixed(2)} × ${rabatt2} / 100 = ${rabattBetrag2.toFixed(2)} €`,
      `3. Endpreis: ${listenpreis2.toFixed(2)} - ${rabattBetrag2.toFixed(2)} = ${endpreis2.toFixed(2)} €`
    ].join("\n")
  };
}

function solveBezugskalkulation(stueckpreis, menge, rabatt, skonto, bezugskosten) {
  const listenpreis = stueckpreis * menge;
  const zieleinkaufspreis = listenpreis * (1 - rabatt / 100);
  const bareinkaufspreis = zieleinkaufspreis * (1 - skonto / 100);
  const bezugspreis = bareinkaufspreis + bezugskosten;
  const jeEinheit = bezugspreis / menge;

  return {
    fullOutput: [
      "ERGEBNIS:",
      `Gesamtbezugspreis: ${bezugspreis.toFixed(2)} €`,
      `Bezugspreis je Einheit: ${jeEinheit.toFixed(2)} €`,
      "",
      "--------------------------------",
      "",
      "RECHENWEG:",
      `1. Listenpreis: ${stueckpreis} × ${menge} = ${listenpreis.toFixed(2)} €`,
      `2. Zieleinkaufspreis: ${listenpreis.toFixed(2)} × (1 - ${rabatt}/100) = ${zieleinkaufspreis.toFixed(2)} €`,
      `3. Bareinkaufspreis: ${zieleinkaufspreis.toFixed(2)} × (1 - ${skonto}/100) = ${bareinkaufspreis.toFixed(2)} €`,
      `4. Bezugspreis: ${bareinkaufspreis.toFixed(2)} + ${bezugskosten} = ${bezugspreis.toFixed(2)} €`,
      `5. Bezugspreis je Einheit: ${bezugspreis.toFixed(2)} / ${menge} = ${jeEinheit.toFixed(2)} €`
    ].join("\n")
  };
}

function solveVerkaufskalkulation(listenpreis, rabatt, skonto, bezugskosten, handlungskosten, gewinn, mwst) {
  const zieleinkauf = listenpreis * (1 - rabatt / 100);
  const bareinkauf = zieleinkauf * (1 - skonto / 100);
  const einstandspreis = bareinkauf + bezugskosten;
  const selbstkosten = einstandspreis * (1 + handlungskosten / 100);
  const barverkaufspreis = selbstkosten * (1 + gewinn / 100);
  const bruttoverkaufspreis = barverkaufspreis * (1 + mwst / 100);

  return {
    fullOutput: [
      "ERGEBNIS:",
      `Bruttoverkaufspreis: ${bruttoverkaufspreis.toFixed(2)} €`,
      "",
      "--------------------------------",
      "",
      "RECHENWEG:",
      `1. Zieleinkaufspreis: ${listenpreis} × (1 - ${rabatt}/100) = ${zieleinkauf.toFixed(2)} €`,
      `2. Bareinkaufspreis: ${zieleinkauf.toFixed(2)} × (1 - ${skonto}/100) = ${bareinkauf.toFixed(2)} €`,
      `3. Einstandspreis: ${bareinkauf.toFixed(2)} + ${bezugskosten} = ${einstandspreis.toFixed(2)} €`,
      `4. Selbstkosten: ${einstandspreis.toFixed(2)} × (1 + ${handlungskosten}/100) = ${selbstkosten.toFixed(2)} €`,
      `5. Barverkaufspreis: ${selbstkosten.toFixed(2)} × (1 + ${gewinn}/100) = ${barverkaufspreis.toFixed(2)} €`,
      `6. Bruttoverkaufspreis: ${barverkaufspreis.toFixed(2)} × (1 + ${mwst}/100) = ${bruttoverkaufspreis.toFixed(2)} €`
    ].join("\n")
  };
}

function solveUmweltschutz(restMl, tubenProTag, arbeitstageProMonat) {
  const verlustProTag = restMl * tubenProTag;
  const verlustProMonat = verlustProTag * arbeitstageProMonat;
  const verlustProJahr = verlustProMonat * 12;

  return {
    fullOutput: [
      "ERGEBNIS:",
      `Farbverlust pro Tag: ${verlustProTag.toFixed(2)} ml`,
      `Farbverlust pro Monat: ${verlustProMonat.toFixed(2)} ml`,
      `Farbverlust pro Jahr: ${verlustProJahr.toFixed(2)} ml`,
      "",
      "--------------------------------",
      "",
      "RECHENWEG:",
      `1. Verlust pro Tag: ${restMl} × ${tubenProTag} = ${verlustProTag.toFixed(2)} ml`,
      `2. Verlust pro Monat: ${verlustProTag.toFixed(2)} × ${arbeitstageProMonat} = ${verlustProMonat.toFixed(2)} ml`,
      `3. Verlust pro Jahr: ${verlustProMonat.toFixed(2)} × 12 = ${verlustProJahr.toFixed(2)} ml`
    ].join("\n")
  };
}

function solveMarketingVormonat(aktuelleKunden, steigerung) {
  const vormonat = aktuelleKunden / (1 + steigerung / 100);

  return {
    fullOutput: [
      "ERGEBNIS:",
      `Kundenzahl im Vormonat: ${vormonat.toFixed(0)}`,
      "",
      "--------------------------------",
      "",
      "RECHENWEG:",
      `1. Formel: Vormonat = aktuelle Kunden / (1 + Steigerung/100)`,
      `2. Einsetzen: ${aktuelleKunden} / (1 + ${steigerung}/100) = ${vormonat.toFixed(2)}`,
      `3. Gerundet: ${vormonat.toFixed(0)}`
    ].join("\n")
  };
}

function solveMarketingUmsatz(kunden, umsatzProKunde) {
  const gesamtumsatz = kunden * umsatzProKunde;

  return {
    fullOutput: [
      "ERGEBNIS:",
      `Gesamtumsatz: ${gesamtumsatz.toFixed(2)} €`,
      "",
      "--------------------------------",
      "",
      "RECHENWEG:",
      `1. Formel: Gesamtumsatz = Kunden × Umsatz pro Kunde`,
      `2. Einsetzen: ${kunden} × ${umsatzProKunde} = ${gesamtumsatz.toFixed(2)} €`
    ].join("\n")
  };
}

// =====================
// BERECHNEN
// =====================
function calculate() {
  try {
    const mode = calcType.value;

    if (mode === "Mischungsrechner") {
      output.textContent = solveMixing(
        parseNum(fields[0].input.value),
        parseNum(fields[1].input.value),
        parseNum(fields[2].input.value),
        parseNum(fields[3].input.value)
      ).fullOutput;
    } else if (mode === "Verhältnis") {
      output.textContent = solveMixing(
        parseNum(fields[0].input.value),
        parseNum(fields[1].input.value),
        parseNum(fields[2].input.value),
        null
      ).fullOutput;
    } else if (mode === "Konzentration") {
      output.textContent = solveConcentration(
        parseNum(fields[0].input.value),
        parseNum(fields[1].input.value),
        parseNum(fields[2].input.value),
        parseNum(fields[3].input.value)
      ).fullOutput;
    } else if (mode === "Deckungsbeitrag") {
      output.textContent = solveDeckungsbeitrag(
        parseNum(fields[0].input.value),
        parseNum(fields[1].input.value)
      ).fullOutput;
    } else if (mode === "Wareneinsatzquote") {
      output.textContent = solveWareneinsatzquote(
        parseNum(fields[0].input.value),
        parseNum(fields[1].input.value)
      ).fullOutput;
    } else if (mode === "Warenrabatt") {
      output.textContent = solveWarenrabatt(
        parseNum(fields[0].input.value),
        parseNum(fields[1].input.value),
        parseNum(fields[2].input.value),
        parseNum(fields[3].input.value)
      ).fullOutput;
    } else if (mode === "Preisberechnung") {
      output.textContent = solvePreisberechnung(
        parseNum(fields[0].input.value),
        parseNum(fields[1].input.value),
        parseNum(fields[2].input.value),
        parseNum(fields[3].input.value),
        parseNum(fields[4].input.value)
      ).fullOutput;
    } else if (mode === "Bezugskalkulation") {
      output.textContent = solveBezugskalkulation(
        parseNum(fields[0].input.value),
        parseNum(fields[1].input.value),
        parseNum(fields[2].input.value),
        parseNum(fields[3].input.value),
        parseNum(fields[4].input.value)
      ).fullOutput;
    } else if (mode === "Verkaufskalkulation") {
      output.textContent = solveVerkaufskalkulation(
        parseNum(fields[0].input.value),
        parseNum(fields[1].input.value),
        parseNum(fields[2].input.value),
        parseNum(fields[3].input.value),
        parseNum(fields[4].input.value),
        parseNum(fields[5].input.value),
        parseNum(fields[6].input.value)
      ).fullOutput;
    } else if (mode === "Umweltschutz") {
      output.textContent = solveUmweltschutz(
        parseNum(fields[0].input.value),
        parseNum(fields[1].input.value),
        parseNum(fields[2].input.value)
      ).fullOutput;
    } else if (mode === "Marketing Vormonat") {
      output.textContent = solveMarketingVormonat(
        parseNum(fields[0].input.value),
        parseNum(fields[1].input.value)
      ).fullOutput;
    } else if (mode === "Marketing Umsatz") {
      output.textContent = solveMarketingUmsatz(
        parseNum(fields[0].input.value),
        parseNum(fields[1].input.value)
      ).fullOutput;
    }
  } catch (err) {
    output.textContent = `FEHLER:\n${err.message}`;
  }
}

// =====================
// MUSTERLÖSUNG
// =====================
function generateSolution() {
  const task = getCurrentTask();

  if (!task) {
    taskSolutionContent.textContent = "Noch keine Musterlösung geladen.";
    return;
  }

  try {
    if (task.type === "mixing") {
      taskSolutionContent.textContent = solveMixing(
        task.high,
        task.low,
        task.target,
        task.total_ml != null ? task.total_ml : null
      ).fullOutput;
    } else if (task.type === "concentration") {
      taskSolutionContent.textContent = solveConcentration(
        task.strong_ml,
        task.strong_pct,
        task.water_ml,
        task.extra_ml
      ).fullOutput;
    } else if (task.type === "deckungsbeitrag") {
      taskSolutionContent.textContent = solveDeckungsbeitrag(
        task.umsatz,
        task.variable_kosten
      ).fullOutput;
    } else if (task.type === "wareneinsatzquote") {
      taskSolutionContent.textContent = solveWareneinsatzquote(
        task.wareneinsatz,
        task.umsatz
      ).fullOutput;
    } else if (task.type === "warenrabatt") {
      taskSolutionContent.textContent = solveWarenrabatt(
        task.preis1,
        task.rabatt1,
        task.preis2,
        task.rabatt2
      ).fullOutput;
    } else if (task.type === "preisberechnung") {
      taskSolutionContent.textContent = solvePreisberechnung(
        task.stueckpreis,
        task.menge1,
        task.rabatt1,
        task.menge2,
        task.rabatt2
      ).fullOutput;
    } else if (task.type === "bezugskalkulation") {
      taskSolutionContent.textContent = solveBezugskalkulation(
        task.stueckpreis,
        task.menge,
        task.rabatt,
        task.skonto,
        task.bezugskosten
      ).fullOutput;
    } else if (task.type === "verkaufskalkulation") {
      taskSolutionContent.textContent = solveVerkaufskalkulation(
        task.listenpreis,
        task.rabatt,
        task.skonto,
        task.bezugskosten,
        task.handlungskosten,
        task.gewinn,
        task.mwst
      ).fullOutput;
    } else if (task.type === "umweltschutz") {
      taskSolutionContent.textContent = solveUmweltschutz(
        task.rest_ml,
        task.tuben_pro_tag,
        task.arbeitstage_pro_monat
      ).fullOutput;
    } else if (task.type === "marketing_vormonat") {
      taskSolutionContent.textContent = solveMarketingVormonat(
        task.aktuelle_kunden,
        task.steigerung
      ).fullOutput;
    } else if (task.type === "marketing_umsatz") {
      taskSolutionContent.textContent = solveMarketingUmsatz(
        task.kunden,
        task.umsatz_pro_kunde
      ).fullOutput;
    } else {
      taskSolutionContent.textContent = "Für diese Aufgabe ist noch keine Musterlösung hinterlegt.";
    }
  } catch (err) {
    taskSolutionContent.textContent = `FEHLER:\n${err.message}`;
  }
}

// =====================
// BEISPIELE
// =====================
function loadExample() {
  applyMode(calcType.value);

  if (calcType.value === "Mischungsrechner") {
    fields[0].input.value = "12";
    fields[1].input.value = "4";
    fields[2].input.value = "6";
    fields[3].input.value = "40";
  } else if (calcType.value === "Verhältnis") {
    fields[0].input.value = "12";
    fields[1].input.value = "3";
    fields[2].input.value = "6";
  } else if (calcType.value === "Konzentration") {
    fields[0].input.value = "40";
    fields[1].input.value = "12";
    fields[2].input.value = "20";
    fields[3].input.value = "60";
  } else if (calcType.value === "Deckungsbeitrag") {
    fields[0].input.value = "20";
    fields[1].input.value = "6";
  } else if (calcType.value === "Wareneinsatzquote") {
    fields[0].input.value = "6";
    fields[1].input.value = "20";
  } else if (calcType.value === "Warenrabatt") {
    fields[0].input.value = "110";
    fields[1].input.value = "18";
    fields[2].input.value = "9.8";
    fields[3].input.value = "7";
  } else if (calcType.value === "Preisberechnung") {
    fields[0].input.value = "7.5";
    fields[1].input.value = "50";
    fields[2].input.value = "3";
    fields[3].input.value = "100";
    fields[4].input.value = "10";
  } else if (calcType.value === "Bezugskalkulation") {
    fields[0].input.value = "2.1";
    fields[1].input.value = "50";
    fields[2].input.value = "3";
    fields[3].input.value = "2";
    fields[4].input.value = "7.5";
  } else if (calcType.value === "Verkaufskalkulation") {
    fields[0].input.value = "5.8";
    fields[1].input.value = "8.5";
    fields[2].input.value = "3";
    fields[3].input.value = "4.7";
    fields[4].input.value = "30";
    fields[5].input.value = "35";
    fields[6].input.value = "19";
  } else if (calcType.value === "Umweltschutz") {
    fields[0].input.value = "8";
    fields[1].input.value = "5";
    fields[2].input.value = "20";
  } else if (calcType.value === "Marketing Vormonat") {
    fields[0].input.value = "876";
    fields[1].input.value = "20";
  } else if (calcType.value === "Marketing Umsatz") {
    fields[0].input.value = "876";
    fields[1].input.value = "29.5";
  }
}

// =====================
// EVENTS
// =====================
calcType.addEventListener("change", () => applyMode(calcType.value));
taskCategory.addEventListener("change", updateTaskList);
taskSelect.addEventListener("change", showTask);

loadTaskBtn.addEventListener("click", () => {
  const task = getCurrentTask();
  loadTaskIntoCalculator(task);
});

toggleSolutionBtn.addEventListener("click", () => {
  const isHidden = taskSolution.classList.contains("hidden");
  taskSolution.classList.toggle("hidden");

  if (isHidden) {
    generateSolution();
    toggleSolutionBtn.textContent = "Musterlösung verbergen";
  } else {
    toggleSolutionBtn.textContent = "Musterlösung anzeigen";
  }
});

exampleBtn.addEventListener("click", loadExample);

clearBtn.addEventListener("click", () => {
  applyMode(calcType.value);
});

calcBtn.addEventListener("click", calculate);

// =====================
// START
// =====================
initCalcTypes();
applyMode("Mischungsrechner");
initTasks();
