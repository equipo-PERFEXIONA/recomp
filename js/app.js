import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_VERSION } from "./config.js";
import { EXERCISES, ROUTINES, GENERAL_RULES, imgUrl, ytUrl } from "./exercises.js";
import { createEvolucion } from "./evolucion.js";
import { createSemana } from "./semana.js";
import { createPanel } from "./panel.js";
import { MENU_MACROS } from "./menu.js";

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const todayStr = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const num = (v) => { if (v === "" || v == null) return null; const x = parseFloat(String(v).replace(",", ".")); return Number.isNaN(x) ? null : x; };
const r1 = (n) => Math.round(n * 10) / 10;
const fdate = (s) => { const [y, m, d] = s.split("-"); return `${d}/${m}/${y.slice(2)}`; };
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

// Al cerrar sesion o cambiar de usuario se borra todo lo guardado en el navegador (copias y sesiones de fuerza).
function clearLocal() {
  try { Object.keys(localStorage).filter((k) => k.startsWith("cache_hist") || k.startsWith("sess_")).forEach((k) => localStorage.removeItem(k)); } catch { /* ok */ }
}
function toast(msg, type = "info", ms = 3500) {
  const t = document.createElement("div");
  const bg = type === "ok" ? "bg-green-900 border-green-500" : type === "err" ? "bg-red-900 border-red-500" : "bg-slate-800 border-slate-500";
  t.className = `toast pointer-events-auto border rounded-xl p-3 text-sm max-w-sm ml-auto ${bg}`;
  t.textContent = msg;
  $("#toasts").appendChild(t);
  setTimeout(() => t.remove(), ms);
}
const setSync = (c) => { const e = $("#sync"); if (e) e.style.color = c; };

/* ---------- configuracion ---------- */
if (SUPABASE_URL.includes("PEGA_AQUI") || SUPABASE_ANON_KEY.includes("PEGA_AQUI")) {
  $("#setup").classList.remove("hidden");
  throw new Error("Falta configurar js/config.js");
}
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(() => {});

const q = async (p) => { const { data, error } = await p; if (error) throw error; return data; };

/* ---------- estado ---------- */
const GOAL_DEFAULT = { goal_kcal: 2000, goal_protein: 180, goal_carbs: 150, goal_fat: 100, goal_steps: 7000, goal_water_l: 3.5, goal_sodium_mg: 2000, goal_purine_mg: 150, goal_fructose_g: 25, height_cm: 185 };
const S = {
  user: null, profile: { ...GOAL_DEFAULT }, date: todayStr(), tab: lsGet("tab", "hoy"),
  meals: [], daily: null, metric: null, draft: null, routine: lsGet("routine", "A"),
  lastSets: {}, media: {}, started: null, charts: [], fitSource: "manual", fitRaw: null,
};

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const WEEKLY_MENU = {
  6: ["1 panecillo tostado + 3 huevos revueltos + 100 g cottage 0 %","2 hamburguesas magras + 150 g arroz + 1/2 aguacate","2 huevos duros + 1 pera + 1 vaso de leche descremada","250 g de yogur 0,0 % + 1 manzana asada con canela"],
  0: ["Café + 3 huevos revueltos + 2 tostadas integrales + 100 g cottage 0 %","2 hamburguesas magras + 150 g porotos + setas","2 huevos duros + 200 g de piña + 100 g cottage 0 %","Tortilla francesa de 1 huevo y 3 claras + 150 g de calabacín cocido"],
  1: ["3 tostadas integrales + 220 g cottage 0 % + 2 huevos + 1/2 aguacate", "2 hamburguesas magras + 150 g lentejas + setas y cherrys salteados", "2 huevos duros + 200 g de piña + 1 vaso de leche descremada", "250 g de yogur 0,0 % + 1 manzana asada con canela"],
  2: ["Café + 3 huevos revueltos + 2 tostadas integrales + 100 g cottage 0 %", "2 hamburguesas magras + 150 g arroz + 1/2 aguacate", "2 huevos duros + manzana + 1 vaso de leche descremada", "Caldo de pollo Gallina Blanca + 40 g de fideos cabello de ángel + 100 g de pollo desmenuzado"],
  3: ["1 panecillo tostado + 2 huevos + 150 g cottage 0 % + 1 pera", "2 hamburguesas magras + 200 g lentejas salteadas con setas", "2 huevos duros + 200 g de piña + 100 g cottage 0 %", "Tortilla francesa de 1 huevo y 3 claras + 150 g de calabacín cocido"],
  4: ["Café con leche + 3 huevos revueltos + 2 tostadas integrales + manzana", "2 hamburguesas magras + 150 g arroz + 1/2 aguacate", "2 huevos duros + 1 pera + 1 vaso de leche descremada", "2 rebanadas de pan tostado con 150 g de cottage 0 % + 1 manzana"],
  5: ["1 panecillo tostado + 3 huevos revueltos + 100 g cottage 0 %", "2 hamburguesas magras + 150 g porotos + setas", "2 huevos duros + manzana + 100 g cottage 0 %", "Caldo de pollo Gallina Blanca + 40 g de fideos cabello de ángel + 1 huevo pochado + 1 manzana"],
};

const FIT = [
  ["weight_kg", "Peso (kg)"], ["body_fat_pct", "Grasa (%)"], ["fat_mass_kg", "Grasa (kg)"], ["muscle_kg", "Masa muscular (kg)"],
  ["skeletal_muscle_kg", "Músculo esquelético (kg)"], ["water_pct", "Agua (%)"], ["visceral_fat", "Grasa visceral"], ["bmr", "BMR (kcal)"], ["bmi", "IMC"],
  ["protein_kg", "Proteína (kg)"], ["fat_free_mass_kg", "Peso sin grasa (kg)"], ["subcutaneous_fat_pct", "Grasa subcutánea (%)"],
  ["bone_mass_kg", "Masa esquelética (kg)"], ["body_age", "Edad corporal"], ["body_score", "Puntuación"], ["whr", "WHR"], ["asmi", "ASMI"],
];
const FIT_MAIN = 9;

/* ---------- autenticacion ---------- */
function showAuth() { $("#app").classList.add("hidden"); $("#auth").classList.remove("hidden"); }
$("#auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#auth-email").value.trim(), password = $("#auth-pass").value;
  $("#auth-msg").textContent = "Entrando…";
  const { error } = await sb.auth.signInWithPassword({ email, password });
  $("#auth-msg").textContent = error ? "No se pudo entrar: " + error.message : "";
});
$("#auth-up").addEventListener("click", async () => {
  const email = $("#auth-email").value.trim(), password = $("#auth-pass").value;
  if (!email || password.length < 6) { $("#auth-msg").textContent = "Escribe correo y una contraseña de 6+ caracteres."; return; }
  const { error } = await sb.auth.signUp({ email, password });
  $("#auth-msg").textContent = error ? error.message : "Cuenta creada. Si pide confirmar el correo, ábrelo y vuelve a entrar.";
});
sb.auth.onAuthStateChange((_ev, session) => {
  const u = session?.user ?? null;
  if (u && S.user?.id === u.id) return;
  if (S.user && (!u || u.id !== S.user.id)) clearLocal();
  S.user = u;
  if (u) start(); else showAuth();
});

async function start() {
  $("#auth").classList.add("hidden"); $("#app").classList.remove("hidden");
  try {
    let p = await q(sb.from("profiles").select("*").eq("id", S.user.id).maybeSingle());
    if (!p) p = await q(sb.from("profiles").upsert({ id: S.user.id }).select().single());
    S.profile = { ...GOAL_DEFAULT, ...p };
  } catch (e) { toast("Perfil: " + e.message, "err"); }
  loadMedia(); loadLastSets();
  go(S.tab);
}

/* ---------- datos ---------- */
async function loadDay() {
  setSync("#f59e0b");
  try {
    const d = S.date;
    const [daily, metric, meals] = await Promise.all([
      q(sb.from("daily_logs").select("*").eq("date", d).maybeSingle()),
      q(sb.from("body_metrics").select("*").eq("date", d).maybeSingle()),
      q(sb.from("meals").select("*").eq("log_date", d).order("created_at")),
    ]);
    S.daily = daily; S.metric = metric; S.meals = meals;
    try { const pd = new Date(d + "T12:00:00"); pd.setDate(pd.getDate() - 1); S.prevDaily = await q(sb.from("daily_logs").select("sleep_minutes,sleep_score,date").eq("date", pd.toISOString().slice(0, 10)).maybeSingle()); } catch { S.prevDaily = null; }
    setSync("#22c55e");
  } catch (e) { setSync("#ef4444"); toast("Sin conexión o error: " + e.message, "err"); }
}
async function loadMedia() {
  try { (await q(sb.from("exercise_media").select("*"))).forEach((r) => (S.media[r.exercise_id] = r.media_url)); } catch { /* opcional */ }
}
async function loadLastSets() {
  try {
    const rows = await q(sb.from("set_logs").select("exercise_id,weight_kg,reps,created_at").order("created_at", { ascending: false }).limit(400));
    for (const r of rows) if (!S.lastSets[r.exercise_id]) S.lastSets[r.exercise_id] = r;
  } catch { /* opcional */ }
}
const PUR_LEVEL = { low: 30, medium: 90, high: 200 };
function mealPur(m) { return m.purine_mg != null && m.purine_mg !== "" ? +m.purine_mg : PUR_LEVEL[m.purine_level] || 0; }
const totals = () => S.meals.reduce((a, m) => ({ kcal: a.kcal + +m.kcal, p: a.p + +m.protein_g, c: a.c + +m.carbs_g, f: a.f + +m.fat_g, na: a.na + +m.sodium_mg, pur: a.pur + mealPur(m), fru: a.fru + (+m.fructose_g || 0) }), { kcal: 0, p: 0, c: 0, f: 0, na: 0, pur: 0, fru: 0 });

