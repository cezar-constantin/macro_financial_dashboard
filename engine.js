// Analysis engine: turns the series of the chosen period into a structured macroeconomic report.
// Rule based and deterministic. Every sentence is built from a number computed here, and every
// qualitative word ("robust", "disinflation", "slippage"...) comes from a fixed threshold below.
import { isNum } from "./common.js";
import {
  L, nf, sgn, obsOf, has, inP, lastObs, firstObs, annualAvg, mean, maxBy, minBy, caAnnual, fmtPeriod, yearOf, indName, S,
} from "./macro.js";

// ------------------------------------------------------------------ small helpers
const pc = (v, d = 1) => (isNum(v) ? nf(v, d) + " %" : "—");
const pp = (v, d = 1) => (isNum(v) ? sgn(v, d) + " pp" : "—");
const pGDP = (v, d = 1) => (isNum(v) ? nf(v, d) + L(" % din PIB", " % of GDP") : "—");
const byYear = (obs) => Object.fromEntries(obs.map(([p, v]) => [+p.slice(0, 4), v]));
const years = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Summary of a series within [from, to]. */
function st(obs, from, to) {
  const p = inP(obs, from, to);
  if (!p.length) return null;
  return {
    n: p.length,
    first: p[0],
    last: p[p.length - 1],
    mean: mean(p.map((o) => o[1])),
    max: maxBy(p),
    min: minBy(p),
    change: p[p.length - 1][1] - p[0][1],
    obs: p,
  };
}
/** Annual values (native annual series or annual averages of sub-annual ones) restricted to [from, to]. */
function annual(id, from, to, opts = {}) {
  const o = obsOf(id);
  if (!o.length) return {};
  const a = o[0][0].length === 4 ? byYear(o) : annualAvg(o, opts);
  const out = {};
  for (const y of years(from, to)) if (isNum(a[y])) out[y] = a[y];
  return out;
}
const vals = (obj) => Object.values(obj);
const lastKey = (obj) => {
  const k = Object.keys(obj).map(Number);
  return k.length ? Math.max(...k) : null;
};
const firstKey = (obj) => {
  const k = Object.keys(obj).map(Number);
  return k.length ? Math.min(...k) : null;
};
function listYears(obj, d = 1) {
  return Object.entries(obj)
    .map(([y, v]) => `${y}: ${sgn(v, d)} %`)
    .join("; ");
}
function cagr(a, b, n) {
  return isNum(a) && isNum(b) && a > 0 && n > 0 ? (Math.pow(b / a, 1 / n) - 1) * 100 : null;
}
function std(a) {
  const m = mean(a);
  return a.length > 1 ? Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)) : null;
}

// ------------------------------------------------------------------ qualitative scales (thresholds visible on purpose)
function growthWord(g) {
  if (!isNum(g)) return "";
  if (g < 0) return L("contracție", "contraction");
  if (g < 1) return L("stagnare", "stagnation");
  if (g < 2.5) return L("creștere modestă", "modest growth");
  if (g < 4) return L("creștere solidă", "solid growth");
  return L("creștere robustă", "robust growth");
}
function inflWord(pi) {
  if (!isNum(pi)) return "";
  if (pi < 0) return L("deflație", "deflation");
  if (pi <= 3.5) return L("în intervalul țintei BNR", "within the NBR target band");
  if (pi <= 5) return L("ușor peste intervalul țintei", "slightly above the target band");
  if (pi <= 10) return L("ridicată", "high");
  return L("foarte ridicată (două cifre)", "very high (double digit)");
}
function deficitWord(d) {
  if (!isNum(d)) return "";
  if (d >= -1) return L("aproape echilibrat", "close to balance");
  if (d >= -3) return L("în limita de 3 % din Tratat", "within the 3% Treaty limit");
  if (d >= -5) return L("peste pragul de 3 %", "above the 3% threshold");
  return L("un deficit excesiv, cu mult peste pragul de 3 %", "an excessive deficit, well above the 3% threshold");
}

// ------------------------------------------------------------------ MIP scoreboard
export function scoreboard(P) {
  const { to } = P;
  const rows = [];
  const add = (key, label, value, fmt, thrLabel, breach, note = "") => rows.push({ key, label, value, fmt, thrLabel, breach, note });
  const official = (id) => lastObs(obsOf(id), to);
  const offNote = L("valoare oficială Eurostat (tabloul MIP)", "official Eurostat value (MIP scoreboard)");
  const calcNote = L("calculat din seriile tabloului de bord", "computed from the dashboard series");
  // current account, 3-year average
  const ca3 = official("mip_ca3_a");
  if (ca3) add("ca3", L(`Contul curent, media pe 3 ani (${+ca3[0] - 2}–${ca3[0]})`, `Current account, 3-year average (${+ca3[0] - 2}–${ca3[0]})`), ca3[1], pGDP, L("între −4 % și +6 %", "between −4% and +6%"), ca3[1] < -4 || ca3[1] > 6, offNote);
  else {
    const ca = caAnnual();
    const caY = Object.keys(ca).map(Number).filter((y) => y <= to);
    if (caY.length >= 3) {
      const y = Math.max(...caY);
      const v = mean([ca[y], ca[y - 1], ca[y - 2]].filter(isNum));
      add("ca3", L(`Contul curent, media ${y - 2}–${y}`, `Current account, ${y - 2}–${y} average`), v, pGDP, L("între −4 % și +6 %", "between −4% and +6%"), v < -4 || v > 6, calcNote);
    }
  }
  const niip = lastObs(obsOf("niip_a"), to);
  if (niip) add("niip", L(`Poziția investițională internațională netă (${niip[0]})`, `Net international investment position (${niip[0]})`), niip[1], pGDP, "> −35 %", niip[1] < -35, offNote);
  const r3 = official("mip_reer3_a");
  if (r3) add("reer", L(`Cursul real efectiv, variație pe 3 ani (${+r3[0] - 3}–${r3[0]})`, `Real effective exchange rate, 3-year change (${+r3[0] - 3}–${r3[0]})`), r3[1], (x) => sgn(x, 1) + " %", "±11 %", Math.abs(r3[1]) > 11, offNote);
  else {
    const reer = annualAvg(obsOf("reer_m"), { full: true });
    const ry = Object.keys(reer).map(Number).filter((y) => y <= to);
    if (ry.length >= 4) {
      const y = Math.max(...ry);
      const v = (reer[y] / reer[y - 3] - 1) * 100;
      add("reer", L(`Cursul real efectiv, variație pe 3 ani (${y - 3}–${y})`, `Real effective exchange rate, 3-year change (${y - 3}–${y})`), v, (x) => sgn(x, 1) + " %", "±11 %", Math.abs(v) > 11, L("indicele BIS, deflatat cu IPC", "BIS index, CPI-deflated"));
    }
  }
  const u3 = official("mip_ulc3_a");
  if (u3) add("ulc", L(`Costul unitar nominal al muncii, variație pe 3 ani (${+u3[0] - 3}–${u3[0]})`, `Nominal unit labour cost, 3-year change (${+u3[0] - 3}–${u3[0]})`), u3[1], (x) => sgn(x, 1) + " %", "< +12 %", u3[1] > 12, offNote);
  else {
    const ulc = byYear(obsOf("ulc_a"));
    const uy = Object.keys(ulc).map(Number).filter((y) => y <= to);
    if (uy.length >= 3) {
      const y = Math.max(...uy);
      const v = ((1 + ulc[y] / 100) * (1 + ulc[y - 1] / 100) * (1 + ulc[y - 2] / 100) - 1) * 100;
      add("ulc", L(`Costul unitar nominal al muncii, variație pe 3 ani (${y - 3}–${y})`, `Nominal unit labour cost, 3-year change (${y - 3}–${y})`), v, (x) => sgn(x, 1) + " %", "< +12 %", v > 12, calcNote);
    }
  }
  const hr = official("mip_hpi_a");
  if (hr) add("hpi", L(`Prețurile locuințelor, variație reală (${hr[0]})`, `House prices, real change (${hr[0]})`), hr[1], (x) => sgn(x, 1) + " %", "< +6 %", hr[1] > 6, offNote);
  else {
    const hpi = annualAvg(obsOf("hpi_q"), { full: true });
    const hicpA = annualAvg(obsOf("hicp_m"), { full: true });
    const hy = Object.keys(hpi).map(Number).filter((y) => y <= to && isNum(hicpA[y]));
    if (hy.length) {
      const y = Math.max(...hy);
      const v = ((1 + hpi[y] / 100) / (1 + hicpA[y] / 100) - 1) * 100;
      add("hpi", L(`Prețurile locuințelor, variație reală (${y})`, `House prices, real change (${y})`), v, (x) => sgn(x, 1) + " %", "< +6 %", v > 6, L("deflatat cu IAPC", "HICP-deflated"));
    }
  }
  for (const [id, thr, lab] of [
    ["credit_gdp_a", 133, L("Datoria sectorului privat", "Private sector debt")],
    ["credit_flow_a", 14, L("Fluxul de credit către sectorul privat", "Private sector credit flow")],
  ]) {
    const o = lastObs(obsOf(id), to);
    if (o) add(id, `${lab} (${o[0]})`, o[1], pGDP, `< ${thr} %`, o[1] > thr, offNote);
  }
  const debt = lastObs(obsOf("debt_a"), to);
  if (debt) add("debt", L(`Datoria publică (${debt[0]})`, `Government debt (${debt[0]})`), debt[1], pGDP, "< 60 %", debt[1] > 60, offNote);
  const un = annualAvg(obsOf("unemp_m"), { full: true });
  const uny = Object.keys(un).map(Number).filter((y) => y <= to);
  if (uny.length >= 3) {
    const y = Math.max(...uny);
    const v = (un[y] + un[y - 1] + un[y - 2]) / 3;
    add("unemp", L(`Rata șomajului, media ${y - 2}–${y}`, `Unemployment rate, ${y - 2}–${y} average`), v, pc, "< 10 %", v > 10);
  }
  // fiscal rule is not part of the MIP scoreboard, but it is the first thing a reader asks
  const def = lastObs(obsOf("deficit_a"), to);
  if (def) add("deficit", L(`Soldul bugetar (${def[0]}) — criteriu Maastricht, nu MIP`, `Budget balance (${def[0]}) — Maastricht criterion, not MIP`), def[1], pGDP, "> −3 %", def[1] < -3);
  return rows;
}

