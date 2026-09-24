// Shared module for the macroeconomic dashboard: i18n additions, shell, data access, period
// selection and SVG charts. Visual language is inherited unchanged from styles.css / common.js
// of the financial-analysis teaching apps.
import { I18N, t, getLang, initLangSwitch, applyStaticTranslations, isNum, PALETTE, escapeHtml as esc } from "./common.js";

// ------------------------------------------------------------------ i18n additions
const RO = {
  "nav.home": "Acasă",
  "nav.dash": "Tablou de bord",
  "nav.report": "Analiza generată",
  "nav.data": "Date și surse",
  "nav.fin": "Analiză financiară cu AI",
  "m.level": "Macroeconomie · România",
  "m.pill": "10 ani de date oficiale",
  "footer.source":
    "Sursele datelor: Eurostat · Banca Națională a României · INS · BIS · FMI (World Economic Outlook) · Banca Mondială",
  "footer.disclaimer.p2":
    "Analiza macroeconomică este generată automat, în browser, de un motor de reguli transparent — nu se trimite nicio cerere către un model AI și nu există apeluri API pentru utilizatori. Textul este un punct de plecare pentru discuție, nu o prognoză și nici o recomandare de investiții.",
  "footer.disclaimer.p3":
    "Datele sunt descărcate din surse oficiale gratuite și pot fi revizuite de instituțiile care le publică. Ultimele observații sunt adesea estimări preliminare (flash).",
  "home.eyebrow": "Macroeconomie cu instrumente AI · material didactic",
  "home.title": "Economia României în zece ani de date oficiale",
  "home.text":
    "Un tablou de bord care adună în același loc creșterea economică, inflația, piața muncii, finanțele publice, echilibrele externe și condițiile financiare, cu date descărcate din surse oficiale gratuite. Alegi perioada, urmărești tendințele, iar aplicația generează în browser o analiză macroeconomică structurată pentru intervalul ales.",
  "home.series": "Serii de timp",
  "home.sources": "Surse oficiale",
  "home.updated": "Date actualizate",
  "home.dash.title": "Tablou de bord",
  "home.dash.text":
    "Indicatorii cheie la finalul perioadei alese și evoluția lor, pe șase teme, cu comparația față de media Uniunii Europene și cu pragurile de referință (ținta de inflație a BNR, criteriile de la Maastricht).",
  "home.report.title": "Analiza macroeconomică generată",
  "home.report.text":
    "Pentru perioada aleasă, motorul de analiză citește seriile, calculează medii, extreme, puncte de inflexiune și scorul de dezechilibre, apoi scrie raportul: rezumat, creștere, inflație, muncă, buget, extern, riscuri și întrebări de discuție.",
  "home.data.title": "Date și surse",
  "home.data.text":
    "Catalogul complet al seriilor: instituția, codul exact al setului de date, frecvența, prima și ultima observație. Fiecare serie se poate descărca în CSV pentru lucru în Excel.",
  "home.open": "Deschide",
  "home.note.kicker": "Cum să folosești materialul",
  "home.note.title": "Trei lucruri de știut înainte",
  "home.note.p1":
    "„AI” înseamnă aici un motor de analiză bazat pe reguli, care rulează integral în browser. Fiecare frază din raport provine dintr-un calcul pe care îl poți verifica în tabloul de bord — exact ce ar trebui să ceri și unui model de limbaj. Pentru comparație, pagina de analiză îți oferă și un prompt gata făcut, cu datele perioadei, pe care îl poți folosi în asistentul AI preferat.",
  "home.note.p2":
    "Datele macroeconomice se revizuiesc. PIB-ul trimestrial, deficitul bugetar sau contul curent pot fi corectate la publicările ulterioare, uneori semnificativ. O concluzie trasă pe ultimul trimestru este întotdeauna provizorie.",
  "home.note.p3":
    "Inflația afișată este indicele armonizat (IAPC/HICP, Eurostat), comparabil între țările UE. Ținta BNR este definită pe IPC-ul național (INS); cele două măsuri sunt apropiate, dar nu identice.",
  // ---- period
  "p.kicker": "Perioada analizată",
  "p.title": "Alege intervalul",
  "p.from": "De la",
  "p.to": "Până la",
  "p.presets": "Perioade predefinite",
  "p.all": "Ultimii 10 ani",
  "p.pre": "Înainte de pandemie",
  "p.covid": "Pandemia",
  "p.infl": "Șocul inflaționist",
  "p.recent": "Ultimii 3 ani",
  "p.eu": "Arată media UE",
  // ---- dashboard
  "d.eyebrow": "Tablou de bord",
  "d.title": "Indicatorii cheie și tendințele lor",
  "d.text":
    "Valorile de pe carduri sunt ultimele observații disponibile până la finalul perioadei alese; săgeata compară cu începutul perioadei. Graficele arată doar intervalul ales, cu media UE punctată acolo unde există.",
  "d.end": "Sfârșitul perioadei",
  "d.start": "Începutul perioadei",
  "d.obs": "Observații",
  "d.kpi.kicker": "Instantaneu",
  "d.kpi.title": "Unde se afla economia la finalul perioadei",
  "d.vsStart": "față de începutul perioadei",
  "d.theme.growth": "Activitate economică",
  "d.theme.prices": "Prețuri și politică monetară",
  "d.theme.labour": "Piața muncii",
  "d.theme.fiscal": "Finanțe publice",
  "d.theme.external": "Sector extern",
  "d.theme.financial": "Condiții financiare",
  "d.theme.outlook": "Perspective",
  "d.source": "Sursa",
  "d.noData": "Nu există observații în perioada aleasă.",
  "d.hint": "Treci cu mouse-ul peste puncte pentru valori exacte.",
  // ---- report
  "r.eyebrow": "Analiza generată",
  "r.title": "Analiza macroeconomică a perioadei alese",
  "r.text":
    "Motorul de analiză citește toate seriile din intervalul ales, le compară cu perioada anterioară de aceeași lungime și cu media UE, verifică pragurile de referință și scrie raportul. Nimic nu pleacă din browser.",
  "r.generate": "Generează analiza",
  "r.regenerate": "Regenerează",
  "r.generating": "se analizează seriile…",
  "r.copy": "Copiază textul",
  "r.download": "Descarcă (.md)",
  "r.print": "Tipărește",
  "r.engine": "Motor de reguli în browser · fără API",
  "r.how.kicker": "Transparență",
  "r.how.title": "Cum a fost generată analiza",
  "r.how.p1":
    "Fiecare afirmație din raport este legată de un calcul: medie pe perioadă, valoarea finală, extremele, schimbarea față de perioada anterioară de aceeași lungime și distanța față de media UE sau față de un prag oficial. Formularea (de exemplu „accelerare”, „dezinflație”, „derapaj bugetar”) este aleasă din praguri fixe, vizibile în codul sursă (engine.js).",
  "r.how.p2":
    "Un model de limbaj ar scrie mai fluent, dar ar putea inventa cifre. Aici fluența este sacrificată pentru trasabilitate. Folosește promptul de mai jos ca să compari cele două abordări pe aceleași date.",
  "r.prompt.kicker": "Pentru seminar",
  "r.prompt.title": "Promptul pentru un asistent AI",
  "r.prompt.help":
    "Textul de mai jos conține datele perioadei alese într-un format compact și instrucțiunile de analiză. Copiază-l în asistentul AI pe care îl folosești (nu este trimis nicăieri de această pagină) și compară răspunsul cu raportul generat aici: ce cifre a folosit, ce a omis, unde a interpretat diferit.",
  "r.prompt.copy": "Copiază promptul",
  "r.score.kicker": "Semnale",
  "r.score.title": "Tabloul dezechilibrelor (după pragurile procedurii MIP a Comisiei Europene)",
  "r.score.help":
    "Indicatorii principali din procedura privind dezechilibrele macroeconomice (MIP), calculați la finalul perioadei. Pragurile sunt cele oficiale pentru statele din afara zonei euro. Un prag depășit este un semnal de analiză, nu un verdict.",
  "r.score.indicator": "Indicator",
  "r.score.value": "Valoare",
  "r.score.threshold": "Prag",
  "r.score.state": "Stare",
  "r.score.ok": "în limite",
  "r.score.breach": "prag depășit",
  "r.score.na": "indisponibil",
  // ---- data
  "s.eyebrow": "Date și surse",
  "s.title": "De unde vin cifrele",
  "s.text":
    "Toate seriile sunt descărcate automat din API-urile publice ale instituțiilor oficiale, de un script care rulează în GitHub Actions de două ori pe lună. Aplicația citește doar fișierul rezultat; utilizatorii nu fac nicio cerere către surse.",
  "s.catalogue.kicker": "Catalog",
  "s.catalogue.title": "Seriile disponibile",
  "s.indicator": "Indicator",
  "s.source": "Sursă și cod",
  "s.freq": "Frecvență",
  "s.first": "Prima obs.",
  "s.last": "Ultima obs.",
  "s.n": "Obs.",
  "s.csv": "CSV",
  "s.all": "Descarcă toate seriile (CSV)",
  "s.stale": "neactualizată la ultima rulare",
  "s.generated": "Fișier generat la",
  "s.inst.kicker": "Instituții",
  "s.inst.title": "Sursele oficiale folosite",
  "s.missing.kicker": "Limite",
  "s.missing.title": "Ce nu se găsește aici și de ce",
  "freq.M": "lunar",
  "freq.Q": "trimestrial",
  "freq.A": "anual",
  "freq.S": "semestrial",
  "status.loading": "se încarcă datele…",
  "status.error": "Datele nu au putut fi încărcate. Pagina trebuie deschisă printr-un server web (de exemplu GitHub Pages), nu direct din fișier.",
  "toast.copied": "Copiat în clipboard",
};

