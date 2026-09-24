// Home page: shell plus a few live numbers from the data file.
import { $, nf, loadData, renderMacroShell } from "./macro.js";

renderMacroShell("home");
loadData()
  .then((d) => {
    const s = Object.values(d.series).filter((x) => x.obs.length);
    $("hero-series").textContent = nf(s.length, 0);
    $("hero-sources").textContent = nf(new Set(s.map((x) => x.source)).size, 0);
    $("hero-updated").textContent = d.generated.slice(0, 10);
  })
  .catch(() => {});