// ------------------------------------------------------------------ report
export function buildReport(P) {
  const { from, to } = P;
  const len = to - from + 1;
  const pFrom = from - len,
    pTo = from - 1;
  const hasPrev = pFrom >= 2015;
  const sections = [];
  const risks = [];
  const questions = [];
  const summary = [];

  // ================================================================ growth
  {
    const out = [];
    const g = annual("gdp_real_a", from, to);
    const gEU = annual("gdp_real_a_eu", from, to);
    const ys = Object.keys(g).map(Number);
    if (ys.length) {
      const avg = mean(vals(g));
      const avgEU = mean(Object.keys(g).filter((y) => isNum(gEU[y])).map((y) => gEU[y]));
      const cum = (vals(g).reduce((a, x) => a * (1 + x / 100), 1) - 1) * 100;
      const best = maxBy(Object.entries(g));
      const worst = minBy(Object.entries(g));
      const rec = Object.entries(g).filter(([, v]) => v < 0).map(([y]) => y);
      out.push(
        L(
          `Între ${firstKey(g)} și ${lastKey(g)}, PIB-ul real a crescut în medie cu ${pc(avg)} pe an — ${growthWord(avg)} — ceea ce înseamnă o creștere cumulată de ${pc(cum)}.${isNum(avgEU) ? ` Media UE27 în aceiași ani a fost ${pc(avgEU)}, deci diferențialul de creștere a fost de ${pp(avg - avgEU)} pe an.` : ""}`,
          `Between ${firstKey(g)} and ${lastKey(g)}, real GDP grew on average by ${pc(avg)} a year — ${growthWord(avg)} — a cumulative increase of ${pc(cum)}.${isNum(avgEU) ? ` The EU27 average over the same years was ${pc(avgEU)}, a growth differential of ${pp(avg - avgEU)} a year.` : ""}`
        )
      );
      if (ys.length > 1)
        out.push(
          L(
            `Cel mai bun an a fost ${best[0]} (${sgn(best[1], 1)} %), cel mai slab ${worst[0]} (${sgn(worst[1], 1)} %).${rec.length ? ` Economia a trecut prin contracție în ${rec.join(", ")}.` : " Niciun an din perioadă nu a înregistrat contracție."} Seria anuală: ${listYears(g)}.`,
            `The best year was ${best[0]} (${sgn(best[1], 1)}%), the weakest ${worst[0]} (${sgn(worst[1], 1)}%).${rec.length ? ` The economy contracted in ${rec.join(", ")}.` : " No year in the period saw a contraction."} Annual series: ${listYears(g)}.`
          )
        );
      summary.push(
        L(
          `Creștere: ${pc(avg)} pe an în medie (${growthWord(avg)})${isNum(avgEU) ? `, față de ${pc(avgEU)} în UE27` : ""}.`,
          `Growth: ${pc(avg)} a year on average (${growthWord(avg)})${isNum(avgEU) ? `, vs ${pc(avgEU)} in the EU27` : ""}.`
        )
      );
      if (hasPrev) {
        const gp = annual("gdp_real_a", pFrom, pTo);
        if (Object.keys(gp).length)
          out.push(
            L(
              `Față de perioada anterioară de aceeași lungime (${pFrom}–${pTo}, medie ${pc(mean(vals(gp)))}), ritmul ${mean(vals(gp)) > avg + 0.3 ? "a încetinit" : mean(vals(gp)) < avg - 0.3 ? "s-a accelerat" : "a rămas similar"}.`,
              `Compared with the previous period of equal length (${pFrom}–${pTo}, average ${pc(mean(vals(gp)))}), growth ${mean(vals(gp)) > avg + 0.3 ? "slowed" : mean(vals(gp)) < avg - 0.3 ? "accelerated" : "was similar"}.`
            )
          );
      }
    }
    // drivers
    const parts = [
      ["contrib_cons_a", L("consumul gospodăriilor", "household consumption")],
      ["contrib_gov_a", L("consumul public", "public consumption")],
      ["contrib_gfcf_a", L("investițiile (formarea brută de capital fix)", "investment (gross fixed capital formation)")],
      ["contrib_inv_a", L("variația stocurilor", "inventory changes")],
    ].map(([id, lab]) => [lab, mean(vals(annual(id, from, to)))]);
    const g2 = mean(vals(annual("gdp_real_a", from, to)));
    if (parts.every(([, v]) => isNum(v)) && isNum(g2)) {
      const nx = g2 - parts.reduce((a, [, v]) => a + v, 0);
      parts.push([L("exportul net", "net exports"), nx]);
      const sorted = [...parts].sort((a, b) => b[1] - a[1]);
      const cons = parts[0][1];
      out.push(
        L(
          `Motorul creșterii: în medie, ${sorted[0][0]} a adus ${pp(sorted[0][1])} pe an, urmat de ${sorted[1][0]} (${pp(sorted[1][1])}); ${parts
            .filter(([, v]) => v < 0)
            .map(([l, v]) => `${l} a scăzut creșterea cu ${nf(Math.abs(v), 1)} pp`)
            .join(", ") || "nicio componentă nu a avut contribuție medie negativă"}.${cons > 0.6 * g2 && g2 > 0 ? " Modelul de creștere este dominat de consum, ceea ce tinde să alimenteze importurile și deficitul extern." : ""}`,
          `Growth engine: on average ${sorted[0][0]} added ${pp(sorted[0][1])} a year, followed by ${sorted[1][0]} (${pp(sorted[1][1])}); ${parts
            .filter(([, v]) => v < 0)
            .map(([l, v]) => `${l} subtracted ${nf(Math.abs(v), 1)} pp`)
            .join(", ") || "no component had a negative average contribution"}.${cons > 0.6 * g2 && g2 > 0 ? " The growth model is consumption-led, which tends to feed imports and the external deficit." : ""}`
        )
      );
      if (cons > 0.6 * g2 && g2 > 0) questions.push(L("Este sustenabil un model de creștere bazat pe consum, într-o economie cu deficit de cont curent? Ce ar trebui să se schimbe pentru ca investițiile și exporturile să preia rolul?", "Is a consumption-led growth model sustainable in an economy with a current-account deficit? What would have to change for investment and exports to take over?"));
    }
    // momentum
    const q = st(obsOf("gdp_yoy_q"), from, to);
    if (q) {
      const last4 = q.obs.slice(-4);
      const qoq = inP(obsOf("gdp_qoq_q"), from, to).slice(-2);
      const tech = qoq.length === 2 && qoq.every(([, v]) => v < 0);
      out.push(
        L(
          `Dinamica la final de perioadă: în ${fmtPeriod(q.last[0])}, PIB-ul era cu ${sgn(q.last[1], 1)} % față de același trimestru al anului anterior (ultimele patru trimestre: ${last4.map(([p, v]) => `${fmtPeriod(p)} ${sgn(v, 1)} %`).join(", ")}).${tech ? " Ultimele două trimestre au înregistrat scăderi față de trimestrul anterior — definiția tehnică a recesiunii." : ""}`,
          `Momentum at the end of the period: in ${fmtPeriod(q.last[0])} GDP was ${sgn(q.last[1], 1)}% above the same quarter a year earlier (last four quarters: ${last4.map(([p, v]) => `${fmtPeriod(p)} ${sgn(v, 1)}%`).join(", ")}).${tech ? " The last two quarters both fell quarter on quarter — the technical definition of a recession." : ""}`
        )
      );
      if (tech || q.last[1] < 0) risks.push(L(`Activitatea economică se contractă la final de perioadă (${fmtPeriod(q.last[0])}: ${sgn(q.last[1], 1)} % an/an).`, `Economic activity is contracting at the end of the period (${fmtPeriod(q.last[0])}: ${sgn(q.last[1], 1)}% y/y).`));
    }
    // high-frequency & sentiment
    const hf = [
      ["indprod_m", L("producția industrială", "industrial production")],
      ["retail_m", L("comerțul cu amănuntul", "retail trade")],
      ["constr_m", L("construcțiile", "construction")],
    ]
      .map(([id, lab]) => {
        const s = st(obsOf(id), from, to);
        if (!s || s.obs.length < 3) return null;
        const m3 = mean(s.obs.slice(-3).map((o) => o[1]));
        return `${lab} ${sgn(m3, 1)} %`;
      })
      .filter(Boolean);
    const esi = st(obsOf("esi_m"), from, to);
    if (hf.length)
      out.push(
        L(
          `Indicatorii lunari (media ultimelor trei luni, variație anuală): ${hf.join(", ")}.${esi ? ` Indicatorul de sentiment economic era la ${nf(esi.last[1], 1)} în ${fmtPeriod(esi.last[0])} — ${esi.last[1] >= 100 ? "peste" : "sub"} media pe termen lung (100).` : ""}`,
          `Monthly indicators (last three months average, year on year): ${hf.join(", ")}.${esi ? ` The economic sentiment indicator stood at ${nf(esi.last[1], 1)} in ${fmtPeriod(esi.last[0])} — ${esi.last[1] >= 100 ? "above" : "below"} its long-term average (100).` : ""}`
        )
      );
    const pps = annual("gdp_pc_pps_a", from, to);
    if (Object.keys(pps).length > 1) {
      const a = pps[firstKey(pps)],
        b = pps[lastKey(pps)];
      out.push(
        L(
          `Convergența reală: PIB-ul pe locuitor la paritatea puterii de cumpărare a trecut de la ${nf(a, 0)} % la ${nf(b, 0)} % din media UE (${firstKey(pps)}–${lastKey(pps)}), adică ${sgn(b - a, 0)} puncte.`,
          `Real convergence: GDP per capita in purchasing power standards moved from ${nf(a, 0)}% to ${nf(b, 0)}% of the EU average (${firstKey(pps)}–${lastKey(pps)}), i.e. ${sgn(b - a, 0)} points.`
        )
      );
    }
    sections.push({ key: "growth", title: L("Creșterea economică și ciclul", "Economic growth and the cycle"), paras: out });
  }

  // ================================================================ inflation & monetary policy
  {
    const out = [];
    const h = st(obsOf("hicp_m"), from, to);
    const hEU = st(obsOf("hicp_m_eu"), from, to);
    if (h) {
      const above = h.obs.filter(([, v]) => v > 3.5).length;
      out.push(
        L(
          `Inflația anuală (IAPC) a avut o medie de ${pc(h.mean)} în perioadă${hEU ? `, față de ${pc(hEU.mean)} în UE27` : ""}. Vârful a fost atins în ${fmtPeriod(h.max[0])} (${pc(h.max[1])}), minimul în ${fmtPeriod(h.min[0])} (${pc(h.min[1])}). În ${nf((100 * above) / h.n, 0)} % din luni inflația a fost peste marginea de sus a intervalului țintei BNR (3,5 %).`,
          `Annual HICP inflation averaged ${pc(h.mean)} over the period${hEU ? `, versus ${pc(hEU.mean)} in the EU27` : ""}. It peaked in ${fmtPeriod(h.max[0])} (${pc(h.max[1])}) and bottomed in ${fmtPeriod(h.min[0])} (${pc(h.min[1])}). In ${nf((100 * above) / h.n, 0)}% of the months inflation was above the upper edge of the NBR target band (3.5%).`
        )
      );
      const core = lastObs(inP(obsOf("hicp_core_m"), from, to), to);
      const trend = h.obs.length >= 7 ? h.last[1] - h.obs[h.obs.length - 7][1] : null;
      out.push(
        L(
          `La final (${fmtPeriod(h.last[0])}), inflația era ${pc(h.last[1])} — ${inflWord(h.last[1])}${isNum(trend) ? `, ${trend < -0.5 ? "în scădere (dezinflație)" : trend > 0.5 ? "în creștere" : "relativ stabilă"} în ultimele șase luni (${pp(trend)})` : ""}.${core ? ` Inflația de bază (fără energie și alimente) era ${pc(core[1])}${core[1] > h.last[1] + 0.3 ? ", peste inflația totală: presiunile sunt larg răspândite și persistente" : core[1] < h.last[1] - 0.3 ? ", sub inflația totală: presiunea vine mai ales din energie și alimente" : ""}.` : ""}`,
          `At the end (${fmtPeriod(h.last[0])}) inflation was ${pc(h.last[1])} — ${inflWord(h.last[1])}${isNum(trend) ? `, ${trend < -0.5 ? "falling (disinflation)" : trend > 0.5 ? "rising" : "fairly stable"} over the last six months (${pp(trend)})` : ""}.${core ? ` Core inflation (excluding energy and food) was ${pc(core[1])}${core[1] > h.last[1] + 0.3 ? ", above headline: price pressures are broad-based and persistent" : core[1] < h.last[1] - 0.3 ? ", below headline: pressure comes mainly from energy and food" : ""}.` : ""}`
        )
      );
      summary.push(
        L(
          `Inflație: medie ${pc(h.mean)}, vârf ${pc(h.max[1])} (${fmtPeriod(h.max[0])}), final ${pc(h.last[1])} — ${inflWord(h.last[1])}.`,
          `Inflation: average ${pc(h.mean)}, peak ${pc(h.max[1])} (${fmtPeriod(h.max[0])}), end ${pc(h.last[1])} — ${inflWord(h.last[1])}.`
        )
      );
      if (h.last[1] > 3.5) risks.push(L(`Inflația rămâne peste intervalul țintei (${pc(h.last[1])} în ${fmtPeriod(h.last[0])}), cu risc pentru așteptările inflaționiste și pentru veniturile reale.`, `Inflation remains above the target band (${pc(h.last[1])} in ${fmtPeriod(h.last[0])}), a risk for inflation expectations and real incomes.`));
      if (hEU && h.mean - hEU.mean > 1.5)
        questions.push(L("De ce a fost inflația din România sistematic peste media UE? Ce rol au avut prețurile administrate, cursul de schimb și politica fiscală?", "Why was Romanian inflation systematically above the EU average? What role did administered prices, the exchange rate and fiscal policy play?"));
    }
    const pr = st(obsOf("policy_rate_m"), from, to);
    if (pr) {
      const moves = [];
      for (let i = 1; i < pr.obs.length; i++) {
        const d = pr.obs[i][1] - pr.obs[i - 1][1];
        if (Math.abs(d) > 0.01) moves.push([pr.obs[i][0], d]);
      }
      const hikes = moves.filter(([, d]) => d > 0),
        cuts = moves.filter(([, d]) => d < 0);
      const bp = (a) => nf(Math.abs(a.reduce((s, [, d]) => s + d, 0)) * 100, 0);
      out.push(
        L(
          `Politica monetară: dobânda BNR a pornit de la ${pc(pr.first[1], 2)} și a încheiat perioada la ${pc(pr.last[1], 2)}, cu un maxim de ${pc(pr.max[1], 2)}. ${hikes.length ? `Au existat ${hikes.length} luni cu majorări (în total ${bp(hikes)} puncte de bază, prima în ${fmtPeriod(hikes[0][0])})` : "Nu au existat majorări"}${cuts.length ? ` și ${cuts.length} cu reduceri (${bp(cuts)} puncte de bază)` : ""}.`,
          `Monetary policy: the NBR rate started at ${pc(pr.first[1], 2)} and ended at ${pc(pr.last[1], 2)}, with a maximum of ${pc(pr.max[1], 2)}. ${hikes.length ? `There were ${hikes.length} months with hikes (${bp(hikes)} basis points in total, the first in ${fmtPeriod(hikes[0][0])})` : "There were no hikes"}${cuts.length ? ` and ${cuts.length} with cuts (${bp(cuts)} basis points)` : ""}.`
        )
      );
      if (h) {
        const hm = Object.fromEntries(h.obs);
        const real = pr.obs.filter(([p]) => isNum(hm[p])).map(([p, v]) => [p, v - hm[p]]);
        if (real.length) {
          const avgR = mean(real.map((o) => o[1]));
          const neg = real.filter(([, v]) => v < 0).length;
          const lastR = real[real.length - 1];
          out.push(
            L(
              `Dobânda reală (dobânda BNR minus inflația anuală) a avut o medie de ${pp(avgR)} și a fost negativă în ${nf((100 * neg) / real.length, 0)} % din luni; la final era ${pp(lastR[1])} — o politică monetară ${lastR[1] > 0.5 ? "restrictivă în termeni reali" : lastR[1] < -0.5 ? "încă stimulativă în termeni reali" : "aproximativ neutră"}.`,
              `The real rate (NBR rate minus annual inflation) averaged ${pp(avgR)} and was negative in ${nf((100 * neg) / real.length, 0)}% of the months; at the end it was ${pp(lastR[1])} — a monetary stance that is ${lastR[1] > 0.5 ? "restrictive in real terms" : lastR[1] < -0.5 ? "still stimulative in real terms" : "roughly neutral"}.`
            )
          );
          if (neg / real.length > 0.4) questions.push(L("Dobânda reală a fost negativă o bună parte din perioadă. De ce ar alege o bancă centrală această abordare și care sunt costurile ei?", "The real rate was negative for much of the period. Why would a central bank choose this and what are its costs?"));
        }
      }
    }
    const b10 = st(obsOf("bond10y_m"), from, to);
    const r3 = st(obsOf("irate3m_m"), from, to);
    if (b10)
      out.push(
        L(
          `Piețele: ${r3 ? `ROBOR 3M a încheiat la ${pc(r3.last[1], 2)}, ` : ""}randamentul titlurilor de stat la 10 ani la ${pc(b10.last[1], 2)} (maxim ${pc(b10.max[1], 2)} în ${fmtPeriod(b10.max[0])}).${pr ? ` Diferența față de dobânda BNR, de ${pp(b10.last[1] - pr.last[1], 2)}, măsoară prima de termen și de risc cerută de investitori pentru datoria statului.` : ""}`,
          `Markets: ${r3 ? `3M ROBOR ended at ${pc(r3.last[1], 2)}, ` : ""}the 10-year government bond yield at ${pc(b10.last[1], 2)} (peak ${pc(b10.max[1], 2)} in ${fmtPeriod(b10.max[0])}).${pr ? ` The gap to the NBR rate, ${pp(b10.last[1] - pr.last[1], 2)}, measures the term and risk premium investors demand on government debt.` : ""}`
        )
      );
    if (b10 && b10.last[1] > 6.5) risks.push(L(`Costul de finanțare al statului este ridicat (randament la 10 ani ${pc(b10.last[1], 2)}), ceea ce crește povara dobânzilor.`, `The sovereign's funding cost is high (10-year yield ${pc(b10.last[1], 2)}), raising the interest burden.`));
    const hp = st(obsOf("hpi_q"), from, to);
    if (hp)
      out.push(
        L(
          `Prețurile locuințelor au crescut în medie cu ${pc(hp.mean)} pe an (nominal), cu ultimul punct la ${pc(hp.last[1])} în ${fmtPeriod(hp.last[0])}.`,
          `House prices rose on average by ${pc(hp.mean)} a year (nominal), with the latest reading at ${pc(hp.last[1])} in ${fmtPeriod(hp.last[0])}.`
        )
      );
    sections.push({ key: "prices", title: L("Inflația și politica monetară", "Inflation and monetary policy"), paras: out });
  }

  // ================================================================ labour
  {
    const out = [];
    const u = st(obsOf("unemp_m"), from, to);
    const uEU = st(obsOf("unemp_m_eu"), from, to);
    if (u) {
      out.push(
        L(
          `Rata șomajului a pornit de la ${pc(u.first[1])} (${fmtPeriod(u.first[0])}) și a ajuns la ${pc(u.last[1])} (${fmtPeriod(u.last[0])}), cu un minim de ${pc(u.min[1])} în ${fmtPeriod(u.min[0])}.${uEU ? ` Media UE27 la final: ${pc(uEU.last[1])} — România ${u.last[1] < uEU.last[1] ? "sub" : "peste"} media europeană.` : ""} ${u.last[1] - u.min[1] > 0.7 ? "Revenirea de la minim sugerează o piață a muncii care începe să se relaxeze." : "Piața muncii rămâne strânsă."}`,
          `The unemployment rate moved from ${pc(u.first[1])} (${fmtPeriod(u.first[0])}) to ${pc(u.last[1])} (${fmtPeriod(u.last[0])}), with a low of ${pc(u.min[1])} in ${fmtPeriod(u.min[0])}.${uEU ? ` EU27 average at the end: ${pc(uEU.last[1])} — Romania ${u.last[1] < uEU.last[1] ? "below" : "above"} the European average.` : ""} ${u.last[1] - u.min[1] > 0.7 ? "The rise from the low suggests a labour market that is starting to loosen." : "The labour market remains tight."}`
        )
      );
      summary.push(L(`Piața muncii: șomaj ${pc(u.first[1])} → ${pc(u.last[1])}.`, `Labour market: unemployment ${pc(u.first[1])} → ${pc(u.last[1])}.`));
    }
    const yU = st(obsOf("unemp_youth_m"), from, to);
    if (yU) out.push(L(`Șomajul în rândul tinerilor sub 25 de ani era ${pc(yU.last[1])} în ${fmtPeriod(yU.last[0])} (medie ${pc(yU.mean)} în perioadă).`, `Youth unemployment (under 25) was ${pc(yU.last[1])} in ${fmtPeriod(yU.last[0])} (period average ${pc(yU.mean)}).`));
    const e = annual("emp_rate_a", from, to);
    const eEU = annual("emp_rate_a_eu", from, to);
    if (Object.keys(e).length) {
      const y1 = lastKey(e);
      out.push(
        L(
          `Rata de ocupare (20–64 de ani) a evoluat de la ${pc(e[firstKey(e)])} la ${pc(e[y1])} (${firstKey(e)}–${y1})${isNum(eEU[y1]) ? `, față de ${pc(eEU[y1])} în UE27` : ""}; distanța până la ținta UE pentru 2030 (78 %) este de ${nf(78 - e[y1], 1)} pp. Participarea scăzută, nu șomajul, este principala limită a pieței muncii din România.`,
          `The employment rate (20–64) moved from ${pc(e[firstKey(e)])} to ${pc(e[y1])} (${firstKey(e)}–${y1})${isNum(eEU[y1]) ? `, versus ${pc(eEU[y1])} in the EU27` : ""}; the gap to the EU 2030 target (78%) is ${nf(78 - e[y1], 1)} pp. Low participation, not unemployment, is the main constraint of Romania's labour market.`
        )
      );
    }
    const lci = st(obsOf("lci_q"), from, to);
    const h = st(obsOf("hicp_m"), from, to);
    if (lci && h)
      out.push(
        L(
          `Costul orar al muncii a crescut în medie cu ${pc(lci.mean)} pe an, față de o inflație medie de ${pc(h.mean)} — un câștig real de aproximativ ${pp(lci.mean - h.mean)} pe an.`,
          `Hourly labour costs rose on average by ${pc(lci.mean)} a year, against average inflation of ${pc(h.mean)} — a real gain of roughly ${pp(lci.mean - h.mean)} a year.`
        )
      );
    const ulc = annual("ulc_a", from, to);
    const ulcEU = annual("ulc_a_eu", from, to);
    if (Object.keys(ulc).length > 1) {
      const cum = (vals(ulc).reduce((a, x) => a * (1 + x / 100), 1) - 1) * 100;
      const cumEU = Object.keys(ulcEU).length ? (vals(ulcEU).reduce((a, x) => a * (1 + x / 100), 1) - 1) * 100 : null;
      out.push(
        L(
          `Costul unitar nominal al muncii a crescut cumulat cu ${pc(cum, 0)} între ${firstKey(ulc)} și ${lastKey(ulc)}${isNum(cumEU) ? `, față de ${pc(cumEU, 0)} în UE27` : ""}: salariile au crescut mai repede decât productivitatea, ceea ce erodează competitivitatea prin costuri.`,
          `Nominal unit labour costs rose cumulatively by ${pc(cum, 0)} between ${firstKey(ulc)} and ${lastKey(ulc)}${isNum(cumEU) ? `, versus ${pc(cumEU, 0)} in the EU27` : ""}: wages grew faster than productivity, eroding cost competitiveness.`
        )
      );
      if (isNum(cumEU) && cum - cumEU > 15) risks.push(L("Costul unitar al muncii crește mult mai repede decât în UE, cu presiune asupra competitivității externe.", "Unit labour costs are rising much faster than in the EU, putting pressure on external competitiveness."));
    }
    const w = annual("ins_wage_m", from, to);
    if (Object.keys(w).length > 1) {
      const y0 = firstKey(w),
        y1 = lastKey(w);
      const hA = annual("hicp_m", y0 + 1, y1, { full: true });
      const price = vals(hA).reduce((a, x) => a * (1 + x / 100), 1);
      const nom = cagr(w[y0], w[y1], y1 - y0);
      const realG = Object.keys(hA).length === y1 - y0 ? (Math.pow(w[y1] / w[y0] / price, 1 / (y1 - y0)) - 1) * 100 : null;
      out.push(
        L(
          `Câștigul salarial mediu net (INS) a trecut de la ${nf(w[y0], 0)} lei în ${y0} la ${nf(w[y1], 0)} lei în ${y1}: ${pc(nom)} pe an nominal${isNum(realG) ? ` și aproximativ ${pc(realG)} pe an în termeni reali` : ""}.`,
          `Average net earnings (INS) rose from RON ${nf(w[y0], 0)} in ${y0} to RON ${nf(w[y1], 0)} in ${y1}: ${pc(nom)} a year in nominal terms${isNum(realG) ? ` and about ${pc(realG)} a year in real terms` : ""}.`
        )
      );
    }
    sections.push({ key: "labour", title: L("Piața muncii și veniturile", "Labour market and incomes"), paras: out });
  }

  // ================================================================ public finances
  {
    const out = [];
    const d = annual("deficit_a", from, to);
    const dEU = annual("deficit_a_eu", from, to);
    if (Object.keys(d).length) {
      const avg = mean(vals(d));
      const worst = minBy(Object.entries(d));
      const y1 = lastKey(d);
      const over = Object.entries(d).filter(([, v]) => v < -3).map(([y]) => y);
      out.push(
        L(
          `Soldul bugetar (metodologie ESA) a avut o medie de ${pGDP(avg)} în ${firstKey(d)}–${y1}${Object.keys(dEU).length ? `, față de ${pGDP(mean(vals(dEU)))} în UE27` : ""}. Cel mai mare deficit a fost în ${worst[0]} (${pGDP(worst[1])}); în ${y1} soldul era ${pGDP(d[y1])} — ${deficitWord(d[y1])}. ${over.length ? `Pragul de 3 % a fost depășit în ${over.length} din ${Object.keys(d).length} ani (${over.join(", ")}).` : "Pragul de 3 % a fost respectat în toți anii."}`,
          `The budget balance (ESA methodology) averaged ${pGDP(avg)} in ${firstKey(d)}–${y1}${Object.keys(dEU).length ? `, versus ${pGDP(mean(vals(dEU)))} in the EU27` : ""}. The largest deficit was in ${worst[0]} (${pGDP(worst[1])}); in ${y1} the balance was ${pGDP(d[y1])} — ${deficitWord(d[y1])}. ${over.length ? `The 3% threshold was breached in ${over.length} of ${Object.keys(d).length} years (${over.join(", ")}).` : "The 3% threshold was respected in every year."}`
        )
      );
      summary.push(L(`Buget: deficit mediu ${pGDP(Math.abs(avg))}, ${y1}: ${pGDP(d[y1])}.`, `Budget: average deficit ${pGDP(Math.abs(avg))}, ${y1}: ${pGDP(d[y1])}.`));
      // pro-cyclicality: deficit widening while growth above 3%
      const g = annual("gdp_real_a", from, to);
      const pro = Object.keys(d)
        .map(Number)
        .filter((y) => isNum(d[y - 1] ?? byYear(obsOf("deficit_a"))[y - 1]) && isNum(g[y]) && g[y] > 3 && d[y] < (d[y - 1] ?? byYear(obsOf("deficit_a"))[y - 1]) - 0.3);
      if (pro.length)
        out.push(
          L(
            `Politica fiscală a fost prociclică în ${pro.join(", ")}: deficitul s-a adâncit deși economia creștea cu peste 3 %. Spațiul fiscal care ar fi trebuit construit în anii buni a lipsit în anii de criză.`,
            `Fiscal policy was pro-cyclical in ${pro.join(", ")}: the deficit widened while the economy grew by more than 3%. The fiscal space that should have been built in good years was missing in bad ones.`
          )
        );
      if (d[y1] < -3) {
        risks.push(L(`Deficitul bugetar (${pGDP(d[y1])} în ${y1}) depășește pragul de 3 % — risc de procedură de deficit excesiv, de creștere a costului de finanțare și de retrogradare a ratingului.`, `The budget deficit (${pGDP(d[y1])} in ${y1}) exceeds the 3% threshold — risk of an excessive deficit procedure, higher funding costs and a rating downgrade.`));
        questions.push(L("Ce combinație de măsuri pe venituri și pe cheltuieli ar reduce deficitul fără să oprească creșterea economică? Ce spun multiplicatorii fiscali?", "What mix of revenue and spending measures would reduce the deficit without stalling growth? What do fiscal multipliers suggest?"));
      }
    }
    const debt = annual("debt_a", from, to);
    if (Object.keys(debt).length) {
      const y0 = firstKey(debt),
        y1 = lastKey(debt);
      const dq = lastObs(inP(obsOf("debt_q"), from, to), to);
      const dEU = annual("debt_a_eu", from, to);
      out.push(
        L(
          `Datoria publică a crescut de la ${pGDP(debt[y0])} în ${y0} la ${pGDP(debt[y1])} în ${y1} (${sgn(debt[y1] - debt[y0], 1)} pp)${dq && dq[0].slice(0, 4) > String(y1) ? `, iar ultima valoare trimestrială este ${pGDP(dq[1])} (${fmtPeriod(dq[0])})` : ""}. ${isNum(dEU[y1]) ? `Nivelul rămâne sub media UE27 (${pGDP(dEU[y1])}), dar ` : ""}${debt[y1] - debt[y0] > 8 ? "ritmul acumulării este cel care îngrijorează, nu nivelul." : "dinamica este relativ stabilă."}`,
          `Government debt rose from ${pGDP(debt[y0])} in ${y0} to ${pGDP(debt[y1])} in ${y1} (${sgn(debt[y1] - debt[y0], 1)} pp)${dq && dq[0].slice(0, 4) > String(y1) ? `, and the latest quarterly value is ${pGDP(dq[1])} (${fmtPeriod(dq[0])})` : ""}. ${isNum(dEU[y1]) ? `The level remains below the EU27 average (${pGDP(dEU[y1])}), but ` : ""}${debt[y1] - debt[y0] > 8 ? "it is the pace of accumulation that is worrying, not the level." : "the dynamics are fairly stable."}`
        )
      );
      if ((dq?.[1] ?? debt[y1]) > 55) risks.push(L(`Datoria publică se apropie de pragul de 60 % din PIB (${pGDP(dq?.[1] ?? debt[y1])}).`, `Public debt is approaching the 60% of GDP threshold (${pGDP(dq?.[1] ?? debt[y1])}).`));
    }
    const rev = annual("gov_rev_a", from, to),
      exp = annual("gov_exp_a", from, to),
      revEU = annual("gov_rev_a_eu", from, to),
      expEU = annual("gov_exp_a_eu", from, to);
    if (Object.keys(rev).length && Object.keys(exp).length)
      out.push(
        L(
          `Structura: veniturile au fost în medie ${pGDP(mean(vals(rev)))}${Object.keys(revEU).length ? ` (UE27: ${pGDP(mean(vals(revEU)))})` : ""}, cheltuielile ${pGDP(mean(vals(exp)))}${Object.keys(expEU).length ? ` (UE27: ${pGDP(mean(vals(expEU)))})` : ""}. ${Object.keys(revEU).length && mean(vals(revEU)) - mean(vals(rev)) > 5 ? "Problema bugetară este în primul rând una de venituri: statul colectează cu mult mai puțin decât media europeană, în timp ce cheltuielile sunt sub medie, dar rigide (salarii, pensii, dobânzi)." : ""}`,
          `Structure: revenue averaged ${pGDP(mean(vals(rev)))}${Object.keys(revEU).length ? ` (EU27: ${pGDP(mean(vals(revEU)))})` : ""}, expenditure ${pGDP(mean(vals(exp)))}${Object.keys(expEU).length ? ` (EU27: ${pGDP(mean(vals(expEU)))})` : ""}. ${Object.keys(revEU).length && mean(vals(revEU)) - mean(vals(rev)) > 5 ? "The budget problem is first of all a revenue problem: the state collects far less than the European average, while spending is below average but rigid (wages, pensions, interest)." : ""}`
        )
      );
    const int = annual("gov_int_a", from, to);
    if (Object.keys(int).length > 1) {
      const y0 = firstKey(int),
        y1 = lastKey(int);
      out.push(
        L(
          `Cheltuielile cu dobânzile au trecut de la ${pGDP(int[y0])} la ${pGDP(int[y1])} (${y0}–${y1}).${int[y1] - int[y0] > 0.7 ? " Creșterea lor reduce spațiul pentru investiții publice și face ajustarea mai dificilă." : ""}`,
          `Interest expenditure went from ${pGDP(int[y0])} to ${pGDP(int[y1])} (${y0}–${y1}).${int[y1] - int[y0] > 0.7 ? " The increase squeezes room for public investment and makes adjustment harder." : ""}`
        )
      );
      if (int[y1] - int[y0] > 0.7) risks.push(L(`Povara dobânzilor crește (${pGDP(int[y1])} în ${y1}).`, `The interest burden is rising (${pGDP(int[y1])} in ${y1}).`));
    }
    sections.push({ key: "fiscal", title: L("Finanțele publice", "Public finances"), paras: out });
  }

  // ================================================================ external sector
  {
    const out = [];
    const ca = caAnnual();
    const caP = Object.fromEntries(Object.entries(ca).filter(([y]) => +y >= from && +y <= to));
    const caSrc = Object.keys(caP).length ? caP : annual("imf_ca", from, Math.min(to, new Date().getFullYear() - 1));
    if (Object.keys(caSrc).length) {
      const y1 = lastKey(caSrc);
      const avg = mean(vals(caSrc));
      out.push(
        L(
          `Contul curent a înregistrat un deficit mediu de ${pGDP(Math.abs(avg))} (${firstKey(caSrc)}–${y1}), ajungând la ${pGDP(caSrc[y1])} în ${y1}. ${caSrc[y1] < -4 ? "Nivelul depășește pragul de alertă de −4 % folosit de Comisia Europeană." : ""}`,
          `The current account ran an average deficit of ${pGDP(Math.abs(avg))} (${firstKey(caSrc)}–${y1}), reaching ${pGDP(caSrc[y1])} in ${y1}. ${caSrc[y1] < -4 ? "This is beyond the −4% alert threshold used by the European Commission." : ""}`
        )
      );
      summary.push(L(`Extern: cont curent ${pGDP(caSrc[y1])} în ${y1}.`, `External: current account ${pGDP(caSrc[y1])} in ${y1}.`));
      const comps = ["goods_q", "services_q", "primary_q", "secondary_q"].map((id) => caAnnual(id)[y1]);
      if (comps.every(isNum))
        out.push(
          L(
            `Descompunerea în ${y1}: bunuri ${pGDP(comps[0])}, servicii ${pGDP(comps[1])}, venituri primare (dividende, dobânzi, salarii) ${pGDP(comps[2])}, venituri secundare (transferuri, remitențe) ${pGDP(comps[3])}. Deficitul provine din comerțul cu bunuri, parțial compensat de exportul de servicii.`,
            `Breakdown in ${y1}: goods ${pGDP(comps[0])}, services ${pGDP(comps[1])}, primary income (dividends, interest, wages) ${pGDP(comps[2])}, secondary income (transfers, remittances) ${pGDP(comps[3])}. The deficit comes from goods trade, partly offset by services exports.`
          )
        );
      const d = annual("deficit_a", from, to);
      if (isNum(d[y1]) && d[y1] < -3 && caSrc[y1] < -4) {
        out.push(
          L(
            `România a avut simultan deficit bugetar și deficit extern mare — „deficitele gemene”. Când statul cheltuie mai mult decât încasează și sectorul privat nu economisește suficient, diferența se finanțează din exterior.`,
            `Romania ran a large budget deficit and a large external deficit at the same time — “twin deficits”. When the state spends more than it collects and the private sector does not save enough, the gap is financed from abroad.`
          )
        );
        risks.push(L("Deficitele gemene (bugetar și de cont curent) fac economia vulnerabilă la schimbarea sentimentului investitorilor și la presiuni pe curs.", "Twin deficits (budget and current account) make the economy vulnerable to shifts in investor sentiment and currency pressure."));
        questions.push(L("Cât din deficitul de cont curent se explică prin deficitul bugetar? Folosiți identitatea economisire–investiții pentru a argumenta.", "How much of the current-account deficit is explained by the budget deficit? Use the saving–investment identity to argue."));
      }
      const fdi = annual("wb_fdi_gdp", from, to);
      if (Object.keys(fdi).length && avg < 0)
        out.push(
          L(
            `Investițiile străine directe au adus în medie ${pGDP(mean(vals(fdi)))} pe an, adică au acoperit aproximativ ${nf(Math.min(999, (100 * mean(vals(fdi))) / Math.abs(avg)), 0)} % din deficitul de cont curent — restul s-a finanțat prin datorie.`,
            `Foreign direct investment brought on average ${pGDP(mean(vals(fdi)))} a year, covering roughly ${nf(Math.min(999, (100 * mean(vals(fdi))) / Math.abs(avg)), 0)}% of the current-account deficit — the rest was debt-financed.`
          )
        );
    }
    const niip = annual("niip_a", from, to);
    if (Object.keys(niip).length > 1) {
      const y0 = firstKey(niip),
        y1 = lastKey(niip);
      out.push(
        L(
          `Poziția investițională internațională netă s-a modificat de la ${pGDP(niip[y0])} la ${pGDP(niip[y1])} (${y0}–${y1}); ${niip[y1] < -35 ? "rămâne sub pragul MIP de −35 %, deci pasivele externe nete sunt ridicate" : "este peste pragul MIP de −35 %"}. O parte importantă a pasivelor sunt însă investiții directe, mai stabile decât datoria.`,
          `The net international investment position moved from ${pGDP(niip[y0])} to ${pGDP(niip[y1])} (${y0}–${y1}); ${niip[y1] < -35 ? "it remains below the −35% MIP threshold, so net external liabilities are high" : "it is above the −35% MIP threshold"}. A large share of liabilities, however, is direct investment, which is more stable than debt.`
        )
      );
    }
    const fxId = has("eurron_m") ? "eurron_m" : "eurron_m_es";
    const fx = st(obsOf(fxId), from, to);
    if (fx && fx.n > 12) {
      const ch = (fx.last[1] / fx.first[1] - 1) * 100;
      const yrs = (yearOf(fx.last[0]) * 12 + +fx.last[0].slice(5, 7) - (yearOf(fx.first[0]) * 12 + +fx.first[0].slice(5, 7))) / 12;
      const mret = fx.obs.slice(1).map((o, i) => (o[1] / fx.obs[i][1] - 1) * 100);
      const worst = maxBy(mret.map((v, i) => [fx.obs[i + 1][0], v]));
      out.push(
        L(
          `Cursul EUR/RON a trecut de la ${nf(fx.first[1], 4)} la ${nf(fx.last[1], 4)} lei (${sgn(ch, 1)} %, adică ${sgn(ch / Math.max(yrs, 1), 1)} % pe an), cu o volatilitate lunară de doar ${nf(std(mret), 2)} % — semnul unui regim de flotare puternic controlată.${worst[1] > 1.5 ? ` Cea mai mare depreciere lunară: ${fmtPeriod(worst[0])} (${sgn(worst[1], 1)} %).` : ""}`,
          `EUR/RON moved from ${nf(fx.first[1], 4)} to ${nf(fx.last[1], 4)} (${sgn(ch, 1)}%, i.e. ${sgn(ch / Math.max(yrs, 1), 1)}% a year), with monthly volatility of only ${nf(std(mret), 2)}% — the mark of a tightly managed float.${worst[1] > 1.5 ? ` Largest monthly depreciation: ${fmtPeriod(worst[0])} (${sgn(worst[1], 1)}%).` : ""}`
        )
      );
      const reer = st(obsOf("reer_m"), from, to);
      if (reer) {
        const rch = (reer.last[1] / reer.first[1] - 1) * 100;
        out.push(
          L(
            `În termeni reali, leul s-a ${rch > 0 ? "apreciat" : "depreciat"} cu ${nf(Math.abs(rch), 1)} % (cursul real efectiv, BIS): ${rch > 5 ? "inflația internă mai mare decât la parteneri, cu un curs nominal stabil, a scumpit produsele românești — o pierdere de competitivitate prin prețuri." : "competitivitatea prin prețuri nu s-a deteriorat semnificativ."}`,
            `In real terms the leu ${rch > 0 ? "appreciated" : "depreciated"} by ${nf(Math.abs(rch), 1)}% (real effective exchange rate, BIS): ${rch > 5 ? "higher domestic inflation than in partner countries, with a stable nominal rate, made Romanian goods dearer — a loss of price competitiveness." : "price competitiveness did not deteriorate significantly."}`
          )
        );
        if (rch > 8) questions.push(L("Un curs nominal stabil împreună cu inflație ridicată înseamnă apreciere reală. Care sunt avantajele și costurile acestei strategii pentru o economie cu deficit extern?", "A stable nominal rate combined with high inflation means real appreciation. What are the benefits and costs of this strategy for an economy with an external deficit?"));
      }
    }
    sections.push({ key: "external", title: L("Echilibrele externe și cursul de schimb", "External balances and the exchange rate"), paras: out });
  }

  // ================================================================ scoreboard-based risks
  const sb = scoreboard(P);
  const breaches = sb.filter((r) => r.breach);
  summary.push(
    L(
      `Tabloul de dezechilibre: ${breaches.length} din ${sb.length} indicatori peste prag${breaches.length ? ` (${breaches.map((b) => b.label.replace(/ \(.*\)$/, "").replace(/,.*$/, "").toLowerCase()).join("; ")})` : ""}.`,
      `Imbalance scoreboard: ${breaches.length} of ${sb.length} indicators beyond threshold${breaches.length ? ` (${breaches.map((b) => b.label.replace(/ \(.*\)$/, "").replace(/,.*$/, "").toLowerCase()).join("; ")})` : ""}.`
    )
  );

  // ================================================================ period character (first summary line)
  {
    const g = mean(vals(annual("gdp_real_a", from, to)));
    const h = st(obsOf("hicp_m"), from, to);
    const d = mean(vals(annual("deficit_a", from, to)));
    const ca = mean(vals(Object.fromEntries(Object.entries(caAnnual()).filter(([y]) => +y >= from && +y <= to))));
    const tags = [];
    if (isNum(g) && g < 0) tags.push(L("recesiune", "recession"));
    else if (isNum(g) && h && g < 1.5 && h.mean > 5) tags.push(L("stagflație (creștere slabă și inflație ridicată)", "stagflation (weak growth and high inflation)"));
    else if (isNum(g) && g >= 3.5) tags.push(L("expansiune rapidă", "rapid expansion"));
    else if (isNum(g)) tags.push(growthWord(g));
    if (h && h.mean > 5) tags.push(L("presiuni inflaționiste puternice", "strong inflationary pressure"));
    else if (h && h.mean < 2) tags.push(L("inflație redusă", "low inflation"));
    if (isNum(d) && d < -3 && isNum(ca) && ca < -3) tags.push(L("deficite gemene", "twin deficits"));
    else if (isNum(d) && d < -3) tags.push(L("deficit bugetar excesiv", "excessive budget deficit"));
    summary.unshift(
      L(`Perioada ${from}–${to} se caracterizează prin: ${tags.join(", ")}.`, `The period ${from}–${to} is characterised by: ${tags.join(", ")}.`)
    );
  }

  // ================================================================ outlook (IMF)
  {
    const out = [];
    const cy = new Date().getFullYear();
    const pick = (id) => byYear(obsOf(id));
    const g = pick("imf_gdp"),
      c = pick("imf_cpi"),
      b = pick("imf_balance"),
      dbt = pick("imf_debt");
    const y1 = cy,
      y2 = cy + 1;
    if (isNum(g[y1]))
      out.push(
        L(
          `Proiecțiile FMI (World Economic Outlook, ultima ediție): creștere de ${pc(g[y1])} în ${y1} și ${pc(g[y2])} în ${y2}; inflație medie de ${pc(c[y1])} și ${pc(c[y2])}; sold bugetar de ${pGDP(b[y1])} și ${pGDP(b[y2])}; datorie publică de ${pGDP(dbt[y2])} în ${y2}${isNum(dbt[cy + 5]) ? ` și ${pGDP(dbt[cy + 5])} în ${cy + 5}` : ""}.`,
          `IMF projections (World Economic Outlook, latest vintage): growth of ${pc(g[y1])} in ${y1} and ${pc(g[y2])} in ${y2}; average inflation of ${pc(c[y1])} and ${pc(c[y2])}; budget balance of ${pGDP(b[y1])} and ${pGDP(b[y2])}; public debt of ${pGDP(dbt[y2])} in ${y2}${isNum(dbt[cy + 5]) ? ` and ${pGDP(dbt[cy + 5])} in ${cy + 5}` : ""}.`
        )
      );
    if (to < cy - 1)
      out.push(
        L(
          `Atenție: perioada aleasă se încheie în ${to}. Proiecțiile de mai sus sunt cele actuale, nu cele disponibile la momentul respectiv — un bun exercițiu este să compari ce s-a întâmplat după ${to} cu ceea ce indica analiza perioadei.`,
          `Note: the chosen period ends in ${to}. The projections above are today's, not those available at the time — a good exercise is to compare what happened after ${to} with what the analysis of the period suggested.`
        )
      );
    if (out.length) sections.push({ key: "outlook", title: L("Perspective", "Outlook"), paras: out });
  }

  if (!risks.length) risks.push(L("Niciun semnal major de risc declanșat de regulile motorului pentru această perioadă.", "No major risk signal triggered by the engine's rules for this period."));
  questions.push(
    L(
      "Ce eveniment din afara datelor (pandemie, război, prețurile energiei, fonduri europene, decizii politice) explică cel mai bine punctul de inflexiune principal al perioadei?",
      "Which event outside the data (pandemic, war, energy prices, EU funds, political decisions) best explains the main turning point of the period?"
    ),
    L(
      "Care dintre concluziile de mai sus s-ar putea schimba după revizuirea datelor? Care se bazează pe un singur trimestru?",
      "Which of the conclusions above might change after data revisions? Which rest on a single quarter?"
    )
  );

  return {
    period: { from, to },
    summary,
    sections,
    risks,
    questions: questions.slice(0, 7),
    scoreboard: sb,
  };
}

