// Tarjeta "Lunes de control" en Hoy: resumen de la semana, tendencia y recordatorio de pesarse, medirse y subir fotos.
export function createSemana(ctx) {
  const { sb, S, esc, r1, fdate } = ctx;
  const q = async (p) => { const { data, error } = await p; if (error) throw error; return data; };
  const iso = (ms) => new Date(ms - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

  async function card() {
    if (new Date().getDay() !== 1) return "";
    try {
      const now = Date.now(), hoy = iso(now), d7 = iso(now - 7 * 864e5), d1 = iso(now - 864e5);
      const [daily, meals, metrics, checkin] = await Promise.all([
        q(sb.from("daily_logs").select("*").gte("date", d7).lte("date", d1)),
        q(sb.from("meals").select("log_date,kcal,protein_g").gte("log_date", d7).lte("log_date", d1)),
        q(sb.from("body_metrics").select("date,weight_kg,muscle_kg,body_fat_pct").order("date")),
        q(sb.from("progress_checkins").select("date").eq("date", hoy)),
      ]);
      const g = S.profile;
      const byDay = {};
      meals.forEach((m) => { const a = (byDay[m.log_date] ||= { k: 0, p: 0 }); a.k += +m.kcal; a.p += +m.protein_g; });
      const days = Object.values(byDay);
      const kAvg = avg(days.map((x) => x.k)), pAvg = avg(days.map((x) => x.p));
      const proDays = days.filter((x) => x.p >= g.goal_protein * 0.95).length;
      const steps = daily.filter((x) => x.steps).map((x) => x.steps);
      const sleeps = daily.filter((x) => x.sleep_minutes).map((x) => x.sleep_minutes / 60);
      const strength = daily.filter((x) => ["Rutina A", "Rutina B", "Fuerza"].includes(x.training)).length;
      const W = metrics.filter((x) => x.weight_kg != null);
      const first = W[0], last = W[W.length - 1];
      const weighedToday = W.some((x) => x.date === hoy);
      const sg = (v) => (v > 0 ? "+" : "") + v;
      const trend = first && last && first.date !== last.date
        ? `Desde el inicio: peso ${sg(r1(last.weight_kg - first.weight_kg))} kg` + (first.muscle_kg != null && last.muscle_kg != null ? ` · músculo ${sg(r1(last.muscle_kg - first.muscle_kg))} kg` : "") + (first.body_fat_pct != null && last.body_fat_pct != null ? ` · grasa ${sg(r1(last.body_fat_pct - first.body_fat_pct))} pt` : "")
        : "Con la báscula de hoy empieza tu tendencia semanal.";
      const lines = [
        `Comidas registradas: ${days.length} de 7 días`,
        kAvg != null ? `Calorías: media ${Math.round(kAvg)} (meta ${g.goal_kcal}) · Proteína: media ${Math.round(pAvg)} g, meta cumplida ${proDays} días` : null,
        steps.length ? `Pasos: media ${Math.round(avg(steps))} · meta cumplida ${steps.filter((s) => s >= g.goal_steps).length} días` : null,
        sleeps.length ? `Sueño: media ${r1(avg(sleeps))} h` : null,
        `Fuerza: ${strength} sesiones`,
      ].filter(Boolean);
      const todo = (ok, t) => `<div class="flex gap-2 text-sm"><span>${ok ? "✓" : "○"}</span><span class="${ok ? "text-green-300 line-through" : ""}">${t}</span></div>`;
      return `<div class="card space-y-3 border-amber-500"><h2 class="font-bold text-amber-300">Lunes de control</h2>
        <p class="text-sm">Buen día. Esta semana ya está hecha, y hoy se mide cómo te fue. Son 10 minutos que sostienen todo lo demás.</p>
        <div class="space-y-1">${todo(weighedToday, "Pésate en ayunas y sube el informe de Fitdays")}${todo(checkin.length > 0, "Mídete (cuello, bíceps y cuádriceps) y haz las 4 fotos")}</div>
        <button id="wk-go" class="btn bg-amber-600 w-full">Ir a Evolución</button>
        <details><summary class="text-sm text-amber-200 cursor-pointer">Tu semana en cifras</summary>
          <ul class="text-sm mt-2 space-y-1 list-disc pl-5">${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
          <p class="text-sm mt-2 text-slate-300">${esc(trend)}</p></details></div>`;
    } catch (e) { return ""; }
  }
  return { card };
}