/* ---------- navegacion ---------- */
const evo = createEvolucion({ sb, S, esc, num, r1, fdate, todayStr, toast, prepImage });
const semana = createSemana({ sb, S, esc, r1, fdate });
const panel = createPanel({ sb, S, esc });
const VIEWS = { hoy: viewHoy, comida: viewComida, fuerza: viewFuerza, evolucion: () => evo.view(), progreso: viewProgreso, ajustes: viewAjustes };
$("#tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) go(b.dataset.tab); });
async function go(tab) {
  S.tab = tab; lsSet("tab", tab);
  $$("#tabs button").forEach((b) => { const on = b.dataset.tab === tab; b.className = "py-2 rounded-lg " + (on ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"); });
  S.charts.forEach((c) => c.destroy()); S.charts = [];
  window.scrollTo(0, 0);
  await VIEWS[tab]();
}

/* ---------- contador de macros ---------- */
function macroRow(label, val, goal, unit, color) {
  const rem = goal - val, pct = Math.min(100, (val / goal) * 100);
  return `<div><div class="flex justify-between text-sm"><span class="text-slate-300">${label}</span>
    <span><b class="${rem < 0 ? "text-red-400" : "text-white"}">${Math.round(rem)}${unit}</b> <span class="text-slate-400 text-xs">restan · ${Math.round(val)}/${goal}</span></span></div>
    <div class="bar mt-1"><i style="width:${pct}%;background:${rem < 0 ? "#ef4444" : color}"></i></div></div>`;
}
function tipText(t) {
  const g = S.profile;
  if (!S.meals.length) return "Registra tu primera comida del día con una foto.";
  const rp = g.goal_protein - t.p, rk = g.goal_kcal - t.kcal;
  const tips = [];
  if (rk < 0) tips.push("Superaste las kcal de hoy.");
  if (rp > 40 && rk < 500) tips.push(`Faltan ${Math.round(rp)} g de proteína con pocas kcal: cottage 0 % o claras.`);
  if (t.na > g.goal_sodium_mg) tips.push("Sodio por encima de tu tope: agua y menos conservas, aceitunas o embutidos.");
  if (t.pur > g.goal_purine_mg) tips.push("Purinas por encima de tu límite de hoy: sin carne, embutidos ni legumbres el resto del día.");
  else if (S.meals.some((m) => m.purine_level === "high")) tips.push("Hoy hay una comida alta en purinas (cuida el ácido úrico).");
  if (t.fru > g.goal_fructose_g) tips.push("Fructosa pasada del límite: nada de fruta ni zumo hasta mañana.");
  return tips.length ? tips.join(" ") : "Vas por buen camino.";
}
function goalsList() {
  const g = S.profile, t = totals(), d = S.daily || {}, h = d.habits || {}, has = S.meals.length > 0;
  const pc = (v, goal) => (goal > 0 ? Math.round((v / goal) * 100) : 0);
  const lv = (v, goal, mid) => (v >= goal ? 2 : v >= goal * mid ? 1 : 0);
  const steps = d.steps || 0, sleep = d.sleep_minutes || (S.prevDaily && S.prevDaily.sleep_minutes) || 0;
  const kr = g.goal_kcal > 0 ? t.kcal / g.goal_kcal : 0;
  const kc = has ? (kr >= 0.75 && kr <= 1 ? 2 : (kr > 1 && kr <= 1.1) || (kr >= 0.65 && kr < 0.75) ? 1 : 0) : 0;
  const pu = has ? (t.pur <= g.goal_purine_mg ? 2 : t.pur <= g.goal_purine_mg * 1.15 ? 1 : 0) : 0;
  const na = has ? (t.na <= g.goal_sodium_mg ? 2 : t.na <= g.goal_sodium_mg * 1.15 ? 1 : 0) : 0;
  return [
    ["Calorías", kc, has ? pc(t.kcal, g.goal_kcal) + " %" : "sin datos"],
    ["Proteína", lv(t.p, g.goal_protein * 0.95, 0.7), pc(t.p, g.goal_protein) + " %"],
    ["Sodio", na, has ? pc(t.na, g.goal_sodium_mg) + " %" : "sin datos"],
    ["Purinas", pu, has ? Math.round(t.pur) + " / " + g.goal_purine_mg + " mg" : "sin datos"],
    ["Caminata " + g.goal_steps + " pasos", lv(steps, g.goal_steps, 0.5), pc(steps, g.goal_steps) + " %"],
    ["Agua", h.hydration ? 2 : 0, h.hydration ? "hecho" : "falta"],
    ["Medicación", h.meds ? 2 : 0, h.meds ? "hecho" : "falta"],
    ["Fuerza o descanso", d.training && d.training !== "Ninguno" ? 2 : 0, d.training && d.training !== "Ninguno" ? esc(d.training) : "sin registrar"],
    ["Sueño 7 h (anoche)", lv(sleep, 420, 0.85), sleep ? Math.round((sleep / 60) * 10) / 10 + " h" : "sin datos"],
  ];
}
const SEM = [["#fee2e2", "#991b1b", "✗"], ["#fef3c7", "#92400e", "●"], ["#dcfce7", "#166534", "✓"]];
function goalsHTML() {
  const l = goalsList(), ok = l.filter((x) => x[1] === 2).length;
  return `<div class="border-t border-slate-700 pt-2"><div class="text-sm mb-2"><b>Metas de hoy: ${ok}/${l.length}</b> <span class="text-xs text-slate-400">verde cumplida · amarillo a medias · rojo falta · calorías: verde 75-100 %, amarillo hasta +10 % o 65-75 %</span></div>
    <div class="grid grid-cols-2 gap-1 text-xs">${l.map(([n, v, det]) => `<div class="rounded-lg px-2 py-1" style="background:${SEM[v][0]};color:${SEM[v][1]}">${SEM[v][2]} ${n} · ${det}</div>`).join("")}</div></div>`;
}
function walkSem(steps) {
  const goal = S.profile.goal_steps, p = Math.round(((steps || 0) / goal) * 100), v = p >= 100 ? 2 : p >= 50 ? 1 : 0;
  return `<div class="rounded-xl p-3 text-sm font-semibold" style="background:${SEM[v][0]};color:${SEM[v][1]}">${SEM[v][2]} Caminata: ${(steps || 0).toLocaleString("es-ES")} / ${goal.toLocaleString("es-ES")} pasos · ${p} %<div class="text-xs font-normal">Se marca sola según tus pasos: verde con ${goal.toLocaleString("es-ES")} o más.</div></div>`;
}
function counterHTML() {
  const g = S.profile, t = totals();
  return `<div class="card space-y-3" id="counter">
    <div class="flex justify-between items-baseline"><h2 class="font-bold text-orange-300">Hoy, lo que te queda</h2><span class="text-xs text-slate-400">${fdate(S.date)}</span></div>
    ${macroRow("Calorías", t.kcal, g.goal_kcal, "", "#0f172a")}
    ${macroRow("Proteína", t.p, g.goal_protein, " g", "#3b82f6")}
    ${macroRow("Carbohidratos", t.c, g.goal_carbs, " g", "#f97316")}
    ${macroRow("Grasas", t.f, g.goal_fat, " g", "#eab308")}
    <div class="flex flex-wrap justify-between gap-x-3 text-xs text-slate-300"><span class="${t.na > g.goal_sodium_mg ? "text-red-400" : ""}">Sodio ${Math.round(t.na)} / ${g.goal_sodium_mg} mg</span><span class="${t.pur > g.goal_purine_mg ? "text-red-400" : ""}">Purinas ${Math.round(t.pur)} / ${g.goal_purine_mg} mg</span><span class="${t.fru > g.goal_fructose_g ? "text-red-400" : ""}">Fructosa ${r1(t.fru)} / ${g.goal_fructose_g} g</span></div>
    <button id="m-now" class="btn bg-green-600 w-full">¿Qué me toca comer ahora?</button><div id="now-box"></div>
    ${goalsHTML()}<p class="text-sm italic text-slate-200 border-t border-slate-700 pt-2">${esc(tipText(t))}</p></div>`;
}
/* ---------- ¿Qué me toca comer ahora? ---------- */
const SLOTS = ["Desayuno", "Almuerzo", "Merienda", "Cena"];
function currentSlot() { const d = new Date(), h = d.getHours() + d.getMinutes() / 60; return h < 11 ? 0 : h < 16 ? 1 : h < 19.5 ? 2 : 3; }
document.addEventListener("click", (e) => { if (e.target.closest("#m-now")) showNow(); });
async function showNow() {
  const box = $("#now-box"); if (!box) return;
  const day = new Date().getDay();
  const slot = currentSlot(), text = WEEKLY_MENU[day][slot];
  const g = S.profile, t = totals();
  box.innerHTML = `<div class="rounded-xl bg-slate-900 p-3 text-sm mt-2">Preparando la receta…</div>`;
  let rec = lsGet("recipe_" + text, null);
  if (!rec) { try { rec = await analyze("recipe", { note: text }); lsSet("recipe_" + text, rec); } catch { rec = null; } }
  const list = (a) => (Array.isArray(a) ? a : []).map((x) => esc(x));
  box.innerHTML = `<div class="rounded-xl bg-slate-900 p-3 mt-2 space-y-2 text-sm">
    <div class="text-xs text-green-300 font-bold uppercase">${SLOTS[slot]} · te quedan ${Math.round(g.goal_kcal - t.kcal)} kcal y ${Math.max(0, Math.round(g.goal_protein - t.p))} g de proteína</div>
    <div class="font-semibold">${esc(text)}</div>
    ${rec ? `<div class="text-xs text-slate-400">${esc(rec.title)} · ${Math.round(Number(rec.time_min) || 0)} min</div>
      <div><b>Ingredientes</b><ul class="list-disc pl-5">${list(rec.ingredients).map((x) => `<li>${x}</li>`).join("")}</ul></div>
      <div><b>Paso a paso</b><ol class="list-decimal pl-5 space-y-1">${list(rec.steps).map((x) => `<li>${x}</li>`).join("")}</ol></div>
      ${rec.tip ? `<div class="text-xs text-amber-200">${esc(rec.tip)}</div>` : ""}` : `<div class="text-xs text-amber-300">No pude generar la receta ahora. Prueba de nuevo en un momento.</div>`}
    <button id="now-ate" class="btn bg-orange-600 w-full">Ya lo comí: agregar</button></div>`;
  $("#now-ate").onclick = async () => {
    const m = MENU_MACROS[text];
    if (m) { await addDirect(["Desayuno", "Comida", "Merienda", "Cena"][slot], text, { kcal: m.kcal, p: m.p, c: m.c, f: m.f, na: m.na, pur: m.pur }); box.innerHTML = ""; return; }
    await go("comida"); runMeal({ note: text });
  };
}
const refreshCounter = () => { const c = $("#counter"); if (c) c.outerHTML = counterHTML(); };

/* ---------- vista HOY ---------- */
async function viewHoy() {
  $("#view").innerHTML = `<p class="text-slate-400 p-4">Cargando…</p>`;
  await loadDay();
  const m = S.metric || {}, d = S.daily || {}, h = d.habits || {};
  const fld = ([k, label], i) => `<div class="${i >= FIT_MAIN ? "" : ""}"><label class="block text-xs text-slate-300 mb-1">${label}</label>
    <input id="f-${k}" inputmode="decimal" class="inp" value="${m[k] ?? ""}"></div>`;
  setTimeout(() => { const si = $("#steps"); if (si) si.addEventListener("input", () => { const v = num(si.value) || 0; $("#walk-sem").innerHTML = walkSem(v); $("#h-walk").checked = v >= S.profile.goal_steps; }); }, 0);
  const chk = (id, label, on) => `<label class="flex items-center gap-3 p-2"><input type="checkbox" id="${id}" ${on ? "checked" : ""}><span>${label}</span></label>`;
  const tr = d.training || "Ninguno";
  const weekHTML = await semana.card();
  $("#view").innerHTML = `<section class="space-y-4">
    ${weekHTML}
    <div class="card"><label class="block text-sm font-semibold mb-1">Fecha</label><input type="date" id="date" class="inp" value="${S.date}"></div>
    ${counterHTML()}
    <div class="card space-y-3">
      <div class="flex justify-between items-center"><h2 class="font-bold text-blue-300">Báscula Fitdays</h2>
        <button id="fit-up" class="btn bg-blue-600 text-sm">📷 Subir captura</button></div>
      <p class="text-xs text-slate-400">Sube el informe y la IA rellena los campos. También puedes mandarlo al bot de Telegram.</p>
      <div class="grid grid-cols-2 gap-3">${FIT.slice(0, FIT_MAIN).map(fld).join("")}</div>
      <details><summary class="text-sm text-blue-300 cursor-pointer">Más datos del informe</summary>
        <div class="grid grid-cols-2 gap-3 mt-3">${FIT.slice(FIT_MAIN).map(fld).join("")}</div></details>
    </div>
    <div class="card space-y-1">
      <h2 class="font-bold text-green-300 mb-2">Hábitos</h2>
      <div><label class="block text-xs text-slate-300 mb-1">Pasos (meta ${S.profile.goal_steps})</label><input id="steps" inputmode="numeric" class="inp mb-2" value="${d.steps ?? ""}"></div>
      <div id="walk-sem" class="mb-1">${walkSem(d.steps)}</div><input type="checkbox" id="h-walk" class="hidden" ${(d.steps || 0) >= S.profile.goal_steps ? "checked" : ""}>
      ${chk("h-hyd", "Agua 3.5 L + sal según indicación", h.hydration)}
      ${chk("h-meds", "Medicación tomada", h.meds)}
      ${chk("h-pro", "Meta de proteína alcanzada", h.protein)}
      <div class="pt-3 border-t border-slate-700 space-y-2"><b>Entrenamiento</b>
        ${["Ninguno", "Rutina A", "Rutina B", "Fuerza", "Descanso"].map((x) => `<label class="flex items-center gap-3"><input type="radio" name="tr" value="${x}" ${tr === x ? "checked" : ""} style="width:1.4rem;height:1.4rem"><span>${x === "Ninguno" ? "Sin registrar" : x === "Fuerza" ? "Fuerza (otra)" : x === "Descanso" ? "Día de descanso" : x}</span></label>`).join("")}
      </div>
    </div>
    ${d.workout_min || d.exercise_min ? `<div class="card text-sm"><b class="text-orange-300">Ejercicio detectado</b><br>${d.workout_min ? `${esc(d.workout_type || "Actividad")}: ${d.workout_min} min${d.workout_km ? ` · ${d.workout_km} km` : ""}${d.workout_kcal ? ` · ${d.workout_kcal} kcal` : ""}<br>` : ""}${d.exercise_min ? `Ejercicio del día: ${d.exercise_min} min` : ""}</div>` : ""}
    <div class="card space-y-3"><h2 class="font-bold text-indigo-300">Sueño</h2>
      <p class="text-xs text-slate-400">Se rellena solo si mandas la captura de Huawei Health al bot. También puedes escribirlo.</p>
      <div class="grid grid-cols-3 gap-3">
        <div><label class="block text-xs text-slate-300 mb-1">Horas</label><input id="s-hours" inputmode="decimal" class="inp" value="${d.sleep_minutes ? r1(d.sleep_minutes / 60) : ""}"></div>
        <div><label class="block text-xs text-slate-300 mb-1">Puntuación</label><input id="s-score" inputmode="numeric" class="inp" value="${d.sleep_score ?? ""}"></div>
        <div><label class="block text-xs text-slate-300 mb-1">FC reposo</label><input id="s-hr" inputmode="numeric" class="inp" value="${d.resting_hr ?? ""}"></div></div></div>
    <div class="card space-y-3"><h2 class="font-bold text-red-300">❤️ Presión arterial</h2>
      <p class="text-xs text-slate-400">Al levantarte y al acostarte. También puedes mandar la captura de Huawei Health al bot.</p>
      ${[["am", "Al levantarte"], ["pm", "Al acostarte"]].map(([m, l]) => `<div><div class="text-xs text-slate-300 mb-1">${l}</div><div class="grid grid-cols-3 gap-2">
        <input id="b-${m}-s" inputmode="numeric" placeholder="Sistólica" class="inp !p-2" value="${d["bp_" + m + "_sys"] ?? ""}">
        <input id="b-${m}-d" inputmode="numeric" placeholder="Diastólica" class="inp !p-2" value="${d["bp_" + m + "_dia"] ?? ""}">
        <input id="b-${m}-p" inputmode="numeric" placeholder="Pulso" class="inp !p-2" value="${d["bp_" + m + "_pulse"] ?? ""}"></div></div>`).join("")}</div>
    <button id="save-day" class="btn bg-green-600 w-full text-lg py-4">Guardar el día</button></section>`;

  $("#date").onchange = (e) => { S.date = e.target.value || todayStr(); viewHoy(); };
  $("#fit-up").onclick = () => $("#file-fit").click();
  $("#save-day").onclick = saveDay;
  const wk = $("#wk-go"); if (wk) wk.onclick = () => go("evolucion");
}

async function saveDay() {
  try {
    const uid = S.user.id, date = S.date;
    const metric = { user_id: uid, date, source: S.fitSource };
    let any = false;
    for (const [k] of FIT) { const v = num($("#f-" + k).value); if (v != null) { metric[k] = v; any = true; } }
    if (S.fitRaw) metric.raw = S.fitRaw;
    if (any) await q(sb.from("body_metrics").upsert(metric, { onConflict: "user_id,date" }));
    // Solo se aplican los cambios que hiciste tú; lo que llegó por Telegram (caminata, fuerza) no se pisa.
    const remote = await q(sb.from("daily_logs").select("habits,training").eq("date", date).maybeSingle());
    const seen = S.daily || {}, seenH = seen.habits || {};
    const dom = { walk: (num($("#steps").value) || 0) >= S.profile.goal_steps, hydration: $("#h-hyd").checked, meds: $("#h-meds").checked, protein: $("#h-pro").checked };
    const habits = { ...((remote && remote.habits) || {}) };
    for (const k of Object.keys(dom)) { if (!!seenH[k] !== dom[k] || habits[k] == null) habits[k] = dom[k]; }
    const trDom = $("input[name=tr]:checked").value;
    const training = trDom !== (seen.training || "Ninguno") ? trDom : (remote && remote.training) || "Ninguno";
    const daily = { user_id: uid, date, habits, training };
    const stp = num($("#steps").value), sh = num($("#s-hours").value), ss = num($("#s-score").value), hr = num($("#s-hr").value);
    if (stp != null) daily.steps = stp;
    if (sh != null) daily.sleep_minutes = Math.round(sh * 60);
    if (ss != null) daily.sleep_score = ss;
    if (hr != null) daily.resting_hr = hr;
    for (const m of ["am", "pm"]) {
      const sy = num($(`#b-${m}-s`).value), di = num($(`#b-${m}-d`).value), pu = num($(`#b-${m}-p`).value);
      if (sy != null && di != null) { daily[`bp_${m}_sys`] = Math.round(sy); daily[`bp_${m}_dia`] = Math.round(di); }
      if (pu != null) daily[`bp_${m}_pulse`] = Math.round(pu);
    }
    await q(sb.from("daily_logs").upsert(daily, { onConflict: "user_id,date" }));
    S.daily = { ...(S.daily || {}), ...daily }; refreshCounter();
    S.fitSource = "manual"; S.fitRaw = null;
    toast("Día guardado en la nube", "ok");
  } catch (e) { toast("No se guardó: " + e.message, "err", 6000); }
}

$("#file-fit").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = "";
  if (!f) return;
  toast("Leyendo informe…");
  try {
    const img = await prepImage(f, 2200, 0.9);
    const data = await analyze("fitdays", { b64: img.b64, mime: img.mime });
    let n = 0;
    for (const [k] of FIT) { const el = $("#f-" + k); if (el && data[k] != null) { el.value = data[k]; n++; } }
    if (data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date) && data.date !== S.date) { S.date = data.date; $("#date").value = data.date; }
    S.fitSource = "fitdays-app"; S.fitRaw = data;
    toast(`${n} datos leídos. Revisa y pulsa Guardar el día.`, "ok", 5000);
  } catch (err) { toast("No se pudo leer: " + err.message, "err", 6000); }
});

/* ---------- IA ---------- */
async function analyze(kind, { b64, mime, note }) {
  const { data, error } = await sb.functions.invoke("analyze", { body: { kind, image_base64: b64, mime, note } });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (!data?.ok) throw new Error(data?.error || "Respuesta vacía");
  return data.data;
}
async function prepImage(file, max = 1280, quality = 0.82) {
  const bmp = await createImageBitmap(file);
  const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", quality));
  const b64 = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.readAsDataURL(blob); });
  return { blob, b64, mime: "image/jpeg" };
}

