// =====================
// DOM
// =====================
const taskCategory = document.getElementById("taskCategory");
const taskSelect = document.getElementById("taskSelect");
const taskMode = document.getElementById("taskMode");
const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const taskPrompt = document.getElementById("taskPrompt");

const manualModeBtn = document.getElementById("manualModeBtn");
const stepModeBtn = document.getElementById("stepModeBtn");
const showSolutionBtn = document.getElementById("showSolutionBtn");
const statusInfo = document.getElementById("statusInfo");

const manualPanel = document.getElementById("manualPanel");
const stepPanel = document.getElementById("stepPanel");
const solutionPanel = document.getElementById("solutionPanel");

const checkManualBtn = document.getElementById("checkManualBtn");
const clearManualBtn = document.getElementById("clearManualBtn");
const manualFeedback = document.getElementById("manualFeedback");

const stepCounter = document.getElementById("stepCounter");
const stepQuestion = document.getElementById("stepQuestion");
const stepHint = document.getElementById("stepHint");
const stepInput = document.getElementById("stepInput");
const checkStepBtn = document.getElementById("checkStepBtn");
const showHintBtn = document.getElementById("showHintBtn");
const nextStepBtn = document.getElementById("nextStepBtn");
const stepFeedback = document.getElementById("stepFeedback");

const solutionOutput = document.getElementById("solutionOutput");

const fields = Array.from({ length: 8 }, (_, i) => ({
  wrapper: document.getElementById(`field${i + 1}`),
  label: document.getElementById(`label${i + 1}`),
  input: document.getElementById(`input${i + 1}`)
})).filter(field => field.wrapper || field.label || field.input);

const manualOperatorBar = manualPanel?.querySelector('.operator-bar[data-target="active-manual"]');

// =====================
// STATE
// =====================
let TASK_DATA = { exam_tasks: {} };
let currentWorkMode = "manual";
let currentSteps = [];
let currentStepIndex = 0;
let hintVisible = false;
let activePathInput = null;

// =====================
// HELPERS
// =====================
function parseNum(value) {
  let normalized = String(value ?? "")
    .trim()
    .replace(/,/g, ".")
    .replace(/×/g, "*")
    .replace(/÷/g, "/");

  if (!normalized) {
    throw new Error("Bitte eine Eingabe machen.");
  }

  if (!/^[0-9+\-*/().:%\s]+$/.test(normalized)) {
    throw new Error("Ungültige Eingabe.");
  }

  if (normalized.includes(":")) {
    throw new Error("Bitte keinen Doppelpunkt verwenden.");
  }

  // 🔥 Prozent-Funktion aktivieren
  // Beispiel: 20% → (20/100)
  normalized = normalized.replace(/(\d+(\.\d+)?)%/g, "($1/100)");

  let result;
  try {
    result = Function(`"use strict"; return (${normalized})`)();
  } catch {
    throw new Error("Ungültiger Rechenausdruck.");
  }

  if (typeof result !== "number" || !isFinite(result)) {
    throw new Error("Ungültiger Rechenausdruck.");
  }

  return result;
}

function nearlyEqual(a, b, tolerance = 0.1) {
  return Math.abs(a - b) <= tolerance;
}

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

function normalizeRatio(a, b) {
  const scale = 100;
  const aa = Math.round(a * scale);
  const bb = Math.round(b * scale);
  const g = aa && bb ? gcd(aa, bb) : Math.max(aa, bb, 1);
  return [aa / g, bb / g];
}

function formatNumber(value, digits = 2) {
  if (Number.isInteger(value)) return String(value);
  return Number(value).toFixed(digits).replace(/\.?0+$/, "");
}

function formatCategoryName(key) {
  const map = {
    anteile: "Anteile",
    mixing: "Mischung",
    concentration: "Konzentration",
    prozent: "Prozent",
    deckungsbeitrag: "Deckungsbeitrag",
    wareneinsatzquote: "Wareneinsatzquote",
    warenrabatt: "Warenrabatt",
    preisberechnung: "Preisberechnung",
    bezugskalkulation: "Bezugskalkulation",
    verkaufskalkulation: "Verkaufskalkulation",
    umweltschutz: "Umweltschutz",
    marketing: "Marketing",
    kalkulation: "Kalkulation"
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

function resetAllPanels() {
  manualPanel.classList.add("hidden");
  stepPanel.classList.add("hidden");
  solutionPanel.classList.add("hidden");
}

function getSolvedStepCount() {
  return currentSteps.filter(step => step.solved).length;
}

function updateProgressInfo() {
  if (!currentSteps.length) {
    statusInfo.textContent = "ℹ Keine Schritte geladen.";
    return;
  }

  const solved = getSolvedStepCount();
  const total = currentSteps.length;

  if (currentWorkMode === "manual") {
    statusInfo.textContent = `ℹ Rechenweg eingeben • Fortschritt: ${solved} / ${total} Schritte`;
    return;
  }

  if (currentWorkMode === "step") {
    const current = Math.min(currentStepIndex + 1, total);
    statusInfo.textContent = `ℹ Einzelschritt-Fokus • Schritt ${current} / ${total}`;
    return;
  }

  if (currentWorkMode === "solution") {
    statusInfo.textContent = `ℹ Musterlösung • ${total} Rechenschritte`;
  }
}

function setPathOperatorBarVisibility(visible) {
  if (!manualOperatorBar) return;
  manualOperatorBar.classList.toggle("hidden", !visible);
}

function setWorkMode(mode) {
  currentWorkMode = mode;
  resetAllPanels();

  if (mode === "manual") {
    manualPanel.classList.remove("hidden");
    setPathOperatorBarVisibility(true);
  } else if (mode === "step") {
    stepPanel.classList.remove("hidden");
    setPathOperatorBarVisibility(false);
  } else if (mode === "solution") {
    solutionPanel.classList.remove("hidden");
    setPathOperatorBarVisibility(false);
  }

  updateProgressInfo();
}

function insertAtCursor(input, text) {
  if (!input) return;

  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const oldValue = input.value;

  input.value = oldValue.slice(0, start) + text + oldValue.slice(end);

  const newPos = start + text.length;
  input.focus();
  input.setSelectionRange(newPos, newPos);

  const idx = Number(input.dataset.stepIndex);
  if (!Number.isNaN(idx) && currentSteps[idx]) {
    currentSteps[idx].userInput = input.value;
  }
}

function setupOperatorBars() {
  document.querySelectorAll(".operator-bar").forEach((bar) => {
    const target = bar.dataset.target;

    bar.querySelectorAll(".op-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (target === "stepInput") {
          insertAtCursor(stepInput, btn.textContent);
        } else if (target === "active-manual") {
          insertAtCursor(activePathInput, btn.textContent);
        }
      });
    });
  });
}

