// Data & sources: catalogue of every series with its origin, coverage and CSV download.
import { t, applyStaticTranslations, downloadText } from "./common.js";
import { $, L, E, nf, IND, indName, unitLabel, fmtPeriod, loadData, renderMacroShell, errorPanel, csvOf } from "./macro.js";

let D = null;

const INSTITUTIONS = () => [
  {
    name: "Eurostat",
    url: "https://ec.europa.eu/eurostat/web/main/data/database",
    what: L(
      "Conturi naționale (PIB, contribuții), IAPC, piața muncii, finanțe publice (notificările EDP), balanța de plăți, dobânzi și curs, indicatori lunari, tabloul MIP. Datele pentru România sunt transmise de INS, BNR și Ministerul Finanțelor.",
      "National accounts (GDP, contributions), HICP, labour market, public finances (EDP notifications), balance of payments, interest and exchange rates, monthly indicators, the MIP scoreboard. Romanian data are transmitted by INS, the NBR and the Ministry of Finance."
    ),
    api: "API JSON-stat 2.0 · dissemination/statistics/1.0",
  },
  {
    name: L("Banca Națională a României", "National Bank of Romania"),
    url: "https://www.bnr.ro/Cursul-de-schimb-524.aspx",
    what: L("Cursurile de referință zilnice (fișierele XML anuale), agregate în medii lunare.", "Daily reference rates (annual XML files), aggregated to monthly averages."),
    api: "curs.bnr.ro/files/xml/years/nbrfxrates{an}.xml",
  },
  {
    name: L("Institutul Național de Statistică", "National Institute of Statistics (INS)"),
    url: "http://statistici.insse.ro:8077/tempo-online/",
    what: L("Câștigul salarial mediu net lunar (matricea TEMPO FOM106D).", "Average net monthly earnings (TEMPO matrix FOM106D)."),
    api: "TEMPO-Online · tempo-ins/pivot",
  },
  {
    name: "BIS",
    url: "https://data.bis.org/",
    what: L("Rata dobânzii de politică monetară (seria BIS preia deciziile BNR) și cursul real efectiv al leului.", "The monetary policy rate (the BIS series records NBR decisions) and the real effective exchange rate of the leu."),
    api: "stats.bis.org/api/v1 · WS_CBPOL, WS_EER",
  },
  {
    name: L("Fondul Monetar Internațional", "International Monetary Fund"),
    url: "https://www.imf.org/en/Publications/WEO",
    what: L("World Economic Outlook: istoric și proiecții pentru creștere, inflație, șomaj, cont curent, sold bugetar și datorie.", "World Economic Outlook: history and projections for growth, inflation, unemployment, current account, fiscal balance and debt."),
    api: "imf.org/external/datamapper/api/v1",
  },
  {
    name: L("Banca Mondială", "World Bank"),
    url: "https://data.worldbank.org/country/romania",
    what: L("Indicatori structurali anuali: PIB pe locuitor în USD, investiții străine directe, deschidere comercială, remitențe.", "Annual structural indicators: GDP per capita in USD, foreign direct investment, trade openness, remittances."),
    api: "api.worldbank.org/v2 · WDI",
  },
];

const LIMITS = () => [
  L(
    "Execuția bugetară lunară (metodologie cash) publicată de Ministerul Finanțelor nu are un API public stabil; tabloul folosește soldul bugetar în metodologia europeană ESA 2010, anual, care este și cel relevant pentru procedura de deficit excesiv.",
    "The monthly cash budget execution published by the Ministry of Finance has no stable public API; the dashboard uses the ESA 2010 budget balance (annual), which is also the one relevant for the excessive deficit procedure."
  ),
  L(
    "Inflația IPC națională (INS), pe care este definită ținta BNR, nu are un API stabil; se folosește IAPC (Eurostat), comparabil între țări. Diferențele dintre cele două sunt, de regulă, de câteva zecimi.",
    "National CPI inflation (INS), on which the NBR target is defined, has no stable API; HICP (Eurostat), comparable across countries, is used instead. The two usually differ by a few tenths."
  ),
  L(
    "Creditul neguvernamental lunar și datoria externă din baza de date interactivă a BNR nu pot fi descărcate automat; creditul privat apare prin indicatorii anuali ai tabloului MIP (Eurostat).",
    "Monthly non-government credit and external debt from the NBR interactive database cannot be downloaded automatically; private credit appears through the annual MIP scoreboard indicators (Eurostat)."
  ),
  L(
    "Din 2026, Eurostat publică IAPC în clasificarea COICOP 2018 (setul prc_hicp_minr). Seriile de inflație sunt continuate automat cu noul set după ultima lună din setul vechi.",
    "From 2026 Eurostat publishes the HICP under COICOP 2018 (dataset prc_hicp_minr). The inflation series are automatically continued with the new dataset after the last month of the old one."
  ),
];