/* ---------- vista COMIDA ---------- */
async function viewComida() {
  $("#view").innerHTML = `<p class="text-slate-400 p-4">Cargando…</p>`;
  await loadDay();
  const day = new Date().getDay();
  $("#view").innerHTML = `<section class="space-y-4">
    ${counterHTML()}
    <div class="card space-y-3">
      <h2 class="font-bold text-orange-300">Añadir comida</h2>
      <div class="grid grid-cols-2 gap-2">
        <button id="m-cam" class="btn bg-orange-600">📷 Foto</button>
        <button id="m-gal" class="btn bg-slate-600">🖼️ Galería</button></div>
      <textarea id="m-text" rows="2" class="inp" placeholder="O descríbela: 2 hamburguesas magras, 150 g de arroz, medio aguacate"></textarea>
      <button id="m-txt" class="btn bg-blue-600 w-full">Analizar texto</button>
      <details class="bg-slate-900 rounded-xl p-3"><summary class="text-sm font-semibold text-green-300 cursor-pointer">Agregar comida directo (sin IA)</summary>
        <div class="space-y-2 mt-3">
          <input id="man-name" class="inp" placeholder="Qué comiste">
          <select id="man-type" class="inp">${["Desayuno", "Comida", "Merienda", "Cena", "Snack"].map((t) => `<option>${t}</option>`).join("")}</select>
          <div class="grid grid-cols-4 gap-2 text-center text-xs">
            <div><label>kcal</label><input id="man-kcal" inputmode="decimal" class="inp text-center !px-1"></div>
            <div><label>Prot</label><input id="man-p" inputmode="decimal" class="inp text-center !px-1"></div>
            <div><label>Carb</label><input id="man-c" inputmode="decimal" class="inp text-center !px-1"></div>
            <div><label>Grasa</label><input id="man-f" inputmode="decimal" class="inp text-center !px-1"></div></div>
          <button id="man-ok" class="btn bg-green-600 w-full">Agregar comida</button></div>
        <div class="space-y-2 mt-4 pt-3 border-t border-slate-700">
          <div class="text-sm font-semibold text-green-300">Etiqueta nutricional</div>
          <p class="text-xs text-slate-400">Foto de la tabla del envase. Pon la cantidad que comes y se calcula solo.</p>
          <label class="btn bg-slate-700 block text-center cursor-pointer text-sm">📷 Foto de la etiqueta<input type="file" accept="image/*" id="lab-file" class="hidden"></label>
          <p id="lab-busy" class="text-xs text-amber-300 hidden">Leyendo la etiqueta…</p>
          <input id="lab-name" class="inp" placeholder="Producto">
          <div class="text-xs text-slate-300">Valores por 100 g o 100 ml</div>
          <div class="grid grid-cols-5 gap-2 text-center text-xs">
            <div><label>kcal</label><input id="lab-kcal" inputmode="decimal" class="inp text-center !px-1"></div>
            <div><label>Prot</label><input id="lab-p" inputmode="decimal" class="inp text-center !px-1"></div>
            <div><label>Carb</label><input id="lab-c" inputmode="decimal" class="inp text-center !px-1"></div>
            <div><label>Grasa</label><input id="lab-f" inputmode="decimal" class="inp text-center !px-1"></div>
            <div><label>Na mg</label><input id="lab-na" inputmode="decimal" class="inp text-center !px-1"></div></div>
          <p id="lab-warn" class="text-xs text-amber-300 hidden">La etiqueta solo traía valores por porción y no vi el peso de la porción: revisa los números.</p>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div><label>Cantidad (g o ml)</label><input id="lab-qty" inputmode="decimal" class="inp" placeholder="150"></div>
            <div><label>o porciones <span id="lab-serv-txt" class="text-slate-400"></span></label><input id="lab-por" inputmode="decimal" class="inp" placeholder="1"></div></div>
          <div id="lab-total" class="text-sm bg-slate-800 rounded-lg p-2">Total: escribe la cantidad</div>
          <select id="lab-type" class="inp">${["Desayuno", "Comida", "Merienda", "Cena", "Snack"].map((t) => `<option>${t}</option>`).join("")}</select>
          <button id="lab-add" class="btn bg-green-600 w-full">Agregar con esta cantidad</button></div></details>
      <p id="m-busy" class="text-sm text-amber-300 hidden">Analizando con IA…</p>
    </div>
    <div id="draft"></div>
    <div class="card"><h2 class="font-bold mb-2">Comidas de hoy</h2><div id="meal-list" class="space-y-2"></div></div>
    <div class="card"><div class="flex justify-between items-center mb-2"><h2 class="font-bold text-blue-300">Menú de <span id="menu-title">${DIAS[day]}</span></h2>
      <select id="menu-day" class="bg-slate-900 border border-slate-600 rounded p-1 text-sm">
        ${[1, 2, 3, 4, 5, 6, 0].map((i) => `<option value="${i}" ${day === i ? "selected" : ""}>${DIAS[i]}${i === new Date().getDay() ? " (hoy)" : ""}</option>`).join("")}</select></div>
      <div id="menu" class="space-y-2"></div></div></section>`;
  renderMeals(); renderMenu(); renderDraft();
  $("#m-cam").onclick = () => $("#file-meal").click();
  $("#m-gal").onclick = () => $("#file-meal-gal").click();
  $("#man-ok").onclick = addManual;
  bindLabel();
  $("#m-txt").onclick = () => { const t = $("#m-text").value.trim(); if (t) runMeal({ note: t }); else toast("Escribe qué comiste."); };
  $("#menu-day").onchange = () => { $("#menu-title").textContent = DIAS[+$("#menu-day").value]; renderMenu(); };
}
for (const id of ["#file-meal", "#file-meal-gal"]) {
  $(id).addEventListener("change", async (e) => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    try { const img = await prepImage(f); runMeal({ img, note: ($("#m-text")?.value || "").trim() }); } catch (err) { toast(err.message, "err"); }
  });
}
// Nunca confiamos en la forma de la respuesta de la IA: se fuerzan numeros y listas.
function cleanMeal(d) {
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const items = (Array.isArray(d?.items) ? d.items : []).map((i) => ({
    name: String(i?.name ?? ""), grams: n(i?.grams), kcal: n(i?.kcal), protein_g: n(i?.protein_g), carbs_g: n(i?.carbs_g), fat_g: n(i?.fat_g), sodium_mg: n(i?.sodium_mg), purine_mg: n(i?.purine_mg), fructose_g: n(i?.fructose_g),
  }));
  const ok = (v, list, def) => (list.includes(v) ? v : def);
  return {
    name: String(d?.name ?? "Comida"), meal_type: ok(d?.meal_type, ["Desayuno", "Comida", "Merienda", "Cena", "Snack"], "Comida"),
    items, kcal: n(d?.kcal), protein_g: n(d?.protein_g), carbs_g: n(d?.carbs_g), fat_g: n(d?.fat_g), sodium_mg: n(d?.sodium_mg), purine_mg: n(d?.purine_mg) || items.reduce((s, i) => s + i.purine_mg, 0), fructose_g: n(d?.fructose_g) || items.reduce((s, i) => s + i.fructose_g, 0),
    purine_level: ok(d?.purine_level, ["low", "medium", "high"], null), confidence: ok(d?.confidence, ["low", "medium", "high"], "low"), notes: String(d?.notes ?? ""),
  };
}
async function runMeal({ img = null, note = "" }) {
  $("#m-busy")?.classList.remove("hidden");
  try {
    let raw;
    try { raw = await analyze("meal", { b64: img?.b64, mime: img?.mime, note }); } catch (e1) { toast("La IA está ocupada, reintento…", "ok", 3000); await new Promise((r) => setTimeout(r, 2500)); raw = await analyze("meal", { b64: img?.b64, mime: img?.mime, note }); }
    const d = cleanMeal(raw);
    S.draft = { ...d, img, source: img ? "photo" : "text", mult: 1, base: { kcal: d.kcal, p: d.protein_g, c: d.carbs_g, f: d.fat_g, na: d.sodium_mg, pur: d.purine_mg, fru: d.fructose_g } };
    renderDraft();
  } catch (e) { toast("Análisis falló: " + e.message, "err", 6000); }
  $("#m-busy")?.classList.add("hidden");
}
function purPanel() {
  const d = S.draft, box = $("#pur-panel"); if (!d || !box) return;
  const g = S.profile, t = totals(), m = d.mult || 1;
  const rows = [
    ["Purinas", "mg", t.pur, (+d.purine_mg || PUR_LEVEL[d.purine_level] || 0) * m, g.goal_purine_mg, "purine_mg"],
    ["Fructosa", "g", t.fru, (+d.fructose_g || 0) * m, g.goal_fructose_g, "fructose_g"],
    ["Sodio", "mg", t.na, (+d.sodium_mg || 0) * m, g.goal_sodium_mg, "sodium_mg"],
  ];
  let over = false; const fix = [];
  const html = rows.map(([lab, u, hoy, esta, lim, key]) => {
    const tot = hoy + esta, pct = lim > 0 ? Math.round((tot / lim) * 100) : 0, left = lim - tot, v = tot <= lim ? 2 : tot <= lim * 1.15 ? 1 : 0;
    if (tot > lim) {
      over = true; let need = tot - lim;
      const its = [...(d.items || [])].map((i) => ({ n: i.name, x: (+i[key] || 0) * m })).filter((i) => i.x > 0).sort((a, b) => b.x - a.x);
      const pick = []; for (const i of its) { if (need <= 0) break; pick.push(i); need -= i.x; }
      fix.push(pick.length ? lab + ": quita " + pick.map((i) => i.n + " (−" + Math.round(i.x) + " " + u + ")").join(" y ") : lab + ": reduce la porción");
    }
    return `<div class="rounded-lg px-2 py-1" style="background:${SEM[v][0]};color:${SEM[v][1]}"><div class="flex justify-between"><b>${SEM[v][2]} ${lab}</b><span>${Math.round(esta * 10) / 10} ${u} esta comida</span></div><div class="text-xs">Hoy ${Math.round(hoy)} → ${Math.round(tot)} de ${lim} ${u} (${pct} %) · ${left >= 0 ? "te quedan " + Math.round(left) : "te pasas " + Math.round(-left)} ${u}</div></div>`;
  }).join("");
  box.innerHTML = `<div class="text-xs font-bold uppercase text-orange-300">Antes de comer: purinas, ácido úrico y sodio</div><div class="space-y-1 text-sm">${html}</div>${over ? `<div class="rounded-lg bg-red-900/60 p-2 text-xs"><b>Para quedar dentro del límite:</b><br>${fix.map(esc).join("<br>")}</div>` : `<div class="rounded-lg bg-green-900/50 p-2 text-xs">Dentro de tus límites de hoy: puedes comerlo.</div>`}`;
}
function renderDraft() {
  const box = $("#draft"); if (!box) return;
  const d = S.draft;
  if (!d) { box.innerHTML = ""; return; }
  const types = ["Desayuno", "Comida", "Merienda", "Cena", "Snack"];
  const pur = d.purine_level === "high" ? `<span class="bg-red-800 text-xs px-2 py-1 rounded-full">Purinas altas</span>` : d.purine_level === "medium" ? `<span class="bg-amber-800 text-xs px-2 py-1 rounded-full">Purinas medias</span>` : "";
  box.innerHTML = `<div class="card space-y-3 border-orange-500">
    <div class="flex justify-between items-start gap-2"><div><b>Antes de comer: revisa y confirma</b><p class="text-xs text-slate-400">Confianza de la IA: ${esc(d.confidence)}</p></div>${pur}</div>
    ${d.img ? `<img src="${URL.createObjectURL(d.img.blob)}" class="rounded-xl max-h-48 w-full object-cover">` : ""}
    <div id="pur-panel" class="space-y-2"></div>
    <input id="d-name" class="inp" value="${esc(d.name)}">
    <ul class="text-xs text-slate-300 space-y-1">${(d.items || []).map((i) => `<li>${esc(i.name)} · ${Math.round(i.grams)} g · ${Math.round(i.kcal)} kcal · ${r1(i.protein_g)} P · ${Math.round(i.purine_mg || 0)} mg pur · ${r1(i.fructose_g || 0)} g fruc</li>`).join("")}</ul>
    ${d.notes ? `<p class="text-xs text-slate-400">${esc(d.notes)}</p>` : ""}
    <div class="grid grid-cols-2 gap-2">
      <select id="d-type" class="inp">${types.map((t) => `<option ${t === d.meal_type ? "selected" : ""}>${t}</option>`).join("")}</select>
      <select id="d-mult" class="inp">${[0.5, 0.75, 1, 1.25, 1.5, 2].map((x) => `<option value="${x}" ${x === d.mult ? "selected" : ""}>Porción x${x}</option>`).join("")}</select></div>
    <div class="grid grid-cols-5 gap-2 text-center text-xs">
      ${[["kcal", "kcal", d.kcal], ["p", "Prot", d.protein_g], ["c", "Carb", d.carbs_g], ["f", "Grasa", d.fat_g], ["na", "Na mg", d.sodium_mg]].map(([k, l, v]) => `<div><label>${l}</label><input id="d-${k}" inputmode="decimal" class="inp text-center !px-1" value="${esc(num(v) ?? 0)}"></div>`).join("")}</div>
    <div class="grid grid-cols-2 gap-2"><button id="d-ok" class="btn bg-green-600">Guardar comida</button><button id="d-no" class="btn bg-slate-600">Descartar</button></div></div>`;
  $("#d-mult").onchange = (e) => {
    const m = +e.target.value; d.mult = m;
    const b = d.base;
    $("#d-kcal").value = Math.round(b.kcal * m); $("#d-p").value = r1(b.p * m); $("#d-c").value = r1(b.c * m); $("#d-f").value = r1(b.f * m); $("#d-na").value = Math.round((b.na || 0) * m); purPanel();
  };
  $("#d-na").addEventListener("input", () => { d.sodium_mg = (num($("#d-na").value) || 0) / (d.mult || 1); purPanel(); });
  purPanel();
  $("#d-no").onclick = () => { S.draft = null; renderDraft(); };
  $("#d-ok").onclick = saveMeal;
}
async function saveMeal() {
  const d = S.draft; if (!d) return;
  try {
    let photo_path = null;
    if (d.img) {
      photo_path = `${S.user.id}/${S.date}/${Date.now()}.jpg`;
      const { error } = await sb.storage.from("meal-photos").upload(photo_path, d.img.blob, { contentType: "image/jpeg" });
      if (error) { toast("Foto no subida: " + error.message, "err"); photo_path = null; }
    }
    const m = d.mult || 1;
    const items = (d.items || []).map((i) => ({ ...i, grams: r1(i.grams * m), kcal: Math.round(i.kcal * m), protein_g: r1(i.protein_g * m), carbs_g: r1(i.carbs_g * m), fat_g: r1(i.fat_g * m), sodium_mg: Math.round((i.sodium_mg || 0) * m), purine_mg: Math.round((i.purine_mg || 0) * m), fructose_g: r1((i.fructose_g || 0) * m) }));
    await q(sb.from("meals").insert({
      user_id: S.user.id, log_date: S.date, meal_type: $("#d-type").value, name: $("#d-name").value.trim() || "Comida",
      items, kcal: num($("#d-kcal").value) || 0, protein_g: num($("#d-p").value) || 0, carbs_g: num($("#d-c").value) || 0,
      fat_g: num($("#d-f").value) || 0, sodium_mg: num($("#d-na").value) || 0, purine_level: d.purine_level || null, purine_mg: Math.round((+d.purine_mg || 0) * m * 10) / 10, fructose_g: Math.round((+d.fructose_g || 0) * m * 10) / 10,
      photo_path, source: d.source, confidence: d.confidence,
    }));
    S.draft = null; $("#m-text").value = "";
    S.meals = await q(sb.from("meals").select("*").eq("log_date", S.date).order("created_at"));
    // Proteína alcanzada: se marca sola
    if (totals().p >= S.profile.goal_protein * 0.95) {
      const rd = await q(sb.from("daily_logs").select("habits").eq("date", S.date).maybeSingle());
      if (!(rd && rd.habits && rd.habits.protein)) {
        const habits = { ...((rd && rd.habits) || {}), protein: true };
        await q(sb.from("daily_logs").upsert({ user_id: S.user.id, date: S.date, habits }, { onConflict: "user_id,date" }));
        S.daily = { ...(S.daily || {}), habits: { ...((S.daily || {}).habits || {}), protein: true } };
      }
    }
    renderDraft(); renderMeals(); refreshCounter();
    toast("Comida guardada", "ok");
  } catch (e) { toast("No se guardó: " + e.message, "err", 6000); }
}
async function renderMeals() {
  const box = $("#meal-list"); if (!box) return;
  if (!S.meals.length) { box.innerHTML = `<p class="text-sm text-slate-400">Aún no hay comidas hoy.</p>`; return; }
  box.innerHTML = S.meals.map((m) => `<div class="flex gap-3 bg-slate-900 rounded-xl p-2" data-id="${m.id}">
    ${m.photo_path ? `<img data-p="${esc(m.photo_path)}" class="w-16 h-16 rounded-lg object-cover bg-slate-700">` : `<div class="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center text-xl">🍽️</div>`}
    <div class="flex-1 min-w-0"><div class="text-xs text-blue-300 font-bold uppercase">${esc(m.meal_type)}</div>
      <div class="text-sm truncate">${esc(m.name)}</div>
      <div class="text-xs text-slate-300">${Math.round(m.kcal)} kcal · ${r1(+m.protein_g)} P · ${r1(+m.carbs_g)} C · ${r1(+m.fat_g)} G${m.purine_level === "high" ? " · <span class='text-red-400'>purinas altas</span>" : ""}</div></div>
    <button data-del="${m.id}" class="text-red-400 px-2" aria-label="Borrar">✕</button></div>`).join("");
  $$("[data-del]", box).forEach((b) => (b.onclick = () => delMeal(b.dataset.del)));
  const paths = S.meals.map((m) => m.photo_path).filter(Boolean);
  if (paths.length) {
    const { data } = await sb.storage.from("meal-photos").createSignedUrls(paths, 3600);
    (data || []).forEach((x) => { const im = $(`img[data-p="${CSS.escape(x.path)}"]`, box); if (im && x.signedUrl) im.src = x.signedUrl; });
  }
}
async function delMeal(id) {
  if (!confirm("¿Borrar esta comida?")) return;
  try {
    const m = S.meals.find((x) => x.id === id);
    await q(sb.from("meals").delete().eq("id", id));
    if (m?.photo_path) await sb.storage.from("meal-photos").remove([m.photo_path]);
    S.meals = S.meals.filter((x) => x.id !== id); renderMeals(); refreshCounter();
  } catch (e) { toast(e.message, "err"); }
}
function renderMenu() {
  const box = $("#menu"); if (!box) return;
  const items = WEEKLY_MENU[$("#menu-day").value] || [];
  const labels = ["Desayuno", "Almuerzo", "Merienda", "Cena"];
  box.innerHTML = items.map((t, i) => `<div class="flex gap-2 items-start bg-slate-900 rounded-lg p-2"><div class="flex-1"><div class="text-xs text-blue-300 font-bold uppercase">${labels[i]}</div><div class="text-sm">${esc(t)}</div></div>
    <div class="flex flex-col gap-1">${MENU_MACROS[t] ? `<button data-a="${i}" class="btn bg-green-600 text-xs !py-2">Agregar</button>` : ""}<button data-m="${i}" class="btn bg-slate-700 text-xs !py-2">Estimar con IA</button></div></div>`).join("");
  $$("[data-m]", box).forEach((b) => (b.onclick = () => { $("#m-text").value = items[+b.dataset.m]; runMeal({ note: items[+b.dataset.m] }); window.scrollTo({ top: 0, behavior: "smooth" }); }));
  $$("[data-a]", box).forEach((b) => (b.onclick = async () => {
    const t = items[+b.dataset.a], m = MENU_MACROS[t];
    b.disabled = true;
    await addDirect(["Desayuno", "Comida", "Merienda", "Cena"][+b.dataset.a], t, { kcal: m.kcal, p: m.p, c: m.c, f: m.f, na: m.na, pur: m.pur });
    b.disabled = false;
  }));
}