// =====================
// STEP DEFINITIONS
// =====================
function buildSteps(task) {
  if (!task) return [];

  if (task.type === "anteile") {
    const totalParts = task.part1 + task.part2;
    const onePart = task.total_ml / totalParts;

    return [
      {
        label: "Teile addieren",
        question: "Wie viele Teile insgesamt?",
        prompt: "Addiere die Verhältnis-Zahlen.",
        placeholder: `${task.part1}+${task.part2}`,
        expected: totalParts,
        hint: `${task.part1} + ${task.part2}`,
        resultText: `${formatNumber(totalParts)} Teile`
      },
      {
        label: "1 Teil berechnen",
        question: "Wie viel ml entspricht 1 Teil?",
        prompt: "Teile die Gesamtmenge durch die Gesamtteile.",
        placeholder: `${task.total_ml}/${totalParts}`,
        expected: onePart,
        hint: `${task.total_ml} / ${totalParts}`,
        resultText: `${formatNumber(onePart)} ml`
      },
      {
        label: `${task.part1} Teile berechnen`,
        question: `Wie viel ml sind ${task.part1} Teile?`,
        prompt: "Multipliziere die Teilezahl mit dem Wert eines Teils.",
        placeholder: `${task.part1}×${formatNumber(onePart)}`,
        expected: onePart * task.part1,
        hint: `${task.part1} × ${formatNumber(onePart)}`,
        resultText: `${formatNumber(onePart * task.part1)} ml`
      },
      {
        label: `${task.part2} Teile berechnen`,
        question: `Wie viel ml sind ${task.part2} Teile?`,
        prompt: "Multipliziere die Teilezahl mit dem Wert eines Teils.",
        placeholder: `${task.part2}×${formatNumber(onePart)}`,
        expected: onePart * task.part2,
        hint: `${task.part2} × ${formatNumber(onePart)}`,
        resultText: `${formatNumber(onePart * task.part2)} ml`
      }
    ];
  }

  if (task.type === "mixing") {
    const diffStrong = task.high - task.target;
    const diffWeak = task.target - task.low;
    const totalParts = diffStrong + diffWeak;
    const onePart = task.total_ml / totalParts;
    const strongMl = onePart * diffWeak;
    const weakMl = onePart * diffStrong;

    return [
      {
        label: "Starke Lösung minus Ziel",
        question: "Wie viel ist starke Lösung minus Zielkonzentration?",
        prompt: "Berechne zuerst die obere Differenz im Mischkreuz.",
        placeholder: `${task.high}-${task.target}`,
        expected: diffStrong,
        hint: `${task.high} - ${task.target}`,
        resultText: formatNumber(diffStrong)
      },
      {
        label: "Ziel minus schwache Lösung",
        question: "Wie viel ist Zielkonzentration minus schwache Lösung?",
        prompt: "Berechne jetzt die untere Differenz im Mischkreuz.",
        placeholder: `${task.target}-${task.low}`,
        expected: diffWeak,
        hint: `${task.target} - ${task.low}`,
        resultText: formatNumber(diffWeak)
      },
      {
        label: "Anteil starke Lösung",
        question: "Wie groß ist der Anteil der starken Lösung?",
        prompt: "Der Anteil der starken Lösung entspricht der gegenüberliegenden Differenz.",
        placeholder: `${diffWeak}`,
        expected: diffWeak,
        hint: `Anteil stark = ${diffWeak}`,
        resultText: formatNumber(diffWeak)
      },
      {
        label: "Anteil schwache Lösung",
        question: "Wie groß ist der Anteil der schwachen Lösung?",
        prompt: "Der Anteil der schwachen Lösung entspricht der gegenüberliegenden Differenz.",
        placeholder: `${diffStrong}`,
        expected: diffStrong,
        hint: `Anteil schwach = ${diffStrong}`,
        resultText: formatNumber(diffStrong)
      },
      {
        label: "Gesamtteile",
        question: "Wie viele Teile insgesamt?",
        prompt: "Addiere beide Anteile.",
        placeholder: `${diffWeak}+${diffStrong}`,
        expected: totalParts,
        hint: `${diffWeak} + ${diffStrong}`,
        resultText: formatNumber(totalParts)
      },
      {
        label: "1 Teil in ml",
        question: "Wie viel ml entspricht 1 Teil?",
        prompt: "Teile die Gesamtmenge durch die Gesamtteile.",
        placeholder: `${task.total_ml}/${totalParts}`,
        expected: onePart,
        hint: `${task.total_ml} / ${totalParts}`,
        resultText: `${formatNumber(onePart)} ml`
      },
      {
        label: "Starke Lösung in ml",
        question: "Wie viel ml starke Lösung werden benötigt?",
        prompt: "Anteil starke Lösung × Wert eines Teils.",
        placeholder: `${diffWeak}×${formatNumber(onePart)}`,
        expected: strongMl,
        hint: `${diffWeak} × ${formatNumber(onePart)}`,
        resultText: `${formatNumber(strongMl)} ml`
      },
      {
        label: "Schwache Lösung in ml",
        question: "Wie viel ml schwache Lösung werden benötigt?",
        prompt: "Anteil schwache Lösung × Wert eines Teils.",
        placeholder: `${diffStrong}×${formatNumber(onePart)}`,
        expected: weakMl,
        hint: `${diffStrong} × ${formatNumber(onePart)}`,
        resultText: `${formatNumber(weakMl)} ml`
      }
    ];
  }

  if (task.type === "ratio") {
    const diffStrong = task.high - task.target;
    const diffWeak = task.target - task.low;
    const [ratioStrong, ratioWeak] = normalizeRatio(diffWeak, diffStrong);

    return [
      {
        label: "Starke Lösung minus Ziel",
        question: "Wie viel ist starke Lösung minus Zielkonzentration?",
        prompt: "Berechne zuerst die obere Differenz.",
        placeholder: `${task.high}-${task.target}`,
        expected: diffStrong,
        hint: `${task.high} - ${task.target}`,
        resultText: formatNumber(diffStrong)
      },
      {
        label: "Ziel minus schwache Lösung",
        question: "Wie viel ist Zielkonzentration minus schwache Lösung?",
        prompt: "Berechne danach die untere Differenz.",
        placeholder: `${task.target}-${task.low}`,
        expected: diffWeak,
        hint: `${task.target} - ${task.low}`,
        resultText: formatNumber(diffWeak)
      },
      {
        label: "Verhältnis stark",
        question: "Wie groß ist das gekürzte Verhältnis für die starke Lösung?",
        prompt: "Kürze das Verhältnis der Anteile.",
        placeholder: `${ratioStrong}`,
        expected: ratioStrong,
        hint: `stark = ${ratioStrong}`,
        resultText: formatNumber(ratioStrong)
      },
      {
        label: "Verhältnis schwach",
        question: "Wie groß ist das gekürzte Verhältnis für die schwache Lösung?",
        prompt: "Kürze das Verhältnis der Anteile.",
        placeholder: `${ratioWeak}`,
        expected: ratioWeak,
        hint: `schwach = ${ratioWeak}`,
        resultText: formatNumber(ratioWeak)
      }
    ];
  }

  if (task.type === "concentration") {
    const active = task.strong_ml * task.strong_pct / 100;
    const total = task.strong_ml + task.water_ml + task.extra_ml;
    const resultPct = (active / total) * 100;

    return [
      {
        label: "Wirkstoffmenge",
        question: "Wie viel ml Wirkstoff sind im Entwickler enthalten?",
        prompt: "Berechne zuerst die Wirkstoffmenge im Entwickler.",
        placeholder: `${task.strong_ml}×${task.strong_pct}/100`,
        expected: active,
        hint: `${task.strong_ml} × ${task.strong_pct} / 100`,
        resultText: `${formatNumber(active)} ml`
      },
      {
        label: "Gesamtmenge",
        question: "Wie groß ist die Gesamtmenge in ml?",
        prompt: "Addiere Entwickler, Wasser und Zusatzmenge.",
        placeholder: `${task.strong_ml}+${task.water_ml}+${task.extra_ml}`,
        expected: total,
        hint: `${task.strong_ml} + ${task.water_ml} + ${task.extra_ml}`,
        resultText: `${formatNumber(total)} ml`
      },
      {
        label: "Endkonzentration",
        question: "Wie hoch ist die Endkonzentration in %?",
        prompt: "Wirkstoffmenge / Gesamtmenge × 100.",
        placeholder: `${formatNumber(active)}/${total}×100`,
        expected: resultPct,
        hint: `${formatNumber(active)} / ${total} × 100`,
        resultText: `${formatNumber(resultPct)} %`
      }
    ];
  }

  if (task.type === "prozent_anteil") {
  const anteilMl = task.gesamt_ml * task.prozent / 100;

  return [
    {
      label: "Prozent von der Gesamtmenge berechnen",
      question: "Wie viel ml sind die angegebenen Prozent von der Gesamtmenge?",
      prompt: "Gesucht ist eine Menge in ml. Rechne: Gesamtmenge × Prozent / 100.",
      placeholder: `${task.gesamt_ml}×${task.prozent}/100`,
      expected: anteilMl,
      hint: `${task.gesamt_ml} × ${task.prozent} / 100`,
      resultText: `${formatNumber(anteilMl)} ml`
    },
    {
      label: "Ergebnis in ml angeben",
      question: "Wie lautet das Ergebnis in ml?",
      prompt: "Notiere die berechnete Wirkstoffmenge.",
      placeholder: `${formatNumber(anteilMl)}`,
      expected: anteilMl,
      hint: `Ergebnis = ${formatNumber(anteilMl)} ml`,
      resultText: `${formatNumber(anteilMl)} ml`
    }
  ];
}

  if (task.type === "prozent_konzentration") {
  const prozent = (task.anteil_ml / task.gesamt_ml) * 100;

  return [
    {
      label: "Konzentration berechnen",
      question: "Wie viel Prozent sind Anteil von der Gesamtmenge?",
      prompt: "Gesucht ist ein Prozentsatz. Rechne: Anteil / Gesamtmenge × 100.",
      placeholder: `${task.anteil_ml}/${task.gesamt_ml}×100`,
      expected: prozent,
      hint: `${task.anteil_ml} / ${task.gesamt_ml} × 100`,
      resultText: `${formatNumber(prozent)} %`
    },
    {
      label: "Ergebnis in % angeben",
      question: "Wie lautet das Ergebnis in Prozent?",
      prompt: "Notiere die berechnete Konzentration.",
      placeholder: `${formatNumber(prozent)}`,
      expected: prozent,
      hint: `Ergebnis = ${formatNumber(prozent)} %`,
      resultText: `${formatNumber(prozent)} %`
    }
  ];
}
    if (task.type === "deckungsbeitrag") {
    const deckungsbeitrag = task.umsatz - task.variable_kosten;

    return [
      {
        label: "Variable Kosten vom Umsatz abziehen",
        question: "Wie berechnet man den Deckungsbeitrag?",
        prompt: "Nutze die Formel: Deckungsbeitrag = Umsatz - variable Kosten.",
        placeholder: `${task.umsatz}-${task.variable_kosten}`,
        expected: deckungsbeitrag,
        hint: `${task.umsatz} - ${task.variable_kosten}`,
        resultText: `${formatNumber(deckungsbeitrag)} €`
      },
      {
        label: "Ergebnis in Euro angeben",
        question: "Wie hoch ist der Deckungsbeitrag in Euro?",
        prompt: "Notiere das Ergebnis in €.",
        placeholder: `${formatNumber(deckungsbeitrag)}`,
        expected: deckungsbeitrag,
        hint: `Ergebnis = ${formatNumber(deckungsbeitrag)} €`,
        resultText: `${formatNumber(deckungsbeitrag)} €`
      }
    ];
  }

  if (task.type === "wareneinsatzquote") {
    const quote = (task.wareneinsatz / task.umsatz) * 100;

    return [
      {
        label: "Wareneinsatzquote berechnen",
        question: "Wie viel Prozent des Umsatzes sind Wareneinsatz?",
        prompt: "Rechne: Wareneinsatz / Umsatz × 100.",
        placeholder: `${task.wareneinsatz}/${task.umsatz}×100`,
        expected: quote,
        hint: `${task.wareneinsatz} / ${task.umsatz} × 100`,
        resultText: `${formatNumber(quote)} %`
      },
      {
        label: "Ergebnis in Prozent angeben",
        question: "Wie hoch ist die Wareneinsatzquote?",
        prompt: "Notiere das Ergebnis in %.",
        placeholder: `${formatNumber(quote)}`,
        expected: quote,
        hint: `Ergebnis = ${formatNumber(quote)} %`,
        resultText: `${formatNumber(quote)} %`
      }
    ];
  }

  if (task.type === "warenrabatt") {
    const rabattBetrag1 = task.preis1 * task.rabatt1 / 100;
    const zahlbetrag1 = task.preis1 - rabattBetrag1;
    const rabattBetrag2 = task.preis2 * task.rabatt2 / 100;
    const zahlbetrag2 = task.preis2 - rabattBetrag2;
    const gesamt = zahlbetrag1 + zahlbetrag2;

    return [
      {
        label: "Rabattbetrag Artikel 1",
        question: "Wie hoch ist der Rabattbetrag für Artikel 1?",
        prompt: "Preis × Rabatt / 100.",
        placeholder: `${task.preis1}×${task.rabatt1}/100`,
        expected: rabattBetrag1,
        hint: `${task.preis1} × ${task.rabatt1} / 100`,
        resultText: `${formatNumber(rabattBetrag1)} €`
      },
      {
        label: "Zahlbetrag Artikel 1",
        question: "Wie hoch ist der Zahlbetrag für Artikel 1?",
        prompt: "Preis - Rabattbetrag.",
        placeholder: `${task.preis1}-${formatNumber(rabattBetrag1)}`,
        expected: zahlbetrag1,
        hint: `${task.preis1} - ${formatNumber(rabattBetrag1)}`,
        resultText: `${formatNumber(zahlbetrag1)} €`
      },
      {
        label: "Rabattbetrag Artikel 2",
        question: "Wie hoch ist der Rabattbetrag für Artikel 2?",
        prompt: "Preis × Rabatt / 100.",
        placeholder: `${task.preis2}×${task.rabatt2}/100`,
        expected: rabattBetrag2,
        hint: `${task.preis2} × ${task.rabatt2} / 100`,
        resultText: `${formatNumber(rabattBetrag2)} €`
      },
      {
        label: "Zahlbetrag Artikel 2",
        question: "Wie hoch ist der Zahlbetrag für Artikel 2?",
        prompt: "Preis - Rabattbetrag.",
        placeholder: `${task.preis2}-${formatNumber(rabattBetrag2)}`,
        expected: zahlbetrag2,
        hint: `${task.preis2} - ${formatNumber(rabattBetrag2)}`,
        resultText: `${formatNumber(zahlbetrag2)} €`
      },
      {
        label: "Gesamtbetrag",
        question: "Wie hoch ist der gesamte Zahlbetrag?",
        prompt: "Addiere beide Zahlbeträge.",
        placeholder: `${formatNumber(zahlbetrag1)}+${formatNumber(zahlbetrag2)}`,
        expected: gesamt,
        hint: `${formatNumber(zahlbetrag1)} + ${formatNumber(zahlbetrag2)}`,
        resultText: `${formatNumber(gesamt)} €`
      }
    ];
  }

  if (task.type === "preisberechnung") {
    const gesamt1 = task.stueckpreis * task.menge1;
    const rabattBetrag1 = gesamt1 * task.rabatt1 / 100;
    const zahlbetrag1 = gesamt1 - rabattBetrag1;
    const stueckpreisNeu1 = zahlbetrag1 / task.menge1;

    const gesamt2 = task.stueckpreis * task.menge2;
    const rabattBetrag2 = gesamt2 * task.rabatt2 / 100;
    const zahlbetrag2 = gesamt2 - rabattBetrag2;
    const stueckpreisNeu2 = zahlbetrag2 / task.menge2;

    return [
      {
        label: "Gesamtpreis bei Menge 1",
        question: "Wie hoch ist der Gesamtpreis für Menge 1 ohne Rabatt?",
        prompt: "Stückpreis × Menge 1.",
        placeholder: `${task.stueckpreis}×${task.menge1}`,
        expected: gesamt1,
        hint: `${task.stueckpreis} × ${task.menge1}`,
        resultText: `${formatNumber(gesamt1)} €`
      },
      {
        label: "Rabattbetrag bei Menge 1",
        question: "Wie hoch ist der Rabattbetrag bei Menge 1?",
        prompt: "Gesamtpreis × Rabatt / 100.",
        placeholder: `${formatNumber(gesamt1)}×${task.rabatt1}/100`,
        expected: rabattBetrag1,
        hint: `${formatNumber(gesamt1)} × ${task.rabatt1} / 100`,
        resultText: `${formatNumber(rabattBetrag1)} €`
      },
      {
        label: "Zahlbetrag bei Menge 1",
        question: "Wie hoch ist der Zahlbetrag bei Menge 1?",
        prompt: "Gesamtpreis - Rabattbetrag.",
        placeholder: `${formatNumber(gesamt1)}-${formatNumber(rabattBetrag1)}`,
        expected: zahlbetrag1,
        hint: `${formatNumber(gesamt1)} - ${formatNumber(rabattBetrag1)}`,
        resultText: `${formatNumber(zahlbetrag1)} €`
      },
      {
        label: "Stückpreis bei Menge 1",
        question: "Wie hoch ist der Stückpreis bei Menge 1?",
        prompt: "Zahlbetrag / Menge 1.",
        placeholder: `${formatNumber(zahlbetrag1)}/${task.menge1}`,
        expected: stueckpreisNeu1,
        hint: `${formatNumber(zahlbetrag1)} / ${task.menge1}`,
        resultText: `${formatNumber(stueckpreisNeu1)} €`
      },
      {
        label: "Gesamtpreis bei Menge 2",
        question: "Wie hoch ist der Gesamtpreis für Menge 2 ohne Rabatt?",
        prompt: "Stückpreis × Menge 2.",
        placeholder: `${task.stueckpreis}×${task.menge2}`,
        expected: gesamt2,
        hint: `${task.stueckpreis} × ${task.menge2}`,
        resultText: `${formatNumber(gesamt2)} €`
      },
      {
        label: "Rabattbetrag bei Menge 2",
        question: "Wie hoch ist der Rabattbetrag bei Menge 2?",
        prompt: "Gesamtpreis × Rabatt / 100.",
        placeholder: `${formatNumber(gesamt2)}×${task.rabatt2}/100`,
        expected: rabattBetrag2,
        hint: `${formatNumber(gesamt2)} × ${task.rabatt2} / 100`,
        resultText: `${formatNumber(rabattBetrag2)} €`
      },
      {
        label: "Zahlbetrag bei Menge 2",
        question: "Wie hoch ist der Zahlbetrag bei Menge 2?",
        prompt: "Gesamtpreis - Rabattbetrag.",
        placeholder: `${formatNumber(gesamt2)}-${formatNumber(rabattBetrag2)}`,
        expected: zahlbetrag2,
        hint: `${formatNumber(gesamt2)} - ${formatNumber(rabattBetrag2)}`,
        resultText: `${formatNumber(zahlbetrag2)} €`
      },
      {
        label: "Stückpreis bei Menge 2",
        question: "Wie hoch ist der Stückpreis bei Menge 2?",
        prompt: "Zahlbetrag / Menge 2.",
        placeholder: `${formatNumber(zahlbetrag2)}/${task.menge2}`,
        expected: stueckpreisNeu2,
        hint: `${formatNumber(zahlbetrag2)} / ${task.menge2}`,
        resultText: `${formatNumber(stueckpreisNeu2)} €`
      }
    ];
  }

  if (task.type === "bezugskalkulation") {
    const listenpreisGesamt = task.stueckpreis * task.menge;
    const rabattBetrag = listenpreisGesamt * task.rabatt / 100;
    const zielEinkaufspreis = listenpreisGesamt - rabattBetrag;
    const skontoBetrag = zielEinkaufspreis * task.skonto / 100;
    const bareinkaufspreis = zielEinkaufspreis - skontoBetrag;
    const bezugspreisGesamt = bareinkaufspreis + task.bezugskosten;
    const bezugspreisProStueck = bezugspreisGesamt / task.menge;

    return [
      {
        label: "Listeneinkaufspreis gesamt",
        question: "Wie hoch ist der gesamte Listeneinkaufspreis?",
        prompt: "Stückpreis × Menge.",
        placeholder: `${task.stueckpreis}×${task.menge}`,
        expected: listenpreisGesamt,
        hint: `${task.stueckpreis} × ${task.menge}`,
        resultText: `${formatNumber(listenpreisGesamt)} €`
      },
      {
        label: "Rabattbetrag",
        question: "Wie hoch ist der Rabattbetrag?",
        prompt: "Listeneinkaufspreis × Rabatt / 100.",
        placeholder: `${formatNumber(listenpreisGesamt)}×${task.rabatt}/100`,
        expected: rabattBetrag,
        hint: `${formatNumber(listenpreisGesamt)} × ${task.rabatt} / 100`,
        resultText: `${formatNumber(rabattBetrag)} €`
      },
      {
        label: "Zieleinkaufspreis",
        question: "Wie hoch ist der Zieleinkaufspreis?",
        prompt: "Listeneinkaufspreis - Rabattbetrag.",
        placeholder: `${formatNumber(listenpreisGesamt)}-${formatNumber(rabattBetrag)}`,
        expected: zielEinkaufspreis,
        hint: `${formatNumber(listenpreisGesamt)} - ${formatNumber(rabattBetrag)}`,
        resultText: `${formatNumber(zielEinkaufspreis)} €`
      },
      {
        label: "Skontobetrag",
        question: "Wie hoch ist der Skontobetrag?",
        prompt: "Zieleinkaufspreis × Skonto / 100.",
        placeholder: `${formatNumber(zielEinkaufspreis)}×${task.skonto}/100`,
        expected: skontoBetrag,
        hint: `${formatNumber(zielEinkaufspreis)} × ${task.skonto} / 100`,
        resultText: `${formatNumber(skontoBetrag)} €`
      },
      {
        label: "Bareinkaufspreis",
        question: "Wie hoch ist der Bareinkaufspreis?",
        prompt: "Zieleinkaufspreis - Skontobetrag.",
        placeholder: `${formatNumber(zielEinkaufspreis)}-${formatNumber(skontoBetrag)}`,
        expected: bareinkaufspreis,
        hint: `${formatNumber(zielEinkaufspreis)} - ${formatNumber(skontoBetrag)}`,
        resultText: `${formatNumber(bareinkaufspreis)} €`
      },
      {
        label: "Bezugspreis gesamt",
        question: "Wie hoch ist der gesamte Bezugspreis?",
        prompt: "Bareinkaufspreis + Bezugskosten.",
        placeholder: `${formatNumber(bareinkaufspreis)}+${task.bezugskosten}`,
        expected: bezugspreisGesamt,
        hint: `${formatNumber(bareinkaufspreis)} + ${task.bezugskosten}`,
        resultText: `${formatNumber(bezugspreisGesamt)} €`
      },
      {
        label: "Bezugspreis pro Stück",
        question: "Wie hoch ist der Bezugspreis je Stück?",
        prompt: "Bezugspreis gesamt / Menge.",
        placeholder: `${formatNumber(bezugspreisGesamt)}/${task.menge}`,
        expected: bezugspreisProStueck,
        hint: `${formatNumber(bezugspreisGesamt)} / ${task.menge}`,
        resultText: `${formatNumber(bezugspreisProStueck)} €`
      }
    ];
  }

  if (task.type === "verkaufskalkulation") {
    const rabattBetrag = task.listenpreis * task.rabatt / 100;
    const zielEinkaufspreis = task.listenpreis - rabattBetrag;
    const skontoBetrag = zielEinkaufspreis * task.skonto / 100;
    const bareinkaufspreis = zielEinkaufspreis - skontoBetrag;
    const bezugspreis = bareinkaufspreis + task.bezugskosten;
    const handlungskostenBetrag = bezugspreis * task.handlungskosten / 100;
    const selbstkosten = bezugspreis + handlungskostenBetrag;
    const gewinnBetrag = selbstkosten * task.gewinn / 100;
    const nettoverkaufspreis = selbstkosten + gewinnBetrag;
    const mwstBetrag = nettoverkaufspreis * task.mwst / 100;
    const bruttoverkaufspreis = nettoverkaufspreis + mwstBetrag;

    return [
      {
        label: "Rabattbetrag",
        question: "Wie hoch ist der Rabattbetrag?",
        prompt: "Listenpreis × Rabatt / 100.",
        placeholder: `${task.listenpreis}×${task.rabatt}/100`,
        expected: rabattBetrag,
        hint: `${task.listenpreis} × ${task.rabatt} / 100`,
        resultText: `${formatNumber(rabattBetrag)} €`
      },
      {
        label: "Zieleinkaufspreis",
        question: "Wie hoch ist der Zieleinkaufspreis?",
        prompt: "Listenpreis - Rabattbetrag.",
        placeholder: `${task.listenpreis}-${formatNumber(rabattBetrag)}`,
        expected: zielEinkaufspreis,
        hint: `${task.listenpreis} - ${formatNumber(rabattBetrag)}`,
        resultText: `${formatNumber(zielEinkaufspreis)} €`
      },
      {
        label: "Skontobetrag",
        question: "Wie hoch ist der Skontobetrag?",
        prompt: "Zieleinkaufspreis × Skonto / 100.",
        placeholder: `${formatNumber(zielEinkaufspreis)}×${task.skonto}/100`,
        expected: skontoBetrag,
        hint: `${formatNumber(zielEinkaufspreis)} × ${task.skonto} / 100`,
        resultText: `${formatNumber(skontoBetrag)} €`
      },
      {
        label: "Bareinkaufspreis",
        question: "Wie hoch ist der Bareinkaufspreis?",
        prompt: "Zieleinkaufspreis - Skontobetrag.",
        placeholder: `${formatNumber(zielEinkaufspreis)}-${formatNumber(skontoBetrag)}`,
        expected: bareinkaufspreis,
        hint: `${formatNumber(zielEinkaufspreis)} - ${formatNumber(skontoBetrag)}`,
        resultText: `${formatNumber(bareinkaufspreis)} €`
      },
      {
        label: "Bezugspreis",
        question: "Wie hoch ist der Bezugspreis?",
        prompt: "Bareinkaufspreis + Bezugskosten.",
        placeholder: `${formatNumber(bareinkaufspreis)}+${task.bezugskosten}`,
        expected: bezugspreis,
        hint: `${formatNumber(bareinkaufspreis)} + ${task.bezugskosten}`,
        resultText: `${formatNumber(bezugspreis)} €`
      },
      {
        label: "Handlungskosten",
        question: "Wie hoch sind die Handlungskosten?",
        prompt: "Bezugspreis × Handlungskosten / 100.",
        placeholder: `${formatNumber(bezugspreis)}×${task.handlungskosten}/100`,
        expected: handlungskostenBetrag,
        hint: `${formatNumber(bezugspreis)} × ${task.handlungskosten} / 100`,
        resultText: `${formatNumber(handlungskostenBetrag)} €`
      },
      {
        label: "Selbstkosten",
        question: "Wie hoch sind die Selbstkosten?",
        prompt: "Bezugspreis + Handlungskosten.",
        placeholder: `${formatNumber(bezugspreis)}+${formatNumber(handlungskostenBetrag)}`,
        expected: selbstkosten,
        hint: `${formatNumber(bezugspreis)} + ${formatNumber(handlungskostenBetrag)}`,
        resultText: `${formatNumber(selbstkosten)} €`
      },
      {
        label: "Gewinn",
        question: "Wie hoch ist der Gewinn?",
        prompt: "Selbstkosten × Gewinn / 100.",
        placeholder: `${formatNumber(selbstkosten)}×${task.gewinn}/100`,
        expected: gewinnBetrag,
        hint: `${formatNumber(selbstkosten)} × ${task.gewinn} / 100`,
        resultText: `${formatNumber(gewinnBetrag)} €`
      },
      {
        label: "Nettoverkaufspreis",
        question: "Wie hoch ist der Nettoverkaufspreis?",
        prompt: "Selbstkosten + Gewinn.",
        placeholder: `${formatNumber(selbstkosten)}+${formatNumber(gewinnBetrag)}`,
        expected: nettoverkaufspreis,
        hint: `${formatNumber(selbstkosten)} + ${formatNumber(gewinnBetrag)}`,
        resultText: `${formatNumber(nettoverkaufspreis)} €`
      },
      {
        label: "Mehrwertsteuer",
        question: "Wie hoch ist die Mehrwertsteuer?",
        prompt: "Nettoverkaufspreis × MwSt / 100.",
        placeholder: `${formatNumber(nettoverkaufspreis)}×${task.mwst}/100`,
        expected: mwstBetrag,
        hint: `${formatNumber(nettoverkaufspreis)} × ${task.mwst} / 100`,
        resultText: `${formatNumber(mwstBetrag)} €`
      },
      {
        label: "Bruttoverkaufspreis",
        question: "Wie hoch ist der Bruttoverkaufspreis?",
        prompt: "Nettoverkaufspreis + Mehrwertsteuer.",
        placeholder: `${formatNumber(nettoverkaufspreis)}+${formatNumber(mwstBetrag)}`,
        expected: bruttoverkaufspreis,
        hint: `${formatNumber(nettoverkaufspreis)} + ${formatNumber(mwstBetrag)}`,
        resultText: `${formatNumber(bruttoverkaufspreis)} €`
      }
    ];
  }

  if (task.type === "umweltschutz") {
    const proTag = task.rest_ml * task.tuben_pro_tag;
    const proMonat = proTag * task.arbeitstage_pro_monat;
    const proJahr = proMonat * 12;

    return [
      {
        label: "Farbverlust pro Tag",
        question: "Wie groß ist der Farbverlust pro Tag?",
        prompt: "Restmenge pro Tube × Tuben pro Tag.",
        placeholder: `${task.rest_ml}×${task.tuben_pro_tag}`,
        expected: proTag,
        hint: `${task.rest_ml} × ${task.tuben_pro_tag}`,
        resultText: `${formatNumber(proTag)} ml`
      },
      {
        label: "Farbverlust pro Monat",
        question: "Wie groß ist der Farbverlust pro Monat?",
        prompt: "Tagesverlust × Arbeitstage pro Monat.",
        placeholder: `${formatNumber(proTag)}×${task.arbeitstage_pro_monat}`,
        expected: proMonat,
        hint: `${formatNumber(proTag)} × ${task.arbeitstage_pro_monat}`,
        resultText: `${formatNumber(proMonat)} ml`
      },
      {
        label: "Farbverlust pro Jahr",
        question: "Wie groß ist der Farbverlust pro Jahr?",
        prompt: "Monatsverlust × 12.",
        placeholder: `${formatNumber(proMonat)}×12`,
        expected: proJahr,
        hint: `${formatNumber(proMonat)} × 12`,
        resultText: `${formatNumber(proJahr)} ml`
      }
    ];
  }

  if (task.type === "marketing_vormonat") {
    const vormonat = task.aktuelle_kunden / (1 + task.steigerung / 100);

    return [
      {
        label: "100 % + Steigerung",
        question: "Wie viel Prozent entspricht der aktuelle Monat?",
        prompt: "Addiere 100 % und die Steigerung.",
        placeholder: `100+${task.steigerung}`,
        expected: 100 + task.steigerung,
        hint: `100 + ${task.steigerung}`,
        resultText: `${formatNumber(100 + task.steigerung)} %`
      },
      {
        label: "Vormonat berechnen",
        question: "Wie viele Kunden hatte der Vormonat?",
        prompt: "Aktuelle Kundenzahl / 120 × 100 oder direkt / 1,2.",
        placeholder: `${task.aktuelle_kunden}/${1 + task.steigerung / 100}`,
        expected: vormonat,
        hint: `${task.aktuelle_kunden} / ${formatNumber(1 + task.steigerung / 100)}`,
        resultText: `${formatNumber(vormonat)} Kunden`
      }
    ];
  }

  if (task.type === "marketing_umsatz") {
    const gesamtumsatz = task.kunden * task.umsatz_pro_kunde;

    return [
      {
        label: "Gesamtumsatz berechnen",
        question: "Wie hoch ist der Gesamtumsatz?",
        prompt: "Kundenzahl × Umsatz pro Kunde.",
        placeholder: `${task.kunden}×${task.umsatz_pro_kunde}`,
        expected: gesamtumsatz,
        hint: `${task.kunden} × ${task.umsatz_pro_kunde}`,
        resultText: `${formatNumber(gesamtumsatz)} €`
      },
      {
        label: "Ergebnis angeben",
        question: "Wie lautet der Gesamtumsatz in Euro?",
        prompt: "Notiere das Ergebnis in €.",
        placeholder: `${formatNumber(gesamtumsatz)}`,
        expected: gesamtumsatz,
        hint: `Ergebnis = ${formatNumber(gesamtumsatz)} €`,
        resultText: `${formatNumber(gesamtumsatz)} €`
      }
    ];
  }
  return [];
}

