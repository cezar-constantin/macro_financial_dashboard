// Generated analysis: runs the rule engine on the chosen period and renders the report,
// the MIP scoreboard, the annual fact table and a ready-made prompt for an external AI assistant.
import { t, isNum, applyStaticTranslations, copyText, downloadText } from "./common.js";
import { $, L, E, nf, loadData, getPeriod, periodPanel, renderMacroShell, errorPanel } from "./macro.js";
import { buildReport, factTable, reportToMarkdown, buildPrompt } from "./engine.js";

const state = { P: null, R: null, busy: false };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function reportHtml(R) {
  const sec = (title, inner, kicker = "") =>
    `<div class="report-section">${kicker ? `<p class="section-kicker">${E(kicker)}</p>` : ""}<h4>${E(title)}</h4>${inner}</div>`;
  let h = `<div class="commentary report">`;
  h += sec(L("Rezumat executiv", "Executive summary"), `<ul>${R.summary.map((x) => `<li>${E(x)}</li>`).join("")}</ul>`);
  R.sections.forEach((s, i) => {
    h += sec(s.title, s.paras.map((p) => `<p>${E(p)}</p>`).join(""), `${i + 1}`);
  });
  h += sec(L("Riscuri și vulnerabilități", "Risks and vulnerabilities"), `<ul class="risk-list">${R.risks.map((x) => `<li>${E(x)}</li>`).join("")}</ul>`);
  h += sec(L("Întrebări pentru discuție", "Discussion questions"), `<ol>${R.questions.map((x) => `<li>${E(x)}</li>`).join("")}</ol>`);
  h += `</div>`;
  return h;
}

function scoreHtml(R) {
  const rows = R.scoreboard
    .map(
      (r) => `<tr><td>${E(r.label)}${r.note ? `<br><small class="muted">${E(r.note)}</small>` : ""}</td><td class="num"><strong>${E(r.fmt(r.value))}</strong></td><td class="num">${E(r.thrLabel)}</td>
      <td><span class="status-dot ${r.breach ? "weak" : "good"}">${E(t(r.breach ? "r.score.breach" : "r.score.ok"))}</span></td></tr>`
    )
    .join("");
  return `<section class="card panel-card">
    <div class="section-heading"><div><p class="section-kicker">${E(t("r.score.kicker"))}</p><h3>${E(t("r.score.title"))}</h3><p class="chart-caption">${E(t("r.score.help"))}</p></div>
    <span class="status-pill">${R.scoreboard.filter((r) => r.breach).length} / ${R.scoreboard.length}</span></div>
    <div class="table-scroll"><table class="data-table"><thead><tr><th>${E(t("r.score.indicator"))}</th><th class="num">${E(t("r.score.value"))}</th><th class="num">${E(t("r.score.threshold"))}</th><th>${E(t("r.score.state"))}</th></tr></thead><tbody>${rows}</tbody></table></div>
  </section>`;
}

function factHtml(ft) {
  const head = ft.years.map((y) => `<th class="num">${y}</th>`).join("");
  const body = ft.rows
    .map((r) => `<tr><td>${E(r.label)}</td>${ft.years.map((y) => `<td class="num">${isNum(r.v[y]) ? E(nf(r.v[y], r.id === "eurron_m" ? 3 : 1)) : "—"}</td>`).join("")}</tr>`)
    .join("");
  return `<section class="card panel-card">
    <div class="section-heading"><div><p class="section-kicker">${E(L("Trasabilitate", "Traceability"))}</p><h3>${E(L("Datele anuale pe care se bazează analiza", "The annual data behind the analysis"))}</h3>
    <p class="chart-caption">${E(L("Medii anuale pentru seriile lunare și trimestriale. Anul în curs apare cu datele disponibile până acum.", "Annual averages for monthly and quarterly series. The current year shows the data available so far."))}</p></div></div>
    <div class="table-scroll"><table class="data-table fact-table"><thead><tr><th></th>${head}</tr></thead><tbody>${body}</tbody></table></div>
  </section>`;
}

function promptHtml(prompt) {
  return `<section class="card panel-card">
    <div class="section-heading"><div><p class="section-kicker">${E(t("r.prompt.kicker"))}</p><h3>${E(t("r.prompt.title"))}</h3><p class="chart-caption">${E(t("r.prompt.help"))}</p></div>
    <button type="button" class="secondary-button" id="copy-prompt">${E(t("r.prompt.copy"))}</button></div>
    <textarea class="memo-textarea prompt-box" id="prompt-box" readonly rows="14">${E(prompt)}</textarea>
  </section>`;
}

function howHtml() {
  return `<section class="card panel-card">
    <div class="section-heading"><div><p class="section-kicker">${E(t("r.how.kicker"))}</p><h3>${E(t("r.how.title"))}</h3></div><span class="status-pill">${E(t("r.engine"))}</span></div>
    <p class="helper-copy">${E(t("r.how.p1"))}</p>
    <p class="helper-copy">${E(t("r.how.p2"))}</p>
  </section>`;
}