/* ---------- Agregar comida directo (sin IA) ---------- */
async function autoProtein() {
  if (totals().p < S.profile.goal_protein * 0.95) return;
  const rd = await q(sb.from("daily_logs").select("habits").eq("date", S.date).maybeSingle());
  if (rd && rd.habits && rd.habits.protein) return;
  const habits = { ...((rd && rd.habits) || {}), protein: true };
  await q(sb.from("daily_logs").upsert({ user_id: S.user.id, date: S.date, habits }, { onConflict: "user_id,date" }));
  S.daily = { ...(S.daily || {}), habits: { ...((S.daily || {}).habits || {}), protein: true } };
}
async function addDirect(type, name, m) {
  try {
    await q(sb.from("meals").insert({
      user_id: S.user.id, log_date: S.date, meal_type: type, name: String(name).slice(0, 160), items: [],
      kcal: m.kcal || 0, protein_g: m.p || 0, carbs_g: m.c || 0, fat_g: m.f || 0, sodium_mg: m.na || 0,
      purine_level: m.pur || null, source: "manual",
    }));
    S.meals = await q(sb.from("meals").select("*").eq("log_date", S.date).order("created_at"));
    await autoProtein();
    renderMeals(); refreshCounter();
    toast(`Agregado: ${Math.round(m.kcal || 0)} kcal · ${Math.round(m.p || 0)} g proteína`, "ok");
  } catch (e) { toast("No se agregó: " + e.message, "err", 6000); }
}
/* ---------- Etiqueta nutricional: foto + cantidad ---------- */
let labServ = 0;
function labTotals() {
  const per = { kcal: num($("#lab-kcal").value) || 0, p: num($("#lab-p").value) || 0, c: num($("#lab-c").value) || 0, f: num($("#lab-f").value) || 0, na: num($("#lab-na").value) || 0 };
  const qty = num($("#lab-qty").value) || 0, k = qty / 100;
  return { qty, kcal: per.kcal * k, p: per.p * k, c: per.c * k, f: per.f * k, na: per.na * k };
}
function labShow() {
  const t = labTotals();
  $("#lab-total").textContent = t.qty > 0 ? `Total ${Math.round(t.qty)} g: ${Math.round(t.kcal)} kcal · ${r1(t.p)} P · ${r1(t.c)} C · ${r1(t.f)} G · ${Math.round(t.na)} mg sodio` : "Total: escribe la cantidad";
}
function bindLabel() {
  ["#lab-kcal", "#lab-p", "#lab-c", "#lab-f", "#lab-na", "#lab-qty"].forEach((id) => $(id).addEventListener("input", labShow));
  $("#lab-por").addEventListener("input", () => { const n = num($("#lab-por").value); if (n != null && labServ > 0) { $("#lab-qty").value = r1(n * labServ); labShow(); } });
  $("#lab-file").addEventListener("change", async (e) => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    $("#lab-busy").classList.remove("hidden");
    try {
      const img = await prepImage(f, 1800, 0.9);
      const d = await analyze("label", { b64: img.b64, mime: img.mime });
      const p = d.per100 || {};
      $("#lab-name").value = d.product_name || $("#lab-name").value;
      $("#lab-kcal").value = p.kcal ?? ""; $("#lab-p").value = p.p ?? ""; $("#lab-c").value = p.c ?? ""; $("#lab-f").value = p.f ?? ""; $("#lab-na").value = p.na ?? "";
      labServ = Number(d.serving_g) > 0 ? Number(d.serving_g) : 0;
      $("#lab-serv-txt").textContent = labServ ? `(1 = ${labServ} g)` : "";
      $("#lab-warn").classList.toggle("hidden", !d.unreliable);
      labShow();
      toast("Etiqueta leída. Pon la cantidad.", "ok");
    } catch (err) { toast("No pude leer la etiqueta: " + err.message, "err", 6000); }
    $("#lab-busy").classList.add("hidden");
  });
  $("#lab-add").onclick = async () => {
    const t = labTotals();
    if (!(t.qty > 0)) { toast("Escribe la cantidad que comiste."); return; }
    if (!(t.kcal > 0)) { toast("Faltan las calorías por 100 g."); return; }
    const name = ($("#lab-name").value.trim() || "Producto") + ` (${Math.round(t.qty)} g)`;
    await addDirect($("#lab-type").value, name, { kcal: Math.round(t.kcal), p: r1(t.p), c: r1(t.c), f: r1(t.f), na: Math.round(t.na), pur: null });
    ["#lab-qty", "#lab-por"].forEach((id) => { $(id).value = ""; }); labShow();
  };
}
async function addManual() {
  const name = $("#man-name").value.trim();
  const kcal = num($("#man-kcal").value);
  if (!name || kcal == null) { toast("Escribe el nombre y las calorías."); return; }
  await addDirect($("#man-type").value, name, { kcal, p: num($("#man-p").value) || 0, c: num($("#man-c").value) || 0, f: num($("#man-f").value) || 0, na: 0, pur: null });
  ["#man-name", "#man-kcal", "#man-p", "#man-c", "#man-f"].forEach((id) => { $(id).value = ""; });
}