function initializeCurrentSteps(task) {
  currentSteps = buildSteps(task).map((step, index) => ({
    ...step,
    unlocked: index === 0,
    solved: false,
    hintVisible: false,
    userInput: "",
    feedback: ""
  }));
}

function getSmartErrorFeedback(task, stepIndex, inputValue) {
  if (!task || typeof inputValue !== "number") {
    return `❌ Noch nicht richtig. Dein Ergebnis ist ${formatNumber(inputValue)}.`;
  }

  if (task.type === "anteile") {
    const totalParts = task.part1 + task.part2;
    const onePart = task.total_ml / totalParts;

    if (stepIndex === 0) return `❌ Addiere nur die Verhältnis-Zahlen ${task.part1} und ${task.part2}.`;
    if (stepIndex === 1) return `❌ Für 1 Teil rechnest du ${task.total_ml} / ${totalParts}.`;
    if (stepIndex === 2) return `❌ Rechne ${task.part1} × ${formatNumber(onePart)}.`;
    if (stepIndex === 3) return `❌ Rechne ${task.part2} × ${formatNumber(onePart)}.`;
  }

  if (task.type === "mixing") {
    if (stepIndex === 0) return `❌ Oben im Mischkreuz rechnest du starke Lösung minus Zielkonzentration.`;
    if (stepIndex === 1) return `❌ Unten im Mischkreuz rechnest du Zielkonzentration minus schwache Lösung.`;
    if (stepIndex === 2 || stepIndex === 3) return `❌ Die Anteile werden aus den gegenüberliegenden Differenzen übernommen.`;
    if (stepIndex === 4) return `❌ Addiere beide Anteile zu den Gesamtteilen.`;
    if (stepIndex === 5) return `❌ Teile die Gesamtmenge durch die Gesamtteile.`;
    if (stepIndex === 6 || stepIndex === 7) return `❌ Jetzt musst du den Anteil mit dem ml-Wert eines Teils multiplizieren.`;
  }

  if (task.type === "concentration") {
    if (stepIndex === 0) return `❌ Berechne zuerst nur die Wirkstoffmenge: ml × Prozent / 100.`;
    if (stepIndex === 1) return `❌ Zur Gesamtmenge gehören Entwickler, Wasser und Farbcreme.`;
    if (stepIndex === 2) return `❌ Endkonzentration = Wirkstoffmenge / Gesamtmenge × 100.`;
  }

  if (task.type === "prozent_anteil") {
    return `❌ Hier ist eine Menge in ml gesucht. Rechne Gesamtmenge × Prozent / 100.`;
  }

  if (task.type === "prozent_konzentration") {
    return `❌ Hier ist ein Prozentsatz gesucht. Rechne Anteil / Gesamtmenge × 100.`;
  }

    if (task.type === "deckungsbeitrag") {
    return `❌ Nutze: Umsatz - variable Kosten.`;
  }

  if (task.type === "wareneinsatzquote") {
    return `❌ Nutze: Wareneinsatz / Umsatz × 100.`;
  }

  if (task.type === "warenrabatt") {
    return `❌ Rechne zuerst den Rabattbetrag, dann den Zahlbetrag und am Ende die Summe.`;
  }

  if (task.type === "preisberechnung") {
    return `❌ Rechne je Menge: Gesamtpreis → Rabattbetrag → Zahlbetrag → Stückpreis.`;
  }

  if (task.type === "bezugskalkulation") {
    return `❌ Reihenfolge: Listenpreis → Rabatt → Zieleinkaufspreis → Skonto → Bareinkaufspreis → Bezugskosten.`;
  }

  if (task.type === "verkaufskalkulation") {
    return `❌ Arbeite Schritt für Schritt: Rabatt → Skonto → Bezugspreis → Handlungskosten → Selbstkosten → Gewinn → MwSt.`;
  }

  if (task.type === "umweltschutz") {
    return `❌ Rechne zuerst pro Tag, dann pro Monat, dann pro Jahr.`;
  }

  if (task.type === "marketing_vormonat") {
    return `❌ Der aktuelle Monat entspricht 100 % + Steigerung. Rechne dann rückwärts.`;
  }

  if (task.type === "marketing_umsatz") {
    return `❌ Nutze: Kundenzahl × Umsatz pro Kunde.`;
  }
  return `❌ Noch nicht richtig. Dein Ergebnis ist ${formatNumber(inputValue)}.`;
}

