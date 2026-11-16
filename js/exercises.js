// Catalogo de fuerza adaptado a home gym basico (mancuernas, banco, bandas, peso corporal)
// y a un hombre de ~130 kg que quiere hipertrofia/mantenimiento sin castigar articulaciones.
// Imagenes: free-exercise-db (dominio publico). Cada ejercicio alterna 2 fotos (inicio/final) como un GIF.
const IMG = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
export const imgUrl = (id, n) => `${IMG}${id}/${n}.jpg`;
export const ytUrl = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

export const GENERAL_RULES = [
  "RIR 2: termina cada serie con 2 repeticiones en reserva. Nunca al fallo.",
  "Tempo 3-1-1: baja en 3 s, pausa 1 s, sube con control. Sin rebotes.",
  "Exhala al esfuerzo. No aguantes la respiracion (importante con tu tension arterial).",
  "Sin impacto ni saltos. Si una articulacion duele, usa la alternativa de la tarjeta.",
  "Progresion: cuando cierres todas las series en el tope de repeticiones, sube el peso 2-5 %.",
];

export const EXERCISES = {
  squat_bench: {
    name: "Sentadilla a banco con mancuerna", media: "Dumbbell_Squat_To_A_Bench",
    muscles: "Cuadriceps, gluteos", sets: 3, reps: "8-10", rest: 120,
    cue: "Mancuerna al pecho. Cadera atras, baja hasta rozar el banco y sube empujando el suelo.",
    joint: "El banco marca una profundidad segura para rodillas y lumbar. Si la rodilla molesta, sube la altura del banco.",
    alt: "Sin banco: silla firme.", yt: "goblet squat to box tecnica",
  },
  db_bench: {
    name: "Press de pecho con mancuernas", media: "Dumbbell_Bench_Press",
    muscles: "Pecho, triceps, hombro anterior", sets: 3, reps: "8-10", rest: 120,
    cue: "Escapulas juntas y abajo, codos a 45 grados del torso, baja hasta sentir el pecho estirado.",
    joint: "Codos a 45 grados protegen el hombro. No bajes mas alla de la linea del pecho.",
    alt: "Sin banco: press de suelo (tumbado, codos tocan el suelo).", yt: "dumbbell bench press tecnica",
  },
  db_shoulder: {
    name: "Press de hombro sentado", media: "Dumbbell_Shoulder_Press",
    muscles: "Hombros, triceps", sets: 3, reps: "10", rest: 90,
    cue: "Espalda apoyada, abdomen firme, sube sin bloquear codos arriba.",
    joint: "Agarre neutro (palmas enfrentadas) si el hombro molesta. Peso moderado.",
    alt: "Con banda elastica pisada.", yt: "seated dumbbell shoulder press tecnica",
  },
  incline_pushup: {
    name: "Flexiones inclinadas (manos elevadas)", media: "Incline_Push-Up",
    muscles: "Pecho, triceps, core", sets: 3, reps: "10-15", rest: 75,
    cue: "Manos en banco o sofa firme, cuerpo en tabla, pecho al borde.",
    joint: "Reduce la carga en munecas y hombros frente a flexiones en suelo. Baja la altura segun progreses.",
    alt: "En pared si es necesario.", yt: "incline push up tecnica",
  },
  lat_raise: {
    name: "Elevaciones laterales", media: "Side_Lateral_Raise",
    muscles: "Deltoides lateral", sets: 3, reps: "12-15", rest: 60,
    cue: "Codos ligeramente flexionados, sube hasta la altura del hombro, controla la bajada.",
    joint: "Peso ligero. Si molesta el hombro, hazlo con banda y sin pasar de la horizontal.",
    alt: "Con banda elastica.", yt: "dumbbell lateral raise tecnica",
  },
  triceps_ext: {
    name: "Extension de triceps de pie", media: "Standing_Dumbbell_Triceps_Extension",
    muscles: "Triceps", sets: 3, reps: "10-12", rest: 60,
    cue: "Codos cerca de la cabeza y quietos; baja detras de la nuca y extiende.",
    joint: "Cuida el codo: peso ligero y recorrido completo sin dolor.",
    alt: "Con banda elastica.", yt: "standing dumbbell triceps extension tecnica",
  },
  plank: {
    name: "Plancha", media: "Plank",
    muscles: "Core", sets: 3, reps: "30-45 s", rest: 45,
    cue: "Antebrazos apoyados, gluteos y abdomen apretados, linea recta cabeza-talones.",
    joint: "Sin hundir la lumbar. Si se hunde, termina la serie.",
    alt: "Apoya las rodillas.", yt: "plank tecnica correcta",
  },
  rdl: {
    name: "Peso muerto rumano con mancuernas", media: "Stiff-Legged_Dumbbell_Deadlift",
    muscles: "Isquios, gluteos, espalda baja", sets: 3, reps: "8-10", rest: 120,
    cue: "Rodillas semiflexionadas, cadera hacia atras, mancuernas pegadas a las piernas, baja hasta media espinilla.",
    joint: "Espalda neutra siempre. Para en cuanto sientas que se redondea. Sin rebote abajo.",
    alt: "Peso mas ligero y rango corto.", yt: "dumbbell romanian deadlift tecnica",
  },
  db_row: {
    name: "Remo con mancuerna a una mano", media: "One-Arm_Dumbbell_Row",
    muscles: "Dorsal, romboides, biceps", sets: 3, reps: "10-12 por lado", rest: 90,
    cue: "Mano y rodilla en el banco, espalda plana, tira el codo hacia la cadera.",
    joint: "Apoyo estable alivia la lumbar. No gires el torso para subir mas peso.",
    alt: "Remo con banda anclada.", yt: "one arm dumbbell row tecnica",
  },
  glute_bridge: {
    name: "Puente de gluteo a una pierna", media: "Single_Leg_Glute_Bridge",
    muscles: "Gluteos, isquios", sets: 3, reps: "10-12 por lado", rest: 75,
    cue: "Talon cerca del gluteo, empuja con el talon, aprieta arriba 1 s.",
    joint: "No arquees la lumbar al subir: la fuerza sale del gluteo.",
    alt: "A dos piernas con mancuerna en la cadera.", yt: "glute bridge tecnica",
  },
  reverse_fly: {
    name: "Pajaros (vuelos posteriores)", media: "Reverse_Flyes",
    muscles: "Deltoides posterior, espalda alta", sets: 3, reps: "12-15", rest: 60,
    cue: "Inclinado con espalda plana, abre los brazos con codos suaves, junta escapulas.",
    joint: "Peso muy ligero. Es un ejercicio de control, no de carga.",
    alt: "Con banda elastica.", yt: "dumbbell reverse fly tecnica",
  },
  pull_apart: {
    name: "Apertura con banda (sustituto de face pull)", media: "Band_Pull_Apart",
    muscles: "Deltoides posterior, manguito", sets: 3, reps: "15-20", rest: 45,
    cue: "Banda a la altura del pecho, brazos rectos, separa hasta tocar el pecho con la banda.",
    joint: "Excelente para la salud del hombro tras tanto empuje. Hazlo suave.",
    alt: "Cualquier banda ligera.", yt: "band pull apart tecnica",
  },
  hammer: {
    name: "Curl martillo", media: "Hammer_Curls",
    muscles: "Biceps, braquial, antebrazo", sets: 3, reps: "10-12", rest: 60,
    cue: "Codos pegados al costado, palmas enfrentadas, sube sin balanceo.",
    joint: "Agarre neutro es mas amable con codos y munecas.",
    alt: "Alternando brazos.", yt: "hammer curl tecnica",
  },
  dead_bug: {
    name: "Bicho muerto (dead bug)", media: "Dead_Bug",
    muscles: "Core profundo", sets: 3, reps: "8-10 por lado", rest: 45,
    cue: "Lumbar pegada al suelo, baja brazo y pierna contrarios lento.",
    joint: "Protege la espalda baja con carga cero.",
    alt: "Solo piernas o solo brazos.", yt: "dead bug ejercicio tecnica",
  },
  farmers: {
    name: "Paseo del granjero", media: "Farmers_Walk",
    muscles: "Agarre, trapecio, core", sets: 3, reps: "30-40 s", rest: 60,
    cue: "Mancuernas pesadas a los lados, hombros atras, pasos cortos y firmes.",
    joint: "Postura alta y respiracion continua. Suma pasos y trabaja agarre.",
    alt: "Mochila con peso.", yt: "farmer walk tecnica",
  },
};

export const ROUTINES = {
  A: {
    title: "Rutina A", subtitle: "Empuje + piernas (cuadriceps)",
    exercises: ["squat_bench", "db_bench", "db_shoulder", "incline_pushup", "lat_raise", "triceps_ext", "plank"],
  },
  B: {
    title: "Rutina B", subtitle: "Tiron + cadena posterior",
    exercises: ["rdl", "db_row", "glute_bridge", "reverse_fly", "pull_apart", "hammer", "dead_bug", "farmers"],
  },
};
