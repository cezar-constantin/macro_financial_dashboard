"""Temporary: print dimension categories of datasets to fix query codes."""
import json, sys, urllib.request, urllib.parse
sys.path.insert(0, "scripts")
from fetch_data import http_get, EUROSTAT, INS

def dims(ds, extra=""):
    try:
        js = json.loads(http_get(EUROSTAT + ds + "?format=JSON&lang=EN&geo=RO&lastTimePeriod=1" + extra, tries=1))
        print("==", ds, extra, "size", js["size"])
        for d in js["id"]:
            if d in ("geo",): continue
            idx = js["dimension"][d]["category"]["index"]
            lab = js["dimension"][d]["category"].get("label", {})
            print("  ", d, [(k, lab.get(k, "")[:50]) for k in list(idx)[:60]])
    except Exception as e:
        print("== FAIL", ds, extra, str(e)[:300])

dims("prc_hicp_minr")
dims("prc_hicp_minr", "&unit=RCH_A")
dims("bop_gdp6_q")
dims("bop_c6_q", "&currency=MIO_EUR&partner=WRL_REST&stk_flow=BAL")
dims("nama_10_gdp", "&unit=CON_PPCH_PRE")
for ds in ["tipspd20", "tipspd22", "tipspc20", "tipspc22", "tipsho20", "tipser10", "tipslm10", "tipsbp20", "tipsbp10", "tipsho10", "nasa_10_f_bs"]:
    dims(ds)
for u in ["https://www.bnr.ro/files/xml/years/nbrfxrates2024.xml", "https://www.bnr.ro/nbrfxrates10days.xml", "https://bnr.ro/files/xml/years/nbrfxrates2024.xml", "https://www.bnr.ro/nbrfxrates.xml"]:
    try:
        b = http_get(u, tries=1)
        print("== BNR", u, len(b), b[:300])
    except Exception as e:
        print("== BNR FAIL", u, str(e)[:200])
for code in ["FOM106D", "FOM106E", "FOM104D"]:
    try:
        m = json.loads(http_get(INS + "matrix/" + code, tries=1, timeout=60))
        print("== INS", code, m.get("matrixName"))
        for d in m["dimensionsMap"]:
            print("   ", d["label"], len(d["options"]), [o["label"] for o in d["options"][:5]], [o["label"] for o in d["options"][-3:]])
    except Exception as e:
        print("== INS FAIL", code, str(e)[:200])
for k in ["WS_TC/Q.RO", "WS_CREDIT_GAP/Q.RO", "WS_DSR/Q.RO", "WS_SPP/Q.RO"]:
    try:
        b = http_get(f"https://stats.bis.org/api/v1/data/{k}/all?lastNObservations=1&detail=dataonly&format=csv", tries=1)
        print("== BIS", k, b[:400])
    except Exception as e:
        print("== BIS FAIL", k, str(e)[:200])