function reportCard(inner, generated) {
  return `<section class="card panel-card" id="report-card">
    <div class="section-heading"><div><p class="section-kicker">${E(t("r.eyebrow"))}</p><h2>${E(L("Analiza macroeconomică a României", "Macroeconomic analysis of Romania"))} · ${state.P.from}–${state.P.to}</h2>
    <p class="chart-caption">${E(t("r.engine"))}</p></div>
    <div class="button-row">
      <button type="button" class="primary-button" id="gen-btn"${state.busy ? " disabled" : ""}>${E(t(generated ? "r.regenerate" : "r.generate"))}</button>
      ${generated ? `<button type="button" class="secondary-button" id="copy-btn">${E(t("r.copy"))}</button><button type="button" class="ghost-button" id="dl-btn">${E(t("r.download"))}</button><button type="button" class="ghost-button" id="print-btn">${E(t("r.print"))}</button>` : ""}
    </div></div>
    <div id="report-body">${inner}</div>
  </section>`;
}

const STEPS = () => [
  L("Citesc seriile din perioada aleasă", "Reading the series in the chosen period"),
  L("Calculez medii, extreme și puncte de inflexiune", "Computing averages, extremes and turning points"),
  L("Compar cu perioada anterioară și cu media UE", "Comparing with the previous period and the EU average"),
  L("Verific pragurile (țintă de inflație, Maastricht, MIP)", "Checking thresholds (inflation target, Maastricht, MIP)"),
  L("Scriu raportul", "Writing the report"),
];

async function generate(animate = true) {
  if (state.busy) return;
  state.busy = true;
  if (animate) {
    const steps = STEPS();
    for (let i = 0; i <= steps.length; i++) {
      $("report-body").innerHTML = `<div class="loading-card"><div class="loading-header"><strong>${E(t("r.generating"))}</strong><span class="loading-badge">${Math.round((100 * i) / steps.length)} %</span></div>
        <div class="loading-progress-shell"><div class="loading-progress-fill" style="width:${(100 * i) / steps.length}%"></div></div>
        <ul class="gen-steps">${steps.map((s, k) => `<li class="${k < i ? "done" : k === i ? "active" : ""}">${E(s)}</li>`).join("")}</ul></div>`;
      if (i < steps.length) await sleep(320);
    }
  }
  state.R = buildReport(state.P);
  state.busy = false;
  render();
}

function render() {
  const pp = periodPanel(state.P, (from, to) => {
    state.P = { ...state.P, from, to };
    state.R = null;
    render();
  });
  $("hero-period").textContent = `${state.P.from} – ${state.P.to}`;
  const ft = factTable(state.P);
  const R = state.R;
  $("hero-risks").textContent = R ? String(R.risks.length) : "—";
  $("hero-mip").textContent = R ? `${R.scoreboard.filter((r) => r.breach).length} / ${R.scoreboard.length}` : "—";
  const inner = R
    ? reportHtml(R)
    : `<div class="empty-state"><strong>${E(L("Raportul nu a fost încă generat pentru această perioadă.", "The report has not been generated for this period yet."))}</strong><p>${E(L("Apasă „Generează analiza”. Durează o secundă; calculele rulează în browserul tău.", "Press “Generate the analysis”. It takes a second; the calculations run in your browser."))}</p></div>`;
  $("workspace").innerHTML =
    pp.html + reportCard(inner, !!R) + (R ? scoreHtml(R) : "") + factHtml(ft) + howHtml() + promptHtml(buildPrompt(state.P, ft));
  pp.wire();
  $("gen-btn")?.addEventListener("click", () => generate(true));
  $("copy-btn")?.addEventListener("click", () => copyText(reportToMarkdown(state.R, ft, L("Analiza macroeconomică a României", "Macroeconomic analysis of Romania"))));
  $("dl-btn")?.addEventListener("click", () =>
    downloadText(`analiza_macro_romania_${state.P.from}_${state.P.to}.md`, reportToMarkdown(state.R, ft, L("Analiza macroeconomică a României", "Macroeconomic analysis of Romania")), "text/markdown")
  );
  $("print-btn")?.addEventListener("click", () => window.print());
  $("copy-prompt")?.addEventListener("click", () => copyText($("prompt-box").value));
  applyStaticTranslations();
}

renderMacroShell("report");
(async () => {
  try {
    await loadData();
    state.P = getPeriod();
    render();
    if (new URLSearchParams(location.search).has("auto")) generate(false);
  } catch (e) {
    $("workspace").innerHTML = errorPanel(e);
  }
})();
document.addEventListener("langchange", () => {
  if (!state.P) return;
  if (state.R) state.R = buildReport(state.P);
  render();
});
