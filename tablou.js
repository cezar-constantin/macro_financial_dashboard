// Dashboard: KPI snapshot at the end of the chosen period and themed trend charts.
import { t, isNum, applyStaticTranslations } from "./common.js";
import {
  $, L, E, nf, sgn, IND, indName, fmtI, fmtU, fmtPeriod, loadData, obsOf, has, S, inP, lastObs, firstObs,
  annualAvg, toObs, caRolling, caAnnual, getPeriod, periodPanel, renderMacroShell, errorPanel, tsChart,
  stackChart, spark, legend, C, yearOf, fxEur,
} from "./macro.js";

const state = { P: null, eu: true };

// ------------------------------------------------------------------ derived series
const fxEurId = () => (has("eurron_m") ? "eurron_m" : "eurron_m_es");
function realPolicyRate() {
  const h = Object.fromEntries(obsOf("hicp_m"));
  return obsOf("policy_rate_m").filter(([p]) => isNum(h[p])).map(([p, v]) => [p, +(v - h[p]).toFixed(2)]);
}
/** Quarterly average of a monthly series, labelled YYYY-Qn. */
function quarterly(obs) {
  const g = {};
  for (const [p, v] of obs) (g[`${p.slice(0, 4)}-Q${Math.ceil(+p.slice(5, 7) / 3)}`] ||= []).push(v);
  return Object.entries(g).filter(([, v]) => v.length === 3).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / 3]).sort();
}
/** Trailing 3-month moving average (smooths noisy monthly activity data). */
function ma3(obs) {
  return obs.slice(2).map((o, i) => [o[0], (obs[i][1] + obs[i + 1][1] + o[1]) / 3]);
}
/** Net-export contribution: reported if available, otherwise GDP growth minus domestic contributions. */
function netExports() {
  if (has("contrib_nx_a")) return obsOf("contrib_nx_a");
  const g = Object.fromEntries(obsOf("gdp_real_a"));
  const parts = ["contrib_cons_a", "contrib_gov_a", "contrib_gfcf_a", "contrib_inv_a"].map((k) => Object.fromEntries(obsOf(k)));
  return Object.keys(g)
    .filter((y) => parts.every((p) => isNum(p[y])))
    .map((y) => [y, +(g[y] - parts.reduce((a, p) => a + p[y], 0)).toFixed(2)]);
}
function caSeries() {
  if (has("ca_q") && has("gdp_nominal_a")) return { obs: caRolling(), label: L("Cont curent, ultimele 4 trimestre", "Current account, last 4 quarters") };
  if (has("ca_gdp_q")) return { obs: obsOf("ca_gdp_q"), label: indName("ca_gdp_q") };
  return { obs: obsOf("imf_ca").filter(([p]) => +p <= new Date().getFullYear() - 1), label: indName("imf_ca") };
}

// ------------------------------------------------------------------ KPI tiles
function kpi(id, label, obs, u, dec, good, note = "") {
  const { from, to } = state.P;
  const p = inP(obs, from, to);
  const last = lastObs(obs, to);
  const first = firstObs(obs, from);
  if (!last) return "";
  const d = first && first[0] !== last[0] ? last[1] - first[1] : null;
  const cls = !isNum(d) || !good || Math.abs(d) < 1e-9 ? "" : d * good > 0 ? " up" : " down";
  const arrow = !isNum(d) ? "" : d > 0 ? "▲" : d < 0 ? "▼" : "■";
  const dTxt = isNum(d) ? `${arrow} ${sgn(d, dec)} ${u === "ron" ? "lei" : "pp"} ${t("d.vsStart")} (${fmtPeriod(first[0])})` : "";
  return `<article class="kpi-tile">
    <span class="metric-label">${E(label)}</span>
    <span class="kpi-value">${E(fmtU(last[1], u, dec))}</span>
    <span class="kpi-delta">${E(fmtPeriod(last[0]))}${note ? " · " + E(note) : ""}</span>
    ${spark(p.length > 1 ? p : obs.slice(-12), C.ro)}
    <span class="kpi-delta${cls}">${E(dTxt)}</span>
  </article>`;
}

