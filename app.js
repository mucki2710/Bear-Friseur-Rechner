const MODES = {
  "Mischungsrechner": {
    labels: ["Starke Lösung (%)", "Schwache Lösung (%)", "Zielkonzentration (%)", "Gesamtmenge (ml)"],
    hints: ["z. B. 12", "z. B. 4", "z. B. 6", "z. B. 40"],
    enabled: [true, true, true, true],
  },
  "Verhältnis": {
    labels: ["Starke Lösung (%)", "Schwache Lösung (%)", "Zielkonzentration (%)", "Nicht benötigt"],
    hints: ["z. B. 12", "z. B. 3", "z. B. 6", ""],
    enabled: [true, true, true, false],
  },
  "Konzentration": {
    labels: ["Menge Entwickler (ml)", "Konzentration (%)", "Wasser (ml)", "Farbcreme (ml)"],
    hints: ["z. B. 40", "z. B. 12", "z. B. 20", "z. B. 60"],
    enabled: [true, true, true, true],
  },
  "Deckungsbeitrag": {
    labels: ["Umsatz (€)", "Variable Kosten (€)", "Nicht benötigt", "Nicht benötigt"],
    hints: ["z. B. 20", "z. B. 6", "", ""],
    enabled: [true, true, false, false],
  },
  "Wareneinsatzquote": {
    labels: ["Wareneinsatz (€)", "Umsatz (€)", "Nicht benötigt", "Nicht benötigt"],
    hints: ["z. B. 6", "z. B. 20", "", ""],
    enabled: [true, true, false, false],
  },
};

const TASK_CATEGORY_CONFIG = {
  mixing: { label: "Mischung", mode: "Mischungsrechner" },
  concentration: { label: "Konzentration", mode: "Konzentration" },
};

const els = {
  calcType: document.getElementById("calcType"),
  exampleBtn: document.getElementById("exampleBtn"),
  clearBtn: document.getElementById("clearBtn"),
  calcBtn: document.getElementById("calcBtn"),
  output: document.getElementById("output"),
  labels: [1, 2, 3, 4].map((n) => document.getElementById(`label${n}`)),
  inputs: [1, 2, 3, 4].map((n) => document.getElementById(`input${n}`)),
  taskCategory: document.getElementById("taskCategory"),
  taskSelect: document.getElementById("taskSelect"),
  taskMode: document.getElementById("taskMode"),
  taskTitle: document.getElementById("taskTitle"),
  taskDescription: document.getElementById("taskDescription"),
  taskPrompt: document.getElementById("taskPrompt"),
  loadTaskBtn: document.getElementById("loadTaskBtn"),
  toggleSolutionBtn: document.getElementById("toggleSolutionBtn"),
  taskSolution: document.getElementById("taskSolution"),
  taskSolutionContent: document.getElementById("taskSolutionContent"),
};

let templates = {
  mixing_examples: [],
  business_examples: [],
  concentration_examples: [],
  exam_tasks: { mixing: [], concentration: [] },
};

for (const mode of Object.keys(MODES)) {
  const option = document.createElement("option");
  option.value = mode;
  option.textContent = mode;
  els.calcType.appendChild(option);
}

for (const [key, config] of Object.entries(TASK_CATEGORY_CONFIG)) {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = config.label;
  els.taskCategory.appendChild(option);
}

function parseNum(value, required = true) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!normalized) {
    if (required) throw new Error("Bitte alle benötigten Felder ausfüllen.");
    return null;
  }
  const num = Number(normalized);
  if (!Number.isFinite(num)) {
    throw new Error("Bitte nur gültige Zahlen eingeben.");
  }
  return num;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

function normalizeRatio(a, b) {
  const scale = 10;
  const aa = Math.round(a * scale);
  const bb = Math.round(b * scale);
  const divisor = aa && bb ? gcd(aa, bb) : Math.max(aa, bb, 1);
  return [aa / divisor, bb / divisor];
}

function formatTaskAsPrompt(task) {
  return task.prompt || "Übernimm die Werte in den Rechner, rechne zuerst selbst und blende die Musterlösung erst danach ein.";
}