// ------------------------------------------------------------------ annual fact table (shown on the page and used in the prompt)
export function factTable(P) {
  const { from, to } = P;
  const rows = [
    ["gdp_real_a", L("PIB real, creștere (%)", "Real GDP growth (%)"), annual("gdp_real_a", from, to)],
    ["hicp_m", L("Inflația IAPC, medie anuală (%)", "HICP inflation, annual avg. (%)"), annual("hicp_m", from, to)],
    ["hicp_core_m", L("Inflația de bază, medie anuală (%)", "Core inflation, annual avg. (%)"), annual("hicp_core_m", from, to)],
    ["policy_rate_m", L("Dobânda BNR, medie anuală (%)", "NBR policy rate, annual avg. (%)"), annual("policy_rate_m", from, to)],
    ["bond10y_m", L("Randament 10 ani, medie (%)", "10-year yield, avg. (%)"), annual("bond10y_m", from, to)],
    ["unemp_m", L("Rata șomajului, medie (%)", "Unemployment rate, avg. (%)"), annual("unemp_m", from, to)],
    ["emp_rate_a", L("Rata de ocupare 20–64 (%)", "Employment rate 20–64 (%)"), annual("emp_rate_a", from, to)],
    ["ulc_a", L("Cost unitar nominal al muncii (%)", "Nominal unit labour cost (%)"), annual("ulc_a", from, to)],
    ["deficit_a", L("Sold bugetar (% PIB)", "Budget balance (% GDP)"), annual("deficit_a", from, to)],
    ["debt_a", L("Datoria publică (% PIB)", "Government debt (% GDP)"), annual("debt_a", from, to)],
    ["ca_q", L("Cont curent (% PIB)", "Current account (% GDP)"), Object.fromEntries(Object.entries(caAnnual()).filter(([y]) => +y >= from && +y <= to))],
    ["niip_a", L("PIIN (% PIB)", "NIIP (% GDP)"), annual("niip_a", from, to)],
    ["eurron_m", L("EUR/RON, medie anuală", "EUR/RON, annual avg."), annual(has("eurron_m") ? "eurron_m" : "eurron_m_es", from, to)],
    ["gdp_pc_pps_a", L("PIB/loc. PPS (UE27 = 100)", "GDP per capita PPS (EU27 = 100)"), annual("gdp_pc_pps_a", from, to)],
  ].filter(([, , v]) => Object.keys(v).length);
  return { years: years(from, to), rows: rows.map(([id, label, v]) => ({ id, label, v })) };
}