function kpiPanel() {
  const ca = caSeries();
  const debt = has("debt_q") ? obsOf("debt_q") : obsOf("debt_a");
  const tiles = [
    kpi("gdp_yoy_q", L("Creșterea PIB real (an/an)", "Real GDP growth (y/y)"), obsOf("gdp_yoy_q"), "%", 1, 1, L("trimestrial", "quarterly")),
    kpi("hicp_m", L("Inflația anuală (IAPC)", "Annual inflation (HICP)"), obsOf("hicp_m"), "%", 1, -1),
    kpi("unemp_m", L("Rata șomajului", "Unemployment rate"), obsOf("unemp_m"), "%", 1, -1),
    kpi("policy_rate_m", L("Dobânda de politică monetară", "Policy rate"), obsOf("policy_rate_m"), "%", 2, 0, "BNR"),
    kpi("deficit_a", L("Soldul bugetar", "Budget balance"), obsOf("deficit_a"), "% PIB", 1, 1, "ESA 2010"),
    kpi("debt", L("Datoria publică", "Public debt"), debt, "% PIB", 1, -1),
    kpi("ca", L("Contul curent", "Current account"), ca.obs, "% PIB", 1, 1, L("4 trimestre", "4 quarters")),
    kpi("fx", L("Cursul EUR/RON", "EUR/RON rate"), fxEur(), "ron", 4, 0, L("medie lunară", "monthly avg.")),
  ].join("");
  return `<section class="card panel-card">
    <div class="section-heading"><div><p class="section-kicker">${E(t("d.kpi.kicker"))}</p><h2>${E(t("d.kpi.title"))}</h2><p class="chart-caption">${E(t("d.hint"))}</p></div>
    <span class="status-pill">${E(t("d.end"))}: ${state.P.to}</span></div>
    <div class="kpi-row">${tiles}</div>
  </section>`;
}

// ------------------------------------------------------------------ chart cards
function card(title, caption, chart, items, srcIds, extraClass = "") {
  const srcs = [...new Set(srcIds.map((id) => S(id)?.source).filter(Boolean))];
  return `<article class="card panel-card chart-card${extraClass}">
    <div><h3>${E(title)}</h3>${caption ? `<p class="chart-caption">${E(caption)}</p>` : ""}</div>
    ${chart}
    ${items && items.length ? legend(items) : ""}
    ${srcs.length ? `<p class="source-note">${E(t("d.source"))}: ${E(srcs.join(" · "))}</p>` : ""}
  </article>`;
}
const ro = (id, extra = {}) => ({ obs: obsOf(id), label: L("România", "Romania"), color: C.ro, fmt: (v) => fmtI(id, v), ...extra });
const eu = (id, extra = {}) => ({ obs: state.eu ? obsOf(id + "_eu") : [], label: L("UE27", "EU27"), color: C.eu, dash: "5 4", fmt: (v) => fmtI(id, v), ...extra });
const pctAxis = (v) => nf(v, Math.abs(v) < 10 && v % 1 ? 1 : 0) + "%";
function roEu(id, title, caption, opts = {}) {
  const series = [ro(id, opts.ro), ...(has(id + "_eu") && state.eu ? [eu(id, opts.eu)] : [])];
  return card(title, caption, tsChart(series, state.P.from, state.P.to, { yfmt: opts.yfmt || pctAxis, refs: opts.refs, band: opts.band }), series.filter((s) => s.obs.length), [id]);
}
function section(key, body) {
  return `<section class="theme-section" id="theme-${key}">
    <div class="theme-heading"><p class="section-kicker">${E(t("d.theme." + key))}</p></div>
    <div class="dash-grid">${body}</div>
  </section>`;
}

