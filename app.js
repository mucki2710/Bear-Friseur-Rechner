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
  const normalized = String(value ?? "")
    .trim()
    .replace(/,/g, ".")
    .replace(/×/g, "*")
    .replace(/÷/g, "/");

  if (!normalized) {
    throw new Error("Bitte eine Eingabe machen.");
  }

  if (!/^[0-9+\-*/().:\s]+$/.test(normalized)) {
    throw new Error("Ungültige Eingabe.");
  }

  if (normalized.includes(":")) {
    throw new Error("Bitte hier einen Rechenausdruck eingeben, kein Verhältnis mit Doppelpunkt.");
  }

  let result;
  try {
    result = Function(`"use strict"; return (${normalized})`)();
  } catch {
    throw new Error("Ungültiger Rechenausdruck.");
  }

  if (typeof result !== "number" || Number.isNaN(result) || !Number.isFinite(result)) {
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
    concentration: "Konzentration"
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
        prompt: "Stark minus Ziel",
        placeholder: `${task.high}-${task.target}`,
        expected: diffStrong,
        hint: `${task.high} - ${task.target}`,
        resultText: formatNumber(diffStrong)
      },
      {
        label: "Ziel minus schwache Lösung",
        question: "Wie viel ist Zielkonzentration minus schwache Lösung?",
        prompt: "Ziel minus Schwach",
        placeholder: `${task.target}-${task.low}`,
        expected: diffWeak,
        hint: `${task.target} - ${task.low}`,
        resultText: formatNumber(diffWeak)
      },
      {
        label: "Anteil starke Lösung",
        question: "Wie groß ist der Anteil der starken Lösung?",
        prompt: "KREUZEN: Zahl von Schwach: Anteil der starken Lösung ist ZIEL minus SCHWACH",
        placeholder: `${diffWeak}`,
        expected: diffWeak,
        hint: `Anteil stark = ${diffWeak}`,
        resultText: formatNumber(diffWeak)
      },
      {
        label: "Anteil schwache Lösung",
        question: "Wie groß ist der Anteil der schwachen Lösung?",
        prompt: "KREUZEN: Zahl von Stark: Anteil der schwachen Lösung ist STARK minus ZIEL",
        placeholder: `${diffStrong}`,
        expected: diffStrong,
        hint: `Anteil schwach = ${diffStrong}`,
        resultText: formatNumber(diffStrong)
      },
      {
        label: "Gesamtteile",
        question: "Wie viele Teile insgesamt?",
        prompt: "Summe beider Anteile: Anteile STARK + Anteile SCHWACH.",
        placeholder: `${diffWeak}+${diffStrong}`,
        expected: totalParts,
        hint: `${diffWeak} + ${diffStrong}`,
        resultText: formatNumber(totalParts)
      },
      {
        label: "1 Teil in ml",
        question: "Wie viel ml entspricht 1 Teil?",
        prompt: "Teile die Gesamtmenge durch die Summe von Anteile STARK + Anteile SCHWACH.",
        placeholder: `${task.total_ml}/${totalParts}`,
        expected: onePart,
        hint: `${task.total_ml} / ${totalParts}`,
        resultText: `${formatNumber(onePart)} ml`
      },
      {
        label: "Starke Lösung in ml",
        question: "Wie viel ml starke Lösung werden benötigt?",
        prompt: "Anteil starke Lösung × ml eines Teils der Gesamtmenge.",
        placeholder: `${diffWeak}×${formatNumber(onePart)}`,
        expected: strongMl,
        hint: `${diffWeak} × ${formatNumber(onePart)}`,
        resultText: `${formatNumber(strongMl)} ml`
      },
      {
        label: "Schwache Lösung in ml",
        question: "Wie viel ml schwache Lösung werden benötigt?",
        prompt: "Anteil schwache Lösung × ml eines Teils der Gesamtmenge.",
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
        hint: `${diffWeak} : ${diffStrong} → stark = ${ratioStrong}`,
        resultText: formatNumber(ratioStrong)
      },
      {
        label: "Verhältnis schwach",
        question: "Wie groß ist das gekürzte Verhältnis für die schwache Lösung?",
        prompt: "Kürze das Verhältnis der Anteile.",
        placeholder: `${ratioWeak}`,
        expected: ratioWeak,
        hint: `${diffWeak} : ${diffStrong} → schwach = ${ratioWeak}`,
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

    if (stepIndex === 0) {
      return `❌ Addiere nur die Verhältnis-Zahlen ${task.part1} und ${task.part2}.`;
    }

    if (stepIndex === 1) {
      if (nearlyEqual(inputValue, task.total_ml * totalParts)) {
        return `❌ Du hast wahrscheinlich multipliziert statt geteilt. Teile ${task.total_ml} durch ${totalParts}.`;
      }
      if (nearlyEqual(inputValue, task.total_ml / task.part1) || nearlyEqual(inputValue, task.total_ml / task.part2)) {
        return `❌ Du musst durch die Gesamtteile teilen, nicht nur durch einen Anteil.`;
      }
      return `❌ Noch nicht richtig. Für 1 Teil rechnest du ${task.total_ml} / ${totalParts}.`;
    }

    if (stepIndex === 2) {
      if (nearlyEqual(inputValue, onePart + task.part1)) {
        return `❌ Hier musst du multiplizieren, nicht addieren. Rechne ${task.part1} × ${formatNumber(onePart)}.`;
      }
      if (nearlyEqual(inputValue, task.part2 * onePart)) {
        return `❌ Das ist der andere Anteil. Hier wird der erste Anteil mit ${task.part1} Teilen gesucht.`;
      }
      return `❌ Noch nicht richtig. Rechne ${task.part1} × ${formatNumber(onePart)}.`;
    }

    if (stepIndex === 3) {
      if (nearlyEqual(inputValue, onePart + task.part2)) {
        return `❌ Hier musst du multiplizieren, nicht addieren. Rechne ${task.part2} × ${formatNumber(onePart)}.`;
      }
      if (nearlyEqual(inputValue, task.part1 * onePart)) {
        return `❌ Das ist der andere Anteil. Hier wird der zweite Anteil mit ${task.part2} Teilen gesucht.`;
      }
      return `❌ Noch nicht richtig. Rechne ${task.part2} × ${formatNumber(onePart)}.`;
    }
  }

  if (task.type === "mixing") {
    if (stepIndex === 0) {
      return `❌ Oben im Mischkreuz rechnest du starke Lösung minus Zielkonzentration.`;
    }
    if (stepIndex === 1) {
      return `❌ Unten im Mischkreuz rechnest du Zielkonzentration minus schwache Lösung.`;
    }
    if (stepIndex === 2 || stepIndex === 3) {
      return `❌ Die Anteile werden aus den gegenüberliegenden Differenzen übernommen.`;
    }
    if (stepIndex === 4) {
      return `❌ Addiere beide Anteile zu den Gesamtteilen.`;
    }
    if (stepIndex === 5) {
      return `❌ Teile die Gesamtmenge durch die Gesamtteile.`;
    }
    if (stepIndex === 6 || stepIndex === 7) {
      return `❌ Jetzt musst du den Anteil mit dem ml-Wert eines Teils multiplizieren.`;
    }
    return `❌ Noch nicht richtig. Prüfe die Differenzen im Mischkreuz und die Gesamtteile.`;
  }

  if (task.type === "concentration") {
    if (stepIndex === 0) {
      return `❌ Berechne zuerst nur die Wirkstoffmenge im Entwickler: ml × Prozent / 100.`;
    }
    if (stepIndex === 1) {
      return `❌ Zur Gesamtmenge gehören Entwickler, Wasser und Farbcreme.`;
    }
    if (stepIndex === 2) {
      return `❌ Endkonzentration = Wirkstoffmenge / Gesamtmenge × 100.`;
    }
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
  }

  const pathLines = steps.map((step, index) => {
      const hint = step.hint || "";
      const result = step.resultText || "";

      // Wenn im Hint schon ein "=" vorkommt → nicht nochmal anhängen
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

  const allowedCategories = ["anteile", "mixing", "concentration"];
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
