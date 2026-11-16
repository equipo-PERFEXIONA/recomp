// Panel visual de Progreso: sueño, presión, pasos, comida, fuerza y peso, con lectura breve basada en evidencia.
const COL = { sleep: "#a855f7", food: "#f97316", bp: "#ef4444", steps: "#22c55e", strength: "#3b82f6", weight: "#06b6d4" };
const r1 = (n) => Math.round(n * 10) / 10;
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

export function bpLevel(s, d) {
  if (s >= 140 || d >= 90) return { c: "#ef4444", t: "Alta" };
  if (s >= 130 || d >= 85) return { c: "#f59e0b", t: "Límite" };
  return { c: "#22c55e", t: "En rango" };
}
const hm = (min) => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")}`;

// Función pura: recibe datos y devuelve tarjetas y notas (se puede probar sin navegador)
export function buildPanel(D, g) {
  const daily = D.daily, today = D.today;
  const byDate = Object.fromEntries(daily.map((x) => [x.date, x]));
  const last = (pred) => [...daily].reverse().find(pred);
  const w7 = (x) => (new Date(today) - new Date(x.date)) / 864e5 <= 6;

  const sl = last((x) => x.sleep_minutes);
  const sl7 = daily.filter((x) => x.sleep_minutes && w7(x)).map((x) => x.sleep_minutes);
  const bp = last((x) => x.bp_am_sys || x.bp_pm_sys);
  const st = byDate[today] && byDate[today].steps ? byDate[today] : last((x) => x.steps);
  const meal = D.mealsByDay[today] || { k: 0, p: 0 };
  const strength = daily.filter((x) => w7(x) && ["Rutina A", "Rutina B", "Fuerza"].includes(x.training)).length;
  const W = D.metrics.filter((x) => x.weight_kg != null);
  const wl = W[W.length - 1], wp = W.length > 1 ? W[W.length - 2] : null;

  const tiles = [];
  tiles.push({ c: COL.sleep, i: "🌙", n: "Sueño", v: sl ? hm(sl.sleep_minutes) : "—", s: sl ? `${sl.sleep_score ? "puntuación " + sl.sleep_score + " · " : ""}meta 7 h` : "sin dato", bar: sl ? Math.min(100, (sl.sleep_minutes / 420) * 100) : 0 });
  if (bp) {
    const am = bp.bp_am_sys ? `${bp.bp_am_sys}/${bp.bp_am_dia}` : "—", pm = bp.bp_pm_sys ? `${bp.bp_pm_sys}/${bp.bp_pm_dia}` : "—";
    const worst = [bp.bp_am_sys && [bp.bp_am_sys, bp.bp_am_dia], bp.bp_pm_sys && [bp.bp_pm_sys, bp.bp_pm_dia]].filter(Boolean).map(([s, d]) => bpLevel(s, d)).sort((a, b) => (b.c === "#ef4444") - (a.c === "#ef4444") || (b.c === "#f59e0b") - (a.c === "#f59e0b"))[0];
    tiles.push({ c: COL.bp, i: "❤️", n: "Presión", v: bp.bp_pm_sys ? pm : am, s: `mañana ${am} · noche ${pm}`, tag: worst, bar: 0 });
  } else tiles.push({ c: COL.bp, i: "❤️", n: "Presión", v: "—", s: "mide al levantarte y al acostarte", bar: 0 });
  tiles.push({ c: COL.steps, i: "👟", n: "Pasos", v: st ? String(st.steps) : "—", s: `meta ${g.goal_steps}`, bar: st ? Math.min(100, (st.steps / g.goal_steps) * 100) : 0 });
  tiles.push({ c: COL.food, i: "🍽️", n: "Comida hoy", v: `${Math.round(meal.k)} kcal`, s: `${Math.round(meal.p)}/${g.goal_protein} g proteína`, bar: Math.min(100, (meal.p / g.goal_protein) * 100) });
  tiles.push({ c: COL.strength, i: "🏋️", n: "Fuerza 7 días", v: String(strength), s: "sesiones", bar: Math.min(100, (strength / 3) * 100) });
  tiles.push({ c: COL.weight, i: "⚖️", n: "Peso", v: wl ? `${wl.weight_kg} kg` : "—", s: wl && wp ? `${wl.weight_kg - wp.weight_kg > 0 ? "+" : ""}${r1(wl.weight_kg - wp.weight_kg)} kg vs anterior` : "primer pesaje", bar: 0 });

  // Lectura breve (máximo 4), con evidencia citada
  const notes = [];
  if (bp) {
    const pts = [bp.bp_am_sys && [bp.bp_am_sys, bp.bp_am_dia], bp.bp_pm_sys && [bp.bp_pm_sys, bp.bp_pm_dia]].filter(Boolean);
    const lv = pts.map(([s, d]) => bpLevel(s, d));
    const hi = lv.some((x) => x.t !== "En rango");
    notes.push(hi
      ? "Presión alta en la última medición (en casa, 135/85 mmHg o más es elevada, ESH/ESC). Si se repite, consúltalo con tu médico."
      : "Presión en rango. Objetivo habitual en personas tratadas: menos de 130/80 mmHg.");
  }
  if (sl) {
    notes.push(sl.sleep_minutes < 390
      ? `Dormiste ${hm(sl.sleep_minutes)} (meta 7 h, AASM/SRS). En dieta, dormir 5,5 h frente a 8,5 h redujo ~55 % la pérdida de grasa y subió ~60 % la de masa magra (Nedeltcheva 2010).`
      : `Sueño de ${hm(sl.sleep_minutes)}: ${sl.sleep_minutes >= 420 ? "cumples" : "casi cumples"} las 7 h recomendadas (AASM/SRS).`);
  }
  // Solo días cerrados: el día en curso está incompleto y falsearía la media
  const mdays = Object.entries(D.mealsByDay).filter(([d, x]) => d !== today && x.k > 0).map(([, x]) => x);
  const ffm = [...W].reverse().find((x) => x.fat_free_mass_kg);
  if (mdays.length && ffm) {
    const p = avg(mdays.map((x) => x.p));
    notes.push(`Proteína media ${Math.round(p)} g = ${r1(p / ffm.fat_free_mass_kg)} g/kg de masa magra. En déficit se recomienda 1,6 g/kg o más (Morton 2018).`);
  }
  if (wl && wp) {
    const dd = (new Date(wl.date) - new Date(wp.date)) / 864e5;
    if (dd >= 5) {
      const pct = (((wl.weight_kg - wp.weight_kg) / dd) * 7 / wp.weight_kg) * 100;
      notes.push(`Ritmo de peso ${r1(pct)} %/semana: ${pct < -1 ? "más rápido que lo habitual (0,5 a 1 %). Cuida proteína y fuerza." : "dentro de lo habitual (0,5 a 1 %)."}`);
    }
  }
  const stepsAvg = avg(daily.filter((x) => x.steps && w7(x)).map((x) => x.steps));
  if (notes.length < 4 && stepsAvg) notes.push(`Pasos medios ${Math.round(stepsAvg)}. Más pasos diarios se asocian a menor mortalidad en estudios poblacionales.`);
  return { tiles, notes: notes.slice(0, 4) };
}