// =====================
// RECHENWEG-MODUS
// =====================
function ensurePathContainer() {
  let pathContainer = document.getElementById("pathSteps");
  if (!pathContainer) {
    pathContainer = document.createElement("div");
    pathContainer.id = "pathSteps";
    pathContainer.className = "path-steps";
    manualFeedback.parentNode.insertBefore(pathContainer, manualFeedback);
  }
  return pathContainer;
}

function clearClassicManualFields() {
  fields.forEach((field) => {
    if (field.wrapper) field.wrapper.classList.add("hidden");
    if (field.label) field.label.textContent = "";
    if (field.input) {
      field.input.value = "";
      field.input.placeholder = "";
    }
  });

  if (checkManualBtn) checkManualBtn.classList.add("hidden");
}

function renderPathSteps() {
  const task = getCurrentTask();
  if (!task) return;

  clearClassicManualFields();
  const pathContainer = ensurePathContainer();
  pathContainer.innerHTML = "";

  currentSteps.forEach((step, index) => {
    const card = document.createElement("div");
    card.className = `step-card ${step.solved ? "solved-step" : ""} ${!step.unlocked ? "locked-step" : ""}`;
    card.style.marginBottom = "12px";

    const feedbackText = step.feedback
      ? `<div class="path-feedback" style="margin-top:8px;">${step.feedback}</div>`
      : `<div class="path-feedback" style="margin-top:8px;color:#6b7280;">Noch keine Prüfung.</div>`;

    const hintText = step.hintVisible
      ? `<div class="path-hint" style="margin-top:8px;">💡 Tipp: ${step.hint}</div>`
      : "";

    const resultText = step.solved
      ? `<div class="path-result" style="margin-top:8px;">Ergebnis: ${step.resultText}</div>`
      : "";

    card.innerHTML = `
      <p class="eyebrow">Schritt ${index + 1} von ${currentSteps.length}</p>
      <h3 style="margin:0 0 6px;">${step.label}</h3>
      <p class="section-text" style="margin-bottom:12px;">${step.prompt}</p>

      <label class="field">
        <span>Rechenoperation</span>
        <input
          id="pathInput${index}"
          data-step-index="${index}"
          type="text"
          inputmode="text"
          autocomplete="off"
          placeholder="${step.placeholder || ""}"
          value="${step.userInput || ""}"
          ${!step.unlocked || step.solved ? "disabled" : ""}
        />
      </label>

      <div class="actions" style="margin-top:10px;">
        <button type="button" data-action="check" data-step="${index}" ${!step.unlocked || step.solved ? "disabled" : ""}>Prüfen</button>
        <button type="button" class="secondary" data-action="hint" data-step="${index}" ${!step.unlocked ? "disabled" : ""}>Tipp</button>
        ${step.solved ? `<button type="button" class="secondary" data-action="edit" data-step="${index}">Ändern</button>` : ""}
      </div>

      ${hintText}
      ${resultText}
      ${feedbackText}
    `;

    pathContainer.appendChild(card);
  });

  pathContainer.querySelectorAll('input[data-step-index]').forEach((input) => {
    input.addEventListener("focus", () => {
      activePathInput = input;
    });

    input.addEventListener("input", (event) => {
      const idx = Number(event.target.dataset.stepIndex);
      if (!Number.isNaN(idx) && currentSteps[idx]) {
        currentSteps[idx].userInput = event.target.value;
      }
    });
  });

  pathContainer.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      const idx = Number(button.dataset.step);

      if (action === "check") checkPathStep(idx);
      if (action === "hint") togglePathHint(idx);
      if (action === "edit") enablePathStepEdit(idx);
    });
  });

  const firstActiveInput = pathContainer.querySelector('input[data-step-index]:not([disabled])');
  if (firstActiveInput && !activePathInput) {
    activePathInput = firstActiveInput;
  }

  manualFeedback.textContent = "Trage die Rechenoperation pro Schritt ein. Nach richtiger Lösung wird der nächste Schritt freigeschaltet.";
  updateProgressInfo();
}