function growth() {
  const { from, to } = state.P;
  const bars = [
    { obs: obsOf("gdp_real_a"), label: L("România", "Romania"), color: C.ro, bars: true, barOffset: state.eu ? -0.5 : 0, fmt: (v) => fmtI("gdp_real_a", v) },
    ...(state.eu ? [{ obs: obsOf("gdp_real_a_eu"), label: L("UE27", "EU27"), color: C.eu, bars: true, barOffset: 0.5, fmt: (v) => fmtI("gdp_real_a", v) }] : []),
  ];
  const nx = netExports();
  const rows = [
    { label: L("Consum privat", "Private consumption"), color: C.ro, obs: obsOf("contrib_cons_a") },
    { label: L("Consum public", "Public consumption"), color: C.alt, obs: obsOf("contrib_gov_a") },
    { label: L("Investiții (FBCF)", "Investment (GFCF)"), color: C.warm, obs: obsOf("contrib_gfcf_a") },
    { label: L("Stocuri", "Inventories"), color: C.violet, obs: obsOf("contrib_inv_a") },
    { label: has("contrib_nx_a") ? L("Export net", "Net exports") : L("Export net (rezidual)", "Net exports (residual)"), color: C.rose, obs: nx },
  ];
  const hf = [
    { obs: ma3(obsOf("indprod_m")), label: L("Industrie", "Industry"), color: C.ro, fmt: (v) => nf(v, 1) + " %" },
    { obs: ma3(obsOf("retail_m")), label: L("Comerț cu amănuntul", "Retail trade"), color: C.warm, fmt: (v) => nf(v, 1) + " %" },
    { obs: ma3(obsOf("constr_m")), label: L("Construcții", "Construction"), color: C.alt, fmt: (v) => nf(v, 1) + " %" },
  ];
  return section(
    "growth",
    card(
      L("Creșterea anuală a PIB real", "Annual real GDP growth"),
      L("Variația procentuală a PIB în prețuri constante față de anul anterior.", "Percentage change of GDP at constant prices vs the previous year."),
      tsChart(bars, from, to, { yfmt: pctAxis }),
      bars,
      ["gdp_real_a"]
    ) +
      roEu("gdp_yoy_q", L("PIB trimestrial, față de același trimestru al anului anterior", "Quarterly GDP, year on year"), L("Serie ajustată sezonier și cu numărul de zile lucrătoare. Arată momentul ciclului mai repede decât datele anuale.", "Seasonally and calendar adjusted. Shows the cycle earlier than annual data.")) +
      card(
        L("Contribuții la creșterea PIB", "Contributions to GDP growth"),
        L("Puncte procentuale; bara neagră este creșterea totală. Cine a tras economia: consumul, investițiile sau exportul net?", "Percentage points; the dark bar is total growth. What drove the economy: consumption, investment or net exports?"),
        stackChart(rows, obsOf("gdp_real_a"), from, Math.min(to, yearOf(obsOf("gdp_real_a").slice(-1)[0]?.[0] || String(to))), { totalLabel: L("Creștere PIB", "GDP growth"), width: 1300, height: 330 }),
        [...rows, { label: L("Creștere PIB", "GDP growth"), color: "#162554" }],
        ["contrib_cons_a"],
        " span-2"
      ) +
      card(
        L("Indicatori lunari de activitate", "Monthly activity indicators"),
        L("Volum, variație anuală, medie mobilă pe 3 luni. Semnalează schimbările de ritm înaintea PIB-ului.", "Volume, year-on-year change, 3-month moving average. Signals changes in momentum before GDP does."),
        tsChart(hf, from, to, { yfmt: pctAxis }),
        hf,
        ["indprod_m"]
      ) +
      roEu("esi_m", L("Sentimentul economic (ESI)", "Economic sentiment (ESI)"), L("Media pe termen lung = 100. Sub 100: agenții economici sunt mai pesimiști decât de obicei.", "Long-term average = 100. Below 100: economic agents are gloomier than usual."), { yfmt: (v) => nf(v, 0), refs: [{ y: 100, color: "#5b6786" }] }) +
      card(
        L("Convergența reală: PIB pe locuitor la paritatea puterii de cumpărare", "Real convergence: GDP per capita in PPS"),
        L("Media UE27 = 100. Cât de aproape este nivelul de trai de media europeană.", "EU27 average = 100. How close living standards are to the EU average."),
        tsChart([ro("gdp_pc_pps_a")], from, to, { yfmt: (v) => nf(v, 0), refs: [{ y: 100, label: L("media UE", "EU average"), color: "#5b6786" }], zero: false }),
        null,
        ["gdp_pc_pps_a"]
      ) +
      card(
        indName("wb_gdp_pc_usd"),
        L("Dolari curenți (Banca Mondială). Include efectul cursului de schimb, deci nu măsoară direct nivelul de trai.", "Current dollars (World Bank). Includes exchange-rate effects, so it does not measure living standards directly."),
        tsChart([ro("wb_gdp_pc_usd", { bars: true, barW: 0.5 })], from, to, { yfmt: (v) => nf(v / 1000, 0) + L(" mii", "k") }),
        null,
        ["wb_gdp_pc_usd"]
      )
  );
}