export function reportToMarkdown(R, ft, title) {
  let s = `# ${title} · ${R.period.from}–${R.period.to}\n\n`;
  s += `## ${L("Rezumat executiv", "Executive summary")}\n` + R.summary.map((x) => `- ${x}`).join("\n") + "\n\n";
  for (const sec of R.sections) s += `## ${sec.title}\n\n` + sec.paras.join("\n\n") + "\n\n";
  s += `## ${L("Tabloul dezechilibrelor (praguri MIP)", "Imbalance scoreboard (MIP thresholds)")}\n\n| ${L("Indicator", "Indicator")} | ${L("Valoare", "Value")} | ${L("Prag", "Threshold")} | ${L("Stare", "Status")} |\n|---|---|---|---|\n`;
  s += R.scoreboard.map((r) => `| ${r.label} | ${r.fmt(r.value)} | ${r.thrLabel} | ${r.breach ? L("prag depășit", "breached") : L("în limite", "within limits")} |`).join("\n") + "\n\n";
  s += `## ${L("Riscuri și vulnerabilități", "Risks and vulnerabilities")}\n` + R.risks.map((x) => `- ${x}`).join("\n") + "\n\n";
  s += `## ${L("Întrebări pentru discuție", "Discussion questions")}\n` + R.questions.map((x, i) => `${i + 1}. ${x}`).join("\n") + "\n\n";
  s += `## ${L("Datele anuale folosite", "Annual data used")}\n\n| | ${ft.years.join(" | ")} |\n|---|${ft.years.map(() => "---:").join("|")}|\n`;
  s += ft.rows.map((r) => `| ${r.label} | ${ft.years.map((y) => (isNum(r.v[y]) ? nf(r.v[y], r.id === "eurron_m" ? 3 : 1) : "—")).join(" | ")} |`).join("\n") + "\n\n";
  s += `_${L("Generat automat în browser de un motor de reguli, pe baza datelor Eurostat, BNR, INS, BIS, FMI și Banca Mondială. Material didactic.", "Generated automatically in the browser by a rule engine from Eurostat, NBR, INS, BIS, IMF and World Bank data. Teaching material.")}_\n`;
  return s;
}