function checkPathStep(index) {
  const step = currentSteps[index];
  if (!step || !step.unlocked) return;

  try {
    const inputValue = parseNum(step.userInput);

    if (nearlyEqual(inputValue, step.expected)) {
      step.solved = true;
      step.feedback = `✅ Richtig: ${step.userInput} = ${formatNumber(inputValue)}`;

      if (step.userInput.includes("%")) {
        step.feedback += ` • 💡 % bedeutet /100`;
      }

      const nextStep = currentSteps[index + 1];
      if (nextStep) nextStep.unlocked = true;
    } else {
      const task = getCurrentTask();
      step.feedback = getSmartErrorFeedback(task, index, inputValue);
    }
  } catch (err) {
    step.feedback = `FEHLER: ${err.message}`;
  }

  activePathInput = document.getElementById(`pathInput${index}`);
  renderPathSteps();
}

function togglePathHint(index) {
  const step = currentSteps[index];
  if (!step || !step.unlocked) return;
  step.hintVisible = !step.hintVisible;
  renderPathSteps();
}

function enablePathStepEdit(index) {
  const step = currentSteps[index];
  if (!step) return;

  step.solved = false;
  step.feedback = "Bearbeite den Schritt erneut.";
  step.unlocked = true;

  for (let i = index + 1; i < currentSteps.length; i += 1) {
    currentSteps[i].unlocked = false;
    currentSteps[i].solved = false;
    currentSteps[i].hintVisible = false;
    currentSteps[i].feedback = "";
  }

  activePathInput = null;
  renderPathSteps();

  const input = document.getElementById(`pathInput${index}`);
  if (input) {
    input.focus();
    activePathInput = input;
  }
}