function prices() {
  const { from, to } = state.P;
  const infl = [
    ro("hicp_m", { label: L("Inflația totală", "Headline") }),
    { obs: obsOf("hicp_core_m"), label: L("Inflația de bază", "Core"), color: C.warm, fmt: (v) => fmtI("hicp_m", v) },
    ...(state.eu ? [eu("hicp_m", { label: L("UE27, totală", "EU27, headline") })] : []),
  ];
  const comp = [
    { obs: obsOf("hicp_food_m"), label: L("Alimente", "Food"), color: C.alt, fmt: (v) => nf(v, 1) + " %" },
    { obs: obsOf("hicp_energy_m"), label: L("Energie", "Energy"), color: C.rose, fmt: (v) => nf(v, 1) + " %" },
    { obs: obsOf("hicp_core_m"), label: L("Bază", "Core"), color: C.warm, fmt: (v) => nf(v, 1) + " %" },
  ];
  const rates = [
    { obs: obsOf("policy_rate_m"), label: L("Dobânda de politică monetară", "Policy rate"), color: C.ro, step: true, fmt: (v) => nf(v, 2) + " %" },
    { obs: obsOf("irate3m_m"), label: "ROBOR 3M", color: C.alt, fmt: (v) => nf(v, 2) + " %" },
    { obs: obsOf("bond10y_m"), label: L("Titluri de stat 10 ani", "10-year bond"), color: C.warm, fmt: (v) => nf(v, 2) + " %" },
  ];
  const real = [{ obs: realPolicyRate(), label: L("Dobânda reală (politică − inflație)", "Real rate (policy − inflation)"), color: C.violet, fmt: (v) => nf(v, 2) + " pp" }];
  return section(
    "prices",
    card(
      L("Inflația: totală, de bază și media UE", "Inflation: headline, core and EU average"),
      L("Rata anuală a IAPC. Banda verde este intervalul țintei BNR (2,5 % ± 1 pp).", "Annual HICP rate. The green band is the NBR target range (2.5% ± 1 pp)."),
      tsChart(infl, from, to, { yfmt: pctAxis, band: { lo: 1.5, hi: 3.5, label: L("ținta BNR", "NBR target") }, width: 1300, height: 320 }),
      infl,
      ["hicp_m"],
      " span-2"
    ) +
      card(
        L("Componentele inflației", "Inflation components"),
        L("Șocurile de energie și alimente trec, de regulă, în inflația de bază cu întârziere.", "Energy and food shocks usually pass through to core inflation with a lag."),
        tsChart(comp, from, to, { yfmt: pctAxis }),
        comp,
        ["hicp_food_m"]
      ) +
      card(
        L("Dobânzi: politica monetară, piața monetară, titlurile de stat", "Interest rates: policy, money market, government bonds"),
        L("ROBOR urmează dobânda BNR; randamentul la 10 ani include și prima de risc a statului.", "ROBOR follows the NBR rate; the 10-year yield also embeds the sovereign risk premium."),
        tsChart(rates, from, to, { yfmt: pctAxis }),
        rates,
        ["policy_rate_m", "irate3m_m", "bond10y_m"]
      ) +
      card(
        L("Dobânda reală de politică monetară", "Real policy rate"),
        L("Dobânda BNR minus inflația anuală (ex post). Negativă: politica monetară stimulează; pozitivă: restrânge.", "NBR rate minus annual inflation (ex post). Negative: monetary policy is stimulative; positive: restrictive."),
        tsChart(real, from, to, { yfmt: (v) => nf(v, 0) }),
        null,
        ["policy_rate_m", "hicp_m"]
      ) +
      roEu("hpi_q", L("Prețurile locuințelor", "House prices"), L("Variație anuală, nominală. Pragul MIP (6 %) se aplică variației reale.", "Annual change, nominal. The MIP threshold (6%) applies to the real change."))
  );
}