/* ---------- vista FUERZA ---------- */
function mediaHTML(id, ex) {
  const custom = S.media[id];
  if (custom) {
    const yt = custom.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
    if (yt) return `<div class="flip"><iframe class="absolute inset-0 w-full h-full" src="https://www.youtube-nocookie.com/embed/${yt[1]}" allowfullscreen loading="lazy"></iframe></div>`;
    if (/\.(mp4|webm)(\?|$)/i.test(custom)) return `<div class="flip"><video class="absolute inset-0 w-full h-full" src="${esc(custom)}" autoplay loop muted playsinline></video></div>`;
    return `<div class="flip"><img src="${esc(custom)}" alt="${esc(ex.name)}" loading="lazy"></div>`;
  }
  return `<div class="flip"><img src="${imgUrl(ex.media, 0)}" alt="${esc(ex.name)}" loading="lazy"><img class="b" src="${imgUrl(ex.media, 1)}" alt="" loading="lazy"></div>`;
}
function sessionKey(r) { return `sess_${S.user.id}_${r}_${S.date}`; }
function viewFuerza() {
  const R = ROUTINES[S.routine];
  const saved = lsGet(sessionKey(S.routine), {});
  S.started = saved._t || null;
  const cards = R.exercises.map((id, i) => {
    const ex = EXERCISES[id], last = S.lastSets[id];
    const rows = Array.from({ length: ex.sets }, (_, n) => {
      const s = saved[id]?.[n] || {};
      return `<div class="flex items-center gap-2 set" data-ex="${id}" data-n="${n}" data-rest="${ex.rest}">
        <span class="w-6 text-sm text-slate-400">${n + 1}</span>
        <input inputmode="decimal" placeholder="kg" class="inp !p-2 w-20 s-w" value="${s.w ?? (last?.weight_kg ?? "")}">
        <input inputmode="numeric" placeholder="reps" class="inp !p-2 w-20 s-r" value="${s.r ?? ""}">
        <button class="btn !py-2 s-ok ${s.d ? "bg-green-600" : "bg-slate-600"}">${s.d ? "✓" : "Hecha"}</button></div>`;
    }).join("");
    return `<article class="ex card space-y-3">
      <div class="flex justify-between text-xs text-slate-400"><span>${i + 1} / ${R.exercises.length}</span><span>Descanso ${ex.rest} s</span></div>
      ${mediaHTML(id, ex)}
      <h3 class="text-lg font-bold">${esc(ex.name)}</h3>
      <div class="flex flex-wrap gap-2 text-xs"><span class="bg-blue-900 px-2 py-1 rounded-full">${ex.sets} x ${esc(ex.reps)}</span><span class="bg-slate-700 px-2 py-1 rounded-full">${esc(ex.muscles)}</span></div>
      <p class="text-sm"><b>Técnica:</b> ${esc(ex.cue)}</p>
      <p class="text-sm text-amber-200"><b>Articulaciones:</b> ${esc(ex.joint)}</p>
      <p class="text-xs text-slate-400">Alternativa: ${esc(ex.alt)}</p>
      ${last ? `<p class="text-xs text-slate-400">Última vez: ${last.weight_kg ?? "-"} kg x ${last.reps ?? "-"}</p>` : ""}
      <div class="space-y-2">${rows}</div>
      <div class="flex gap-3 text-xs"><a class="text-blue-300 underline" target="_blank" rel="noopener" href="${ytUrl(ex.yt)}">Ver más videos</a>
        <button class="text-blue-300 underline" data-media="${id}">Poner mi GIF/video</button></div></article>`;
  }).join("");
  $("#view").innerHTML = `<section class="space-y-4">
    <div class="flex gap-2">${Object.entries(ROUTINES).map(([k, r]) => `<button data-r="${k}" class="btn flex-1 ${S.routine === k ? "bg-blue-600" : "bg-slate-700"}">${r.title}<div class="text-xs font-normal">${r.subtitle}</div></button>`).join("")}</div>
    <details class="card"><summary class="cursor-pointer text-sm font-semibold text-amber-200">Reglas de seguridad (léelas una vez)</summary>
      <ul class="list-disc pl-5 text-sm mt-2 space-y-1">${GENERAL_RULES.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>
    <div class="carousel" id="car">${cards}</div>
    <button id="fin" class="btn bg-green-600 w-full text-lg py-4">Terminar y guardar sesión</button></section>`;
  $$("[data-r]").forEach((b) => (b.onclick = () => { S.routine = b.dataset.r; lsSet("routine", S.routine); viewFuerza(); }));
  $$(".set").forEach((row) => {
    $(".s-ok", row).onclick = (e) => {
      const b = e.currentTarget, done = !b.classList.contains("bg-green-600");
      b.classList.toggle("bg-green-600", done); b.classList.toggle("bg-slate-600", !done); b.textContent = done ? "✓" : "Hecha";
      if (!S.started) S.started = Date.now();
      persistSession(); if (done) startRest(+row.dataset.rest);
    };
    $$("input", row).forEach((i) => i.addEventListener("input", persistSession));
  });
  $$("[data-media]").forEach((b) => (b.onclick = () => setMedia(b.dataset.media)));
  $("#fin").onclick = finishSession;
}
function collectSets() {
  const out = {};
  $$(".set").forEach((row) => {
    const ex = row.dataset.ex, n = +row.dataset.n;
    (out[ex] ||= [])[n] = { w: $(".s-w", row).value, r: $(".s-r", row).value, d: $(".s-ok", row).classList.contains("bg-green-600") };
  });
  return out;
}
function persistSession() { lsSet(sessionKey(S.routine), { ...collectSets(), _t: S.started }); }
async function finishSession() {
  const sets = collectSets();
  const done = Object.entries(sets).flatMap(([ex, arr]) => arr.map((s, n) => ({ ex, n, ...s })).filter((s) => s.d));
  if (!done.length) { toast("Marca al menos una serie como hecha."); return; }
  try {
    const mins = S.started ? Math.round((Date.now() - S.started) / 60000) : null;
    const ses = await q(sb.from("workout_sessions").insert({ user_id: S.user.id, date: S.date, routine: S.routine, duration_min: mins }).select().single());
    await q(sb.from("set_logs").insert(done.map((s) => ({ session_id: ses.id, user_id: S.user.id, exercise_id: s.ex, set_no: s.n + 1, reps: num(s.r), weight_kg: num(s.w) }))));
    await q(sb.from("daily_logs").upsert({ user_id: S.user.id, date: S.date, training: `Rutina ${S.routine}` }, { onConflict: "user_id,date" }));
    try { localStorage.removeItem(sessionKey(S.routine)); } catch { /* ok */ }
    toast(`Sesión guardada: ${done.length} series`, "ok", 5000);
    await loadLastSets(); viewFuerza();
  } catch (e) { toast("No se guardó: " + e.message, "err", 6000); }
}
async function setMedia(id) {
  const url = prompt("Pega la URL de tu GIF, video (mp4/webm) o enlace de YouTube. Vacío = volver al original.", S.media[id] || "");
  if (url === null) return;
  try {
    if (!url.trim()) { await q(sb.from("exercise_media").delete().eq("exercise_id", id)); delete S.media[id]; }
    else { await q(sb.from("exercise_media").upsert({ user_id: S.user.id, exercise_id: id, media_url: url.trim() })); S.media[id] = url.trim(); }
    viewFuerza();
  } catch (e) { toast(e.message, "err"); }
}
let restTimer = null;
function startRest(sec) {
  clearInterval(restTimer);
  const el = $("#rest"); let left = sec;
  const draw = () => { el.textContent = `Descanso ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} · toca para cerrar`; };
  el.classList.remove("hidden"); draw();
  el.onclick = () => { clearInterval(restTimer); el.classList.add("hidden"); };
  restTimer = setInterval(() => {
    left--; if (left <= 0) {
      clearInterval(restTimer); el.textContent = "A la siguiente serie"; navigator.vibrate?.([250, 100, 250]);
      try { const a = new AudioContext(), o = a.createOscillator(); o.connect(a.destination); o.frequency.value = 880; o.start(); o.stop(a.currentTime + 0.25); } catch { /* sin audio */ }
      setTimeout(() => el.classList.add("hidden"), 3000);
    } else draw();
  }, 1000);
}