function resetPathMode() {
  const task = getCurrentTask();
  if (!task) return;
  activePathInput = null;
  initializeCurrentSteps(task);
  renderPathSteps();
}

// =====================
// EINZELSCHRITT-MODUS
// =====================
function renderCurrentStep() {
  const step = currentSteps[currentStepIndex];

  if (!step) {
    stepCounter.textContent = "Fertig";
    stepQuestion.textContent = "✅ Aufgabe vollständig bearbeitet";
    stepHint.textContent = "";
    stepInput.value = "";
    stepFeedback.textContent = "Alle Schritte wurden richtig bearbeitet.";
    updateProgressInfo();
    return;
  }

  stepCounter.textContent = `Schritt ${currentStepIndex + 1} von ${currentSteps.length}`;
  stepQuestion.textContent = step.question;
  stepHint.textContent = hintVisible ? `Tipp: ${step.hint}` : "Hier erscheint bei Bedarf ein Tipp.";
  stepInput.value = step.userInput || "";
  stepFeedback.textContent = "Noch keine Prüfung.";
  updateProgressInfo();
}

function checkCurrentStep() {
  const step = currentSteps[currentStepIndex];
  if (!step) return;

  try {
    const input = parseNum(stepInput.value);

    if (nearlyEqual(input, step.expected)) {
      step.userInput = stepInput.value;
      step.solved = true;
      stepFeedback.textContent = `✅ Richtig: ${formatNumber(input)}`;
      if (stepInput.value.includes("%")) {
        stepFeedback.textContent += ` • 💡 % bedeutet /100`;
      }
    } else {
      stepFeedback.textContent = getSmartErrorFeedback(getCurrentTask(), currentStepIndex, input);
    }
  } catch (err) {
    stepFeedback.textContent = `FEHLER: ${err.message}`;
  }

  updateProgressInfo();
}