function labour() {
  const { from, to } = state.P;
  const lciVsInfl = [
    { obs: obsOf("lci_q"), label: L("Costul orar al muncii", "Hourly labour cost"), color: C.ro, fmt: (v) => nf(v, 1) + " %" },
    { obs: quarterly(obsOf("hicp_m")), label: L("Inflația (medie trimestrială)", "Inflation (quarterly avg.)"), color: C.bad, dash: "5 4", fmt: (v) => nf(v, 1) + " %" },
  ];
  const wage = has("ins_wage_m")
    ? card(indName("ins_wage_m"), L("Lei pe lună, total economie (INS).", "RON per month, whole economy (INS)."), tsChart([ro("ins_wage_m", { label: L("Salariu mediu net", "Average net wage") })], from, to, { yfmt: (v) => nf(v, 0) }), null, ["ins_wage_m"])
    : card(indName("min_wage_s"), L("EUR pe lună, la 1 ianuarie și 1 iulie (Eurostat).", "EUR per month, on 1 January and 1 July (Eurostat)."), tsChart([ro("min_wage_s", { label: L("Salariul minim", "Minimum wage") })], from, to, { yfmt: (v) => nf(v, 0) }), null, ["min_wage_s"]);
  return section(
    "labour",
    roEu("unemp_m", L("Rata șomajului", "Unemployment rate"), L("Definiția Biroului Internațional al Muncii (anchetă), ajustată sezonier — nu șomajul înregistrat la ANOFM.", "ILO definition (survey), seasonally adjusted — not registered unemployment.")) +
      roEu("unemp_youth_m", L("Șomajul în rândul tinerilor (sub 25 de ani)", "Youth unemployment (under 25)"), L("Mai volatil și mai ridicat decât rata generală; sensibil la ciclul economic.", "More volatile and higher than the overall rate; sensitive to the cycle.")) +
      roEu("emp_rate_a", L("Rata de ocupare, 20–64 de ani", "Employment rate, 20–64"), L("Ținta UE pentru 2030 este 78 %.", "The EU 2030 target is 78%."), { refs: [{ y: 78, label: L("ținta UE 2030", "EU 2030 target"), color: C.good }] }) +
      card(
        L("Costul muncii față de inflație", "Labour cost versus inflation"),
        L("Când costul orar crește peste inflație, câștigurile reale cresc; dacă productivitatea nu ține pasul, apare presiune pe competitivitate.", "When hourly labour cost grows faster than inflation, real earnings rise; if productivity lags, competitiveness comes under pressure."),
        tsChart(lciVsInfl, from, to, { yfmt: pctAxis }),
        lciVsInfl,
        ["lci_q", "hicp_m"]
      ) +
      roEu("ulc_a", L("Costul unitar nominal al muncii", "Nominal unit labour cost"), L("Variație anuală: costul muncii pe unitatea de produs. Indicator de competitivitate din tabloul MIP.", "Annual change: labour cost per unit of output. A competitiveness indicator in the MIP scoreboard."), { ro: { bars: false } }) +
      wage
  );
}

