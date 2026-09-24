#!/usr/bin/env python3
"""Download the macroeconomic series for Romania from official, free sources and write data/macro.json.

Sources (no API key needed):
  * Eurostat dissemination API (JSON-stat 2.0) - national accounts, HICP, labour market,
    government finance, balance of payments, interest and exchange rates, short-term indicators
  * BNR (Banca Nationala a Romaniei) - daily reference exchange rates, yearly XML files
  * BIS (Bank for International Settlements) - BNR policy rate, credit to the private sector,
    real effective exchange rate, residential property prices
  * IMF World Economic Outlook (DataMapper API) - history plus the official projections
  * World Bank (WDI API) - structural annual indicators
  * INS TEMPO-Online - net average monthly wage (best effort; the server is often unreachable)

Only the Python standard library is used. Every series is fetched independently: a failure is logged
in data/fetch_log.json and the series keeps the value from the previous data/macro.json, if any,
so a temporary outage of one source never empties the dashboard.

Run: python3 scripts/fetch_data.py
"""
from __future__ import annotations

import csv
import datetime as dt
import io
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "macro.json")
LOG = os.path.join(ROOT, "data", "fetch_log.json")

START_YEAR = int(os.environ.get("START_YEAR", "2015"))  # one year before the 10-year window, for y/y changes
UA = {"User-Agent": "macro-dashboard-ro/1.0 (educational; github.com/cezar-constantin/macro_financial_dashboard)"}

EUROSTAT = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"


