#!/usr/bin/env python3
"""Download the official definitions of the indicators shown on the dashboard and write
data/definitions_source.json (original texts, in the language published by each source).

  * Eurostat - Statistics Explained glossary (MediaWiki API)
  * World Bank - WDI indicator "sourceNote"
  * IMF - DataMapper indicator descriptions
  * INS - TEMPO matrix metadata (definition and methodology fields)
  * BIS - dataflow descriptions (SDMX structure API)

The texts are the reference for the short definitions shown under each chart (macro.js, DEFS).
Run: python3 scripts/fetch_definitions.py
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_data import http_get, INS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "definitions_source.json")
SE = "https://ec.europa.eu/eurostat/statistics-explained/api.php"

GLOSSARY = [
    "Gross domestic product (GDP)", "Real gross domestic product (GDP) growth", "GDP growth rate", "Real GDP growth rate",
    "Volume", "Chain-linked volumes", "Seasonal adjustment", "Purchasing power standard (PPS)", "Purchasing power parities (PPPs)",
    "GDP per capita", "Volume index of GDP per capita in PPS", "Household consumption expenditure", "Final consumption expenditure",
    "Final consumption expenditure of general government", "Government consumption expenditure", "Gross fixed capital formation (GFCF)",
    "Changes in inventories", "Net exports", "Exports of goods and services", "Imports of goods and services", "External balance of goods and services",
    "Industrial production (volume) index", "Industrial production index", "Retail trade volume index", "Volume of retail trade",
    "Production in construction", "Construction production index", "Economic sentiment indicator (ESI)", "Economic sentiment indicator",
    "Consumer confidence indicator", "Consumer confidence indicator (CCI)", "Harmonised index of consumer prices (HICP)", "Inflation rate",
    "Core inflation", "Annual rate of change", "House price index (HPI)", "Unemployment", "Unemployment rate", "Youth unemployment",
    "Youth unemployment rate", "Employment rate", "Labour cost index (LCI)", "Labour costs", "Nominal unit labour cost (NULC)",
    "Unit labour cost", "Minimum wage", "Minimum wages", "Public balance", "Government deficit", "Government deficit/surplus",
    "Government debt", "General government gross debt", "General government", "Total general government revenue",
    "Total general government expenditure", "Government revenue", "Government expenditure", "Interest", "Current account",
    "Balance of payments", "Goods", "Services", "Primary income", "Secondary income", "International investment position (IIP)",
    "Net international investment position (NIIP)", "Money market interest rate", "Interest rate", "Long-term interest rate",
    "EMU convergence criterion bond yields", "Maastricht criteria", "Exchange rate", "Real effective exchange rate (REER)",
    "Effective exchange rate", "Private sector debt", "Private sector credit flow", "Macroeconomic imbalance procedure (MIP)",
    "Excessive deficit procedure (EDP)", "Population", "Stability and growth pact", "European system of accounts (ESA)",
    "Consumer price index (CPI)", "ILO", "International Labour Organisation (ILO)", "Labour force", "Remittances",
    "Constant price GDP", "GDP per capita in purchasing power standards", "Household final consumption expenditure (HFCE)", "Export",
    "Import", "Exports - NA", "Imports - NA", "Volume of sales index", "Volume of industrial production", "Retail trade", "Confidence indicator",
    "Business and consumer confidence", "Labour cost", "Budget deficit", "Public deficit", "Deficit", "Current transfers",
    "Central bank interest rate", "Bond yields", "Nominal effective exchange rate", "Real effective exchange rate", "Credit",
    "Labour productivity", "Compensation of employees", "International Investment Position", "Goods and services account",
    "Trade deficit", "Gross capital formation", "EURIBOR", "Chain index", "Government gross debt", "Public debt",
]

WB = ["NY.GDP.PCAP.CD", "BX.KLT.DINV.WD.GD.ZS", "NE.TRD.GNFS.ZS", "BX.TRF.PWKR.DT.GD.ZS"]
IMF = ["NGDP_RPCH", "PCPIPCH", "LUR", "BCA_NGDPD", "GGXCNL_NGDP", "GGXWDG_NGDP"]
BIS = ["WS_CBPOL", "WS_EER"]


def se_extract(title: str) -> dict | None:
    page = "Glossary:" + title
    q = {"action": "query", "prop": "extracts", "explaintext": "1", "redirects": "1", "format": "json", "titles": page}
    try:
        js = json.loads(http_get(SE + "?" + urllib.parse.urlencode(q), tries=2))
        for p in js.get("query", {}).get("pages", {}).values():
            if "missing" in p:
                return None
            txt = p.get("extract") or ""
            if txt.strip():
                return {"title": p["title"], "text": txt.strip()}
    except Exception as e:  # noqa: BLE001
        print("extract failed", page, str(e)[:150])
    # fallback: raw wikitext
    q = {"action": "parse", "page": page, "prop": "wikitext", "redirects": "1", "format": "json"}
    try:
        js = json.loads(http_get(SE + "?" + urllib.parse.urlencode(q), tries=2))
        if "error" in js:
            return None
        wt = js["parse"]["wikitext"]["*"]
        wt = re.sub(r"\{\{[^{}]*\}\}", "", wt)
        wt = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", wt)
        wt = re.sub(r"\[https?://\S+ ([^\]]*)\]", r"\1", wt)
        wt = re.sub(r"'{2,}", "", wt)
        wt = re.sub(r"<[^>]+>", "", wt)
        return {"title": js["parse"]["title"], "text": wt.strip()}
    except Exception as e:  # noqa: BLE001
        print("parse failed", page, str(e)[:150])
        return None


SEARCH = [
    "real GDP growth", "chain-linked volumes", "volume index of GDP per capita", "household final consumption expenditure",
    "government final consumption expenditure", "net exports", "exports of goods and services", "imports of goods and services",
    "retail trade", "consumer confidence indicator", "core inflation", "unit labour cost", "government deficit", "government revenue",
    "government expenditure", "secondary income", "goods balance of payments", "services balance of payments", "international investment position",
    "money market interest rate", "long-term interest rate", "real effective exchange rate", "private sector debt", "private sector credit flow",
    "macroeconomic imbalance procedure", "European system of accounts", "interest payable", "minimum wages", "ROBOR",
]


def glossary_ns() -> int | None:
    try:
        js = json.loads(http_get(SE + "?action=query&meta=siteinfo&siprop=namespaces&format=json", tries=2))
        for ns in js["query"]["namespaces"].values():
            if (ns.get("*") or ns.get("name") or "").lower() == "glossary":
                return int(ns["id"])
    except Exception as e:  # noqa: BLE001
        print("siteinfo failed", str(e)[:150])
    return None


def search(term: str, ns) -> list[str]:
    q = {"action": "query", "list": "search", "srsearch": term, "srlimit": "5", "format": "json"}
    if ns is not None:
        q["srnamespace"] = str(ns)
    try:
        js = json.loads(http_get(SE + "?" + urllib.parse.urlencode(q), tries=2))
        return [h["title"] for h in js.get("query", {}).get("search", [])]
    except Exception as e:  # noqa: BLE001
        print("search failed", term, str(e)[:150])
        return []


def glossary_index() -> list[str]:
    titles, cont = [], {}
    ns = glossary_ns()
    while True:
        q = {"action": "query", "list": "allpages", "aplimit": "500", "format": "json", **cont}
        if ns is not None:
            q["apnamespace"] = str(ns)
        else:
            q["apprefix"] = "Glossary:"
        try:
            js = json.loads(http_get(SE + "?" + urllib.parse.urlencode(q), tries=2))
        except Exception as e:  # noqa: BLE001
            print("allpages failed", str(e)[:150])
            break
        titles += [p["title"] for p in js.get("query", {}).get("allpages", [])]
        if "continue" not in js:
            break
        cont = {"apcontinue": js["continue"]["apcontinue"]}
    return titles


def esms_concepts(html: str) -> str:
    """Text of the 'Statistical concepts and definitions' section of a Euro SDMX metadata page."""
    txt = re.sub(r"<script.*?</script>|<style.*?</style>", "", html, flags=re.S)
    txt = re.sub(r"<br\s*/?>|</p>|</div>|</li>|</tr>", "\n", txt)
    txt = re.sub(r"<[^>]+>", "", txt)
    txt = re.sub(r"&nbsp;", " ", txt)
    txt = re.sub(r"&amp;", "&", txt)
    txt = re.sub(r"[ \t]+", " ", txt)
    txt = re.sub(r"\n\s*\n+", "\n", txt)
    # the section starts at the last heading occurrence (the first ones are in the table of contents)
    starts = [m.end() for m in re.finditer(r"Statistical concepts and definitions", txt)]
    if not starts:
        return txt.strip()[:20000]
    body = txt[starts[-1]:]
    end = re.search(r"\n\s*(?:3\.5\.?\s*)?Statistical unit", body)
    return body[: end.start() if end else 6000].strip()[:6000]


def eurostat_datasets() -> dict:
    from fetch_data import CATALOGUE, EUROSTAT
    out = {}
    seen_esms = {}
    for spec in CATALOGUE:
        if spec["src"] != "eurostat":
            continue
        ds, f = spec["ds"], spec["f"]
        rec = {"ds": ds, "filters": f}
        try:
            q = [("format", "JSON"), ("lang", "EN"), ("geo", "RO"), ("lastTimePeriod", "1")] + list(f.items())
            js = json.loads(http_get(EUROSTAT + ds + "?" + urllib.parse.urlencode(q), tries=2))
            rec["dataset_label"] = js.get("label")
            rec["labels"] = {d: list(js["dimension"][d]["category"].get("label", {}).values()) for d in js["id"] if d not in ("geo", "time", "freq")}
        except Exception as e:  # noqa: BLE001
            rec["labels_error"] = str(e)[:200]
        try:
            xml = http_get(f"https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/dataflow/ESTAT/{ds.upper()}", tries=2).decode("utf-8", "replace")
            m = re.search(r"<common:AnnotationType>ESMS_HTML</common:AnnotationType>.*?<common:AnnotationURL>(.*?)</common:AnnotationURL>", xml, re.S) or \
                re.search(r"(https://ec\.europa\.eu/eurostat/cache/metadata/en/[a-z0-9_]+_esms\.htm)", xml)
            if m:
                url = m.group(1)
                rec["esms_url"] = url
                if url not in seen_esms:
                    seen_esms[url] = esms_concepts(http_get(url, tries=2).decode("utf-8", "replace"))
                rec["esms_concepts"] = seen_esms[url]
        except Exception as e:  # noqa: BLE001
            rec["esms_error"] = str(e)[:200]
        out[spec["id"]] = rec
        print("DS", spec["id"], rec.get("dataset_label"), rec.get("esms_url"), len(rec.get("esms_concepts", "")))
    return out


def main():
    out = {"eurostat_glossary": {}, "eurostat_glossary_missing": [], "worldbank": {}, "imf": {}, "ins": {}, "bis": {}}
    idx = glossary_index()
    out["eurostat_glossary_index"] = idx
    print("glossary pages:", len(idx))
    for t in GLOSSARY:
        r = se_extract(t)
        if r:
            out["eurostat_glossary"][t] = {**r, "url": "https://ec.europa.eu/eurostat/statistics-explained/index.php?title=" + urllib.parse.quote(r["title"].replace(" ", "_"))}
            print("OK  ", t)
        else:
            out["eurostat_glossary_missing"].append(t)
            print("MISS", t)
    ns = glossary_ns()
    out["eurostat_search"] = {}
    for term in SEARCH:
        hits = search(term, ns)
        found = {}
        for h in hits[:3]:
            r = se_extract(h.split(":", 1)[1] if h.startswith("Glossary:") else h)
            if r:
                found[h] = {**r, "url": "https://ec.europa.eu/eurostat/statistics-explained/index.php?title=" + urllib.parse.quote(r["title"].replace(" ", "_"))}
        out["eurostat_search"][term] = found
        print("SEARCH", term, "->", list(found))
    out["eurostat_datasets"] = eurostat_datasets()
    for code in WB:
        try:
            js = json.loads(http_get(f"https://api.worldbank.org/v2/indicator/{code}?format=json"))
            d = js[1][0]
            out["worldbank"][code] = {"name": d["name"], "text": d.get("sourceNote", ""), "source": d.get("sourceOrganization", ""),
                                      "url": f"https://data.worldbank.org/indicator/{code}"}
            print("OK   WB", code)
        except Exception as e:  # noqa: BLE001
            print("FAIL WB", code, str(e)[:150])
    try:
        js = json.loads(http_get("https://www.imf.org/external/datamapper/api/v1/indicators"))
        for code in IMF:
            d = js["indicators"].get(code, {})
            out["imf"][code] = {"name": d.get("label"), "text": d.get("description"), "unit": d.get("unit"), "source": d.get("source"),
                                "url": f"https://www.imf.org/external/datamapper/{code}@WEO"}
        print("OK   IMF")
    except Exception as e:  # noqa: BLE001
        print("FAIL IMF", str(e)[:150])
    for code in ["FOM106D"]:
        try:
            m = json.loads(http_get(INS + "matrix/" + code, timeout=60))
            out["ins"][code] = {k: m.get(k) for k in ("matrixName", "definitie", "metodologie", "observatii", "ultimaActualizare", "intrerupere", "continuareSerie", "periodicitati")}
            out["ins"][code]["details"] = {k: v for k, v in (m.get("details") or {}).items() if isinstance(v, (str, int))}
            print("OK   INS", code)
        except Exception as e:  # noqa: BLE001
            print("FAIL INS", code, str(e)[:150])
    for flow in BIS:
        for url in (f"https://stats.bis.org/api/v1/dataflow/BIS/{flow}/1.0?detail=full", f"https://stats.bis.org/api/v2/structure/dataflow/BIS/{flow}/1.0"):
            try:
                txt = http_get(url, headers={"Accept": "application/vnd.sdmx.structure+xml;version=2.1, application/xml"}).decode("utf-8", "replace")
                names = re.findall(r"<(?:com|common):Name[^>]*>(.*?)</(?:com|common):Name>", txt, re.S)
                descs = re.findall(r"<(?:com|common):Description[^>]*>(.*?)</(?:com|common):Description>", txt, re.S)
                ann = re.findall(r"<(?:com|common):AnnotationText[^>]*>(.*?)</(?:com|common):AnnotationText>", txt, re.S)
                out["bis"][flow] = {"url": url, "names": names[:5], "descriptions": descs[:5], "annotations": [a[:3000] for a in ann[:10]]}
                print("OK   BIS", flow)
                break
            except Exception as e:  # noqa: BLE001
                print("FAIL BIS", url, str(e)[:150])
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    print("written", OUT)


if __name__ == "__main__":
    main()