function fiscal() {
  const { from, to } = state.P;
  const def = [
    { obs: obsOf("deficit_a"), label: L("România", "Romania"), color: C.ro, bars: true, barOffset: state.eu ? -0.5 : 0, fmt: (v) => fmtI("deficit_a", v) },
    ...(state.eu ? [{ obs: obsOf("deficit_a_eu"), label: L("UE27", "EU27"), color: C.eu, bars: true, barOffset: 0.5, fmt: (v) => fmtI("deficit_a", v) }] : []),
  ];
  const re = [
    { obs: obsOf("gov_rev_a"), label: L("Venituri", "Revenue"), color: C.good, fmt: (v) => fmtI("gov_rev_a", v) },
    { obs: obsOf("gov_exp_a"), label: L("Cheltuieli", "Expenditure"), color: C.bad, fmt: (v) => fmtI("gov_exp_a", v) },
    ...(state.eu
      ? [
          { obs: obsOf("gov_rev_a_eu"), label: L("Venituri UE27", "EU27 revenue"), color: C.good, dash: "5 4", width: 1.4, fmt: (v) => fmtI("gov_rev_a", v) },
          { obs: obsOf("gov_exp_a_eu"), label: L("Cheltuieli UE27", "EU27 expenditure"), color: C.bad, dash: "5 4", width: 1.4, fmt: (v) => fmtI("gov_rev_a", v) },
        ]
      : []),
  ];
  return section(
    "fiscal",
    card(
      L("Soldul bugetului general consolidat", "General government balance"),
      L("Metodologia europeană (ESA 2010), % din PIB. Linia roșie: pragul de 3 % din Tratat.", "European methodology (ESA 2010), % of GDP. Red line: the 3% Treaty threshold."),
      tsChart(def, from, to, { yfmt: pctAxis, refs: [{ y: -3, label: L("−3 % (Maastricht)", "−3% (Maastricht)") }] }),
      def,
      ["deficit_a"]
    ) +
      roEu(has("debt_q") ? "debt_q" : "debt_a", L("Datoria publică", "Government debt"), L("Datoria brută consolidată, % din PIB. Linia roșie: pragul de 60 % din Tratat.", "Gross consolidated debt, % of GDP. Red line: the 60% Treaty threshold."), { refs: [{ y: 60, label: "60 %" }] }) +
      card(
        L("Veniturile și cheltuielile bugetare", "Government revenue and expenditure"),
        L("Diferența dintre cele două linii este deficitul. România are unul dintre cele mai mici niveluri de venituri fiscale din UE.", "The gap between the lines is the deficit. Romania has one of the lowest revenue ratios in the EU."),
        tsChart(re, from, to, { yfmt: (v) => nf(v, 0) + "%", zero: false }),
        re,
        ["gov_rev_a", "gov_exp_a"]
      ) +
      roEu("gov_int_a", L("Cheltuielile cu dobânzile", "Interest expenditure"), L("Costul datoriei, % din PIB. Crește odată cu datoria și cu randamentele.", "Cost of debt, % of GDP. Rises with both debt and yields."))
  );
}