function solveMixing(strong, weak, target, totalMl) {
  if (weak > strong) throw new Error("Die schwache Lösung darf nicht größer als die starke sein.");
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
    "3. Anteile zuordnen:",
    `   Anteil stark (Ziel minus SCHWACH) = ${diffWeak}`,
    `   Anteil schwach (STARK minus Ziel) = ${diffStrong}`,
    "",
    "4. Verhältnis bilden:",
    `   ${diffWeak} : ${diffStrong} = ${ratioStrong} : ${ratioWeak}`,
  ];

  if (totalMl == null) {
    steps.push("", "5. Keine Gesamtmenge angegeben.", "   Deshalb wird nur das Verhältnis berechnet.");
    return {
      result: `Verhältnis: ${ratioStrong} : ${ratioWeak}`,
      steps: steps.join("\n"),
    };
  }

  const parts = ratioStrong + ratioWeak;
  const onePart = totalMl / parts;
  const strongMl = Math.round(onePart * ratioStrong * 10) / 10;
  const weakMl = Math.round(onePart * ratioWeak * 10) / 10;

  steps.push(
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
  );

  return {
    result:
      `Starke Lösung (${strong}%): ${strongMl.toFixed(1)} ml\n` +
      `Schwache Lösung (${weak}%): ${weakMl.toFixed(1)} ml\n` +
      `Verhältnis: ${ratioStrong} : ${ratioWeak}\n` +
      `Gesamtmenge: ${totalMl} ml`,
    steps: steps.join("\n"),
  };
}

function solveFinalConcentration(strongMl, strongPct, waterMl, extraMl) {
  const active = (strongMl * strongPct) / 100;
  const total = strongMl + waterMl + extraMl;
  const resultPct = (active / total) * 100;

  return {
    result: `Endkonzentration: ${resultPct.toFixed(2)} %`,
    steps: [
      "Gegeben:",
      `   Entwickler: ${strongMl} ml mit ${strongPct} %`,
      `   Wasser: ${waterMl} ml (0 %)`,
      `   Farbcreme: ${extraMl} ml (0 %)`,
      "",
      "1. Wirkstoffmenge im Entwickler berechnen:",
      `   ${strongPct}% von ${strongMl} ml`,
      `   = ${strongMl} × ${strongPct} / 100`,
      `   = ${active.toFixed(2)} ml Wirkstoff`,
      "",
      "2. Gesamtmenge berechnen:",
      `   ${strongMl} + ${waterMl} + ${extraMl}`,
      `   = ${total} ml`,
      "",
      "3. Endkonzentration berechnen:",
      `   ${active.toFixed(2)} / ${total} × 100`,
      `   = ${resultPct.toFixed(2)} %`,
      "",
      "4. Ergebnis:",
      `   Die Mischung hat eine Konzentration von ${resultPct.toFixed(2)} %`,
    ].join("\n"),
  };
}

function solveDeckungsbeitrag(umsatz, variableKosten) {
  const db = umsatz - variableKosten;
  return {
    result: `Deckungsbeitrag: ${db} €`,
    steps: [
      "1. Formel:",
      "   Deckungsbeitrag = Umsatz - variable Kosten",
      "",
      "2. Werte einsetzen:",
      `   ${umsatz} - ${variableKosten}`,
      "",
      "3. Ergebnis:",
      `   Deckungsbeitrag = ${db} €`,
    ].join("\n"),
  };
}

function solveWareneinsatzquote(wareneinsatz, umsatz) {
  if (umsatz === 0) throw new Error("Der Umsatz darf nicht 0 sein.");
  const quote = (wareneinsatz / umsatz) * 100;
  return {
    result: `Wareneinsatzquote: ${quote.toFixed(2)} %`,
    steps: [
      "1. Formel:",
      "   Wareneinsatzquote = Wareneinsatz / Umsatz × 100",
      "",
      "2. Werte einsetzen:",
      `   ${wareneinsatz} / ${umsatz} × 100`,
      "",
      "3. Ergebnis:",
      `   Wareneinsatzquote = ${quote.toFixed(2)} %`,
    ].join("\n"),
  };
}

function updateMode(mode) {
  const config = MODES[mode];
  config.labels.forEach((text, i) => {
    els.labels[i].textContent = text;
    els.inputs[i].placeholder = config.hints[i];
    els.inputs[i].disabled = !config.enabled[i];
    if (!config.enabled[i]) els.inputs[i].value = "";
  });
}

function clearInputs() {
  els.inputs.forEach((input) => {
    input.value = "";
  });
  els.output.textContent = "Noch keine Berechnung.";
}

