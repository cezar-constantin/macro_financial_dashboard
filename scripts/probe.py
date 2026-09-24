"""Temporary: print dimension categories of datasets to fix query codes."""
import json, sys
sys.path.insert(0, "scripts")
from fetch_data import http_get, EUROSTAT

js = json.loads(http_get(EUROSTAT + "prc_hicp_minr?format=JSON&lang=EN&geo=RO&lastTimePeriod=1&unit=RCH_A", tries=1))
idx = js["dimension"]["coicop18"]["category"]["index"]
lab = js["dimension"]["coicop18"]["category"]["label"]
print("== coicop18 aggregates:", [(k, lab[k][:60]) for k in idx if not k.startswith("CP")])
for u in ["https://curs.bnr.ro/files/xml/years/nbrfxrates2024.xml", "https://curs.bnr.ro/nbrfxrates.xml"]:
    try:
        print("== BNR", u, http_get(u, tries=1)[:200])
    except Exception as e:
        print("== BNR FAIL", u, str(e)[:200])
