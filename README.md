# Macroeconomia României cu instrumente AI

Tablou de bord didactic cu principalii indicatori macroeconomici ai României pe ultimii zece ani,
descărcați din surse oficiale gratuite, și o **analiză macroeconomică generată automat** pentru perioada
aleasă. Tot calculul rulează în browser; utilizatorii nu fac niciun apel API și nimic nu se trimite pe
server. Interfață RO/EN, cu același aspect ca materialele
[Analiză financiară cu AI](https://github.com/cezar-constantin/analiza_financiara_cu_ai_avansat).

Live: https://cezar-constantin.github.io/macro_financial_dashboard/

| Pagină | Ce face |
|---|---|
| `index.html` — acasă | Prezentarea instrumentelor și trei avertismente de metodă. |
| `tablou.html` — tablou de bord | Selector de perioadă (ani sau perioade predefinite: pre-pandemie, pandemie, șocul inflaționist, ultimii 3 ani), 8 carduri cu valoarea la final de perioadă și variația față de început, apoi grafice pe șapte teme: activitate economică, prețuri și politică monetară, piața muncii, finanțe publice, sector extern, condiții financiare, perspective FMI. Comparație cu media UE27 și praguri de referință (ținta BNR, Maastricht, MIP). |
| `analiza.html` — analiza generată | Motorul de analiză (`engine.js`) citește seriile perioadei și scrie raportul: rezumat executiv, creștere, inflație și politică monetară, piața muncii, finanțe publice, echilibre externe, perspective, riscuri și întrebări de seminar. Alături: tabloul dezechilibrelor după pragurile MIP, tabelul anual cu datele folosite și un prompt gata făcut pentru un asistent AI extern, ca studenții să compare cele două abordări. Export .md, copiere, tipărire. |
| `surse.html` — date și surse | Catalogul celor 84 de serii: instituția, codul exact al setului de date, frecvența, prima și ultima observație, descărcare CSV (una sau toate). |

## De ce „AI” fără API

Cerința a fost ca utilizatorii să nu facă apeluri API. Analiza este deci produsă de un **motor de reguli
determinist** care rulează în browser: fiecare frază este legată de un calcul (medie, extreme, variație
față de perioada anterioară de aceeași lungime, diferență față de UE, prag depășit), iar cuvintele
calitative („creștere solidă”, „dezinflație”, „deficit excesiv”) vin din praguri fixe, vizibile în cod.
Pentru partea de AI generativ, pagina de analiză construiește promptul cu datele perioadei, pe care
participanții îl pot folosi în asistentul lor — fără ca aplicația să trimită ceva.

## Date

`data/macro.json` (~100 KB) este generat de `scripts/fetch_data.py` (doar biblioteca standard Python),
care rulează în GitHub Actions (`.github/workflows/update-data.yml`) pe 3 și 18 ale fiecărei luni, la
orice modificare a scriptului și manual din fila *Actions*. Scriptul face commit cu datele noi; dacă o
sursă nu răspunde, seria își păstrează valorile anterioare și este marcată ca neactualizată.
Jurnalul ultimei rulări este în `data/fetch_log.json`.

| Sursă | Ce se descarcă |
|---|---|
| **Eurostat** (API JSON-stat) | PIB anual și trimestrial, contribuții la creștere, PIB/locuitor PPS, producție industrială, comerț, construcții, sentiment economic și încrederea consumatorilor, IAPC (total, de bază, alimente, energie — continuat automat în clasificarea COICOP 2018 din 2026), prețurile locuințelor, șomaj (total și tineri), rata de ocupare, costul muncii și costul unitar al muncii, salariul minim, deficit, datorie, venituri, cheltuieli și dobânzi bugetare, balanța de plăți (cont curent și componente), PIIN, ROBOR 3M, randamentul la 10 ani, cursul EUR/RON, populația, indicatorii tabloului MIP (cont curent pe 3 ani, curs real efectiv, cost unitar al muncii, prețuri reale ale locuințelor, datorie și flux de credit privat). Pentru majoritatea indicatorilor se descarcă și media UE27. |
| **BNR** | Cursurile de referință zilnice EUR și USD (fișierele XML anuale), agregate în medii lunare. |
| **INS** (TEMPO-Online) | Câștigul salarial mediu net lunar (FOM106D). |
| **BIS** | Rata dobânzii de politică monetară a BNR și cursul real efectiv al leului. |
| **FMI** (World Economic Outlook) | Istoric și proiecții: creștere, inflație, șomaj, cont curent, sold bugetar, datorie. |
| **Banca Mondială** (WDI) | PIB/locuitor în USD, ISD, deschidere comercială, remitențe. |

Rulare locală: `python3 scripts/fetch_data.py` (sau cu id-uri de serii ca argumente, pentru o
actualizare parțială), apoi `python3 -m http.server` și deschide `http://localhost:8000`. Paginile
trebuie servite printr-un server web: deschise direct din fișier, browserul blochează citirea datelor.

## Limite

- Inflația este IAPC (comparabilă în UE), nu IPC-ul național pe care este definită ținta BNR.
- Soldul bugetar este cel anual în metodologia ESA 2010; execuția bugetară lunară cash a MF nu are un API stabil.
- Creditul lunar și datoria externă din baza interactivă a BNR nu se pot descărca automat.
- Ultimele observații sunt adesea estimări preliminare și se revizuiesc.

## Structură

```
index.html  tablou.html  analiza.html  surse.html
macro.js       – i18n, shell, acces la date, selectorul de perioadă, graficele SVG
engine.js      – motorul de analiză, tabloul MIP, exportul și promptul
tablou.js  analiza.js  surse.js  home.js
common.js  styles.css  – preluate din aplicațiile de analiză financiară, ca aspectul să fie identic
macro.css      – completări de stil pentru tabloul macro
data/          – macro.json și jurnalul ultimei descărcări
scripts/       – fetch_data.py
```

## Publicare

`.github/workflows/deploy-pages.yml` publică site-ul pe GitHub Pages la fiecare push pe `main` și după
fiecare actualizare reușită a datelor pe `main`.

*Material didactic, necomercial. Nu constituie prognoză sau recomandare de investiții.*