function getTaskGroups() {
  return templates.exam_tasks || { mixing: [], concentration: [] };
}

function getCurrentTaskList() {
  const category = els.taskCategory.value || "mixing";
  return getTaskGroups()[category] || [];
}

function getSelectedTask() {
  const taskList = getCurrentTaskList();
  const index = Number(els.taskSelect.value || 0);
  return taskList[index] || null;
}

function renderTaskSelect() {
  const category = els.taskCategory.value || "mixing";
  const taskList = getTaskGroups()[category] || [];
  els.taskSelect.innerHTML = "";

  taskList.forEach((task, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = task.title;
    els.taskSelect.appendChild(option);
  });

  if (!taskList.length) {
    const option = document.createElement("option");
    option.value = "0";
    option.textContent = "Keine Aufgaben vorhanden";
    els.taskSelect.appendChild(option);
  }

  renderTaskDetails();
}

function renderTaskDetails() {
  const category = els.taskCategory.value || "mixing";
  const task = getSelectedTask();
  const categoryConfig = TASK_CATEGORY_CONFIG[category];

  els.taskSolution.classList.add("hidden");
  els.toggleSolutionBtn.textContent = "Musterlösung anzeigen";

  if (!task) {
    els.taskMode.textContent = categoryConfig.label;
    els.taskTitle.textContent = "Noch keine Aufgabe gewählt";
    els.taskDescription.textContent = "Für diesen Bereich ist noch keine Aufgabe hinterlegt.";
    els.taskPrompt.textContent = "Wähle eine Aufgabe aus, übernimm die Werte und rechne dann selbst.";
    els.taskSolutionContent.textContent = "Noch keine Musterlösung geladen.";
    return;
  }

  els.taskMode.textContent = categoryConfig.label;
  els.taskTitle.textContent = task.title;
  els.taskDescription.textContent = task.description;
  els.taskPrompt.textContent = formatTaskAsPrompt(task);
  els.taskSolutionContent.textContent = task.solutionText || "Noch keine Musterlösung vorhanden.";
}

function applyTaskToInputs(task) {
  if (!task) return;

  const categoryConfig = TASK_CATEGORY_CONFIG[task.type];
  if (!categoryConfig) return;

  els.calcType.value = categoryConfig.mode;
  updateMode(categoryConfig.mode);
  clearInputs();

  if (task.type === "mixing") {
    els.inputs[0].value = task.high ?? "";
    els.inputs[1].value = task.low ?? "";
    els.inputs[2].value = task.target ?? "";
    els.inputs[3].value = task.total_ml ?? "";
  } else if (task.type === "concentration") {
    els.inputs[0].value = task.strong_ml ?? "";
    els.inputs[1].value = task.strong_pct ?? "";
    els.inputs[2].value = task.water_ml ?? "";
    els.inputs[3].value = task.extra_ml ?? "";
  }

  els.output.textContent = "Werte aus der Aufgabe übernommen. Rechne jetzt selbst und vergleiche danach mit der Musterlösung.";
}

function loadExample() {
  const mode = els.calcType.value;

  if (mode === "Mischungsrechner") {
    const item = templates.mixing_examples[0] || { high: 12, low: 2, target: 6, total_ml: 40 };
    els.inputs[0].value = item.high ?? "";
    els.inputs[1].value = item.low ?? "";
    els.inputs[2].value = item.target ?? "";
    els.inputs[3].value = item.total_ml ?? "";
  } else if (mode === "Verhältnis") {
    const item = templates.mixing_examples[1] || { high: 12, low: 3, target: 6 };
    els.inputs[0].value = item.high ?? "";
    els.inputs[1].value = item.low ?? "";
    els.inputs[2].value = item.target ?? "";
    els.inputs[3].value = "";
  } else if (mode === "Konzentration") {
    const item = templates.concentration_examples[0] || { strong_ml: 40, strong_pct: 12, water_ml: 20, extra_ml: 60 };
    els.inputs[0].value = item.strong_ml ?? "";
    els.inputs[1].value = item.strong_pct ?? "";
    els.inputs[2].value = item.water_ml ?? "";
    els.inputs[3].value = item.extra_ml ?? "";
  } else if (mode === "Deckungsbeitrag") {
    const item = templates.business_examples[0] || { umsatz: 20, variable_kosten: 6 };
    els.inputs[0].value = item.umsatz ?? "";
    els.inputs[1].value = item.variable_kosten ?? "";
    els.inputs[2].value = "";
    els.inputs[3].value = "";
  } else if (mode === "Wareneinsatzquote") {
    const item = templates.business_examples[1] || { wareneinsatz: 6, umsatz: 20 };
    els.inputs[0].value = item.wareneinsatz ?? "";
    els.inputs[1].value = item.umsatz ?? "";
    els.inputs[2].value = "";
    els.inputs[3].value = "";
  }
}