function external() {
  const { from, to } = state.P;
  const ca = caSeries();
  const comps = [
    ["goods_q", L("Bunuri", "Goods"), C.rose],
    ["services_q", L("Servicii", "Services"), C.good],
    ["primary_q", L("Venituri primare", "Primary income"), C.warm],
    ["secondary_q", L("Venituri secundare", "Secondary income"), C.alt],
  ].filter(([id]) => has(id));
  const compCard = comps.length
    ? card(
        L("Structura contului curent", "Current account structure"),
        L("% din PIB, pe an calendaristic. Deficitul comercial la bunuri este compensat parțial de surplusul la servicii (IT, transport) și de remitențe.", "% of GDP, calendar year. The goods deficit is partly offset by the services surplus (IT, transport) and by remittances."),
        stackChart(comps.map(([id, label, color]) => ({ label, color, obs: toObs(caAnnual(id)) })), toObs(caAnnual("ca_q")), from, to, { totalLabel: L("Cont curent", "Current account") }),
        [...comps.map(([, label, color]) => ({ label, color })), { label: L("Cont curent", "Current account"), color: "#162554" }],
        ["ca_q"]
      )
    : "";
  const fdi = [
    { obs: obsOf("wb_fdi_gdp"), label: L("ISD, intrări nete", "FDI, net inflows"), color: C.ro, fmt: (v) => nf(v, 1) + " %" },
    { obs: obsOf("wb_remit_gdp"), label: L("Remitențe", "Remittances"), color: C.warm, fmt: (v) => nf(v, 1) + " %" },
  ];
  const fx = [{ obs: fxEur(), label: "EUR/RON", color: C.ro, fmt: (v) => nf(v, 4) + " lei" }];
  return section(
    "external",
    card(
      L("Contul curent", "Current account"),
      L("% din PIB. Sub −4 % (media pe 3 ani) este pragul de alertă din procedura MIP.", "% of GDP. Below −4% (3-year average) is the MIP alert threshold."),
      tsChart([{ ...ca, color: C.ro, fmt: (v) => nf(v, 1) + " %" }], from, to, { yfmt: pctAxis, refs: [{ y: -4, label: "−4 % (MIP)" }] }),
      null,
      ["ca_q", "gdp_nominal_a"]
    ) +
      compCard +
      card(
        indName("niip_a"),
        L("Activele externe minus pasivele externe, % din PIB. Pragul MIP: −35 %.", "External assets minus liabilities, % of GDP. MIP threshold: −35%."),
        tsChart([ro("niip_a")], from, to, { yfmt: pctAxis, refs: [{ y: -35, label: "−35 % (MIP)" }] }),
        null,
        ["niip_a"]
      ) +
      card(
        L("Cursul de schimb EUR/RON", "EUR/RON exchange rate"),
        L("Medie lunară a cursurilor de referință. Regim de flotare controlată: BNR netezește variațiile.", "Monthly average of reference rates. Managed float: the NBR smooths fluctuations."),
        tsChart(fx, from, to, { yfmt: (v) => nf(v, 2), zero: false }),
        null,
        [fxEurId(), "eurron_m_es"]
      ) +
      card(
        indName("reer_m"),
        L("Deflatat cu prețurile de consum, față de un coș larg de parteneri. Creștere = apreciere reală = pierdere de competitivitate prin prețuri.", "CPI-deflated, against a broad basket of partners. Up = real appreciation = loss of price competitiveness."),
        tsChart([ro("reer_m")], from, to, { yfmt: (v) => nf(v, 0), zero: false }),
        null,
        ["reer_m"]
      ) +
      card(
        L("Investiții străine directe și remitențe", "Foreign direct investment and remittances"),
        L("% din PIB, anual (Banca Mondială). Surse de finanțare a deficitului extern care nu creează datorie.", "% of GDP, annual (World Bank). Non-debt-creating sources of external financing."),
        tsChart(fdi, from, to, { yfmt: pctAxis }),
        fdi,
        ["wb_fdi_gdp"]
      )
  );
}

function financial() {
  const { from, to } = state.P;
  const spreadObs = (() => {
    const pr = Object.fromEntries(obsOf("policy_rate_m"));
    return obsOf("bond10y_m").filter(([p]) => isNum(pr[p])).map(([p, v]) => [p, +(v - pr[p]).toFixed(2)]);
  })();
  const credit = has("credit_gdp_a")
    ? card(indName("credit_gdp_a"), L("Stocul de datorie al firmelor și gospodăriilor, % din PIB (consolidat). Prag MIP: 133 %.", "Debt stock of firms and households, % of GDP (consolidated). MIP threshold: 133%."), tsChart([ro("credit_gdp_a")], from, to, { yfmt: pctAxis }), null, ["credit_gdp_a"])
    : "";
  const flow = has("credit_flow_a")
    ? card(indName("credit_flow_a"), L("Fluxul anual de credit către sectorul privat, % din PIB. Prag MIP: 14 %.", "Annual credit flow to the private sector, % of GDP. MIP threshold: 14%."), tsChart([ro("credit_flow_a", { bars: true })], from, to, { yfmt: pctAxis }), null, ["credit_flow_a"])
    : "";
  return section(
    "financial",
    card(
      L("Panta curbei: randamentul la 10 ani minus dobânda BNR", "Curve slope: 10-year yield minus NBR rate"),
      L("Puncte procentuale. O pantă mare semnalează prime de risc sau așteptări de inflație ridicate; o pantă negativă, așteptări de relaxare monetară.", "Percentage points. A steep slope signals risk premia or high inflation expectations; a negative one, expected monetary easing."),
      tsChart([{ obs: spreadObs, label: L("Panta", "Slope"), color: C.violet, fmt: (v) => sgn(v, 2) + " pp" }], from, to, { yfmt: (v) => nf(v, 1) }),
      null,
      ["bond10y_m", "policy_rate_m"]
    ) +
      credit +
      flow +
      roEu("cons_conf_m", L("Încrederea consumatorilor", "Consumer confidence"), L("Sold al răspunsurilor pozitive și negative; anticipează consumul.", "Balance of positive and negative answers; leads consumption."), { yfmt: (v) => nf(v, 0), ro: {}, eu: {} })
  );
}