const EN = {
  "nav.home": "Home",
  "nav.dash": "Dashboard",
  "nav.report": "Generated analysis",
  "nav.data": "Data & sources",
  "nav.fin": "Financial analysis with AI",
  "m.level": "Macroeconomics · Romania",
  "m.pill": "10 years of official data",
  "footer.source":
    "Data sources: Eurostat · National Bank of Romania · INS (national statistics) · BIS · IMF (World Economic Outlook) · World Bank",
  "footer.disclaimer.p2":
    "The macroeconomic analysis is generated automatically in the browser by a transparent rule engine — no request is sent to an AI model and there are no API calls for users. The text is a starting point for discussion, not a forecast or investment advice.",
  "footer.disclaimer.p3":
    "Data are downloaded from free official sources and may be revised by the publishing institutions. The latest observations are often preliminary (flash) estimates.",
  "home.eyebrow": "Macroeconomics with AI tools · teaching material",
  "home.title": "Romania's economy in ten years of official data",
  "home.text":
    "A dashboard that brings together growth, inflation, the labour market, public finances, external balances and financial conditions, using data downloaded from free official sources. Pick a period, follow the trends, and the app generates a structured macroeconomic analysis for that window, in your browser.",
  "home.series": "Time series",
  "home.sources": "Official sources",
  "home.updated": "Data updated",
  "home.dash.title": "Dashboard",
  "home.dash.text":
    "Key indicators at the end of the chosen period and how they evolved, across six themes, compared with the EU average and with reference thresholds (the NBR inflation target, the Maastricht criteria).",
  "home.report.title": "Generated macroeconomic analysis",
  "home.report.text":
    "For the chosen period the analysis engine reads the series, computes averages, extremes, turning points and the imbalance scoreboard, then writes the report: summary, growth, inflation, labour, budget, external, risks and discussion questions.",
  "home.data.title": "Data & sources",
  "home.data.text":
    "The full catalogue of series: institution, exact dataset code, frequency, first and last observation. Every series can be downloaded as CSV for work in Excel.",
  "home.open": "Open",
  "home.note.kicker": "How to use this material",
  "home.note.title": "Three things to know first",
  "home.note.p1":
    "“AI” here means a rule-based analysis engine that runs entirely in the browser. Every sentence of the report comes from a calculation you can check on the dashboard — exactly what you should also demand from a language model. For comparison, the analysis page also gives you a ready-made prompt with the period's data, to use in the AI assistant of your choice.",
  "home.note.p2":
    "Macroeconomic data get revised. Quarterly GDP, the budget deficit or the current account can be corrected in later releases, sometimes significantly. A conclusion drawn from the last quarter is always provisional.",
  "home.note.p3":
    "Inflation shown is the harmonised index (HICP, Eurostat), comparable across EU countries. The NBR target is defined on the national CPI (INS); the two measures are close but not identical.",
  "p.kicker": "Period analysed",
  "p.title": "Choose the window",
  "p.from": "From",
  "p.to": "To",
  "p.presets": "Preset periods",
  "p.all": "Last 10 years",
  "p.pre": "Pre-pandemic",
  "p.covid": "Pandemic",
  "p.infl": "Inflation shock",
  "p.recent": "Last 3 years",
  "p.eu": "Show EU average",
  "d.eyebrow": "Dashboard",
  "d.title": "Key indicators and their trends",
  "d.text":
    "Card values are the latest observations available up to the end of the chosen period; the arrow compares with the start of the period. Charts show only the chosen window, with the EU average dotted where available.",
  "d.end": "End of period",
  "d.start": "Start of period",
  "d.obs": "Observations",
  "d.kpi.kicker": "Snapshot",
  "d.kpi.title": "Where the economy stood at the end of the period",
  "d.vsStart": "vs start of period",
  "d.theme.growth": "Economic activity",
  "d.theme.prices": "Prices and monetary policy",
  "d.theme.labour": "Labour market",
  "d.theme.fiscal": "Public finances",
  "d.theme.external": "External sector",
  "d.theme.financial": "Financial conditions",
  "d.theme.outlook": "Outlook",
  "d.source": "Source",
  "d.noData": "No observations in the chosen period.",
  "d.hint": "Hover over the points for exact values.",
  "r.eyebrow": "Generated analysis",
  "r.title": "Macroeconomic analysis of the chosen period",
  "r.text":
    "The analysis engine reads every series in the chosen window, compares it with the previous period of equal length and with the EU average, checks reference thresholds and writes the report. Nothing leaves the browser.",
  "r.generate": "Generate the analysis",
  "r.regenerate": "Regenerate",
  "r.generating": "analysing the series…",
  "r.copy": "Copy text",
  "r.download": "Download (.md)",
  "r.print": "Print",
  "r.engine": "Rule engine in the browser · no API",
  "r.how.kicker": "Transparency",
  "r.how.title": "How the analysis was generated",
  "r.how.p1":
    "Every statement in the report is tied to a calculation: period average, end value, extremes, change versus the previous period of equal length and distance from the EU average or an official threshold. The wording (e.g. “acceleration”, “disinflation”, “fiscal slippage”) is picked from fixed thresholds, visible in the source code (engine.js).",
  "r.how.p2":
    "A language model would write more fluently, but it could invent numbers. Here fluency is traded for traceability. Use the prompt below to compare the two approaches on the same data.",
  "r.prompt.kicker": "For the seminar",
  "r.prompt.title": "The prompt for an AI assistant",
  "r.prompt.help":
    "The text below contains the chosen period's data in a compact format plus the analysis instructions. Paste it into the AI assistant you use (this page sends it nowhere) and compare the answer with the report generated here: which numbers it used, what it left out, where it interpreted differently.",
  "r.prompt.copy": "Copy the prompt",
  "r.score.kicker": "Signals",
  "r.score.title": "Imbalance scoreboard (European Commission MIP thresholds)",
  "r.score.help":
    "The headline indicators of the Macroeconomic Imbalance Procedure (MIP), computed at the end of the period. Thresholds are the official ones for non-euro-area member states. A breached threshold is a signal for analysis, not a verdict.",
  "r.score.indicator": "Indicator",
  "r.score.value": "Value",
  "r.score.threshold": "Threshold",
  "r.score.state": "Status",
  "r.score.ok": "within limits",
  "r.score.breach": "breached",
  "r.score.na": "unavailable",
  "s.eyebrow": "Data & sources",
  "s.title": "Where the numbers come from",
  "s.text":
    "All series are downloaded automatically from the public APIs of official institutions by a script that runs in GitHub Actions twice a month. The app only reads the resulting file; users make no request to the sources.",
  "s.catalogue.kicker": "Catalogue",
  "s.catalogue.title": "Available series",
  "s.indicator": "Indicator",
  "s.source": "Source and code",
  "s.freq": "Frequency",
  "s.first": "First obs.",
  "s.last": "Last obs.",
  "s.n": "Obs.",
  "s.csv": "CSV",
  "s.all": "Download all series (CSV)",
  "s.stale": "not refreshed in the last run",
  "s.generated": "File generated at",
  "s.inst.kicker": "Institutions",
  "s.inst.title": "Official sources used",
  "s.missing.kicker": "Limits",
  "s.missing.title": "What is not here and why",
  "freq.M": "monthly",
  "freq.Q": "quarterly",
  "freq.A": "annual",
  "freq.S": "half-yearly",
  "status.loading": "loading data…",
  "status.error": "The data could not be loaded. The page must be served by a web server (e.g. GitHub Pages), not opened directly from disk.",
  "toast.copied": "Copied to clipboard",
};
Object.assign(I18N.ro, RO);
Object.assign(I18N.en, EN);