export function buildPrompt(P, ft) {
  const head = L(
    `Ești un economist care pregătește o analiză macroeconomică a României pentru perioada ${P.from}–${P.to}, destinată unui seminar universitar. Folosește DOAR datele de mai jos (surse: Eurostat, BNR, INS, BIS, FMI, Banca Mondială). Nu inventa cifre; dacă o informație lipsește, spune explicit.

Structura cerută:
1. Rezumat executiv (5 idei).
2. Creșterea economică: ritm, motoare, comparație cu UE, convergență.
3. Inflația și politica monetară: evoluție, cauze probabile, poziția BNR (dobânda reală).
4. Piața muncii: șomaj, ocupare, costul muncii și competitivitate.
5. Finanțele publice: deficit, datorie, sustenabilitate.
6. Echilibrele externe: cont curent, PIIN, curs de schimb.
7. Principalele trei riscuri și trei întrebări pentru discuție.
Pentru fiecare afirmație, citează cifra din tabel pe care se bazează.

Date anuale (medii anuale pentru seriile lunare și trimestriale; „—” = indisponibil):`,
    `You are an economist preparing a macroeconomic analysis of Romania for ${P.from}–${P.to}, for a university seminar. Use ONLY the data below (sources: Eurostat, NBR, INS, BIS, IMF, World Bank). Do not invent numbers; if something is missing, say so explicitly.

Required structure:
1. Executive summary (5 points).
2. Economic growth: pace, drivers, comparison with the EU, convergence.
3. Inflation and monetary policy: evolution, likely causes, NBR stance (real rate).
4. Labour market: unemployment, employment, labour costs and competitiveness.
5. Public finances: deficit, debt, sustainability.
6. External balances: current account, NIIP, exchange rate.
7. The three main risks and three discussion questions.
For every statement, quote the number from the table it is based on.

Annual data (annual averages for monthly and quarterly series; “—” = unavailable):`
  );
  const table = [["indicator", ...ft.years].join(" | ")]
    .concat(ft.rows.map((r) => [r.label, ...ft.years.map((y) => (isNum(r.v[y]) ? (Math.round(r.v[y] * 1000) / 1000).toString() : "—"))].join(" | ")))
    .join("\n");
  const sb = scoreboard(P)
    .map((r) => `- ${r.label}: ${r.fmt(r.value)} (${L("prag", "threshold")} ${r.thrLabel})`)
    .join("\n");
  const last = [
    ["gdp_yoy_q", L("PIB trimestrial an/an", "Quarterly GDP y/y")],
    ["hicp_m", L("Inflația IAPC", "HICP inflation")],
    ["unemp_m", L("Rata șomajului", "Unemployment rate")],
    ["policy_rate_m", L("Dobânda BNR", "NBR policy rate")],
  ]
    .map(([id, lab]) => {
      const o = lastObs(obsOf(id), P.to);
      return o ? `- ${lab}: ${o[1]} (${o[0]})` : null;
    })
    .filter(Boolean)
    .join("\n");
  return `${head}\n\n${table}\n\n${L("Ultimele observații din perioadă:", "Latest observations in the period:")}\n${last}\n\n${L("Indicatori din tabloul MIP la finalul perioadei:", "MIP scoreboard indicators at the end of the period:")}\n${sb}\n`;
}

export { indName, S };