export function createPanel(ctx) {
  const { sb, S, esc } = ctx;
  const q = async (p) => { const { data, error } = await p; if (error) throw error; return data; };
  const iso = (ms) => new Date(ms - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const tileHTML = (t) => `<div class="rounded-2xl p-3" style="background:linear-gradient(135deg,${t.c}38,#1e293b);border:1px solid ${t.c}77">
      <div class="flex items-center gap-2 text-xs uppercase font-semibold" style="color:${t.c}"><span class="text-lg">${t.i}</span>${esc(t.n)}</div>
      <div class="text-2xl font-bold mt-1">${esc(t.v)}${t.tag ? ` <span class="text-xs align-middle rounded-full px-2 py-0.5" style="background:${t.tag.c}33;color:${t.tag.c}">${esc(t.tag.t)}</span>` : ""}</div>
      <div class="text-xs text-slate-300">${esc(t.s)}</div>
      ${t.bar ? `<div class="bar mt-2"><i style="width:${t.bar}%;background:${t.c}"></i></div>` : ""}</div>`;

  async function mount() {
    const view = document.querySelector("#view");
    if (!view) return;
    let host = document.querySelector("#panel");
    if (host) host.remove();
    host = document.createElement("div"); host.id = "panel"; host.className = "space-y-3 mb-4";
    view.prepend(host);
    try {
      const now = Date.now(), today = iso(now), from = iso(now - 29 * 864e5), from14 = iso(now - 13 * 864e5);
      const [daily, meals, metrics] = await Promise.all([
        q(sb.from("daily_logs").select("*").gte("date", from).order("date")),
        q(sb.from("meals").select("log_date,kcal,protein_g").gte("log_date", from14)),
        q(sb.from("body_metrics").select("date,weight_kg,fat_free_mass_kg").order("date")),
      ]);
      const mealsByDay = {};
      meals.forEach((m) => { const a = (mealsByDay[m.log_date] ||= { k: 0, p: 0 }); a.k += +m.kcal; a.p += +m.protein_g; });
      const { tiles, notes } = buildPanel({ daily, mealsByDay, metrics, today }, S.profile);
      host.innerHTML = `<div class="grid grid-cols-2 gap-3">${tiles.map(tileHTML).join("")}</div>
        <div class="card space-y-2"><h3 class="font-bold text-sm">Lectura rápida</h3>
          ${notes.length ? `<ul class="text-sm space-y-2">${notes.map((n) => `<li class="flex gap-2"><span>•</span><span>${esc(n)}</span></li>`).join("")}</ul>` : `<p class="text-sm text-slate-400">Cuando haya datos de sueño, presión y comidas, aquí verás una lectura breve.</p>`}
          <p class="text-xs text-slate-500">Orientativo. No sustituye a tu médico.</p></div>
        <div id="pn-charts" class="space-y-3"></div>`;
      draw(daily, today, now);
    } catch (e) { host.innerHTML = ""; }
  }

  function draw(daily, today, now) {
    const days = Array.from({ length: 14 }, (_, i) => iso(now - (13 - i) * 864e5));
    const by = Object.fromEntries(daily.map((x) => [x.date, x]));
    const labels = days.map((d) => d.slice(8) + "/" + d.slice(5, 7));
    const box = document.querySelector("#pn-charts");
    const grid = { color: "#334155" }, leg = { labels: { color: "#cbd5e1" } };
    const add = (id, title, color, build) => {
      const el = document.createElement("div"); el.className = "card";
      el.style.borderColor = color + "77";
      el.innerHTML = `<h3 class="text-sm font-semibold text-center mb-2" style="color:${color}">${title}</h3><div class="h-44"><canvas id="${id}"></canvas></div>`;
      box.appendChild(el);
      S.charts.push(new Chart(el.querySelector("canvas"), build()));
    };
    const hasSleep = days.some((d) => by[d] && by[d].sleep_minutes);
    if (hasSleep) add("pn-sleep", "🌙 Sueño (horas)", COL.sleep, () => ({
      data: { labels, datasets: [
        { type: "bar", label: "Horas", data: days.map((d) => (by[d] && by[d].sleep_minutes ? Math.round((by[d].sleep_minutes / 60) * 10) / 10 : null)), backgroundColor: COL.sleep },
        { type: "line", label: "Meta 7 h", data: days.map(() => 7), borderColor: "#e9d5ff", borderDash: [6, 4], pointRadius: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid }, y: { grid, beginAtZero: true } }, plugins: { legend: leg } },
    }));
    const hasBp = days.some((d) => by[d] && (by[d].bp_am_sys || by[d].bp_pm_sys));
    if (hasBp) add("pn-bp", "❤️ Presión arterial (mmHg)", COL.bp, () => ({
      type: "line",
      data: { labels, datasets: [
        { label: "Sistólica mañana", data: days.map((d) => (by[d] && by[d].bp_am_sys) || null), borderColor: "#ef4444", spanGaps: true, tension: 0.3 },
        { label: "Diastólica mañana", data: days.map((d) => (by[d] && by[d].bp_am_dia) || null), borderColor: "#fca5a5", spanGaps: true, tension: 0.3 },
        { label: "Sistólica noche", data: days.map((d) => (by[d] && by[d].bp_pm_sys) || null), borderColor: "#f59e0b", spanGaps: true, tension: 0.3 },
        { label: "Diastólica noche", data: days.map((d) => (by[d] && by[d].bp_pm_dia) || null), borderColor: "#fde68a", spanGaps: true, tension: 0.3 }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid }, y: { grid } }, plugins: { legend: leg } },
    }));
    const hasSteps = days.some((d) => by[d] && by[d].steps);
    if (hasSteps) add("pn-steps", "👟 Pasos", COL.steps, () => ({
      data: { labels, datasets: [
        { type: "bar", label: "Pasos", data: days.map((d) => (by[d] && by[d].steps) || null), backgroundColor: COL.steps },
        { type: "line", label: "Meta", data: days.map(() => S.profile.goal_steps), borderColor: "#bbf7d0", borderDash: [6, 4], pointRadius: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid }, y: { grid, beginAtZero: true } }, plugins: { legend: leg } },
    }));
  }
  return { mount };
}