export const $ = (id) => document.getElementById(id);
export const ro = () => getLang() === "ro";
export const L = (r, e) => (ro() ? r : e);
export const E = (s) => esc(String(s ?? ""));
const loc = () => (ro() ? "ro-RO" : "en-GB");
export const nf = (v, d = 1) =>
  isNum(v) ? (v < 0 ? "−" : "") + Math.abs(v).toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";
export const sgn = (v, d = 1) => (isNum(v) ? (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d }) : "—");

// ------------------------------------------------------------------ indicator catalogue
// unit: "%", "pp", "% PIB", "idx", "lei", "eur", "ron" ; dec: decimals ; good: +1 higher is better, -1 lower is better, 0 neutral
export const IND = {
  gdp_real_a: { ro: "Creșterea PIB real (anual)", en: "Real GDP growth (annual)", u: "%", dec: 1, good: 1 },
  gdp_yoy_q: { ro: "PIB real, trimestrial (față de același trimestru al anului anterior)", en: "Real GDP, quarterly (year on year)", u: "%", dec: 1, good: 1 },
  gdp_qoq_q: { ro: "PIB real, trimestrial (față de trimestrul anterior, ajustat sezonier)", en: "Real GDP, quarterly (quarter on quarter, seasonally adjusted)", u: "%", dec: 1, good: 1 },
  gdp_nominal_a: { ro: "PIB nominal", en: "Nominal GDP", u: "meur", dec: 0, good: 0 },
  gdp_nominal_ron_a: { ro: "PIB nominal (lei)", en: "Nominal GDP (RON)", u: "mron", dec: 0, good: 0 },
  gdp_pc_pps_a: { ro: "PIB pe locuitor la paritatea puterii de cumpărare (UE27 = 100)", en: "GDP per capita in PPS (EU27 = 100)", u: "idx", dec: 0, good: 1 },
  contrib_cons_a: { ro: "Contribuția consumului gospodăriilor", en: "Contribution of household consumption", u: "pp", dec: 1, good: 0 },
  contrib_gov_a: { ro: "Contribuția consumului public", en: "Contribution of government consumption", u: "pp", dec: 1, good: 0 },
  contrib_gfcf_a: { ro: "Contribuția investițiilor (FBCF)", en: "Contribution of investment (GFCF)", u: "pp", dec: 1, good: 0 },
  contrib_inv_a: { ro: "Contribuția variației stocurilor", en: "Contribution of inventory change", u: "pp", dec: 1, good: 0 },
  contrib_nx_a: { ro: "Contribuția exportului net", en: "Contribution of net exports", u: "pp", dec: 1, good: 0 },
  indprod_m: { ro: "Producția industrială (volum, față de anul anterior)", en: "Industrial production (volume, year on year)", u: "%", dec: 1, good: 1 },
  retail_m: { ro: "Comerțul cu amănuntul (volum, față de anul anterior)", en: "Retail trade (volume, year on year)", u: "%", dec: 1, good: 1 },
  constr_m: { ro: "Lucrările de construcții (volum, față de anul anterior)", en: "Construction output (volume, year on year)", u: "%", dec: 1, good: 1 },
  esi_m: { ro: "Indicatorul de sentiment economic (ESI)", en: "Economic sentiment indicator (ESI)", u: "idx", dec: 1, good: 1 },
  cons_conf_m: { ro: "Încrederea consumatorilor (sold)", en: "Consumer confidence (balance)", u: "bal", dec: 1, good: 1 },
  hicp_m: { ro: "Inflația anuală (IAPC)", en: "Annual inflation (HICP)", u: "%", dec: 1, good: -1 },
  hicp_core_m: { ro: "Inflația de bază (fără energie și alimente)", en: "Core inflation (excl. energy and food)", u: "%", dec: 1, good: -1 },
  hicp_food_m: { ro: "Inflația la alimente", en: "Food inflation", u: "%", dec: 1, good: -1 },
  hicp_energy_m: { ro: "Inflația la energie", en: "Energy inflation", u: "%", dec: 1, good: -1 },
  hpi_q: { ro: "Prețurile locuințelor (față de anul anterior)", en: "House prices (year on year)", u: "%", dec: 1, good: 0 },
  policy_rate_m: { ro: "Rata dobânzii de politică monetară (BNR)", en: "Monetary policy rate (NBR)", u: "%", dec: 2, good: 0 },
  irate3m_m: { ro: "Dobânda interbancară la 3 luni (ROBOR 3M)", en: "3-month interbank rate (ROBOR 3M)", u: "%", dec: 2, good: 0 },
  bond10y_m: { ro: "Randamentul titlurilor de stat la 10 ani", en: "10-year government bond yield", u: "%", dec: 2, good: -1 },
  unemp_m: { ro: "Rata șomajului (BIM, ajustată sezonier)", en: "Unemployment rate (ILO, seasonally adjusted)", u: "%", dec: 1, good: -1 },
  unemp_youth_m: { ro: "Rata șomajului în rândul tinerilor (sub 25 de ani)", en: "Youth unemployment rate (under 25)", u: "%", dec: 1, good: -1 },
  emp_rate_a: { ro: "Rata de ocupare (20–64 ani)", en: "Employment rate (20–64)", u: "%", dec: 1, good: 1 },
  lci_q: { ro: "Costul orar al forței de muncă (față de anul anterior)", en: "Hourly labour cost (year on year)", u: "%", dec: 1, good: 0 },
  ulc_a: { ro: "Costul unitar nominal al muncii (anual)", en: "Nominal unit labour cost (annual)", u: "%", dec: 1, good: -1 },
  ins_wage_m: { ro: "Câștigul salarial mediu net", en: "Average net monthly earnings", u: "lei", dec: 0, good: 1 },
  min_wage_s: { ro: "Salariul minim brut", en: "Gross minimum wage", u: "eur", dec: 0, good: 0 },
  deficit_a: { ro: "Soldul bugetului general consolidat (ESA)", en: "General government balance (ESA)", u: "% PIB", dec: 1, good: 1 },
  debt_a: { ro: "Datoria publică", en: "Government debt", u: "% PIB", dec: 1, good: -1 },
  debt_q: { ro: "Datoria publică (trimestrial)", en: "Government debt (quarterly)", u: "% PIB", dec: 1, good: -1 },
  gov_rev_a: { ro: "Veniturile bugetare totale", en: "Total government revenue", u: "% PIB", dec: 1, good: 0 },
  gov_exp_a: { ro: "Cheltuielile bugetare totale", en: "Total government expenditure", u: "% PIB", dec: 1, good: 0 },
  gov_int_a: { ro: "Cheltuielile cu dobânzile", en: "Interest expenditure", u: "% PIB", dec: 1, good: -1 },
  ca_gdp_q: { ro: "Contul curent (trimestrial)", en: "Current account (quarterly)", u: "% PIB", dec: 1, good: 1 },
  ca_q: { ro: "Contul curent", en: "Current account", u: "meur", dec: 0, good: 1 },
  goods_q: { ro: "Balanța bunurilor", en: "Goods balance", u: "meur", dec: 0, good: 1 },
  services_q: { ro: "Balanța serviciilor", en: "Services balance", u: "meur", dec: 0, good: 1 },
  primary_q: { ro: "Veniturile primare", en: "Primary income", u: "meur", dec: 0, good: 1 },
  secondary_q: { ro: "Veniturile secundare", en: "Secondary income", u: "meur", dec: 0, good: 1 },
  niip_a: { ro: "Poziția investițională internațională netă", en: "Net international investment position", u: "% PIB", dec: 1, good: 1 },
  eurron_m: { ro: "Cursul EUR/RON (medie lunară BNR)", en: "EUR/RON exchange rate (NBR monthly average)", u: "ron", dec: 4, good: 0 },
  usdron_m: { ro: "Cursul USD/RON (medie lunară BNR)", en: "USD/RON exchange rate (NBR monthly average)", u: "ron", dec: 4, good: 0 },
  eurron_m_es: { ro: "Cursul EUR/RON (Eurostat, medie lunară)", en: "EUR/RON exchange rate (Eurostat, monthly average)", u: "ron", dec: 4, good: 0 },
  reer_m: { ro: "Cursul real efectiv al leului (indice)", en: "Real effective exchange rate of the leu (index)", u: "idx", dec: 1, good: 0 },
  credit_gdp_q: { ro: "Creditul total către sectorul privat nefinanciar", en: "Total credit to the private non-financial sector", u: "% PIB", dec: 1, good: 0 },
  credit_gap_q: { ro: "Decalajul creditului față de trend (credit gap)", en: "Credit-to-GDP gap", u: "pp", dec: 1, good: 0 },
  population_a: { ro: "Populația la 1 ianuarie", en: "Population on 1 January", u: "pers", dec: 0, good: 0 },
  imf_gdp: { ro: "FMI · creșterea PIB real", en: "IMF · real GDP growth", u: "%", dec: 1, good: 1 },
  imf_cpi: { ro: "FMI · inflația medie (IPC)", en: "IMF · average inflation (CPI)", u: "%", dec: 1, good: -1 },
  imf_unemp: { ro: "FMI · rata șomajului", en: "IMF · unemployment rate", u: "%", dec: 1, good: -1 },
  imf_ca: { ro: "FMI · contul curent", en: "IMF · current account", u: "% PIB", dec: 1, good: 1 },
  imf_balance: { ro: "FMI · soldul bugetar", en: "IMF · fiscal balance", u: "% PIB", dec: 1, good: 1 },
  imf_debt: { ro: "FMI · datoria publică brută", en: "IMF · gross public debt", u: "% PIB", dec: 1, good: -1 },
  wb_gdp_pc_usd: { ro: "PIB pe locuitor (USD curenți)", en: "GDP per capita (current USD)", u: "usd", dec: 0, good: 1 },
  wb_fdi_gdp: { ro: "Investițiile străine directe, intrări nete", en: "Foreign direct investment, net inflows", u: "% PIB", dec: 1, good: 1 },
  wb_trade_gdp: { ro: "Deschiderea comercială (exporturi + importuri)", en: "Trade openness (exports + imports)", u: "% PIB", dec: 1, good: 0 },
  wb_remit_gdp: { ro: "Remitențele primite", en: "Personal remittances received", u: "% PIB", dec: 1, good: 0 },
};

