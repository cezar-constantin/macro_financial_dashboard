// Short definitions of the indicators shown in the charts. Each text is a condensed rendering of the
// official definition published by the source of the data (Romanian translation of the original):
// the originals are kept in data/definitions_source.json, downloaded by scripts/fetch_definitions.py.
// Definitions marked `calc` describe indicators computed in this dashboard from official series.

const G = (title) => `https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Glossary:${encodeURIComponent(title.replace(/ /g, "_"))}`;
const M = (code) => `https://ec.europa.eu/eurostat/cache/metadata/en/${code}_esms.htm`;
const ES_G = (t) => ({ ro: `Eurostat · Glosar: ${t}`, en: `Eurostat · Glossary: ${t}`, url: G(t) });
const ES_M = (code) => ({ ro: `Eurostat · metadate ${code}`, en: `Eurostat · metadata ${code}`, url: M(code) });
const WB = (code) => ({ ro: `Banca Mondială · ${code}`, en: `World Bank · ${code}`, url: `https://data.worldbank.org/indicator/${code}` });
const IMF = (code) => ({ ro: `FMI · WEO ${code}`, en: `IMF · WEO ${code}`, url: `https://www.imf.org/external/datamapper/${code}@WEO` });
const BIS = (flow, topic) => ({ ro: `BIS · ${flow}`, en: `BIS · ${flow}`, url: `https://data.bis.org/topics/${topic}` });
const INS = { ro: "INS · TEMPO FOM106D (definiție)", en: "INS · TEMPO FOM106D (definition)", url: "http://statistici.insse.ro:8077/tempo-online/#/pages/tables/insse-table" };