def http_get(url: str, data: bytes | None = None, headers: dict | None = None, tries: int = 4, timeout: int = 90) -> bytes:
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={**UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001 - we log and retry on anything
            last = e
            if hasattr(e, "code") and getattr(e, "code") in (400, 404):
                break
            time.sleep(2 * (i + 1))
    raise RuntimeError(f"{url}: {last}")


# ------------------------------------------------------------------ Eurostat
def since(freq: str) -> str:
    return {"M": f"{START_YEAR}-01", "Q": f"{START_YEAR}-Q1", "A": f"{START_YEAR}", "S": f"{START_YEAR}-S1"}[freq]


def eurostat(ds: str, filters: dict, geos: list[str], freq: str) -> dict[str, list]:
    params = [("format", "JSON"), ("lang", "EN"), ("sinceTimePeriod", since(freq))]
    params += [("geo", g) for g in geos]
    for k, v in filters.items():
        for vv in v if isinstance(v, list) else [v]:
            params.append((k, vv))
    url = EUROSTAT + ds + "?" + urllib.parse.urlencode(params)
    js = json.loads(http_get(url))
    ids, sizes, dims = js["id"], js["size"], js["dimension"]
    # stride of each dimension in the flattened value array
    strides = [1] * len(ids)
    for i in range(len(ids) - 2, -1, -1):
        strides[i] = strides[i + 1] * sizes[i + 1]
    cats = []
    for d in ids:
        idx = dims[d]["category"]["index"]
        inv = {v: k for k, v in idx.items()} if isinstance(idx, dict) else dict(enumerate(idx))
        cats.append(inv)
    extra = [d for d, s in zip(ids, sizes) if s > 1 and d not in ("geo", "time")]
    if extra:
        raise RuntimeError(f"{ds}: filter leaves several categories in {extra}")
    out: dict[str, list] = defaultdict(list)
    for k, v in js.get("value", {}).items():
        k = int(k)
        pos = {d: cats[i][(k // strides[i]) % sizes[i]] for i, d in enumerate(ids)}
        if v is None:
            continue
        out[pos["geo"]].append([pos["time"], round(float(v), 4)])
    for g in out:
        out[g].sort()
    if not out:
        raise RuntimeError(f"{ds}: empty response")
    return out


def eurostat_url(ds: str, filters: dict) -> str:
    return f"https://ec.europa.eu/eurostat/databrowser/view/{ds}/default/table?lang=en"


# ------------------------------------------------------------------ BIS
def bis(flow: str, key: str) -> list:
    url = f"https://stats.bis.org/api/v1/data/{flow}/{key}/all?startPeriod={START_YEAR}-01-01&detail=dataonly&format=csv"
    txt = http_get(url, headers={"Accept": "text/csv"}).decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(txt)))
    obs = []
    for r in rows:
        p, v = r.get("TIME_PERIOD"), r.get("OBS_VALUE")
        if p and v not in (None, "", "NaN"):
            obs.append([p, round(float(v), 4)])
    if not obs:
        raise RuntimeError(f"BIS {flow}/{key}: empty")
    obs.sort()
    return obs


# ------------------------------------------------------------------ BNR
def bnr_fx() -> dict[str, list]:
    ns = {"b": "http://www.bnr.ro/xsd"}
    monthly: dict[str, dict[str, dict]] = {"EUR": defaultdict(dict), "USD": defaultdict(dict)}
    this_year = dt.date.today().year
    hosts = ["https://curs.bnr.ro", "https://www.bnr.ro"]
    for y in range(START_YEAR, this_year + 1):
        paths = [f"/files/xml/years/nbrfxrates{y}.xml"] + (["/nbrfxrates10days.xml"] if y == this_year else [])
        for path in paths:
            errs = []
            for h in hosts:
                try:
                    raw = http_get(h + path, tries=2)
                    if not raw.lstrip().startswith(b"<?xml") and b"<DataSet" not in raw[:500]:
                        raise RuntimeError("HTML instead of XML (anti-bot page)")
                    _bnr_collect(ET.fromstring(raw), ns, monthly)
                    break
                except Exception as e:  # noqa: BLE001
                    errs.append(f"{h}{path}: {str(e)[:120]}")
            else:
                raise RuntimeError("; ".join(errs))
    out = {}
    for cur, m in monthly.items():
        out[cur] = [[k, round(sum(v.values()) / len(v), 4)] for k, v in sorted(m.items())]
    return out


def _bnr_collect(root, ns, monthly):
    for cube in root.iter("{http://www.bnr.ro/xsd}Cube"):
        d = cube.get("date")
        for rate in cube.findall("b:Rate", ns):
            cur = rate.get("currency")
            if cur in monthly:
                mult = float(rate.get("multiplier") or 1)
                # keyed by date so the overlapping 10-day file does not double count
                monthly[cur][d[:7]][d] = float(rate.text) / mult


# ------------------------------------------------------------------ IMF / World Bank / INS
def imf(indicator: str) -> list:
    js = json.loads(http_get(f"https://www.imf.org/external/datamapper/api/v1/{indicator}/ROU"))
    vals = js["values"][indicator]["ROU"]
    return [[k, round(float(v), 4)] for k, v in sorted(vals.items()) if int(k) >= START_YEAR and v is not None]


def worldbank(indicator: str) -> list:
    url = f"https://api.worldbank.org/v2/country/ROU/indicator/{indicator}?format=json&per_page=200&date={START_YEAR}:{dt.date.today().year}"
    js = json.loads(http_get(url))
    rows = js[1] if len(js) > 1 and js[1] else []
    obs = [[r["date"], round(float(r["value"]), 4)] for r in rows if r.get("value") is not None]
    if not obs:
        raise RuntimeError(f"WB {indicator}: empty")
    return sorted(obs)


INS = "http://statistici.insse.ro:8077/tempo-ins/"


def ins_wage() -> list:
    """Net average monthly earnings, total economy (INS TEMPO matrix FOM106D, monthly), lei."""
    code = "FOM106D"
    meta = json.loads(http_get(INS + "matrix/" + code, timeout=60))
    dims = meta["dimensionsMap"]
    enc = []
    periods = {}
    for d in dims:
        label = d["label"].lower()
        opts = d["options"]
        if "luni" in label or "perioade" in label:
            sel = []
            for o in opts:
                lab = o["label"].strip()
                # labels look like "Luna ianuarie 2016"
                yr = [int(t) for t in lab.split() if t.isdigit() and len(t) == 4]
                if yr and yr[0] >= START_YEAR:
                    sel.append(o)
                    periods[str(o["nomItemId"])] = lab
            enc.append(",".join(str(o["nomItemId"]) for o in sel))
        elif "um" in label or "unitati" in label:
            enc.append(str(opts[0]["nomItemId"]))
        else:
            tot = next((o for o in opts if o["label"].strip().lower().startswith("total")), opts[0])
            enc.append(str(tot["nomItemId"]))
    body = {
        "language": "ro",
        "encQuery": ":".join(enc),
        "matCode": code,
        "matMaxDim": meta["details"]["matMaxDim"],
        "matUMSpec": meta["details"]["matUMSpec"],
        "matRegJ": meta["details"].get("matRegJ", 0),
    }
    txt = http_get(INS + "pivot", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}, timeout=120).decode("utf-8")
    months = {"ianuarie": 1, "februarie": 2, "martie": 3, "aprilie": 4, "mai": 5, "iunie": 6, "iulie": 7, "august": 8,
              "septembrie": 9, "octombrie": 10, "noiembrie": 11, "decembrie": 12}
    obs = []
    for line in txt.splitlines()[1:]:
        parts = [p.strip() for p in line.split(",")]
        lab = next((p for p in parts if p.lower().startswith("luna")), None)
        if not lab:
            continue
        w = lab.lower().split()
        try:
            m = months[w[1]]
            y = int(w[2])
            v = float(parts[-1])
        except Exception:
            continue
        obs.append([f"{y}-{m:02d}", v])
    if not obs:
        raise RuntimeError("INS FOM106D: no rows parsed; head=" + txt[:300])
    return sorted(obs)


# ------------------------------------------------------------------ catalogue
# Each entry: id, source, freq, unit, and the query. "eu": also fetch the EU27 aggregate as benchmark.
E = "eurostat"
CATALOGUE = [
    # --- activity
    dict(id="gdp_real_a", src=E, ds="nama_10_gdp", f=dict(unit="CLV_PCH_PRE", na_item="B1GQ"), freq="A", unit="%", eu=True),
    dict(id="gdp_nominal_a", src=E, ds="nama_10_gdp", f=dict(unit="CP_MEUR", na_item="B1GQ"), freq="A", unit="mil. EUR"),
    dict(id="gdp_nominal_ron_a", src=E, ds="nama_10_gdp", f=dict(unit="CP_MNAC", na_item="B1GQ"), freq="A", unit="mil. RON"),
    dict(id="gdp_yoy_q", src=E, ds="namq_10_gdp", f=dict(unit="CLV_PCH_SM", s_adj="SCA", na_item="B1GQ"), freq="Q", unit="%", eu=True,
         alt=[dict(unit="CLV_PCH_SM", s_adj="NSA", na_item="B1GQ")]),
    dict(id="gdp_qoq_q", src=E, ds="namq_10_gdp", f=dict(unit="CLV_PCH_PRE", s_adj="SCA", na_item="B1GQ"), freq="Q", unit="%", eu=True),
    dict(id="contrib_cons_a", src=E, ds="nama_10_gdp", f=dict(unit="CON_PPCH_PRE", na_item="P31_S14_S15"), freq="A", unit="pp"),
    dict(id="contrib_gov_a", src=E, ds="nama_10_gdp", f=dict(unit="CON_PPCH_PRE", na_item="P3_S13"), freq="A", unit="pp"),
    dict(id="contrib_gfcf_a", src=E, ds="nama_10_gdp", f=dict(unit="CON_PPCH_PRE", na_item="P51G"), freq="A", unit="pp"),
    dict(id="contrib_inv_a", src=E, ds="nama_10_gdp", f=dict(unit="CON_PPCH_PRE", na_item="P52_P53"), freq="A", unit="pp"),
    dict(id="gdp_pc_pps_a", src=E, ds="nama_10_pc", f=dict(unit="PC_EU27_2020_HAB_MPPS_CP", na_item="B1GQ"), freq="A", unit="UE27=100"),
    dict(id="indprod_m", src=E, ds="sts_inpr_m", f=dict(indic_bt="PRD", nace_r2="B-D", s_adj="CA", unit="PCH_SM"), freq="M", unit="%", eu=True),
    dict(id="retail_m", src=E, ds="sts_trtu_m", f=dict(indic_bt="VOL_SLS", nace_r2="G47", s_adj="CA", unit="PCH_SM"), freq="M", unit="%", eu=True),
    dict(id="constr_m", src=E, ds="sts_copr_m", f=dict(indic_bt="PRD", nace_r2="F", s_adj="CA", unit="PCH_SM"), freq="M", unit="%"),
    dict(id="esi_m", src=E, ds="ei_bssi_m_r2", f=dict(indic="BS-ESI-I", s_adj="SA"), freq="M", unit="index", eu=True),
    dict(id="cons_conf_m", src=E, ds="ei_bsco_m", f=dict(indic="BS-CSMCI", s_adj="SA", unit="BAL"), freq="M", unit="sold", eu=True),
    # --- prices
    dict(id="hicp_m", src=E, ds="prc_hicp_manr", f=dict(unit="RCH_A", coicop="CP00"), freq="M", unit="%", eu=True,
         extend=[("prc_hicp_minr", dict(unit="RCH_A", coicop18="TOTAL"))]),
    dict(id="hicp_core_m", src=E, ds="prc_hicp_manr", f=dict(unit="RCH_A", coicop="TOT_X_NRG_FOOD"), freq="M", unit="%", eu=True,
         extend=[("prc_hicp_minr", dict(unit="RCH_A", coicop18="TOT_X_NRG_FOOD"))]),
    dict(id="hicp_food_m", src=E, ds="prc_hicp_manr", f=dict(unit="RCH_A", coicop="FOOD"), freq="M", unit="%",
         extend=[("prc_hicp_minr", dict(unit="RCH_A", coicop18="FOOD"))]),
    dict(id="hicp_energy_m", src=E, ds="prc_hicp_manr", f=dict(unit="RCH_A", coicop="NRG"), freq="M", unit="%",
         extend=[("prc_hicp_minr", dict(unit="RCH_A", coicop18="NRG"))]),
    dict(id="hpi_q", src=E, ds="prc_hpi_q", f=dict(purchase="TOTAL", unit="RCH_A"), freq="Q", unit="%", eu=True),
    # --- labour
    dict(id="unemp_m", src=E, ds="une_rt_m", f=dict(s_adj="SA", age="TOTAL", sex="T", unit="PC_ACT"), freq="M", unit="%", eu=True),
    dict(id="unemp_youth_m", src=E, ds="une_rt_m", f=dict(s_adj="SA", age="Y_LT25", sex="T", unit="PC_ACT"), freq="M", unit="%", eu=True),
    dict(id="emp_rate_a", src=E, ds="lfsi_emp_a", f=dict(indic_em="EMP_LFS", sex="T", age="Y20-64", unit="PC_POP"), freq="A", unit="%", eu=True),
    dict(id="lci_q", src=E, ds="lc_lci_r2_q", f=dict(lcstruct="D1_D4_MD5", nace_r2="B-S", s_adj="NSA", unit="PCH_SM"), freq="Q", unit="%", eu=True),
    dict(id="ulc_a", src=E, ds="nama_10_lp_ulc", f=dict(na_item="NULC_PER", unit="PCH_PRE"), freq="A", unit="%", eu=True),
    dict(id="min_wage_s", src=E, ds="earn_mw_cur", f=dict(currency="EUR"), freq="S", unit="EUR"),
    # --- public finance
    dict(id="deficit_a", src=E, ds="gov_10dd_edpt1", f=dict(na_item="B9", sector="S13", unit="PC_GDP"), freq="A", unit="% PIB", eu=True),
    dict(id="debt_a", src=E, ds="gov_10dd_edpt1", f=dict(na_item="GD", sector="S13", unit="PC_GDP"), freq="A", unit="% PIB", eu=True),
    dict(id="debt_q", src=E, ds="gov_10q_ggdebt", f=dict(na_item="GD", sector="S13", unit="PC_GDP"), freq="Q", unit="% PIB", eu=True),
    dict(id="gov_rev_a", src=E, ds="gov_10a_main", f=dict(na_item="TR", sector="S13", unit="PC_GDP"), freq="A", unit="% PIB", eu=True),
    dict(id="gov_exp_a", src=E, ds="gov_10a_main", f=dict(na_item="TE", sector="S13", unit="PC_GDP"), freq="A", unit="% PIB", eu=True),
    dict(id="gov_int_a", src=E, ds="gov_10a_main", f=dict(na_item="D41PAY", sector="S13", unit="PC_GDP"), freq="A", unit="% PIB", eu=True),
    # --- external
    dict(id="ca_gdp_q", src=E, ds="bop_gdp6_q", f=dict(freq="Q", bop_item="CA", stk_flow="BAL", partner="WRL_REST", unit="PC_GDP", s_adj="NSA"), freq="Q", unit="% PIB"),
    dict(id="ca_q", src=E, ds="bop_c6_q", f=dict(bop_item="CA", stk_flow="BAL", partner="WRL_REST", currency="MIO_EUR", sector10="S1", sectpart="S1"), freq="Q", unit="mil. EUR"),
    dict(id="goods_q", src=E, ds="bop_c6_q", f=dict(bop_item="G", stk_flow="BAL", partner="WRL_REST", currency="MIO_EUR", sector10="S1", sectpart="S1"), freq="Q", unit="mil. EUR"),
    dict(id="services_q", src=E, ds="bop_c6_q", f=dict(bop_item="S", stk_flow="BAL", partner="WRL_REST", currency="MIO_EUR", sector10="S1", sectpart="S1"), freq="Q", unit="mil. EUR"),
    dict(id="primary_q", src=E, ds="bop_c6_q", f=dict(bop_item="IN1", stk_flow="BAL", partner="WRL_REST", currency="MIO_EUR", sector10="S1", sectpart="S1"), freq="Q", unit="mil. EUR"),
    dict(id="secondary_q", src=E, ds="bop_c6_q", f=dict(bop_item="IN2", stk_flow="BAL", partner="WRL_REST", currency="MIO_EUR", sector10="S1", sectpart="S1"), freq="Q", unit="mil. EUR"),
    dict(id="niip_a", src=E, ds="tipsii10", f=dict(unit="PC_GDP", stk_flow="N_LE", bop_item="FA", partner="WRL_REST", sector10="S1", sectpart="S1"), freq="A", unit="% PIB"),
    # --- MIP scoreboard (official Eurostat computations) and private sector credit
    dict(id="mip_ca3_a", src=E, ds="tipsbp10", f=dict(unit="PC_GDP_3Y", s_adj="NSA", bop_item="CA", stk_flow="BAL", partner="WRL_REST"), freq="A", unit="% PIB"),
    dict(id="mip_reer3_a", src=E, ds="tipser10", f=dict(unit="PCH_3Y"), freq="A", unit="%"),
    dict(id="mip_ulc3_a", src=E, ds="tipslm10", f=dict(na_item="NULC_HW", unit="PCH_3Y"), freq="A", unit="%"),
    dict(id="mip_hpi_a", src=E, ds="tipsho20", f=dict(unit="RCH_A_AVG"), freq="A", unit="%"),
    dict(id="credit_gdp_a", src=E, ds="tipspd20", f=dict(unit="PC_GDP"), freq="A", unit="% PIB"),
    dict(id="credit_flow_a", src=E, ds="tipspc20", f=dict(unit="PC_GDP"), freq="A", unit="% PIB"),
    # --- financial
    dict(id="irate3m_m", src=E, ds="irt_st_m", f=dict(int_rt="IRT_M3"), freq="M", unit="%"),
    dict(id="bond10y_m", src=E, ds="irt_lt_mcby_m", f=dict(int_rt="MCBY"), freq="M", unit="%"),
    dict(id="eurron_m_es", src=E, ds="ert_bil_eur_m", f=dict(currency="RON", statinfo="AVG", unit="NAC"), freq="M", unit="RON/EUR", geo=False),
    # --- demography
    dict(id="population_a", src=E, ds="demo_pjan", f=dict(age="TOTAL", sex="T", unit="NR"), freq="A", unit="persoane"),
    # --- BIS (policy rate from BNR decisions, credit, REER, property prices)
    dict(id="policy_rate_m", src="bis", flow="WS_CBPOL", key="M.RO", freq="M", unit="%"),
    dict(id="reer_m", src="bis", flow="WS_EER", key="M.R.B.RO", freq="M", unit="2020=100"),
    # --- BNR
    dict(id="bnr_fx", src="bnr", freq="M", unit="RON"),
    # --- IMF WEO (history + projections)
    dict(id="imf_gdp", src="imf", ind="NGDP_RPCH", freq="A", unit="%"),
    dict(id="imf_cpi", src="imf", ind="PCPIPCH", freq="A", unit="%"),
    dict(id="imf_unemp", src="imf", ind="LUR", freq="A", unit="%"),
    dict(id="imf_ca", src="imf", ind="BCA_NGDPD", freq="A", unit="% PIB"),
    dict(id="imf_balance", src="imf", ind="GGXCNL_NGDP", freq="A", unit="% PIB"),
    dict(id="imf_debt", src="imf", ind="GGXWDG_NGDP", freq="A", unit="% PIB"),
    # --- World Bank
    dict(id="wb_gdp_pc_usd", src="wb", ind="NY.GDP.PCAP.CD", freq="A", unit="USD"),
    dict(id="wb_fdi_gdp", src="wb", ind="BX.KLT.DINV.WD.GD.ZS", freq="A", unit="% PIB"),
    dict(id="wb_trade_gdp", src="wb", ind="NE.TRD.GNFS.ZS", freq="A", unit="% PIB"),
    dict(id="wb_remit_gdp", src="wb", ind="BX.TRF.PWKR.DT.GD.ZS", freq="A", unit="% PIB"),
    # --- INS
    dict(id="ins_wage_m", src="ins", freq="M", unit="lei"),
]

SOURCE_META = {
    "eurostat": "Eurostat",
    "bis": "BIS (Bank for International Settlements), din datele BNR",
    "bnr": "Banca Națională a României",
    "imf": "FMI — World Economic Outlook",
    "wb": "Banca Mondială — World Development Indicators",
    "ins": "INS — TEMPO-Online",
}


def fetch_one(spec: dict) -> dict[str, dict]:
    """Returns {series_id: {..., obs}} (one spec can produce several series, e.g. RO + EU)."""
    src = spec["src"]
    out = {}
    base = {"src": src, "freq": spec["freq"], "unit": spec["unit"]}
    if src == E:
        geos = ["RO"] + (["EU27_2020"] if spec.get("eu") else [])
        tries = [(spec["ds"], spec["f"])] + [(spec["ds"], a) for a in spec.get("alt", [])] + list(spec.get("alt_ds", []))
        errors = []
        for ds, f in tries:
            try:
                if spec.get("geo") is False:
                    res = eurostat_nogeo(ds, f, spec["freq"])
                else:
                    res = eurostat(ds, f, geos, spec["freq"])
                meta = {**base, "code": ds + " · " + ", ".join(f"{k}={v}" for k, v in f.items()),
                        "url": eurostat_url(ds, f)}
                for ext_ds, ext_f in spec.get("extend", []):
                    # a newer dataset continues the series (e.g. HICP moved to COICOP 2018 in 2026)
                    try:
                        ext = eurostat(ext_ds, ext_f, geos, spec["freq"])
                        for g in list(res):
                            lastp = res[g][-1][0] if res[g] else ""
                            res[g] = res[g] + [o for o in ext.get(g, []) if o[0] > lastp]
                        meta_ext = f" + {ext_ds} · " + ", ".join(f"{k}={v}" for k, v in ext_f.items())
                    except Exception as e:  # noqa: BLE001
                        meta_ext = ""
                        print(f"     extend {ext_ds} failed: {str(e)[:200]}", flush=True)
                    meta["code"] += meta_ext
                if "RO" in res:
                    out[spec["id"]] = {**meta, "obs": res["RO"]}
                if "EU27_2020" in res:
                    out[spec["id"] + "_eu"] = {**meta, "obs": res["EU27_2020"]}
                if out:
                    return out
            except Exception as e:  # noqa: BLE001
                errors.append(str(e)[:400])
        raise RuntimeError(" | ".join(errors))
    if src == "bis":
        obs = bis(spec["flow"], spec["key"])
        return {spec["id"]: {**base, "code": f"{spec['flow']} · {spec['key']}",
                             "url": "https://data.bis.org/topics/" + {"WS_CBPOL": "CBPOL", "WS_EER": "EER"}[spec["flow"]],
                             "obs": obs}}
    if src == "bnr":
        fx = bnr_fx()
        return {
            "eurron_m": {**base, "unit": "RON/EUR", "code": "nbrfxrates{an}.xml · EUR (medie lunară a cursurilor zilnice)", "url": "https://www.bnr.ro/Cursurile-pietei-valutare-in-format-XML-3424.aspx", "obs": fx["EUR"]},
            "usdron_m": {**base, "unit": "RON/USD", "code": "nbrfxrates{an}.xml · USD (medie lunară a cursurilor zilnice)", "url": "https://www.bnr.ro/Cursurile-pietei-valutare-in-format-XML-3424.aspx", "obs": fx["USD"]},
        }
    if src == "imf":
        return {spec["id"]: {**base, "code": f"WEO · {spec['ind']}", "url": f"https://www.imf.org/external/datamapper/{spec['ind']}@WEO/ROU", "obs": imf(spec["ind"])}}
    if src == "wb":
        return {spec["id"]: {**base, "code": f"WDI · {spec['ind']}", "url": f"https://data.worldbank.org/indicator/{spec['ind']}?locations=RO", "obs": worldbank(spec["ind"])}}
    if src == "ins":
        return {spec["id"]: {**base, "code": "TEMPO · FOM106D", "url": "http://statistici.insse.ro:8077/tempo-online/#/pages/tables/insse-table", "obs": ins_wage()}}
    raise ValueError(src)


def eurostat_nogeo(ds, f, freq):
    params = [("format", "JSON"), ("lang", "EN"), ("sinceTimePeriod", since(freq))] + list(f.items())
    js = json.loads(http_get(EUROSTAT + ds + "?" + urllib.parse.urlencode(params)))
    tidx = js["dimension"]["time"]["category"]["index"]
    inv = {v: k for k, v in tidx.items()}
    obs = sorted([inv[int(k)], round(float(v), 4)] for k, v in js["value"].items() if v is not None)
    return {"RO": obs}


def main():
    prev = {}
    if os.path.exists(OUT):
        try:
            with open(OUT, encoding="utf-8") as fh:
                prev = json.load(fh).get("series", {})
        except Exception:
            prev = {}
    series, log = {}, []
    only = set(sys.argv[1:])
    for spec in CATALOGUE:
        if only and spec["id"] not in only:
            continue
        t0 = time.time()
        try:
            res = fetch_one(spec)
            for sid, s in res.items():
                s["source"] = SOURCE_META[spec["src"]]
                series[sid] = s
            log.append({"id": spec["id"], "ok": True, "series": {k: [len(v["obs"]), v["obs"][-1][0] if v["obs"] else None] for k, v in res.items()}, "sec": round(time.time() - t0, 1)})
            print(f"OK   {spec['id']:<20} " + ", ".join(f"{k}: {len(v['obs'])} obs → {v['obs'][-1][0]}" for k, v in res.items()), flush=True)
        except Exception as e:  # noqa: BLE001
            msg = str(e)[:800]
            log.append({"id": spec["id"], "ok": False, "error": msg})
            print(f"FAIL {spec['id']:<20} {msg}", flush=True)
            for k in (spec["id"], spec["id"] + "_eu"):
                if k in prev:
                    series[k] = {**prev[k], "stale": True}
            if spec["src"] == "bnr":
                for k in ("eurron_m", "usdron_m"):
                    if k in prev:
                        series[k] = {**prev[k], "stale": True}
    if only:
        series = {**prev, **series}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    doc = {
        "generated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "start_year": START_YEAR,
        "series": dict(sorted(series.items())),
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, ensure_ascii=False, separators=(",", ":"))
    with open(LOG, "w", encoding="utf-8") as fh:
        json.dump({"generated": doc["generated"], "results": log}, fh, ensure_ascii=False, indent=1)
    ok = sum(1 for r in log if r["ok"])
    print(f"\n{ok}/{len(log)} specs OK, {len(series)} series written to {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()