export function indName(id) {
  const base = id.endsWith("_eu") ? id.slice(0, -3) : id;
  const d = IND[base];
  const n = d ? (ro() ? d.ro : d.en) : base;
  return id.endsWith("_eu") ? `${n} · UE27` : n;
}
export function unitLabel(u) {
  const m = {
    "%": "%", pp: L("pp", "pp"), "% PIB": L("% din PIB", "% of GDP"), idx: L("indice", "index"), bal: L("sold", "balance"),
    lei: "lei", eur: "EUR", usd: "USD", ron: "lei", meur: L("mil. EUR", "EUR m"), mron: L("mil. lei", "RON m"), pers: L("persoane", "people"),
  };
  return m[u] ?? u;
}
/** Value with unit, short form used in cards, tooltips and the report. */
export function fmtU(v, u, dec = 1) {
  if (!isNum(v)) return "—";
  if (u === "%" || u === "% PIB") return nf(v, dec) + (u === "%" ? " %" : L(" % din PIB", " % of GDP"));
  if (u === "pp") return sgn(v, dec) + " pp";
  if (u === "meur") return Math.abs(v) >= 1000 ? nf(v / 1000, 1) + L(" mld. EUR", " EUR bn") : nf(v, 0) + L(" mil. EUR", " EUR m");
  if (u === "mron") return nf(v / 1000, 1) + L(" mld. lei", " RON bn");
  if (u === "lei" || u === "ron") return nf(v, dec) + " lei";
  if (u === "eur") return nf(v, dec) + " EUR";
  if (u === "usd") return nf(v, dec) + " USD";
  if (u === "pers") return nf(v / 1e6, 2) + L(" mil.", " m");
  return nf(v, dec);
}
export const fmtI = (id, v) => {
  const d = IND[id.replace(/_eu$/, "")] || { u: "", dec: 1 };
  return fmtU(v, d.u, d.dec);
};

