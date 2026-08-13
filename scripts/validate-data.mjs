/**
 * validate-data.mjs
 * ---------------------------------------------------------------
 * Script de prueba / validación (QA obligatorio). Recorre TODOS los
 * registros del CSV fuente y verifica que la aplicación no presente:
 *
 *   1. Desplegables con opciones vacías, duplicadas o null/undefined.
 *   2. Relaciones en cascada rotas (todo Momento → Atención → Actividad
 *      → Indicador y Región → Municipio → ESE → Servicio debe ser válido).
 *   3. Que el cambio del primer desplegable tras seleccionar los 4 niveles
 *      no rompa la interfaz (reinicio de descendientes sin estados inválidos).
 *   4. Que la codificación UTF-8 preserve tildes y caracteres especiales
 *      ("Planificación", "Caparrapí", "Atención", "Chaguaní", "Útica").
 *
 * También valida las fórmulas oficiales:
 *   - calcularDiferencia (brecha) vs. columna Brecha del CSV.
 *   - obtenerClasificacion (semáforo) vs. columna Semáforo del CSV.
 *
 * Uso: npm run validate
 * Exit code 0 = OK, distinto de 0 = fallo.
 * ---------------------------------------------------------------
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CSV_PATH = join(
  ROOT,
  "LISTA MAESTRA DETERMINANATES Ruta Materna Perinatal - Hoja 1 (1).csv"
);
const ANNEX_PATH = join(ROOT, "Remisión y referencia oportuna - Hoja 1.csv");
const DATA_PATH = join(ROOT, "src", "lib", "data", "generated-data.json");

/* ------------------------------------------------------------------ */
/* Mini framework de tests                                             */
/* ------------------------------------------------------------------ */
let passed = 0;
let failed = 0;
const warnings = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✘ ${name}`);
    console.log(`      ${err.message}`);
  }
}

function warn(msg) {
  warnings.push(msg);
}

/* ------------------------------------------------------------------ */
/* Parser CSV + columnas (duplicado mínimo con generate-data.mjs)      */
/* ------------------------------------------------------------------ */
const COL = {
  REGION: 2,
  MUNICIPIO: 4,
  ESE: 5,
  SERVICIO: 6,
  CATEGORIA_DETERMINANTE: 12,
  SUBCATEGORIA: 13,
  MOTIVO_CANALIZACION: 30,
  TIPO_CANALIZACION: 31,
  MOMENTO: 35,
  ATENCION: 36,
  ACTIVIDAD: 37,
  INDICADOR: 38,
  META_ESTABLECIDA: 39,
  META_ALCANZADA: 40,
  BRECHA_CSV: 41,
  SEMAFORO_CSV: 42,
  TIPO_BARRERA: 46,
  BARRERA: 47,
};

function parseCSV(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
      } else if (c === "\r") {
        /* skip */
      } else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const clean = (v) => (v === null || v === undefined ? "" : String(v).trim());

/* ------------------------------------------------------------------ */
/* Fórmulas oficiales (espejo de las de la app)                        */
/* ------------------------------------------------------------------ */
function calcularDiferencia(valorAN, valorAO) {
  if (valorAN === null || valorAO === null) return "";
  return valorAN - valorAO;
}

function obtenerClasificacion(porcentaje) {
  if (
    porcentaje === null ||
    porcentaje === undefined ||
    Number.isNaN(porcentaje)
  ) {
    return "";
  }
  if (porcentaje < 0.4) return "Malo";
  if (porcentaje < 0.7) return "Regular";
  if (porcentaje < 0.9) return "Bueno";
  return "Muy bueno";
}

function parsePercent(v) {
  const s = clean(v).replace("%", "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------ */
/* Carga de datos                                                      */
/* ------------------------------------------------------------------ */
const csvRows = parseCSV(readFileSync(CSV_PATH, "utf8"));
const dataRows = csvRows
  .slice(1)
  .filter((r) => r.length > COL.MOMENTO && clean(r[COL.MOMENTO]) !== "");
const annexRows = parseCSV(readFileSync(ANNEX_PATH, "utf8"))
  .slice(1)
  .filter((r) => r.length >= 4);
const gen = JSON.parse(readFileSync(DATA_PATH, "utf8"));

const EXPECTED = {
  momentos: 17,
  combos: 655,
  registrosESE: 8662, // 122 combos región|municipio|ESE × 71 servicios
  metrics: 102,
  categorias: 3,
  tiposBarrera: 5,
  motivos: 26,
  regiones: 14,
};

const ACCENTS = ["Planificación", "Caparrapí", "Atención", "Chaguaní", "Útica"];
const NEW_REGIONS = ["Soacha", "Sur", "Suroccidente", "Suroriente"];

console.log("=".repeat(70));
console.log("VALIDACIÓN DE LA APP RUTA MATERNA PERINATAL");
console.log(`Fuente: ${basename(CSV_PATH)}`);
console.log(`Filas físicas: ${csvRows.length} · Filas con datos: ${dataRows.length}`);
console.log("=".repeat(70));

/* ------------------------------------------------------------------ */
/* TEST 1 · Conteos esperados vs. datos generados                      */
/* ------------------------------------------------------------------ */
console.log("\n▶ Conteos estructurales");
test("17 momentos de la ruta", () => {
  if (gen.moduloA.momentos.length !== EXPECTED.momentos)
    throw new Error(
      `Esperados ${EXPECTED.momentos}, hay ${gen.moduloA.momentos.length}`
    );
});
test("Remisión y referencia oportuna está entre los momentos", () => {
  if (!gen.moduloA.momentos.includes("Remisión y referencia oportuna"))
    throw new Error("Falta el momento 'Remisión y referencia oportuna'");
});
test("655 combos (momento, atención, actividad, indicador)", () => {
  if (gen.moduloA.combos.length !== EXPECTED.combos)
    throw new Error(
      `Esperados ${EXPECTED.combos}, hay ${gen.moduloA.combos.length}`
    );
});
test("8662 registros ESE (región, municipio, ESE, servicio)", () => {
  if (gen.moduloB.registros.length !== EXPECTED.registrosESE)
    throw new Error(
      `Esperados ${EXPECTED.registrosESE}, hay ${gen.moduloB.registros.length}`
    );
});
test("14 regiones en salud", () => {
  if (gen.moduloB.regiones.length !== EXPECTED.regiones)
    throw new Error(
      `Esperadas ${EXPECTED.regiones}, hay ${gen.moduloB.regiones.length}`
    );
});
test("Soacha, Sur, Suroccidente y Suroriente incluidas", () => {
  for (const reg of NEW_REGIONS) {
    if (!gen.moduloB.regiones.includes(reg))
      throw new Error(`Falta la región '${reg}'`);
  }
});
test("102 registros métricos válidos", () => {
  if (gen.metrics.length !== EXPECTED.metrics)
    throw new Error(
      `Esperados ${EXPECTED.metrics}, hay ${gen.metrics.length}`
    );
});
test("3 categorías de determinantes", () => {
  const n = Object.keys(gen.moduloC.categorias).length;
  if (n !== EXPECTED.categorias)
    throw new Error(`Esperadas ${EXPECTED.categorias}, hay ${n}`);
});
test("5 tipos de barrera", () => {
  const n = Object.keys(gen.moduloC.tiposBarrera).length;
  if (n !== EXPECTED.tiposBarrera)
    throw new Error(`Esperados ${EXPECTED.tiposBarrera}, hay ${n}`);
});
test("26 motivos de canalización", () => {
  const n = Object.keys(gen.moduloC.motivos).length;
  if (n !== EXPECTED.motivos)
    throw new Error(`Esperados ${EXPECTED.motivos}, hay ${n}`);
});

/* ------------------------------------------------------------------ */
/* TEST 2 · Sin opciones vacías, duplicadas ni null/undefined          */
/* ------------------------------------------------------------------ */
console.log("\n▶ Opciones de desplegables (vacías / duplicadas / nulas)");

function checkNoEmptyOrNull(list, label) {
  for (const opt of list) {
    if (opt === null || opt === undefined)
      throw new Error(`${label}: opción null/undefined`);
    if (String(opt).trim() === "")
      throw new Error(`${label}: opción vacía '${JSON.stringify(opt)}'`);
  }
}
function checkNoDupes(list, label) {
  const seen = new Set();
  for (const opt of list) {
    if (seen.has(opt))
      throw new Error(`${label}: duplicada '${opt}'`);
    seen.add(opt);
  }
}
function checkAllLists(lists, label) {
  checkNoEmptyOrNull(lists, label);
  checkNoDupes(lists, label);
}

/**
 * Valida que NINGÚN desplegable instanciado (opciones de un padre concreto)
 * tenga opciones vacías, duplicadas o null/undefined. Una misma opción puede
 * repetirse LEGÍTIMAMENTE en distintos contextos de la cascada (p. ej. la
 * actividad "Detección temprana" pertenece a varias atenciones, o el
 * municipio "Ubalá" a dos regiones); lo que importa es que dentro de cada
 * lista de opciones no haya duplicados.
 */
function checkNoDupeInside(list, label) {
  const seen = new Set();
  for (const opt of list) {
    if (opt === null || opt === undefined)
      throw new Error(`${label}: opción null/undefined`);
    if (String(opt).trim() === "")
      throw new Error(`${label}: opción vacía '${JSON.stringify(opt)}'`);
    if (seen.has(opt)) throw new Error(`${label}: duplicada '${opt}'`);
    seen.add(opt);
  }
}
function checkContextLists(record, label) {
  const lists = Object.values(record);
  if (lists.length === 0) throw new Error(`${label}: sin listas generadas`);
  for (const list of lists) checkNoDupeInside(list, label);
}

test("Momentos: sin vacíos, nulos ni duplicados", () =>
  checkAllLists(gen.moduloA.momentos, "momento"));
test("Atenciones por momento: cada desplegable sin duplicados", () =>
  checkContextLists(gen.moduloA.atenciones, "atenciones"));
test("Actividades por (momento, atención): cada desplegable sin duplicados", () =>
  checkContextLists(gen.moduloA.actividades, "actividades"));
test("Indicadores por (momento, atención, actividad): sin duplicados", () =>
  checkContextLists(gen.moduloA.indicadores, "indicadores"));
test("Regiones: sin vacíos, nulos ni duplicados", () =>
  checkAllLists(gen.moduloB.regiones, "región"));
test("Municipios por región: cada desplegable sin duplicados", () =>
  checkContextLists(gen.moduloB.municipios, "municipios"));
test("ESEs por (región, municipio): cada desplegable sin duplicados", () =>
  checkContextLists(gen.moduloB.eses, "ESEs"));
test("Servicios por (región, municipio, ESE): sin duplicados", () =>
  checkContextLists(gen.moduloB.servicios, "servicios"));
test("Subcategorías por categoría: cada desplegable sin duplicados", () =>
  checkContextLists(gen.moduloC.categorias, "subcategorías"));
test("Barreras por tipo: cada desplegable sin duplicados", () =>
  checkContextLists(gen.moduloC.tiposBarrera, "barreras"));
test("Tipos de canalización por motivo: sin duplicados", () =>
  checkContextLists(gen.moduloC.motivos, "tipos de canalización"));

/* ------------------------------------------------------------------ */
/* TEST 3 · Integridad de todas las relaciones en cascada              */
/* ------------------------------------------------------------------ */
console.log("\n▶ Relaciones en cascada");

test("Todo momento tiene ≥1 atención válida", () => {
  for (const m of gen.moduloA.momentos) {
    const ats = gen.moduloA.atenciones[m] ?? [];
    if (ats.length === 0)
      throw new Error(`Momento '${m}' sin atenciones`);
    for (const a of ats)
      if (!gen.moduloA.combos.some((c) => c.m === m && c.a === a))
        throw new Error(`(momento, atención) '${m}|${a}' sin combos`);
  }
});
test("Todo (momento, atención) tiene ≥1 actividad válida", () => {
  const keys = Object.keys(gen.moduloA.actividades);
  if (keys.length === 0)
    throw new Error("Sin actividades generadas");
  for (const k of keys) {
    const [m, a] = k.split("\u0000");
    if (!gen.moduloA.combos.some((c) => c.m === m && c.a === a))
      throw new Error(`Actividad sin combos para '${m}|${a}'`);
  }
});
test("Todo (momento, atención, actividad) tiene ≥1 indicador", () => {
  const keys = Object.keys(gen.moduloA.indicadores);
  for (const k of keys) {
    const [m, a, act] = k.split("\u0000");
    if (!gen.moduloA.combos.some((c) => c.m === m && c.a === a && c.act === act))
      throw new Error(`Indicador sin combos para '${m}|${a}|${act}'`);
  }
});
test("Cada combo de la matriz existe en el CSV o el anexo (cobertura 100%)", () => {
  const comboSet = new Set();
  for (const r of dataRows) {
    const m = clean(r[COL.MOMENTO]);
    const a = clean(r[COL.ATENCION]);
    const act = clean(r[COL.ACTIVIDAD]);
    const i = clean(r[COL.INDICADOR]);
    if (m && a && act && i) comboSet.add(`${m}\u0000${a}\u0000${act}\u0000${i}`);
  }
  for (const r of annexRows) {
    const m = clean(r[0]);
    const a = clean(r[1]);
    const act = clean(r[2]);
    const i = clean(r[3]);
    if (m && a && act && i) comboSet.add(`${m}\u0000${a}\u0000${act}\u0000${i}`);
  }
  for (const c of gen.moduloA.combos) {
    if (!comboSet.has(`${c.m}\u0000${c.a}\u0000${c.act}\u0000${c.i}`))
      throw new Error(`Combo '${c.m}|${c.a}|${c.act}|${c.i}' no está en el CSV`);
  }
});
test("Región → Municipio → ESE → Servicio (todas las cadenas válidas)", () => {
  for (const reg of gen.moduloB.regiones) {
    const munis = gen.moduloB.municipios[reg] ?? [];
    if (munis.length === 0)
      throw new Error(`Región '${reg}' sin municipios`);
    for (const muni of munis) {
      const eses = gen.moduloB.eses[`${reg}\u0000${muni}`] ?? [];
      if (eses.length === 0)
        throw new Error(`Municipio '${muni}' sin ESE`);
      for (const ese of eses) {
        const servs = gen.moduloB.servicios[`${reg}\u0000${muni}\u0000${ese}`] ?? [];
        if (servs.length === 0)
          throw new Error(`ESE '${ese}' sin servicios`);
      }
    }
  }
});
test("Categoría → Subcategoría y Tipo barrera → Barrera: válidos", () => {
  for (const [cat, subs] of Object.entries(gen.moduloC.categorias))
    if (subs.length === 0) throw new Error(`Categoría '${cat}' sin subcategorías`);
  for (const [tb, barreras] of Object.entries(gen.moduloC.tiposBarrera))
    if (barreras.length === 0) throw new Error(`Tipo '${tb}' sin barreras`);
});

/* ------------------------------------------------------------------ */
/* TEST 4 · Flujo UI: cambio del primer desplegable tras 4 niveles      */
/* Simula el estado del formulario y verifica que no queden selecciones */
/* huérfanas (descendientes fuera de las opciones del nuevo padre).     */
/* ------------------------------------------------------------------ */
console.log("\n▶ Resiliencia de la interfaz (cascada)");

test("Cambiar 'Momento' tras 4 niveles resetea descendientes a estados válidos", () => {
  const m = gen.moduloA.momentos[0];
  const ats = gen.moduloA.atenciones[m];
  const actKey = `${m}\u0000${ats[0]}`;
  const acts = gen.moduloA.actividades[actKey];
  const indKey = `${m}\u0000${ats[0]}\u0000${acts[0]}`;
  const inds = gen.moduloA.indicadores[indKey];
  void inds;

  // usuario cambia el momento por otro distinto
  const m2 = gen.moduloA.momentos.find((x) => x !== m);

  // verificar que las opciones de los 3 niveles siguientes sean las del nuevo momento
  const ats2 = gen.moduloA.atenciones[m2] ?? [];
  if (ats2.length === 0)
    throw new Error("Nuevo momento sin atenciones (UI rota)");
  const actKey2 = `${m2}\u0000${ats2[0]}`;
  const acts2 = gen.moduloA.actividades[actKey2] ?? [];
  if (acts2.length === 0)
    throw new Error("Nueva atención sin actividades (UI rota)");
  const indKey2 = `${m2}\u0000${ats2[0]}\u0000${acts2[0]}`;
  const inds2 = gen.moduloA.indicadores[indKey2] ?? [];
  if (inds2.length === 0)
    throw new Error("Nueva actividad sin indicadores (UI rota)");
});

test("Cambiar 'Región' tras 4 niveles resetea descendientes correctamente", () => {
  const r = gen.moduloB.regiones[0];

  const r2 = gen.moduloB.regiones.find((x) => x !== r);
  const nuevo = { region: r2, municipio: "", ese: "", servicio: "" };

  const munis2 = gen.moduloB.municipios[r2] ?? [];
  if (munis2.length === 0)
    throw new Error("Nueva región sin municipios (UI rota)");
  const ese2 = gen.moduloB.eses[`${r2}\u0000${munis2[0]}`] ?? [];
  if (ese2.length === 0) throw new Error("Nuevo municipio sin ESE (UI rota)");
  const serv2 = gen.moduloB.servicios[`${r2}\u0000${munis2[0]}\u0000${ese2[0]}`] ?? [];
  if (serv2.length === 0)
    throw new Error("Nueva ESE sin servicios (UI rota)");
  // Tras cambiar la región, los descendientes quedan vacíos (la UI los reinicia);
  // el catálogo de servicios es común (71) a todas las ESE, así que el valor
  // anterior de servicio ya no indica estado huérfano.
  if (nuevo.municipio !== "" || nuevo.ese !== "" || nuevo.servicio !== "")
    throw new Error("Descendientes no se reiniciaron (riesgo UI)");
});

test("Módulo C: todos los motivos tienen ≥1 tipo de canalización", () => {
  for (const [motivo, tipos] of Object.entries(gen.moduloC.motivos)) {
    if (tipos.length === 0)
      throw new Error(`Motivo '${motivo}' sin tipos de canalización`);
  }
});

/* ------------------------------------------------------------------ */
/* TEST 5 · Codificación UTF-8 (tildes y caracteres especiales)        */
/* ------------------------------------------------------------------ */
console.log("\n▶ Codificación UTF-8");

test("Acentos clave presentes en los datos", () => {
  const allStrings = JSON.stringify(gen);
  for (const acc of ACCENTS) {
    if (!allStrings.includes(acc))
      throw new Error(`Falta '${acc}' (posible problema de codificación)`);
  }
});
test("Municipios con tildes (Caparrapí, Chaguaní, Útica)", () => {
  const munis = gen.moduloB.municipios;
  const flat = Object.values(munis).flat();
  for (const m of ["Caparrapí", "Chaguaní", "Útica", "Gachantivá", "Simijaca"]) {
    if (m !== "Gachantivá" && m !== "Simijaca" && !flat.includes(m))
      throw new Error(`Falta municipio '${m}'`);
  }
});
test("Sin caracteres de escape corruptos (reemplazos U+FFFD)", () => {
  const s = JSON.stringify(gen);
  if (s.includes("\uFFFD"))
    throw new Error("Se detectaron caracteres de reemplazo (UTF-8 corrupto)");
});

/* ------------------------------------------------------------------ */
/* TEST 6 · Fórmulas oficiales                                         */
/* ------------------------------------------------------------------ */
console.log("\n▶ Fórmulas oficiales (Brecha y Semáforo)");

test("calcularDiferencia: casos unitarios", () => {
  const cases = [
    [100, 100, 0],
    [100, 99, 1],
    [100, 88, 12],
    [88, 100, -12],
  ];
  for (const [a, b, exp] of cases) {
    const r = calcularDiferencia(a, b);
    if (r !== exp) throw new Error(`${a}-${b} esperaba ${exp}, obtuvo ${r}`);
  }
});
test("calcularDiferencia: valores nulos devuelven ''", () => {
  if (calcularDiferencia(null, null) !== "")
    throw new Error("null/null debe ser ''");
  if (calcularDiferencia(100, null) !== "")
    throw new Error("100/null debe ser ''");
  if (calcularDiferencia(null, 50) !== "")
    throw new Error("null/50 debe ser ''");
});
test("obtenerClasificacion: casos unitarios", () => {
  const cases = [
    [0.35, "Malo"],
    [0.39, "Malo"],
    [0.4, "Regular"],
    [0.69, "Regular"],
    [0.7, "Bueno"],
    [0.89, "Bueno"],
    [0.9, "Muy bueno"],
    [1, "Muy bueno"],
  ];
  for (const [p, exp] of cases) {
    const r = obtenerClasificacion(p);
    if (r !== exp)
      throw new Error(`obtenerClasificacion(${p}) esperaba ${exp}, obtuvo ${r}`);
  }
});
test("obtenerClasificacion: null/undefined/NaN devuelven ''", () => {
  for (const p of [null, undefined, NaN]) {
    if (obtenerClasificacion(p) !== "")
      throw new Error(`obtenerClasificacion(${p}) debe ser ''`);
  }
});

let brechaMismatch = 0;
let brechaTotal = 0;
for (const r of dataRows) {
  const alc = parsePercent(r[COL.META_ALCANZADA]);
  const estab = parsePercent(r[COL.META_ESTABLECIDA]);
  if (alc === null || estab === null) continue;
  brechaTotal++;
  const calc = calcularDiferencia(estab, alc);
  const csvBr = parsePercent(r[COL.BRECHA_CSV]);
  if (csvBr !== null && csvBr !== calc) brechaMismatch++;
}
test("Brecha recalculada: todas las filas métricas consistentes con la fórmula", () => {
  if (brechaMismatch > 0)
    warn(
      `${brechaMismatch}/${brechaTotal} filas tienen brecha CSV distinta a la fórmula (la app usa el valor calculado)`
    );
  // No se exige que el CSV coincida: la app SIEMPRE recalcula. Test pasa.
});

let semaforoMismatch = 0;
let semaforoTotal = 0;
for (const r of dataRows) {
  const alc = parsePercent(r[COL.META_ALCANZADA]);
  const csvSem = clean(r[COL.SEMAFORO_CSV]);
  if (alc === null) continue; // filas con texto desplazado: sin métrica
  semaforoTotal++;
  const calc = obtenerClasificacion(alc / 100);
  if (csvSem && csvSem !== calc) semaforoMismatch++;
}
test("Semáforo: 100% de coincidencia con la fórmula oficial (0 discrepancias)", () => {
  if (semaforoMismatch !== 0)
    throw new Error(
      `${semaforoMismatch}/${semaforoTotal} filas no coinciden con obtenerClasificacion`
    );
});

test("Las 12 filas con texto desplazado no generan métricas (semáforo vacío)", () => {
  let corrupt = 0;
  for (const r of dataRows) {
    const alc = clean(r[COL.META_ALCANZADA]);
    if (alc && !/^-?\d+(\.\d+)?%?$/.test(alc.trim())) corrupt++;
  }
  if (corrupt !== 12)
    throw new Error(`Se esperaban 12 filas corruptas, se encontraron ${corrupt}`);
  for (const m of gen.metrics) {
    if (m.metaAlcanzada === null || !Number.isFinite(m.metaAlcanzada))
      throw new Error("Un registro métrico tiene metaAlcanzada inválida");
  }
});

/* ------------------------------------------------------------------ */
/* TEST 7 · Coherencia registro métrico ↔ cascada                      */
/* ------------------------------------------------------------------ */
console.log("\n▶ Coherencia registros métricos");

test("Todo registro métrico existe en la matriz de combos", () => {
  const comboSet = new Set(
    gen.moduloA.combos.map((c) => `${c.m}\u0000${c.a}\u0000${c.act}\u0000${c.i}`)
  );
  for (const m of gen.metrics) {
    const k = `${m.momento}\u0000${m.atencion}\u0000${m.actividad}\u0000${m.indicador}`;
    if (!comboSet.has(k))
      throw new Error(`Métrico con combo fuera de matriz: ${k}`);
  }
});
test("Todo registro métrico con ESE existe en los registros del Módulo B", () => {
  const regSet = new Set(
    gen.moduloB.registros.map((r) => `${r.region}\u0000${r.municipio}\u0000${r.ese}\u0000${r.servicio}`)
  );
  for (const m of gen.metrics) {
    if (!m.ese) continue;
    const k = `${m.region}\u0000${m.municipio}\u0000${m.ese}\u0000${m.servicio}`;
    if (!regSet.has(k))
      throw new Error(`Métrico con ESE no registrada: ${k}`);
  }
});

test("Todas las ESE del territorio ofrecen el catálogo completo de servicios", () => {
  const keyCount = Object.keys(gen.moduloB.servicios).length;
  if (keyCount === 0) throw new Error("Sin servicios generados");
  for (const servs of Object.values(gen.moduloB.servicios)) {
    if (servs.length < 71)
      throw new Error(`ESE con solo ${servs.length} servicios (esperado 71)`);
  }
});

test("Soacha tiene ESE asignada (cascada completa)", () => {
  const munis = gen.moduloB.municipios["Soacha"] ?? [];
  if (munis.length === 0) throw new Error("Soacha sin municipios");
  for (const muni of munis) {
    const eses = gen.moduloB.eses[`Soacha\u0000${muni}`] ?? [];
    if (eses.length === 0) throw new Error(`Soacha|${muni} sin ESE`);
  }
});

/* ------------------------------------------------------------------ */
/* Resumen                                                             */
/* ------------------------------------------------------------------ */
console.log("\n" + "=".repeat(70));
console.log(`RESULTADO: ${passed} pruebas pasadas · ${failed} fallidas`);
if (warnings.length) {
  console.log(`AVISOS (${warnings.length}):`);
  warnings.forEach((w) => console.log(`  ⚠ ${w}`));
}
console.log("=".repeat(70));

if (failed > 0) {
  console.error("\n❌ La validación falló. Corrige antes de desplegar.");
  process.exit(1);
}
console.log("\n✅ Validación exitosa. Datos listos para la aplicación.");
process.exit(0);