function render() {
  const ids = Object.keys(D.series).sort((a, b) => {
    const ka = Object.keys(IND).indexOf(a.replace(/_eu$/, "")),
      kb = Object.keys(IND).indexOf(b.replace(/_eu$/, ""));
    return (ka < 0 ? 999 : ka) - (kb < 0 ? 999 : kb) || a.localeCompare(b);
  });
  const rows = ids
    .map((id) => {
      const s = D.series[id];
      const o = s.obs;
      return `<tr>
        <td><strong>${E(indName(id))}</strong><br><small class="muted">${E(unitLabel(IND[id.replace(/_eu$/, "")]?.u || s.unit))}${s.stale ? ` · <span class="status-dot watch">${E(t("s.stale"))}</span>` : ""}</small></td>
        <td>${E(s.source)}<br><small class="muted mono"><a href="${E(s.url)}" target="_blank" rel="noreferrer">${E(s.code)}</a></small></td>
        <td>${E(t("freq." + s.freq))}</td>
        <td class="num">${E(o.length ? fmtPeriod(o[0][0]) : "—")}</td>
        <td class="num">${E(o.length ? fmtPeriod(o[o.length - 1][0]) : "—")}</td>
        <td class="num">${nf(o.length, 0)}</td>
        <td><button type="button" class="small-button" data-csv="${E(id)}">${E(t("s.csv"))}</button></td>
      </tr>`;
    })
    .join("");
  const inst = INSTITUTIONS()
    .map(
      (i) => `<article class="card panel-card tool-card">
        <h3>${E(i.name)}</h3><p class="helper-copy">${E(i.what)}</p>
        <p class="source-note mono">${E(i.api)}</p>
        <a class="ghost-button" href="${E(i.url)}" target="_blank" rel="noreferrer">${E(L("Site-ul sursei", "Source website"))}</a></article>`
    )
    .join("");
  $("hero-series").textContent = nf(ids.length, 0);
  $("hero-obs").textContent = nf(ids.reduce((a, id) => a + D.series[id].obs.length, 0), 0);
  $("hero-updated").textContent = D.generated.replace("T", " ").slice(0, 16) + " UTC";
  $("workspace").innerHTML = `
    <section class="card panel-card">
      <div class="section-heading"><div><p class="section-kicker">${E(t("s.catalogue.kicker"))}</p><h2>${E(t("s.catalogue.title"))}</h2>
      <p class="chart-caption">${E(t("s.generated"))} ${E(D.generated.replace("T", " ").slice(0, 16))} UTC · ${E(L("perioada descărcată începe în", "download window starts in"))} ${D.start_year}</p></div>
      <button type="button" class="primary-button" id="csv-all">${E(t("s.all"))}</button></div>
      <div class="table-scroll catalogue-scroll"><table class="data-table"><thead><tr>
        <th>${E(t("s.indicator"))}</th><th>${E(t("s.source"))}</th><th>${E(t("s.freq"))}</th><th class="num">${E(t("s.first"))}</th><th class="num">${E(t("s.last"))}</th><th class="num">${E(t("s.n"))}</th><th></th>
      </tr></thead><tbody>${rows}</tbody></table></div>
    </section>
    <section class="theme-section"><div class="theme-heading"><p class="section-kicker">${E(t("s.inst.kicker"))} · ${E(t("s.inst.title"))}</p></div>
      <div class="tool-grid three-up">${inst}</div></section>
    <section class="card panel-card">
      <div class="section-heading"><div><p class="section-kicker">${E(t("s.missing.kicker"))}</p><h3>${E(t("s.missing.title"))}</h3></div></div>
      <ul class="plain-list">${LIMITS().map((x) => `<li>${E(x)}</li>`).join("")}</ul>
      <p class="helper-copy">${E(
        L(
          "Actualizarea: scriptul scripts/fetch_data.py (doar biblioteca standard Python) rulează în GitHub Actions pe 3 și 18 ale fiecărei luni și poate fi pornit manual din fila Actions. Dacă o sursă nu răspunde, seria își păstrează valorile de la rularea anterioară și este marcată ca neactualizată.",
          "Updates: the scripts/fetch_data.py script (Python standard library only) runs in GitHub Actions on the 3rd and 18th of every month and can be started manually from the Actions tab. If a source does not respond, the series keeps the values from the previous run and is flagged as not refreshed."
        )
      )}</p>
    </section>`;
  $("csv-all").addEventListener("click", () => downloadText("macro_romania_toate_seriile.csv", "﻿" + csvOf(ids), "text/csv"));
  document.querySelectorAll("[data-csv]").forEach((b) =>
    b.addEventListener("click", () => downloadText(`macro_romania_${b.dataset.csv}.csv`, "﻿" + csvOf([b.dataset.csv]), "text/csv"))
  );
  applyStaticTranslations();
}

renderMacroShell("data");
(async () => {
  try {
    D = await loadData();
    render();
  } catch (e) {
    $("workspace").innerHTML = errorPanel(e);
  }
})();
document.addEventListener("langchange", () => D && render());