function outlook() {
  const imf = ["imf_gdp", "imf_cpi", "imf_unemp", "imf_ca", "imf_balance", "imf_debt"].filter(has);
  if (!imf.length) return "";
  const y0 = new Date().getFullYear() - 1;
  const years = [];
  for (let y = y0; y <= y0 + 5; y++) years.push(y);
  const head = years.map((y) => `<th class="num">${y}${y > y0 ? "<sup>p</sup>" : ""}</th>`).join("");
  const body = imf
    .map((id) => {
      const m = Object.fromEntries(obsOf(id));
      const name = indName(id).replace(/^(FMI|IMF) · /, "");
      return `<tr><td>${E(name[0].toUpperCase() + name.slice(1))}</td>${years.map((y) => `<td class="num">${E(isNum(m[y]) ? nf(m[y], 1) : "—")}</td>`).join("")}</tr>`;
    })
    .join("");
  const g = [
    { obs: obsOf("imf_gdp").filter(([p]) => +p <= y0), label: L("Realizat", "Actual"), color: C.ro, fmt: (v) => nf(v, 1) + " %" },
    { obs: obsOf("imf_gdp").filter(([p]) => +p >= y0), label: L("Proiecție FMI", "IMF projection"), color: C.warm, dash: "6 4", fmt: (v) => nf(v, 1) + " %" },
  ];
  return section(
    "outlook",
    `<article class="card panel-card chart-card span-2">
      <div><h3>${E(L("Proiecțiile Fondului Monetar Internațional (World Economic Outlook)", "International Monetary Fund projections (World Economic Outlook)"))}</h3>
      <p class="chart-caption">${E(L("Ultima ediție WEO disponibilă; p = proiecție. Proiecțiile nu depind de perioada aleasă și nu sunt produse de acest instrument.", "Latest WEO vintage; p = projection. Projections do not depend on the chosen period and are not produced by this tool."))}</p></div>
      <div class="table-scroll"><table class="data-table"><thead><tr><th>${E(L("Indicator", "Indicator"))}</th>${head}</tr></thead><tbody>${body}</tbody></table></div>
      ${tsChart(g, Math.max(state.P.min, y0 - 5), y0 + 5, { yfmt: pctAxis, width: 1300, height: 280 })}
      ${legend(g)}
      <p class="source-note">${E(t("d.source"))}: ${E(S("imf_gdp")?.source || "")}</p>
    </article>`
  );
}

// ------------------------------------------------------------------ render
function render() {
  const pp = periodPanel(
    state.P,
    (from, to) => {
      state.P = { ...state.P, from, to };
      render();
    },
    `<label class="field-card check-card"><span class="field-label">${E(t("p.eu"))}</span><input type="checkbox" id="eu-toggle"${state.eu ? " checked" : ""}/></label>
     <nav class="theme-jump">${["growth", "prices", "labour", "fiscal", "external", "financial", "outlook"].map((k) => `<a class="flow-chip" href="#theme-${k}">${E(t("d.theme." + k))}</a>`).join("")}</nav>`
  );
  $("hero-period").textContent = `${state.P.from} – ${state.P.to}`;
  const n = Object.values(window.__macro.series).filter((s) => s.obs.length).length;
  $("hero-series").textContent = nf(n, 0);
  $("workspace").innerHTML = pp.html + kpiPanel() + growth() + prices() + labour() + fiscal() + external() + financial() + outlook();
  pp.wire();
  $("eu-toggle")?.addEventListener("change", (e) => {
    state.eu = e.target.checked;
    render();
  });
  applyStaticTranslations();
}

renderMacroShell("dash");
(async () => {
  try {
    window.__macro = await loadData();
    state.P = getPeriod();
    $("hero-updated").textContent = window.__macro.generated.slice(0, 10);
    render();
  } catch (e) {
    $("workspace").innerHTML = errorPanel(e);
  }
})();
document.addEventListener("langchange", () => state.P && render());