// ------------------------------------------------------------------ data
let DATA = null;
export async function loadData() {
  if (DATA) return DATA;
  const res = await fetch("./data/macro.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  DATA = await res.json();
  return DATA;
}
export const S = (id) => DATA?.series?.[id] || null;
export const obsOf = (id) => S(id)?.obs || [];
export const has = (id) => obsOf(id).length > 0;

/** Period label ("2024-03", "2024-Q1", "2024-S1", "2024") to decimal year at the middle of the period. */
export function tnum(p) {
  const y = Number(p.slice(0, 4));
  if (p.length === 4) return y + 0.5;
  if (p[5] === "Q") return y + (Number(p[6]) - 0.5) / 4;
  if (p[5] === "S") return y + (Number(p[6]) - 0.5) / 2;
  return y + (Number(p.slice(5, 7)) - 0.5) / 12;
}
export const yearOf = (p) => Number(p.slice(0, 4));
const MONTHS_RO = ["ian.", "feb.", "mar.", "apr.", "mai", "iun.", "iul.", "aug.", "sept.", "oct.", "nov.", "dec."];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtPeriod(p) {
  if (!p) return "—";
  if (p.length === 4) return p;
  if (p[5] === "Q") return (ro() ? "T" : "Q") + p[6] + " " + p.slice(0, 4);
  if (p[5] === "S") return (ro() ? "S" : "H") + p[6] + " " + p.slice(0, 4);
  const m = Number(p.slice(5, 7)) - 1;
  return (ro() ? MONTHS_RO : MONTHS_EN)[m] + " " + p.slice(0, 4);
}
/** Observations within [from, to] years (inclusive). */
export const inP = (obs, from, to) => obs.filter(([p]) => yearOf(p) >= from && yearOf(p) <= to);
/** Last observation with year <= to. */
export function lastObs(obs, to) {
  for (let i = obs.length - 1; i >= 0; i--) if (yearOf(obs[i][0]) <= to) return obs[i];
  return null;
}
export function firstObs(obs, from) {
  return obs.find(([p]) => yearOf(p) >= from) || null;
}
/** Annual averages of a sub-annual series: {year: avg}; `full` requires all sub-periods. */
export function annualAvg(obs, { full = false, sum = false } = {}) {
  const g = {};
  for (const [p, v] of obs) (g[yearOf(p)] ||= []).push(v);
  const out = {};
  for (const [y, vs] of Object.entries(g)) {
    const n = obs.find(([p]) => yearOf(p) === +y)[0].length === 7 ? (obs[0][0][5] === "Q" ? 4 : 12) : 1;
    if (full && vs.length < n) continue;
    out[y] = sum ? vs.reduce((a, b) => a + b, 0) : vs.reduce((a, b) => a + b, 0) / vs.length;
  }
  return out;
}
export const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
export const maxBy = (obs) => obs.reduce((m, o) => (!m || o[1] > m[1] ? o : m), null);
export const minBy = (obs) => obs.reduce((m, o) => (!m || o[1] < m[1] ? o : m), null);

/** Current account, % of GDP, per calendar year: sum of the 4 quarters over nominal GDP in EUR. */
export function caAnnual(item = "ca_q") {
  const q = annualAvg(obsOf(item), { full: true, sum: true });
  const gdp = Object.fromEntries(obsOf("gdp_nominal_a").map(([p, v]) => [p, v]));
  const out = {};
  for (const [y, s] of Object.entries(q)) if (isNum(gdp[y])) out[y] = (100 * s) / gdp[y];
  return out;
}
/** Rolling 4-quarter current account in % of GDP (last 4 quarters over annual GDP, latest year available). */
export function caRolling() {
  const q = obsOf("ca_q");
  const gdp = Object.fromEntries(obsOf("gdp_nominal_a").map(([p, v]) => [+p, v]));
  const gy = Object.keys(gdp).map(Number);
  const out = [];
  for (let i = 3; i < q.length; i++) {
    const s = q[i - 3][1] + q[i - 2][1] + q[i - 1][1] + q[i][1];
    let y = yearOf(q[i][0]);
    // nominal GDP of the four quarters: interpolate between the two calendar years
    const qn = Number(q[i][0][6]);
    const gA = gdp[y] ?? gdp[Math.max(...gy)],
      gB = gdp[y - 1] ?? gA;
    const g = (gA * qn + gB * (4 - qn)) / 4;
    if (isNum(g)) out.push([q[i][0], (100 * s) / g]);
  }
  return out;
}
export const toObs = (obj) => Object.entries(obj).map(([y, v]) => [String(y), v]).sort();

export function dataYears() {
  const all = Object.values(DATA.series).flatMap((s) => (s.obs.length ? [yearOf(s.obs[0][0]), yearOf(s.obs[s.obs.length - 1][0])] : []));
  const maxY = Math.min(Math.max(...all), new Date().getFullYear());
  return { min: Math.max(Math.min(...all), maxY - 10), max: maxY };
}

// ------------------------------------------------------------------ period state (shared by all pages)
const PKEY = "macro.period";
export function getPeriod() {
  const { min, max } = dataYears();
  const qs = new URLSearchParams(location.search);
  let from = Number(qs.get("de")),
    to = Number(qs.get("pana"));
  if (!from || !to) {
    try {
      const s = JSON.parse(localStorage.getItem(PKEY) || "null");
      if (s) ({ from, to } = s);
    } catch (e) {}
  }
  if (!from || from < min || from > max) from = min;
  if (!to || to > max || to < from) to = max;
  return { from, to, min, max };
}
export function setPeriod(from, to) {
  try {
    localStorage.setItem(PKEY, JSON.stringify({ from, to }));
  } catch (e) {}
  const u = new URL(location.href);
  u.searchParams.set("de", from);
  u.searchParams.set("pana", to);
  history.replaceState(null, "", u);
}
export function presets(min, max) {
  return [
    { key: "p.all", from: min, to: max },
    { key: "p.pre", from: min, to: 2019 },
    { key: "p.covid", from: 2020, to: 2021 },
    { key: "p.infl", from: 2022, to: 2023 },
    { key: "p.recent", from: max - 2, to: max },
  ].filter((p) => p.from >= min && p.to <= max && p.from <= p.to);
}

/** Period selector panel; onChange(from, to) fires on every change. */
export function periodPanel(P, onChange, extra = "") {
  const opts = (sel) => {
    let h = "";
    for (let y = P.min; y <= P.max; y++) h += `<option value="${y}"${y === sel ? " selected" : ""}>${y}</option>`;
    return h;
  };
  const pr = presets(P.min, P.max)
    .map((p) => `<button type="button" class="tab-button${p.from === P.from && p.to === P.to ? " is-active" : ""}" data-from="${p.from}" data-to="${p.to}">${E(t(p.key))} <small style="margin-left:6px;opacity:.7">${p.from}–${p.to}</small></button>`)
    .join("");
  const html = `<section class="card panel-card period-card">
    <div class="section-heading"><div><p class="section-kicker">${E(t("p.kicker"))}</p><h2>${E(t("p.title"))}</h2></div>
      <span class="status-pill">${P.from} – ${P.to}</span></div>
    <div class="period-row">
      <label class="field-card"><span class="field-label">${E(t("p.from"))}</span><select class="field-input" id="p-from">${opts(P.from)}</select></label>
      <label class="field-card"><span class="field-label">${E(t("p.to"))}</span><select class="field-input" id="p-to">${opts(P.to)}</select></label>
      ${extra}
    </div>
    <div class="tab-list" role="group" aria-label="${E(t("p.presets"))}">${pr}</div>
  </section>`;
  const wire = () => {
    const f = $("p-from"),
      tt = $("p-to");
    const fire = (a, b) => {
      if (a > b) [a, b] = [b, a];
      setPeriod(a, b);
      onChange(a, b);
    };
    f?.addEventListener("change", () => fire(+f.value, +tt.value));
    tt?.addEventListener("change", () => fire(+f.value, +tt.value));
    document.querySelectorAll(".period-card [data-from]").forEach((b) => b.addEventListener("click", () => fire(+b.dataset.from, +b.dataset.to)));
  };
  return { html, wire };
}

// ------------------------------------------------------------------ shell
export function renderMacroShell(active) {
  const nav = $("site-nav");
  if (nav) {
    const link = (key, href, id) => `<a class="nav-link${active === id ? " is-active" : ""}" href="${href}" data-i18n="nav.${key}"></a>`;
    nav.innerHTML =
      link("home", "./index.html", "home") +
      link("dash", "./tablou.html", "dash") +
      link("report", "./analiza.html", "report") +
      link("data", "./surse.html", "data") +
      `<a class="nav-link" href="https://cezar-constantin.github.io/analiza_financiara_cu_ai_avansat/" target="_blank" rel="noreferrer" data-i18n="nav.fin"></a>
      <div class="lang-switch" role="group" aria-label="Language">
        <button type="button" data-lang="ro">RO</button>
        <button type="button" data-lang="en">EN</button>
      </div>`;
  }
  const footer = $("site-footer");
  if (footer) {
    footer.innerHTML = `
      <section class="card disclaimer-card">
        <div class="section-heading">
          <div>
            <p class="section-kicker" data-i18n="footer.disclaimer.kicker"></p>
            <h2 data-i18n="footer.disclaimer.title"></h2>
          </div>
          <span class="status-pill" data-i18n="footer.disclaimer.pill"></span>
        </div>
        <p class="helper-copy" data-i18n="footer.disclaimer.p1"></p>
        <p class="helper-copy" data-i18n="footer.disclaimer.p2"></p>
        <p class="helper-copy" data-i18n="footer.disclaimer.p3"></p>
        <p class="helper-copy footer-meta"><span data-i18n="footer.source"></span> · <span data-i18n="footer.more"></span> <a href="https://cezar-chirila.com/" target="_blank" rel="noreferrer">www.cezar-chirila.com</a></p>
      </section>`;
  }
  initLangSwitch();
  applyStaticTranslations();
}

export function errorPanel(e) {
  return `<section class="card panel-card"><div class="empty-state"><strong>${E(t("status.error"))}</strong><p class="chart-caption">${E(e?.message || e)}</p></div></section>`;
}

// ------------------------------------------------------------------ charts (same visual language as common.js)
export const C = {
  ro: PALETTE[0],
  eu: "#8a94ad",
  alt: PALETTE[1],
  warm: PALETTE[2],
  violet: PALETTE[3],
  rose: PALETTE[4],
  good: "#1b6f3a",
  bad: "#b0491b",
};

function niceTicks(min, max, n = 4) {
  const span = max - min || 1;
  const raw = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const ticks = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(10)));
  return { ticks, step };
}