function nextStep() {
  const step = currentSteps[currentStepIndex];
  if (!step) return;

  try {
    const input = parseNum(stepInput.value);

    if (!nearlyEqual(input, step.expected)) {
      stepFeedback.textContent = "❌ Bitte erst den aktuellen Schritt richtig lösen.";
      return;
    }

    step.userInput = stepInput.value;
    step.solved = true;
    currentStepIndex += 1;
    hintVisible = false;
    renderCurrentStep();
  } catch (err) {
    stepFeedback.textContent = `FEHLER: ${err.message}`;
  }
}

function toggleHint() {
  hintVisible = !hintVisible;
  renderCurrentStep();
}

// =====================
// LÖSUNG
// =====================
function buildSolutionText(task) {
  if (!task) return "Noch keine Musterlösung angezeigt.";

  const steps = buildSteps(task);
  if (!steps.length) return "Für diese Aufgabe ist noch keine Musterlösung hinterlegt.";

  const resultLines = [];

  if (task.type === "anteile") {
    resultLines.push(
      `${task.part1} Teile = ${formatNumber(steps[2].expected)} ml`,
      `${task.part2} Teile = ${formatNumber(steps[3].expected)} ml`
    );
  } else if (task.type === "mixing") {
    resultLines.push(
      `Starke Lösung: ${formatNumber(steps[6].expected)} ml`,
      `Schwache Lösung: ${formatNumber(steps[7].expected)} ml`
    );
  } else if (task.type === "ratio") {
    resultLines.push(
      `Verhältnis stark : schwach = ${formatNumber(steps[2].expected)} : ${formatNumber(steps[3].expected)}`
    );
  } else if (task.type === "concentration") {
    resultLines.push(
      `Endkonzentration: ${formatNumber(steps[2].expected)} %`
    );
  } else if (task.type === "prozent_anteil") {
    resultLines.push(
      `Anteil in ml: ${formatNumber(steps[1].expected)} ml`
    );
  } else if (task.type === "prozent_konzentration") {
    resultLines.push(
      `Konzentration: ${formatNumber(steps[1].expected)} %`
    );
  } else if (task.type === "deckungsbeitrag") {
    resultLines.push(
      `Deckungsbeitrag: ${formatNumber(steps[0].expected)} €`
    );
  } else if (task.type === "wareneinsatzquote") {
    resultLines.push(
      `Wareneinsatzquote: ${formatNumber(steps[0].expected)} %`
    );
  } else if (task.type === "warenrabatt") {
    resultLines.push(
      `Gesamtbetrag: ${formatNumber(steps[4].expected)} €`
    );
  } else if (task.type === "preisberechnung") {
    resultLines.push(
      `Zahlbetrag bei ${task.menge1} Stück: ${formatNumber(steps[2].expected)} €`,
      `Stückpreis bei ${task.menge1} Stück: ${formatNumber(steps[3].expected)} €`,
      `Zahlbetrag bei ${task.menge2} Stück: ${formatNumber(steps[6].expected)} €`,
      `Stückpreis bei ${task.menge2} Stück: ${formatNumber(steps[7].expected)} €`
    );
  } else if (task.type === "bezugskalkulation") {
    resultLines.push(
      `Gesamtbezugspreis: ${formatNumber(steps[5].expected)} €`,
      `Bezugspreis je Stück: ${formatNumber(steps[6].expected)} €`
    );
  } else if (task.type === "verkaufskalkulation") {
    resultLines.push(
      `Bruttoverkaufspreis: ${formatNumber(steps[10].expected)} €`
    );
  } else if (task.type === "umweltschutz") {
    resultLines.push(
      `Farbverlust pro Monat: ${formatNumber(steps[1].expected)} ml`,
      `Farbverlust pro Jahr: ${formatNumber(steps[2].expected)} ml`
    );
  } else if (task.type === "marketing_vormonat") {
    resultLines.push(
      `Kundenzahl im Vormonat: ${formatNumber(steps[1].expected)}`
    );
  } else if (task.type === "marketing_umsatz") {
    resultLines.push(
      `Gesamtumsatz: ${formatNumber(steps[0].expected)} €`
    );
  }

  const pathLines = steps.map((step, index) => {
    const hint = step.hint || "";
    const result = step.resultText || "";

    if (hint.includes("=")) {
      return `${index + 1}. ${step.label}: ${hint}`;
    }

    return `${index + 1}. ${step.label}: ${hint} = ${result}`;
  });

  return [
    "ERGEBNIS:",
    ...resultLines,
    "",
    "--------------------------------",
    "",
    "RECHENWEG:",
    ...pathLines
  ].join("\n");
}