/* ---------- vista PROGRESO ---------- */
async function viewProgreso() { await viewProgresoBase(); await panel.mount(); }
async function viewProgresoBase() {
  $("#view").innerHTML = `<p class="text-slate-400 p-4">Cargando…</p>`;
  let metrics = [], daily = [], mealsAgg = {};
  try {
    const from = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    const [m, d, ml] = await Promise.all([
      q(sb.from("body_metrics").select("*").order("date")),
      q(sb.from("daily_logs").select("*").order("date")),
      q(sb.from("meals").select("log_date,kcal,protein_g").gte("log_date", from)),
    ]);
    metrics = m; daily = d;
    ml.forEach((x) => { const a = (mealsAgg[x.log_date] ||= { kcal: 0, p: 0 }); a.kcal += +x.kcal; a.p += +x.protein_g; });
    lsSet(`cache_hist_${S.user.id}`, { metrics, daily, mealsAgg });
  } catch (e) { const c = lsGet(`cache_hist_${S.user.id}`, null); if (c) ({ metrics, daily, mealsAgg } = c); toast("Sin conexión: mostrando la última copia", "err"); }

  const W = metrics.filter((x) => x.weight_kg != null);
  if (!W.length) { $("#view").innerHTML = `<div class="card">Aún no hay mediciones. Guarda la primera en Hoy o usa "Cargar medición inicial" en Ajustes.</div>`; return; }
  const a = W[0], b = W[W.length - 1];
  const diff = (k) => (a[k] != null && b[k] != null ? r1(b[k] - a[k]) : null);
  const sgn = (v, u = "") => (v == null || a === b ? "—" : `${v > 0 ? "+" : ""}${v}${u}`);
  const dW = diff("weight_kg"), dM = diff("muscle_kg"), dFp = diff("body_fat_pct"), dFk = diff("fat_mass_kg");
  const keep = a.muscle_kg && b.muscle_kg ? r1((b.muscle_kg / a.muscle_kg) * 100) : null;
  // ritmo semanal sobre los ultimos 14 dias
  let pace = "";
  const recent = W.filter((x) => new Date(x.date) >= new Date(Date.now() - 14 * 864e5));
  if (recent.length >= 2) {
    const f = recent[0], l = recent[recent.length - 1], days = (new Date(l.date) - new Date(f.date)) / 864e5;
    if (days >= 5) { const wk = ((l.weight_kg - f.weight_kg) / days) * 7, pct = (wk / f.weight_kg) * 100; pace = `Ritmo: ${r1(wk)} kg/sem (${r1(pct)} %/sem). ${pct < -1 ? "Más de 1 % semanal: referencia habitual para no perder músculo. Revisa proteína y fuerza." : "Dentro de lo habitual."}`; }
  }
  const warn = dM != null && dM < -1.5 ? `<div class="bg-red-900 border border-red-500 rounded-xl p-3 text-sm">Has perdido ${Math.abs(dM)} kg de masa muscular desde el inicio. Prioriza proteína y las dos rutinas.</div>` : "";
  const sl = daily.filter((x) => x.sleep_minutes).slice(-7);
  const sleepCard = sl.length ? `<div class="card text-sm">Sueño (${sl.length === 1 ? "último día" : "últimos " + sl.length + " días"}): <b>${r1(sl.reduce((a, x) => a + x.sleep_minutes, 0) / sl.length / 60)} h</b> de media${sl.some((x) => x.sleep_score) ? ` · puntuación ${Math.round(sl.filter((x) => x.sleep_score).reduce((a, x) => a + x.sleep_score, 0) / sl.filter((x) => x.sleep_score).length)}` : ""}</div>` : "";
  // Valor actual siempre visible; el cambio aparece debajo y solo cuando hay con qué comparar.
  const stat = (l, cur, unit, chg, good) => `<div class="card text-center"><p class="text-xs uppercase text-slate-300">${l}</p>
    <p class="text-2xl font-bold text-white">${cur != null ? cur : "—"}<span class="text-sm font-normal text-slate-400"> ${cur != null ? unit : ""}</span></p>
    <p class="text-xs ${chg == null || a === b ? "text-slate-500" : good ? "text-green-400" : "text-red-400"}">${chg == null || a === b ? "sin cambios aún" : "cambio " + (chg > 0 ? "+" : "") + chg + " " + unit}</p></div>`;
  $("#view").innerHTML = `<section class="space-y-4">
    <p class="text-xs text-slate-400">Desde ${fdate(a.date)} hasta ${fdate(b.date)} · Actual ${b.weight_kg} kg</p>
    <div class="grid grid-cols-2 gap-3">${stat("Peso", b.weight_kg, "kg", dW, dW <= 0)}${stat("Músculo", b.muscle_kg, "kg", dM, dM == null || dM >= -0.5)}${stat("Grasa %", b.body_fat_pct, "%", dFp, dFp == null || dFp <= 0)}${stat("Grasa kg", b.fat_mass_kg, "kg", dFk, dFk == null || dFk <= 0)}</div>
    <div class="card text-sm">Músculo conservado: <b>${keep ?? "-"} %</b>. ${esc(pace)}</div>${warn}${sleepCard}
    <div class="card"><h3 class="text-sm font-semibold text-center mb-2">Peso y músculo</h3><div class="h-56"><canvas id="c1"></canvas></div></div>
    <div class="card"><h3 class="text-sm font-semibold text-center mb-2">Grasa corporal %</h3><div class="h-44"><canvas id="c2"></canvas></div></div>
    <div class="card"><h3 class="text-sm font-semibold text-center mb-2">Calorías y proteína (14 días)</h3><div class="h-52"><canvas id="c3"></canvas></div></div>
    <div class="flex gap-2 noprint"><button id="csv" class="btn bg-slate-700 flex-1">Exportar CSV</button><button id="prt" class="btn bg-slate-700 flex-1">Imprimir</button></div>
    <div class="card overflow-x-auto"><table class="w-full text-sm whitespace-nowrap"><thead class="text-slate-300 text-xs uppercase"><tr><th class="text-left p-1">Fecha</th><th>Peso</th><th>% Gr</th><th>Músc</th><th>BMR</th><th>Hábitos</th></tr></thead><tbody>
      ${[...W].reverse().slice(0, 40).map((x) => { const dl = daily.find((d) => d.date === x.date); const hs = dl ? Object.values(dl.habits || {}).filter(Boolean).length : 0; return `<tr class="border-t border-slate-700 text-center"><td class="text-left p-1">${fdate(x.date)}</td><td>${x.weight_kg}</td><td>${x.body_fat_pct ?? "-"}</td><td>${x.muscle_kg ?? "-"}</td><td>${x.bmr ?? "-"}</td><td>${hs}/4</td></tr>`; }).join("")}
    </tbody></table></div></section>`;

  const grid = { color: "#e2e8f0" }, leg = { labels: { color: "#475569" } };
  const lab = W.map((x) => fdate(x.date));
  S.charts.push(new Chart($("#c1"), { type: "line", data: { labels: lab, datasets: [
    { label: "Peso (kg)", data: W.map((x) => x.weight_kg), borderColor: "#ef4444", tension: 0.3, yAxisID: "y" },
    { label: "Músculo (kg)", data: W.map((x) => x.muscle_kg), borderColor: "#22c55e", tension: 0.3, yAxisID: "y1" }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid }, y: { grid }, y1: { position: "right", grid: { drawOnChartArea: false } } }, plugins: { legend: leg } } }));
  S.charts.push(new Chart($("#c2"), { type: "line", data: { labels: lab, datasets: [{ label: "% grasa", data: W.map((x) => x.body_fat_pct), borderColor: "#f59e0b", tension: 0.3 }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid }, y: { grid } }, plugins: { legend: leg } } }));
  const days = Object.keys(mealsAgg).sort();
  S.charts.push(new Chart($("#c3"), { data: { labels: days.map(fdate), datasets: [
    { type: "bar", label: "kcal", data: days.map((d) => Math.round(mealsAgg[d].kcal)), backgroundColor: "#64748b", yAxisID: "y" },
    { type: "line", label: "Proteína (g)", data: days.map((d) => Math.round(mealsAgg[d].p)), borderColor: "#3b82f6", yAxisID: "y1" }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid }, y: { grid }, y1: { position: "right", grid: { drawOnChartArea: false } } }, plugins: { legend: leg } } }));
  $("#prt").onclick = () => window.print();
  $("#csv").onclick = () => {
    const cols = ["date", ...FIT.map((f) => f[0])];
    const csv = [cols.join(","), ...W.map((x) => cols.map((c) => x[c] ?? "").join(","))].join("\n");
    const el = document.createElement("a"); el.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); el.download = `recomp_${todayStr()}.csv`; el.click();
  };
}