export const DEFS = {
  gdp_real: {
    name: { ro: "PIB real", en: "Real GDP" },
    ro: "Produsul intern brut este măsura de bază a dimensiunii economiei: suma valorii adăugate brute a tuturor unităților rezidente care desfășoară activități de producție, plus impozitele pe produse, minus subvențiile pe produse. Seria este exprimată în volume înlănțuite (prețuri constante), ca variație procentuală, deci arată creșterea producției fără efectul prețurilor.",
    en: "Gross domestic product is a basic measure of the overall size of a country's economy: the sum of the gross value added of all resident institutional units engaged in production, plus taxes on products and minus subsidies on products. The series is in chain-linked volumes (constant prices), as a percentage change, so it shows output growth without the price effect.",
    src: [ES_G("Gross domestic product (GDP)"), ES_M("nama_10_gdp")],
  },
  gdp_q: {
    name: { ro: "PIB trimestrial, ajustat sezonier", en: "Quarterly GDP, seasonally adjusted" },
    ro: "Același PIB în volume înlănțuite, comparat cu același trimestru al anului anterior. Datele sunt ajustate sezonier și cu numărul de zile lucrătoare: ajustarea sezonieră este metoda statistică prin care se elimină efectele influențelor sezoniere recurente, observate în trecut, pentru ca tendințele nesezoniere să fie mai clare.",
    en: "The same GDP in chain-linked volumes, compared with the same quarter of the previous year. Data are seasonally and calendar adjusted: seasonal adjustment is a statistical method for removing the effects of recurring seasonal influences observed in the past, so that non-seasonal trends show more clearly.",
    src: [ES_M("namq_10_gdp"), ES_G("Seasonal adjustment")],
  },
  contrib: {
    name: { ro: "Contribuția la creșterea PIB", en: "Contribution to GDP growth" },
    ro: "Variația, în puncte procentuale, pe care o componentă a cererii o aduce creșterii PIB față de anul anterior. Din partea cheltuielilor, PIB = consumul final al gospodăriilor și ISFLSG + consumul final al administrației publice + formarea brută de capital fix + variația stocurilor și achizițiile nete de obiecte de valoare + exporturi − importuri.",
    en: "The change, in percentage points, that a demand component adds to GDP growth over the previous year. On the expenditure side, GDP = household and NPISH final consumption + government final consumption + gross fixed capital formation + changes in inventories and net acquisition of valuables + exports − imports.",
    src: [ES_M("nama_10_gdp")],
  },
  hfce: {
    name: { ro: "Consumul final al gospodăriilor", en: "Household final consumption" },
    ro: "Totalul cheltuielilor gospodăriilor rezidente pentru bunuri și servicii individuale, inclusiv cele vândute la prețuri sub nivelul pieței și cheltuielile imputate, care nu au loc în bani (în serie sunt incluse și instituțiile fără scop lucrativ în serviciul gospodăriilor).",
    en: "The total outlay on individual goods and services by resident households, including those sold at below-market prices and imputed expenditures that do not occur in monetary terms (the series also includes non-profit institutions serving households).",
    src: [ES_G("Household final consumption expenditure (HFCE)")],
  },
  govcons: {
    name: { ro: "Consumul final al administrației publice", en: "Government final consumption" },
    ro: "Cheltuielile unităților rezidente pentru bunuri sau servicii folosite pentru satisfacerea directă a nevoilor individuale sau a nevoilor colective ale membrilor comunității; aici, partea efectuată de sectorul administrației publice (S.13).",
    en: "Expenditure by resident units on goods or services used for the direct satisfaction of individual needs or the collective needs of members of the community; here, the part incurred by the general government sector (S.13).",
    src: [ES_G("Final consumption expenditure")],
  },
  gfcf: {
    name: { ro: "Formarea brută de capital fix (investiții)", en: "Gross fixed capital formation (investment)" },
    ro: "Achizițiile, minus cedările, de active fixe ale producătorilor rezidenți într-o perioadă. Activele fixe sunt active corporale sau necorporale, rezultate din procese de producție, folosite repetat sau continuu mai mult de un an.",
    en: "Resident producers' acquisitions, less disposals, of fixed assets during a given period. Fixed assets are tangible or intangible assets produced as outputs from production processes that are used repeatedly, or continuously, for more than one year.",
    src: [ES_G("Gross fixed capital formation (GFCF)")],
  },
  inventories: {
    name: { ro: "Variația stocurilor", en: "Changes in inventories" },
    ro: "Diferența dintre intrările și ieșirile din stocuri: produse finite încă nevândute, bunuri cumpărate pentru consum intermediar sau revânzare, producție în curs și stocuri strategice. Seria include și achizițiile minus cedările de obiecte de valoare.",
    en: "The difference between additions to and withdrawals from inventories: finished output not yet sold, goods acquired for intermediate consumption or resale, work in progress and strategic stocks. The series also includes acquisitions less disposals of valuables.",
    src: [ES_G("Changes in inventories")],
  },
  netexp: {
    name: { ro: "Exportul net (rezidual)", en: "Net exports (residual)" },
    ro: "În conturile naționale, exporturile sunt tranzacții cu bunuri și servicii de la rezidenți către nerezidenți, iar importurile invers. Eurostat nu publică pentru România contribuția exportului net în acest set, așa că aici este calculată ca diferență: creșterea PIB minus contribuțiile celorlalte componente (include și discrepanțele statistice).",
    en: "In national accounts, exports are transactions in goods and services from residents to non-residents, and imports the reverse. Eurostat does not publish the net-export contribution for Romania in this dataset, so it is computed here as a residual: GDP growth minus the other contributions (it also absorbs statistical discrepancies).",
    src: [ES_G("Exports - NA"), ES_M("nama_10_gdp")],
    calc: true,
  },
  indprod: {
    name: { ro: "Indicele producției industriale", en: "Industrial production index" },
    ro: "Indicator de ciclu economic care urmărește variațiile valorii adăugate a industriei, măsurând lunar variațiile volumului producției (indice de tip Laspeyres). Acoperă industria extractivă, prelucrătoare și energia (secțiunile B–D CAEN).",
    en: "A business cycle indicator that aims to measure changes in the value added of industry by measuring monthly changes in the volume of output (a Laspeyres-type index). It covers mining and quarrying, manufacturing and energy supply (NACE sections B–D).",
    src: [ES_G("Industrial production index"), ES_M("sts")],
  },
  retail: {
    name: { ro: "Volumul vânzărilor cu amănuntul", en: "Retail sales volume" },
    ro: "Măsură de volum a cifrei de afaceri din comerțul cu amănuntul (exclusiv autovehicule): pentru a elimina efectul prețurilor, valoarea vânzărilor este deflatată cu un indice al prețurilor mărfurilor vândute.",
    en: "A volume measure of retail trade turnover (excluding motor vehicles): to eliminate the price effect, the value of sales is deflated with an index of the prices of the goods sold.",
    src: [ES_G("Volume of sales index")],
  },
  constr: {
    name: { ro: "Producția în construcții", en: "Production in construction" },
    ro: "Indicator de ciclu economic care măsoară variațiile lunare ale producției de clădiri (rezidențiale și nerezidențiale) și de lucrări de geniu civil (drumuri, căi ferate, poduri, tuneluri, utilități), în volum, adică fără efectul prețurilor.",
    en: "A business-cycle indicator measuring monthly changes in the production of buildings (residential and non-residential) and civil engineering works (roads, railways, bridges, tunnels, utility projects), in volume terms, i.e. price adjusted.",
    src: [ES_G("Production in construction")],
  },
  ma3: {
    name: { ro: "Medie mobilă pe 3 luni", en: "3-month moving average" },
    ro: "Pentru lizibilitate, graficul arată media ultimelor trei variații lunare an/an publicate de Eurostat (calcul al acestui tablou).",
    en: "For readability, the chart shows the average of the last three monthly year-on-year changes published by Eurostat (computed in this dashboard).",
    src: [],
    calc: true,
  },
  esi: {
    name: { ro: "Indicatorul de sentiment economic (ESI)", en: "Economic sentiment indicator (ESI)" },
    ro: "Indicator compozit, publicat lunar de Comisia Europeană, format din cinci indicatori sectoriali de încredere cu ponderi diferite: industrie (40 %), servicii (30 %), consumatori (20 %), construcții (5 %) și comerț cu amănuntul (5 %).",
    en: "A composite indicator published monthly by the European Commission, made up of five sectoral confidence indicators with different weights: industry (40%), services (30%), consumers (20%), construction (5%) and retail trade (5%).",
    src: [ES_G("Economic sentiment indicator (ESI)")],
  },
  consconf: {
    name: { ro: "Încrederea consumatorilor", en: "Consumer confidence" },
    ro: "Indicator de încredere calculat ca medie aritmetică simplă a soldurilor (ajustate sezonier) dintre răspunsurile pozitive și negative la întrebări specifice din anchetele de conjunctură, de exemplu despre așteptările economice.",
    en: "A confidence indicator calculated as the simple arithmetic average of the (seasonally adjusted) balances of positive and negative answers to specific survey questions, e.g. regarding economic expectations.",
    src: [ES_G("Confidence indicator")],
  },
  pps: {
    name: { ro: "PIB pe locuitor în PPS", en: "GDP per capita in PPS" },
    ro: "Indicele de volum al PIB pe locuitor exprimat în standarde ale puterii de cumpărare (PPS) este destinat comparațiilor între țări: elimină diferențele de nivel al prețurilor. Raportat la UE27 = 100, o valoare peste 100 înseamnă un PIB pe locuitor peste media UE. PPS este o monedă artificială cu care, teoretic, se cumpără aceeași cantitate de bunuri și servicii în fiecare țară.",
    en: "The volume index of GDP per capita in Purchasing Power Standards (PPS) is intended for cross-country comparisons: it eliminates differences in price levels. Relative to EU27 = 100, a value above 100 means GDP per head above the EU average. The PPS is an artificial currency unit that, theoretically, buys the same amount of goods and services in each country.",
    src: [ES_G("GDP per capita in purchasing power standards"), ES_G("Purchasing power standard (PPS)")],
  },
  gdp_pc_usd: {
    name: { ro: "PIB pe locuitor (USD curenți)", en: "GDP per capita (current US$)" },
    ro: "Venitul total obținut din producția de bunuri și servicii pe teritoriul economic într-o perioadă, împărțit la populație. Este exprimat în prețuri curente (fără ajustare pentru evoluția prețurilor) și în dolari americani.",
    en: "The total income earned through the production of goods and services in an economic territory during a period, divided by the population. It is expressed in current prices (no adjustment for price changes) and in US dollars.",
    src: [WB("NY.GDP.PCAP.CD")],
  },
  hicp: {
    name: { ro: "Inflația IAPC", en: "HICP inflation" },
    ro: "Indicele armonizat al prețurilor de consum (IAPC) este indicele prețurilor de consum calculat în UE după o abordare armonizată și un set unic de definiții; este folosit în principal pentru a măsura inflația. Rata anuală a inflației este variația procentuală a indicelui față de aceeași lună a anului anterior.",
    en: "The harmonised index of consumer prices (HICP) is the consumer price index calculated in the EU according to a harmonised approach and a single set of definitions; it is mainly used to measure inflation. The annual inflation rate is the percentage change of the index against the same month of the previous year.",
    src: [ES_G("Harmonised index of consumer prices (HICP)"), ES_G("Inflation rate")],
  },
  core: {
    name: { ro: "Inflația de bază", en: "Core inflation" },
    ro: "Rata anuală a IAPC pentru agregatul „indice general, exclusiv energie, alimente, alcool și tutun” — componentele cele mai volatile sunt scoase din coș.",
    en: "The annual HICP rate for the aggregate “overall index excluding energy, food, alcohol and tobacco” — the most volatile components are removed from the basket.",
    src: [ES_M("prc_hicp")],
  },
  food_energy: {
    name: { ro: "Alimente și energie", en: "Food and energy" },
    ro: "Ratele anuale ale IAPC pentru agregatele speciale „alimente, inclusiv alcool și tutun” și „energie”.",
    en: "Annual HICP rates for the special aggregates “food including alcohol and tobacco” and “energy”.",
    src: [ES_M("prc_hicp")],
  },
  policy: {
    name: { ro: "Rata dobânzii de politică monetară", en: "Monetary policy rate" },
    ro: "Rata dobânzii care reflectă cel mai bine intențiile de politică ale autorității monetare — pentru România, dobânda de politică monetară a BNR. Este rata oficială la care banca centrală creditează băncile comerciale și principalul ei instrument pentru a influența oferta de bani din economie.",
    en: "The interest rate which best captures the monetary authorities' policy intentions — for Romania, the NBR policy rate. It is the official rate at which the central bank lends to commercial banks and its main instrument for influencing the money supply in the economy.",
    src: [BIS("WS_CBPOL", "CBPOL"), ES_G("Central bank interest rate")],
  },
  robor: {
    name: { ro: "ROBOR 3M (piața monetară)", en: "3M ROBOR (money market)" },
    ro: "Ratele pieței monetare sunt rate de referință pentru dobânzile pe termen scurt la împrumuturi sau depozite; cele mai multe sunt rate interbancare. Aici, scadența de 3 luni pentru leu (ROBOR 3M).",
    en: "Money market rates are reference rates for short-term interest rates on loans or deposits; most are interbank rates. Here, the 3-month maturity for the leu (3M ROBOR).",
    src: [ES_M("irt_st")],
  },
  bond10y: {
    name: { ro: "Randamentul titlurilor de stat la 10 ani", en: "10-year government bond yield" },
    ro: "Seria criteriului de convergență de la Maastricht: randamentul obligațiunilor administrației centrale pe piața secundară, înainte de impozitare, cu o scadență reziduală de aproximativ 10 ani, în moneda națională.",
    en: "The Maastricht Treaty EMU convergence criterion series: central government bond yields on the secondary market, gross of tax, with a residual maturity of around 10 years, in national currency.",
    src: [ES_M("irt_lt_mcby"), ES_G("Bond yields")],
  },
  realrate: {
    name: { ro: "Dobânda reală de politică monetară", en: "Real policy rate" },
    ro: "Calcul al acestui tablou: dobânda de politică monetară minus rata anuală a inflației IAPC din aceeași lună (dobândă reală ex post).",
    en: "Computed in this dashboard: the policy rate minus the annual HICP inflation rate of the same month (ex post real rate).",
    src: [],
    calc: true,
  },
  slope: {
    name: { ro: "Panta curbei randamentelor", en: "Yield curve slope" },
    ro: "Calcul al acestui tablou: randamentul titlurilor de stat la 10 ani minus dobânda de politică monetară din aceeași lună.",
    en: "Computed in this dashboard: the 10-year government bond yield minus the policy rate of the same month.",
    src: [],
    calc: true,
  },
  hpi: {
    name: { ro: "Indicele prețurilor locuințelor", en: "House price index" },
    ro: "Măsoară variația prețurilor de tranzacție ale locuințelor cumpărate de gospodării — noi și existente, indiferent de scop (inclusiv pentru închiriere), la prețuri de piață; include prețul terenului și al construcției. Seria arată variația anuală nominală.",
    en: "Measures changes in the transaction prices of dwellings purchased by households — new and existing, whatever the purpose (including buy-to-let), at market prices; it includes the price of the land and of the structure. The series shows the nominal annual change.",
    src: [ES_G("House price index (HPI)"), ES_M("prc_hpi_inx")],
  },
  unemp: {
    name: { ro: "Rata șomajului (BIM)", en: "Unemployment rate (ILO)" },
    ro: "Numărul șomerilor ca procent din forța de muncă (ocupați plus șomeri). Șomer, după Biroul Internațional al Muncii, este o persoană de 15–74 de ani care nu a lucrat în săptămâna de referință, a căutat activ un loc de muncă în ultimele patru săptămâni și poate începe lucrul imediat sau în cel mult două săptămâni.",
    en: "The number of unemployed people as a percentage of the labour force (employed plus unemployed). Unemployed, according to the International Labour Organization, is a person aged 15–74 who was not employed in the reference week, actively sought work during the past four weeks and is available to start within two weeks.",
    src: [ES_G("Unemployment rate"), ES_M("une_rt_m")],
  },
  youth: {
    name: { ro: "Rata șomajului în rândul tinerilor", en: "Youth unemployment rate" },
    ro: "Procentul șomerilor dintr-o grupă de vârstă tânără în forța de muncă de aceeași vârstă (aici, sub 25 de ani). O mare parte a tinerilor sunt în afara pieței muncii (de exemplu studenții la zi), de aceea rata tinde să fie mai mare decât rata generală.",
    en: "The share of unemployed people of a young age group in the labour force of the same age (here, under 25). Many young people are outside the labour market (e.g. full-time students), which is why the rate tends to be higher than the overall rate.",
    src: [ES_G("Youth unemployment rate")],
  },
  emprate: {
    name: { ro: "Rata de ocupare", en: "Employment rate" },
    ro: "Procentul persoanelor ocupate în populația totală de aceeași vârstă (aici, 20–64 de ani). Ocupată este persoana care a lucrat cel puțin o oră pentru plată sau profit în săptămâna de referință ori a lipsit temporar de la o astfel de muncă.",
    en: "The percentage of employed persons in the total population of the same age (here, 20–64). Employed persons are those who worked at least one hour for pay or profit during the reference week or were temporarily absent from such work.",
    src: [ES_G("Employment rate"), ES_M("lfsi")],
  },
  lci: {
    name: { ro: "Indicele costului forței de muncă", en: "Labour cost index" },
    ro: "Indicator pe termen scurt al costului orar al muncii suportat de angajatori: costurile salariale (salarii în bani și în natură) plus costurile nesalariale, cum sunt contribuțiile sociale ale angajatorului, minus subvențiile primite, împărțite la numărul de ore lucrate.",
    en: "A short-term indicator of the hourly labour costs incurred by employers: wage costs (wages and salaries in cash and in kind) plus non-wage costs such as employers' social contributions, minus subsidies received, divided by the number of hours worked.",
    src: [ES_G("Labour cost index (LCI)"), ES_M("lci")],
  },
  ulc: {
    name: { ro: "Costul unitar nominal al muncii", en: "Nominal unit labour cost" },
    ro: "Remunerația pe salariat împărțită la productivitatea reală a muncii pe persoană ocupată (PIB în volum pe persoană ocupată). Arată cât costă munca pe unitatea de produs.",
    en: "Compensation per employee divided by real labour productivity per person employed (GDP in volume per person employed). It shows the labour cost per unit of output.",
    src: [ES_M("nama_10_prod")],
  },
  wage: {
    name: { ro: "Câștigul salarial mediu net", en: "Average net earnings" },
    ro: "Câștigul salarial nominal net se obține scăzând din câștigul salarial nominal brut contribuțiile sociale obligatorii ale salariaților (asigurări sociale și asigurări sociale de sănătate) și impozitul corespunzător.",
    en: "Net nominal earnings are obtained by deducting from gross nominal earnings the employees' compulsory social contributions (social insurance and health insurance) and the corresponding income tax.",
    src: [INS],
  },
  minwage: {
    name: { ro: "Salariul minim", en: "Minimum wage" },
    ro: "Cel mai mic salariu pe care angajatorii sunt obligați prin lege să îl plătească angajaților. Eurostat publică salariul minim național brut (înainte de impozit și contribuții), la nivel lunar, în euro.",
    en: "The lowest wage that employers are legally obliged to pay their employees. Eurostat publishes the gross national minimum wage (before income tax and social contributions), at a monthly rate, in euro.",
    src: [ES_G("Minimum wage"), ES_M("earn_minw")],
  },
  deficit: {
    name: { ro: "Soldul bugetar (deficit/excedent)", en: "Government balance (deficit/surplus)" },
    ro: "Capacitatea (+) sau necesarul (−) de finanțare al administrației publice (B.9) în sistemul ESA 2010: diferența dintre veniturile și cheltuielile sectorului administrației publice, raportată la PIB. Este măsura folosită în procedura de deficit excesiv.",
    en: "Net lending (+) or net borrowing (−) of general government (B.9) as defined in ESA 2010: the difference between the revenue and the expenditure of the general government sector, relative to GDP. It is the measure used in the excessive deficit procedure.",
    src: [ES_M("gov_10dd"), ES_G("Public balance")],
  },
  debt: {
    name: { ro: "Datoria publică (datoria Maastricht)", en: "Government debt (Maastricht debt)" },
    ro: "Valoarea nominală (facială) a datoriei brute totale a administrației publice la sfârșitul anului sau trimestrului, consolidată între și în cadrul subsectoarelor; cuprinde numerar și depozite, titluri de datorie și împrumuturi.",
    en: "The nominal (face) value of total gross general government debt outstanding at the end of the year or quarter, consolidated between and within government subsectors; it comprises currency and deposits, debt securities and loans.",
    src: [ES_G("Government debt")],
  },
  revenue: {
    name: { ro: "Veniturile totale ale administrației publice", en: "Total government revenue" },
    ro: "Toate veniturile pe care le primește statul: suma impozitelor, a contribuțiilor sociale nete, a vânzărilor, a altor venituri curente și a transferurilor de capital primite.",
    en: "All the income a government receives: the sum of taxes, net social contributions, sales, other current revenues and capital transfer revenues.",
    src: [ES_G("Total general government revenue")],
  },
  expenditure: {
    name: { ro: "Cheltuielile totale ale administrației publice", en: "Total government expenditure" },
    ro: "Toate tranzacțiile de utilizare din sistemul ESA ale statului: consum intermediar, formare brută de capital, remunerarea salariaților, subvenții, venituri din proprietate plătite (inclusiv dobânzi), prestații sociale, alte transferuri curente și de capital.",
    en: "All government transactions recorded as uses in the ESA framework: intermediate consumption, gross capital formation, compensation of employees, subsidies, property income payable (including interest), social benefits, other current and capital transfers.",
    src: [ES_G("Total general government expenditure")],
  },
  interest: {
    name: { ro: "Dobânzile plătite", en: "Interest paid" },
    ro: "Suma pe care debitorul trebuie să o plătească creditorului într-o perioadă, fără a reduce principalul datorat, conform instrumentului financiar (depozite, titluri de datorie, împrumuturi). Se înregistrează pe bază de angajamente.",
    en: "The amount that the debtor becomes liable to pay to the creditor over a given period without reducing the principal outstanding, under the terms of the financial instrument (deposits, debt securities, loans). Recorded on an accrual basis.",
    src: [ES_G("Interest")],
  },
  ca: {
    name: { ro: "Contul curent", en: "Current account" },
    ro: "Înregistrarea tuturor tranzacțiilor din balanța de plăți care privesc exporturile și importurile de bunuri și servicii, plățile de venituri și transferurile curente dintre rezidenții unei țări și nerezidenți. Aici, suma ultimelor patru trimestre raportată la PIB.",
    en: "The record of all balance of payments transactions covering the exports and imports of goods and services, payments of income, and current transfers between residents of a country and nonresidents. Here, the sum of the last four quarters relative to GDP.",
    src: [IMF("BCA_NGDPD"), ES_G("Balance of payments")],
  },
  ca_parts: {
    name: { ro: "Componentele contului curent", en: "Current account components" },
    ro: "Soldul (încasări minus plăți) pentru bunuri, servicii, venituri primare (remunerarea muncii, dobânzi, dividende, profituri reinvestite) și venituri secundare. Veniturile secundare sunt transferuri curente: bunuri, servicii sau active financiare transferate fără ca ceva de valoare economică să fie primit în schimb (de exemplu remitențele).",
    en: "The balance (credits minus debits) for goods, services, primary income (compensation of employees, interest, dividends, reinvested earnings) and secondary income. Secondary income consists of current transfers: goods, services or financial items transferred without something of economic value being received in return (e.g. remittances).",
    src: [ES_M("bop_6"), ES_G("Primary income"), ES_G("Current transfers")],
  },
  niip: {
    name: { ro: "Poziția investițională internațională netă", en: "Net international investment position" },
    ro: "Diferența dintre activele financiare externe ale rezidenților și pasivele lor externe față de nerezidenți, la un moment dat. O valoare negativă (pasive mai mari decât activele) înseamnă că țara este debitor net față de restul lumii. Indicatorul MIP este raportul la PIB, cu pragul orientativ de −35 %.",
    en: "The difference between residents' external financial assets and their external liabilities to non-residents at a point in time. A negative value (liabilities higher than assets) makes the country a net debtor to the rest of the world. The MIP indicator is the ratio to GDP, with an indicative threshold of −35%.",
    src: [ES_G("International Investment Position"), ES_M("tipsii")],
  },
  fx: {
    name: { ro: "Cursul de schimb EUR/RON", en: "EUR/RON exchange rate" },
    ro: "Cursul de schimb este prețul monedei unei țări în raport cu o altă monedă. Aici, câți lei costă un euro: media lunară a cursurilor de referință zilnice ale BNR (lunile recente, din media lunară publicată de Eurostat).",
    en: "The exchange rate is the price of one country's currency in relation to another. Here, how many lei one euro costs: the monthly average of the NBR's daily reference rates (recent months from the monthly average published by Eurostat).",
    src: [ES_G("Exchange rate"), ES_M("ert_bil_eur")],
  },
  reer: {
    name: { ro: "Cursul real efectiv", en: "Real effective exchange rate" },
    ro: "Media ponderată a cursurilor bilaterale ale leului față de partenerii comerciali, ajustată pentru diferențele de nivel al prețurilor dintre țări. Evoluția lui indică evoluția competitivității externe prin prețuri a țării: o creștere înseamnă apreciere reală.",
    en: "A weighted average of the leu's bilateral exchange rates against trading partners, adjusted for price level differences between countries. Its movements indicate the evolution of the country's aggregate external price competitiveness: a rise means real appreciation.",
    src: [BIS("WS_EER", "EER"), ES_G("Real effective exchange rate")],
  },
  fdi: {
    name: { ro: "Investițiile străine directe, intrări nete", en: "Foreign direct investment, net inflows" },
    ro: "Intrările nete de investiții făcute pentru a dobândi un interes de conducere durabil (10 % sau mai mult din drepturile de vot) într-o întreprindere care operează în altă economie decât cea a investitorului: capital propriu, profituri reinvestite și alte capitaluri, minus dezinvestirile, raportate la PIB.",
    en: "Net inflows of investment to acquire a lasting management interest (10 percent or more of voting stock) in an enterprise operating in an economy other than that of the investor: equity capital, reinvested earnings and other capital, less disinvestment, divided by GDP.",
    src: [WB("BX.KLT.DINV.WD.GD.ZS")],
  },
  remit: {
    name: { ro: "Remitențele personale primite", en: "Personal remittances received" },
    ro: "Transferurile personale (toate transferurile curente, în bani sau în natură, dintre gospodăriile rezidente și cele nerezidente) plus remunerarea salariaților care lucrează temporar în altă economie, raportate la PIB.",
    en: "Personal transfers (all current transfers in cash or in kind between resident and nonresident households) plus compensation of employees working temporarily in another economy, relative to GDP.",
    src: [WB("BX.TRF.PWKR.DT.GD.ZS")],
  },
  privdebt: {
    name: { ro: "Datoria sectorului privat", en: "Private sector debt" },
    ro: "Stocul de titluri de datorie și împrumuturi (pasive) al societăților nefinanciare, gospodăriilor și ISFLSG, consolidat, raportat la PIB. În tabloul MIP actual, indicatorul principal este împărțit pe gospodării (prag 55 % din PIB) și societăți nefinanciare (prag 85 %).",
    en: "The stock of debt securities and loans (liabilities) of non-financial corporations, households and NPISH, consolidated, relative to GDP. In the current MIP scoreboard the headline indicator is split into households (threshold 55% of GDP) and non-financial corporations (threshold 85%).",
    src: [ES_M("tipspd")],
  },
  credflow: {
    name: { ro: "Fluxul de credit către sectorul privat", en: "Private sector credit flow" },
    ro: "Tranzacțiile nete din anul respectiv cu titluri de datorie și împrumuturi ale societăților nefinanciare, gospodăriilor și ISFLSG, consolidate, raportate la PIB. În tabloul MIP actual, fluxul este raportat la stocul de datorie din anul anterior, separat pe gospodării (prag 14 %) și societăți (prag 13 %).",
    en: "The year's net transactions in debt securities and loans of non-financial corporations, households and NPISH, consolidated, relative to GDP. In the current MIP scoreboard the flow is measured against the previous year's debt stock, separately for households (threshold 14%) and corporations (13%).",
    src: [ES_M("tipspc")],
  },
  imf_gdp: {
    name: { ro: "FMI · creșterea PIB real", en: "IMF · real GDP growth" },
    ro: "PIB-ul este cea mai folosită măsură a activității economice totale a unei țări: valoarea totală, la prețuri constante, a bunurilor și serviciilor finale produse într-o țară într-o perioadă (de exemplu un an). Variație procentuală anuală; ultimii ani sunt proiecții.",
    en: "GDP is the most commonly used single measure of a country's overall economic activity: the total value at constant prices of final goods and services produced within a country during a period such as one year. Annual percent change; the latest years are projections.",
    src: [IMF("NGDP_RPCH")],
  },
  imf_other: {
    name: { ro: "FMI · ceilalți indicatori din tabel", en: "IMF · other indicators in the table" },
    ro: "Inflația: variația procentuală a indicelui mediu al prețurilor de consum. Șomajul: numărul șomerilor ca procent din forța de muncă. Contul curent: tranzacțiile cu bunuri, servicii, venituri și transferuri curente cu nerezidenții, % din PIB. Soldul bugetar: veniturile minus cheltuielile totale ale administrației publice. Datoria brută: toate pasivele care presupun plăți de dobândă și/sau principal în viitor.",
    en: "Inflation: the percent change in the average consumer price index. Unemployment: unemployed persons as a percentage of the labour force. Current account: transactions in goods, services, income and current transfers with nonresidents, % of GDP. Fiscal balance: general government revenue minus total expenditure. Gross debt: all liabilities that require payment of interest and/or principal in the future.",
    src: [IMF("PCPIPCH"), IMF("LUR"), IMF("BCA_NGDPD"), IMF("GGXCNL_NGDP"), IMF("GGXWDG_NGDP")],
  },
};