function showSolution() {
  solutionOutput.textContent = buildSolutionText(getCurrentTask());
  setWorkMode("solution");
  updateProgressInfo();
}

// =====================
// TASK LOADING
// =====================
async function initTasks() {
  const response = await fetch(`task_templates.json?v=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  TASK_DATA = data;

  const allowedCategories = [
  "anteile",
  "mixing",
  "concentration",
  "prozent",
  "deckungsbeitrag",
  "wareneinsatzquote",
  "warenrabatt",
  "preisberechnung",
  "bezugskalkulation",
  "verkaufskalkulation",
  "umweltschutz",
  "marketing",
  "kalkulation"
];
  const categories = Object.keys(data.exam_tasks || {}).filter((key) => allowedCategories.includes(key));

  taskCategory.innerHTML = "";

  categories.forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = formatCategoryName(key);
    taskCategory.appendChild(option);
  });

  if (categories.length === 0) {
    throw new Error("Keine unterstützten Aufgaben gefunden.");
  }

  updateTaskList();
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
    taskPrompt.textContent = "Wähle eine Aufgabe aus.";
    statusInfo.textContent = "";
    return;
  }

  taskMode.textContent = formatCategoryName(taskCategory.value);
  taskTitle.textContent = task.title || "Ohne Titel";
  taskDescription.textContent = task.description || "";
  taskPrompt.textContent = task.prompt || "";

  initializeCurrentSteps(task);
  currentStepIndex = 0;
  hintVisible = false;
  activePathInput = null;

  renderCurrentStep();
  renderPathSteps();
  solutionOutput.textContent = "Noch keine Musterlösung angezeigt.";
  setWorkMode(currentWorkMode);
}

// =====================
// EVENTS
// =====================
taskCategory.addEventListener("change", updateTaskList);
taskSelect.addEventListener("change", showTask);

manualModeBtn.addEventListener("click", () => {
  initializeCurrentSteps(getCurrentTask());
  activePathInput = null;
  renderPathSteps();
  setWorkMode("manual");
});

stepModeBtn.addEventListener("click", () => {
  initializeCurrentSteps(getCurrentTask());
  currentStepIndex = 0;
  hintVisible = false;
  renderCurrentStep();
  setWorkMode("step");
});

showSolutionBtn.addEventListener("click", showSolution);

if (checkManualBtn) {
  checkManualBtn.classList.add("hidden");
}

clearManualBtn.addEventListener("click", () => {
  resetPathMode();
});

checkStepBtn.addEventListener("click", checkCurrentStep);
showHintBtn.addEventListener("click", toggleHint);
nextStepBtn.addEventListener("click", nextStep);

// =====================
// START
// =====================
(async function startApp() {
  try {
    setupOperatorBars();
    await initTasks();
    setWorkMode("manual");
  } catch (err) {
    statusInfo.textContent = `✖ Fehler beim Laden: ${err.message}`;
  }
})();