/* ---------- vista AJUSTES ---------- */
const BASELINE = { date: "2026-11-16", weight_kg: 129.7, body_fat_pct: 32.7, fat_mass_kg: 42.4, muscle_kg: 81.4, skeletal_muscle_kg: 50.7, water_pct: 49.3, visceral_fat: 18, bmr: 2255, bmi: 37.9, protein_kg: 17.5, fat_free_mass_kg: 87.2, subcutaneous_fat_pct: 23.3, bone_mass_kg: 5.8, body_age: 56, body_score: 73, whr: 1.13, asmi: 11.6 };
function viewAjustes() {
  const g = S.profile;
  const f = (k, l) => `<div><label class="text-xs text-slate-300">${l}</label><input id="g-${k}" inputmode="decimal" class="inp" value="${g[k]}"></div>`;
  $("#view").innerHTML = `<section class="space-y-4">
    <div class="card space-y-3"><h2 class="font-bold text-blue-300">Objetivos diarios</h2>
      <div class="grid grid-cols-2 gap-3">${f("goal_kcal", "Calorías")}${f("goal_protein", "Proteína (g)")}${f("goal_carbs", "Carbos (g)")}${f("goal_fat", "Grasas (g)")}${f("goal_steps", "Pasos")}${f("goal_sodium_mg", "Sodio máx (mg)")}${f("height_cm", "Altura (cm)")}</div>
      <button id="g-save" class="btn bg-green-600 w-full">Guardar objetivos</button></div>
    <div class="card space-y-3"><h2 class="font-bold text-amber-300">Datos</h2>
      <button id="base" class="btn bg-blue-600 w-full">Cargar mi medición inicial (16/11/2026)</button>
      <button id="imp" class="btn bg-slate-700 w-full">Importar historial viejo (.json)</button>
      <p class="text-xs text-slate-400">El .json sale de "exportar-datos-viejos.html" abierto donde tenías la app antigua.</p></div>
    <div class="card space-y-3"><h2 class="font-bold">Cuenta</h2><p class="text-sm text-slate-300">${esc(S.user.email)}</p>
      <button id="upd" class="btn bg-slate-700 w-full">Forzar actualización de la app</button>
      <button id="out" class="btn bg-red-800 w-full">Cerrar sesión</button>
      <p class="text-xs text-slate-500 text-center">${esc(APP_VERSION)}</p></div></section>`;
  $("#g-save").onclick = async () => {
    const upd = {};
    for (const k of Object.keys(GOAL_DEFAULT)) { const v = num($("#g-" + k).value); if (v != null) upd[k] = v; }
    try { S.profile = { ...S.profile, ...(await q(sb.from("profiles").update(upd).eq("id", S.user.id).select().single())) }; toast("Objetivos guardados", "ok"); } catch (e) { toast(e.message, "err"); }
  };
  $("#base").onclick = async () => {
    try { await q(sb.from("body_metrics").upsert({ ...BASELINE, user_id: S.user.id, source: "fitdays-app" }, { onConflict: "user_id,date" })); toast("Medición inicial cargada", "ok"); } catch (e) { toast(e.message, "err"); }
  };
  $("#imp").onclick = () => $("#file-import").click();
  $("#upd").onclick = async () => { try { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); for (const k of await caches.keys()) await caches.delete(k); } catch { /* ok */ } location.reload(); };
  $("#out").onclick = async () => { await sb.auth.signOut(); clearLocal(); S.user = null; showAuth(); };
}
$("#file-import").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    const recs = JSON.parse(await f.text());
    if (!Array.isArray(recs)) throw new Error("El archivo debe ser una lista de registros");
    const have = new Set((await q(sb.from("meals").select("log_date"))).map((m) => m.log_date));
    let nm = 0;
    for (const r of recs) {
      if (!r.date) continue;
      const bm = { user_id: S.user.id, date: r.date, source: "import", weight_kg: r.weight || null, body_fat_pct: r.fat || null, muscle_kg: r.muscle || null, water_pct: r.water || null, visceral_fat: r.visceral || null, bmr: r.bmr || null };
      Object.keys(bm).forEach((k) => bm[k] == null && delete bm[k]);
      if (bm.weight_kg) await q(sb.from("body_metrics").upsert(bm, { onConflict: "user_id,date" }));
      await q(sb.from("daily_logs").upsert({ user_id: S.user.id, date: r.date, habits: r.habits || {}, training: r.training || "Ninguno" }, { onConflict: "user_id,date" }));
      const n = r.nutrition;
      if (n && n.cal > 0 && !have.has(r.date)) { await q(sb.from("meals").insert({ user_id: S.user.id, log_date: r.date, meal_type: "Comida", name: (n.food || "Importado").slice(0, 120), kcal: n.cal, protein_g: n.pro || 0, carbs_g: n.car || 0, fat_g: n.fat || 0, source: "manual" })); nm++; }
    }
    toast(`Importado: ${recs.length} días, ${nm} comidas`, "ok", 5000);
  } catch (err) { toast("Importación falló: " + err.message, "err", 6000); }
});