function calculate() {
  try {
    const mode = els.calcType.value;
    let solved;

    if (mode === "Mischungsrechner") {
      const strong = parseNum(els.inputs[0].value);
      const weak = parseNum(els.inputs[1].value);
      const target = parseNum(els.inputs[2].value);
      const total = parseNum(els.inputs[3].value, false);
      solved = solveMixing(strong, weak, target, total);
    } else if (mode === "Verhältnis") {
      const strong = parseNum(els.inputs[0].value);
      const weak = parseNum(els.inputs[1].value);
      const target = parseNum(els.inputs[2].value);
      solved = solveMixing(strong, weak, target, null);
    } else if (mode === "Konzentration") {
      solved = solveFinalConcentration(
        parseNum(els.inputs[0].value),
        parseNum(els.inputs[1].value),
        parseNum(els.inputs[2].value),
        parseNum(els.inputs[3].value)
      );
    } else if (mode === "Deckungsbeitrag") {
      solved = solveDeckungsbeitrag(parseNum(els.inputs[0].value), parseNum(els.inputs[1].value));
    } else if (mode === "Wareneinsatzquote") {
      solved = solveWareneinsatzquote(parseNum(els.inputs[0].value), parseNum(els.inputs[1].value));
    } else {
      throw new Error(`Unbekannter Modus: ${mode}`);
    }

    els.output.textContent = `ERGEBNIS:\n${solved.result}\n\n--------------------------------\n\nRECHENWEG:\n${solved.steps}`;
  } catch (error) {
    els.output.textContent = `FEHLER:\n${error.message}`;
  }
}

function toggleSolution() {
  const hidden = els.taskSolution.classList.toggle("hidden");
  els.toggleSolutionBtn.textContent = hidden ? "Musterlösung anzeigen" : "Musterlösung verbergen";
}

function buildSolutionTextForTask(task) {
  try {
    if (task.type === "mixing") {
      const solved = solveMixing(task.high, task.low, task.target, task.total_ml ?? null);
      return `ERGEBNIS:\n${solved.result}\n\n--------------------------------\n\nRECHENWEG:\n${solved.steps}`;
    }

    if (task.type === "concentration") {
      const solved = solveFinalConcentration(task.strong_ml, task.strong_pct, task.water_ml, task.extra_ml);
      return `ERGEBNIS:\n${solved.result}\n\n--------------------------------\n\nRECHENWEG:\n${solved.steps}`;
    }
  } catch (error) {
    return `FEHLER IN DER MUSTERLÖSUNG:\n${error.message}`;
  }

  return "Noch keine Musterlösung vorhanden.";
}

async function loadTemplates() {
  try {
    const response = await fetch("task_templates.json", { cache: "no-store" });
    if (!response.ok) return;
    templates = await response.json();
  } catch (_err) {
    // Fallback bleibt aktiv.
  }

  const groups = getTaskGroups();
  for (const [type, list] of Object.entries(groups)) {
    groups[type] = (list || []).map((task) => ({
      ...task,
      solutionText: task.solutionText || buildSolutionTextForTask(task),
    }));
  }
}

els.calcType.addEventListener("change", (event) => updateMode(event.target.value));
els.exampleBtn.addEventListener("click", loadExample);
els.clearBtn.addEventListener("click", clearInputs);
els.calcBtn.addEventListener("click", calculate);
els.taskCategory.addEventListener("change", renderTaskSelect);
els.taskSelect.addEventListener("change", renderTaskDetails);
els.loadTaskBtn.addEventListener("click", () => applyTaskToInputs(getSelectedTask()));
els.toggleSolutionBtn.addEventListener("click", toggleSolution);

(async function init() {
  await loadTemplates();
  els.calcType.value = "Mischungsrechner";
  updateMode("Mischungsrechner");
  els.taskCategory.value = "mixing";
  renderTaskSelect();
})();