/**
 * Time-series chart over the years [from, to].
 * series: [{obs:[[period,value]], label, color, dash, width, fmt}]
 * opts: refs:[{y,label,color}], band:{lo,hi,label}, yfmt, height, zero
 */
export function tsChart(series, from, to, opts = {}) {
  const W = opts.width || 640,
    H = opts.height || 260,
    padL = 50,
    padR = 16,
    padT = 16,
    padB = 30;
  const pw = W - padL - padR,
    ph = H - padT - padB;
  const x0 = from,
    x1 = to + 1;
  const pts = series.map((s) => inP(s.obs || [], from, to));
  const vals = pts.flat().map((o) => o[1]);
  if (!vals.length) return `<p class="chart-caption">${E(t("d.noData"))}</p>`;
  for (const r of opts.refs || []) vals.push(r.y);
  if (opts.band) vals.push(opts.band.lo, opts.band.hi);
  let lo = Math.min(...vals),
    hi = Math.max(...vals);
  if (opts.zero !== false && lo > 0 && lo < (hi - lo) * 0.6) lo = 0;
  if (hi === lo) hi = lo + 1;
  const padV = (hi - lo) * 0.06;
  lo -= padV;
  hi += padV;
  const { ticks } = niceTicks(lo, hi, 4);
  lo = Math.min(lo, ticks[0]);
  hi = Math.max(hi, ticks[ticks.length - 1]);
  const xf = (tv) => padL + ((tv - x0) / (x1 - x0)) * pw;
  const yf = (v) => padT + ((hi - v) / (hi - lo)) * ph;
  const yfmt = opts.yfmt || ((v) => nf(v, Math.abs(hi - lo) < 5 ? 1 : 0));
  let svg = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${E(opts.aria || series.map((s) => s.label).join(", "))}">`;
  for (const tv of ticks) {
    const y = yf(tv);
    svg += `<line class="grid-line" x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}"/>`;
    svg += `<text class="axis-label" x="${padL - 6}" y="${y + 4}" text-anchor="end">${E(yfmt(tv))}</text>`;
  }
  if (opts.band) {
    svg += `<rect x="${padL}" y="${yf(opts.band.hi)}" width="${pw}" height="${Math.max(0, yf(opts.band.lo) - yf(opts.band.hi))}" fill="rgba(27,111,58,0.08)"/>`;
    if (opts.band.label) svg += `<text class="axis-label" x="${W - padR - 4}" y="${yf(opts.band.hi) - 4}" text-anchor="end" fill="#1b6f3a">${E(opts.band.label)}</text>`;
  }
  const nYears = x1 - x0;
  const step = nYears > 8 ? 2 : 1;
  for (let y = x0; y < x1; y++) {
    const x = xf(y);
    svg += `<line class="grid-line" x1="${x}" x2="${x}" y1="${padT}" y2="${padT + ph}" opacity="0.5"/>`;
    if ((y - x0) % step === 0) svg += `<text class="axis-label" x="${xf(y + 0.5)}" y="${H - 10}" text-anchor="middle" font-weight="700">${y}</text>`;
  }
  if (lo < 0 && hi > 0) svg += `<line class="axis-line" x1="${padL}" x2="${W - padR}" y1="${yf(0)}" y2="${yf(0)}"/>`;
  for (const r of opts.refs || []) {
    svg += `<line x1="${padL}" x2="${W - padR}" y1="${yf(r.y)}" y2="${yf(r.y)}" stroke="${r.color || C.bad}" stroke-width="1.4" stroke-dasharray="6 4"/>`;
    if (r.label) svg += `<text class="axis-label" x="${padL + 6}" y="${yf(r.y) - 5}" fill="${r.color || C.bad}" font-weight="700">${E(r.label)}</text>`;
  }
  series.forEach((s, i) => {
    const P = pts[i];
    if (!P.length) return;
    const xy = P.map(([p, v]) => [xf(tnum(p)), yf(v), p, v]);
    const fmt = s.fmt || ((v) => nf(v, 1));
    if (s.bars) {
      const bw = Math.max(2, (pw / nYears) * (s.barW || 0.34));
      const off = s.barOffset || 0;
      for (const [x, y, p, v] of xy) {
        const top = Math.min(y, yf(Math.max(lo, 0))),
          h = Math.abs(y - yf(Math.max(lo, 0)));
        svg += `<g class="hover-target"><rect x="${x - bw / 2 + off * bw}" y="${top}" width="${bw}" height="${Math.max(h, 1)}" rx="3" fill="${s.color}" opacity="${s.opacity || 1}"><title>${E(fmtPeriod(p))} · ${E(s.label)}: ${E(fmt(v))}</title></rect></g>`;
      }
      return;
    }
    let d = "";
    let prevT = null;
    for (const [x, y, p] of xy) {
      const tv = tnum(p);
      const gap = prevT != null && tv - prevT > (p.length === 7 && p[5] !== "Q" && p[5] !== "S" ? 0.2 : p.length === 4 ? 1.5 : 0.6);
      d += `${!d || gap ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      prevT = tv;
    }
    if (s.step) {
      d = "";
      xy.forEach(([x, y], k) => {
        d += k ? `H${x.toFixed(1)}V${y.toFixed(1)}` : `M${x.toFixed(1)},${y.toFixed(1)}`;
      });
    }
    svg += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.2}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""} stroke-linejoin="round" stroke-linecap="round"/>`;
    const r = xy.length > 60 ? 2.2 : xy.length > 20 ? 3 : 4.2;
    for (const [x, y, p, v] of xy)
      svg += `<g class="hover-target"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${s.color}" stroke="#fff" stroke-width="${r > 3 ? 1.5 : 0.8}"${s.dash ? ' opacity="0.8"' : ""}><title>${E(fmtPeriod(p))} · ${E(s.label)}: ${E(fmt(v))}</title></circle></g>`;
  });
  svg += `<line class="axis-line" x1="${padL}" x2="${W - padR}" y1="${padT + ph}" y2="${padT + ph}"/>`;
  svg += `</svg>`;
  return svg;
}

/** Stacked annual contributions (pp) with the total as a marker. rows: [{key,label,color,obs}], total obs */
export function stackChart(rows, total, from, to, opts = {}) {
  const W = opts.width || 640,
    H = opts.height || 280,
    padL = 50,
    padR = 16,
    padT = 16,
    padB = 30;
  const pw = W - padL - padR,
    ph = H - padT - padB;
  const years = [];
  for (let y = from; y <= to; y++) years.push(y);
  const val = (obs, y) => obs.find(([p]) => +p === y)?.[1];
  let lo = 0,
    hi = 0;
  const stacks = years.map((y) => {
    let pos = 0,
      neg = 0;
    const segs = rows.map((r) => {
      const v = val(r.obs, y);
      if (!isNum(v)) return null;
      const s = v >= 0 ? { a: pos, b: pos + v } : { a: neg + v, b: neg };
      if (v >= 0) pos += v;
      else neg += v;
      return { ...s, v, r };
    });
    lo = Math.min(lo, neg);
    hi = Math.max(hi, pos);
    const tv = val(total, y);
    if (isNum(tv)) (lo = Math.min(lo, tv)), (hi = Math.max(hi, tv));
    return { y, segs, tv };
  });
  if (!stacks.some((s) => s.segs.some(Boolean))) return `<p class="chart-caption">${E(t("d.noData"))}</p>`;
  const { ticks } = niceTicks(lo, hi, 5);
  lo = Math.min(lo, ticks[0]);
  hi = Math.max(hi, ticks[ticks.length - 1]);
  const yf = (v) => padT + ((hi - v) / (hi - lo)) * ph;
  const gw = pw / years.length;
  const bw = Math.min(40, gw * 0.6);
  let svg = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${E(opts.aria || "")}">`;
  for (const tv of ticks) {
    svg += `<line class="grid-line" x1="${padL}" x2="${W - padR}" y1="${yf(tv)}" y2="${yf(tv)}"/>`;
    svg += `<text class="axis-label" x="${padL - 6}" y="${yf(tv) + 4}" text-anchor="end">${E(nf(tv, 0))}</text>`;
  }
  stacks.forEach((s, i) => {
    const cx = padL + i * gw + gw / 2;
    for (const g of s.segs) {
      if (!g) continue;
      svg += `<g class="hover-target"><rect x="${cx - bw / 2}" y="${yf(g.b)}" width="${bw}" height="${Math.max(0.8, yf(g.a) - yf(g.b))}" fill="${g.r.color}"><title>${s.y} · ${E(g.r.label)}: ${E(sgn(g.v, 1))} pp</title></rect></g>`;
    }
    if (isNum(s.tv))
      svg += `<g class="hover-target"><rect x="${cx - bw / 2 - 4}" y="${yf(s.tv) - 2}" width="${bw + 8}" height="4" rx="2" fill="#162554"><title>${s.y} · ${E(opts.totalLabel || "")}: ${E(sgn(s.tv, 1))} %</title></rect></g>`;
    svg += `<text class="axis-label" x="${cx}" y="${H - 10}" text-anchor="middle" font-weight="700">${s.y}</text>`;
  });
  svg += `<line class="axis-line" x1="${padL}" x2="${W - padR}" y1="${yf(0)}" y2="${yf(0)}"/></svg>`;
  return svg;
}

/** Tiny sparkline for KPI tiles. */
export function spark(obs, color = C.ro) {
  if (!obs || obs.length < 2) return "";
  const W = 140,
    H = 34;
  const v = obs.map((o) => o[1]);
  const lo = Math.min(...v),
    hi = Math.max(...v);
  const sp = hi - lo || 1;
  const pts = v.map((y, i) => `${((i / (v.length - 1)) * (W - 4) + 2).toFixed(1)},${(H - 3 - ((y - lo) / sp) * (H - 6)).toFixed(1)}`);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" points="${pts.join(" ")}"/><circle cx="${pts[pts.length - 1].split(",")[0]}" cy="${pts[pts.length - 1].split(",")[1]}" r="2.8" fill="${color}"/></svg>`;
}

export function legend(items) {
  return `<div class="legend-row">${items
    .map((s) => `<span class="legend-chip${s.dash ? " is-dashed" : ""}" style="--legend-color:${s.color}">${E(s.label)}</span>`)
    .join("")}</div>`;
}

export function csvOf(ids) {
  const rows = [["serie", "indicator", "perioada", "valoare", "unitate", "sursa"]];
  for (const id of ids) {
    const s = S(id);
    if (!s) continue;
    for (const [p, v] of s.obs) rows.push([id, indName(id), p, String(v).replace(".", ro() ? "," : "."), s.unit, s.source]);
  }
  return rows.map((r) => r.map((c) => (/[;"\n]/.test(c) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(";")).join("\n");
}
