// Pestaña Evolución: 4 fotos y medidas cada lunes, línea de tiempo y comparación antes/después.
export function createEvolucion(ctx) {
  const { sb, S, esc, num, r1, fdate, todayStr, toast, prepImage } = ctx;
  const $ = (s) => document.querySelector(s);
  const q = async (p) => { const { data, error } = await p; if (error) throw error; return data; };

  const ANG = [["front", "Frente"], ["side_r", "Perfil derecho"], ["back", "Espalda"], ["side_l", "Perfil izquierdo"]];
  const MEAS = [["neck_cm", "Cuello"], ["biceps_l_cm", "Bíceps izq"], ["biceps_r_cm", "Bíceps der"], ["quad_l_cm", "Cuádriceps izq"], ["quad_r_cm", "Cuádriceps der"], ["waist_cm", "Ombligo"]];
  const COLORS = ["#f59e0b", "#3b82f6", "#60a5fa", "#22c55e", "#4ade80", "#ef4444"];

  let rows = [];
  let urls = {};
  let pending = {};

  function lastMonday() {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  async function sign(paths) {
    const need = paths.filter((p) => p && !urls[p]);
    if (!need.length) return;
    const { data } = await sb.storage.from("progress-photos").createSignedUrls(need, 3600);
    (data || []).forEach((x) => { if (x.signedUrl) urls[x.path] = x.signedUrl; });
  }
  const photoOf = (r, a) => (r && r.photos && r.photos[a] ? urls[r.photos[a]] : null);
  const imgTag = (src, cls) => (src ? `<img src="${esc(src)}" class="${cls}" loading="lazy">` : `<div class="${cls} flex items-center justify-center text-slate-500 text-xs">sin foto</div>`);

  async function view() {
    $("#view").innerHTML = `<p class="text-slate-400 p-4">Cargando…</p>`;
    pending = {};
    try {
      rows = await q(sb.from("progress_checkins").select("*").order("date"));
      await sign(rows.flatMap((r) => Object.values(r.photos || {})));
    } catch (e) { toast("No se pudo cargar: " + e.message, "err", 6000); rows = []; }

    const isMonday = new Date().getDay() === 1;
    const hasThisWeek = rows.some((r) => r.date === lastMonday());
    const banner = isMonday && !hasThisWeek ? `<div class="bg-amber-900 border border-amber-500 rounded-xl p-3 text-sm">Hoy es lunes: toca foto y medidas.</div>` : "";

    $("#view").innerHTML = `<section class="space-y-4">
      ${banner}
      <div class="card space-y-3">
        <h2 class="font-bold text-pink-300">Registro semanal</h2>
        <div><label class="block text-xs text-slate-300 mb-1">Fecha (lunes)</label><input type="date" id="e-date" class="inp" value="${lastMonday()}"></div>
        <div class="grid grid-cols-2 gap-3">${MEAS.map(([k, l]) => `<div><label class="block text-xs text-slate-300 mb-1">${l} (cm)</label><input id="e-${k}" inputmode="decimal" class="inp"></div>`).join("")}</div>
        <div class="grid grid-cols-2 gap-3">${ANG.map(([a, l]) => `<div><div class="text-xs text-slate-300 mb-1">${l}</div>
          <label class="block cursor-pointer"><div id="e-box-${a}">${imgTag(null, "rounded-xl w-full h-44 object-cover bg-slate-900")}</div>
          <input type="file" accept="image/*" id="e-f-${a}" class="hidden"><span class="btn bg-slate-700 block text-center mt-1 text-sm">Elegir foto</span></label></div>`).join("")}</div>
        <button id="e-save" class="btn bg-green-600 w-full">Guardar semana</button>
      </div>
      <div id="e-compare"></div>
      <div id="e-chart"></div>
      <div id="e-list"></div></section>`;

    $("#e-date").onchange = () => fillForm($("#e-date").value);
    ANG.forEach(([a]) => { $("#e-f-" + a).onchange = (ev) => onPhoto(a, ev); });
    $("#e-save").onclick = save;
    fillForm($("#e-date").value);
    renderCompare(); renderChart(); renderList();
  }

  function fillForm(date) {
    const r = rows.find((x) => x.date === date);
    MEAS.forEach(([k]) => { $("#e-" + k).value = r && r[k] != null ? r[k] : ""; });
    pending = {};
    ANG.forEach(([a]) => { $("#e-box-" + a).innerHTML = imgTag(photoOf(r, a), "rounded-xl w-full h-44 object-cover bg-slate-900"); });
  }

  async function onPhoto(a, ev) {
    const f = ev.target.files[0]; ev.target.value = "";
    if (!f) return;
    try {
      const img = await prepImage(f, 1600, 0.85);
      pending[a] = img.blob;
      $("#e-box-" + a).innerHTML = imgTag(URL.createObjectURL(img.blob), "rounded-xl w-full h-44 object-cover bg-slate-900");
    } catch (e) { toast("Foto no válida: " + e.message, "err"); }
  }

  async function save() {
    const date = $("#e-date").value;
    if (!date) { toast("Elige la fecha."); return; }
    try {
      const existing = rows.find((x) => x.date === date);
      const photos = { ...((existing && existing.photos) || {}) };
      for (const [a, blob] of Object.entries(pending)) {
        const path = `${S.user.id}/${date}/${a}.jpg`;
        const { error } = await sb.storage.from("progress-photos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (error) throw error;
        photos[a] = path; delete urls[path];
      }
      const row = { user_id: S.user.id, date, photos };
      MEAS.forEach(([k]) => { const v = num($("#e-" + k).value); if (v != null) row[k] = v; });
      await q(sb.from("progress_checkins").upsert(row, { onConflict: "user_id,date" }));
      toast("Semana guardada", "ok");
      await view();
      $("#e-date").value = date; fillForm(date);
    } catch (e) { toast("No se guardó: " + e.message, "err", 6000); }
  }

  function renderCompare() {
    const box = $("#e-compare");
    if (!rows.length) { box.innerHTML = `<div class="card text-sm text-slate-300">Cuando guardes tu primera semana, aquí podrás comparar fotos y medidas.</div>`; return; }
    const opts = (sel) => rows.map((r) => `<option value="${r.date}" ${r.date === sel ? "selected" : ""}>${fdate(r.date)}</option>`).join("");
    const a0 = rows[0].date, b0 = rows[rows.length - 1].date;
    box.innerHTML = `<div class="card space-y-3"><h2 class="font-bold text-pink-300">Comparar</h2>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-xs text-slate-300 mb-1">Antes</label><select id="c-a" class="inp">${opts(a0)}</select></div>
        <div><label class="block text-xs text-slate-300 mb-1">Después</label><select id="c-b" class="inp">${opts(b0)}</select></div></div>
      <div id="c-grid"></div></div>`;
    $("#c-a").onchange = drawCompare; $("#c-b").onchange = drawCompare;
    drawCompare();
  }
  function drawCompare() {
    const A = rows.find((r) => r.date === $("#c-a").value), B = rows.find((r) => r.date === $("#c-b").value);
    const cell = (r, a) => imgTag(photoOf(r, a), "rounded-lg w-full h-40 object-cover bg-slate-900");
    const delta = (k) => { const x = A && A[k], y = B && B[k]; if (x == null || y == null) return "-"; const d = r1(y - x); return `${d > 0 ? "+" : ""}${d}`; };
    $("#c-grid").innerHTML = `<div class="grid grid-cols-2 gap-2 text-center text-xs text-slate-300 mb-1"><div>Antes · ${A ? fdate(A.date) : "-"}</div><div>Después · ${B ? fdate(B.date) : "-"}</div></div>
      ${ANG.map(([a, l]) => `<div class="text-xs text-slate-400 mt-2 mb-1">${l}</div><div class="grid grid-cols-2 gap-2">${cell(A, a)}${cell(B, a)}</div>`).join("")}
      <table class="w-full text-sm mt-3"><thead class="text-xs text-slate-300"><tr><th class="text-left">Medida</th><th>Antes</th><th>Después</th><th>Cambio</th></tr></thead><tbody>
      ${MEAS.map(([k, l]) => `<tr class="border-t border-slate-700 text-center"><td class="text-left py-1">${l}</td><td>${A && A[k] != null ? A[k] : "-"}</td><td>${B && B[k] != null ? B[k] : "-"}</td><td>${delta(k)}</td></tr>`).join("")}</tbody></table>`;
  }

  function renderChart() {
    const box = $("#e-chart");
    const pts = rows.filter((r) => MEAS.some(([k]) => r[k] != null));
    if (pts.length < 2) { box.innerHTML = ""; return; }
    box.innerHTML = `<div class="card"><h3 class="text-sm font-semibold text-center mb-2">Medidas (cm)</h3><div class="h-56"><canvas id="e-cv"></canvas></div></div>`;
    S.charts.push(new Chart($("#e-cv"), {
      type: "line",
      data: { labels: pts.map((r) => fdate(r.date)), datasets: MEAS.map(([k, l], i) => ({ label: l, data: pts.map((r) => r[k]), borderColor: COLORS[i], tension: 0.3, spanGaps: true })) },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { color: "#334155" } }, y: { grid: { color: "#334155" } } }, plugins: { legend: { labels: { color: "#cbd5e1" } } } },
    }));
  }

  function renderList() {
    const box = $("#e-list");
    if (!rows.length) { box.innerHTML = ""; return; }
    box.innerHTML = `<div class="card"><h2 class="font-bold mb-2">Línea de tiempo</h2><div class="flex gap-3 overflow-x-auto pb-2">
      ${[...rows].reverse().map((r) => `<div class="shrink-0 w-36 bg-slate-900 rounded-xl p-2 text-center">
        <div class="text-xs text-blue-300 font-bold">${fdate(r.date)}</div>
        ${imgTag(photoOf(r, "front"), "rounded-lg w-full h-36 object-cover bg-slate-800 my-1")}
        <div class="text-xs text-slate-300">Bíceps ${r.biceps_l_cm ?? "-"} / ${r.biceps_r_cm ?? "-"}</div>
        <div class="text-xs text-slate-300">Cuádr ${r.quad_l_cm ?? "-"} / ${r.quad_r_cm ?? "-"}</div>
        <div class="text-xs text-slate-300">Cuello ${r.neck_cm ?? "-"}</div>
        <button data-edit="${r.date}" class="text-xs text-blue-300 underline mt-1">Editar</button></div>`).join("")}</div></div>`;
    box.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => { $("#e-date").value = b.dataset.edit; fillForm(b.dataset.edit); window.scrollTo({ top: 0, behavior: "smooth" }); }));
  }

  return { view };
}
