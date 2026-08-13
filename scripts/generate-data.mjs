/**
 * generate-data.mjs
 * ---------------------------------------------------------------
 * Normaliza el CSV fuente "LISTA MAESTRA DETERMINANATES Ruta Materna
 * Perinatal - Hoja 1 (1).csv" a un JSON optimizado y tipado en
 * src/lib/data/generated-data.json (luego consumido por lib/data.ts).
 *
 * El CSV tiene cabeceras duplicadas ("Relación con el problema trazador"),
 * filas de encabezado intercaladas y campos multilínea, por lo que se
 * parsea por POSICIÓN de columna (RFC 4180) en lugar de por nombre.
 * ---------------------------------------------------------------
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const CSV_PATH = join(
  ROOT,
  "LISTA MAESTRA DETERMINANATES Ruta Materna Perinatal - Hoja 1 (1).csv"
);
const ANNEX_PATH = join(ROOT, "Remisión y referencia oportuna - Hoja 1.csv");
const MASTER_TERRITORY_PATH = join(
  ROOT,
  "REGION MUNICIPIO ESE - Hoja 1 (3).csv"
);
const OUT_DIR = join(ROOT, "src", "lib", "data");
const OUT_PATH = join(OUT_DIR, "generated-data.json");
const COUNTS_PATH = join(OUT_DIR, "data-counts.json");

/**
 * Catálogo canónico de servicios asistenciales (71), proporcionado por el
 * equipo. Se asigna COMPLETO a cada ESE: el campo de servicio es parte de la
 * identificación de quien responde (independiente de los indicadores).
 */
const SERVICIOS_CANONICOS = [
  "Anestesiología", "Atención Domiciliaria", "Banco de Sangre",
  "Cardiología", "Central de Mezclas", "Cirugía Cardiovascular",
  "Cirugía General", "Cirugía Maxilofacial", "Cirugía Pediátrica",
  "Cirugía Plástica", "Consulta Externa", "Dermatología",
  "Ecocardiografía", "Ecografía", "Electrocardiografía",
  "Endocrinología", "Endoscopia Digestiva", "Farmacia Hospitalaria",
  "Fonoaudiología", "Gastroenterología", "Gestión de Calidad",
  "Ginecología", "Hematología", "Hemodiálisis", "Hemodinamia",
  "Hospitalización", "Imágenes Diagnósticas", "Laboratorio Clínico",
  "Medicina Física y Rehabilitación", "Medicina Interna",
  "Medicina Nuclear", "Medicina Preventiva", "Medicina Transfusional",
  "Nefrología", "Neonatología", "Neumología", "Neurocirugía",
  "Neurología", "Nutrición y Dietética", "Obstetricia",
  "Odontología Hospitalaria", "Oftalmología", "Oncología Clínica",
  "Ortopedia y Traumatología", "Otorrinolaringología", "Patología",
  "Pediatría", "Psicología", "Psiquiatría", "Quimioterapia",
  "Quirófanos", "Radiología", "Radioterapia",
  "Recuperación Postanestésica", "Rehabilitación Integral",
  "Resonancia Magnética (RM)", "Reumatología", "Sala de Observación",
  "Sala de Partos", "Seguridad del Paciente", "Telemedicina",
  "Terapia Ocupacional", "Terapia Respiratoria",
  "Tomografía Computarizada (TAC)", "Unidad Coronaria",
  "Unidad de Cuidados Intensivos (UCI) Adultos",
  "Unidad de Cuidados Intensivos Neonatal",
  "Unidad de Cuidados Intensivos Pediátrica",
  "Unidad de Cuidados Intermedios", "Unidad de Quemados",
  "Unidad de Trasplantes",
];

/* ------------------------------------------------------------------ */
/* Columnas (índice 0-based) — definidas contra la fila 0 del CSV      */
/* ------------------------------------------------------------------ */
const COL = {
  REGION: 2, // Región en Salud
  MUNICIPIO: 4,
  ESE: 5, // NOMBRE DEL PRESTADOR - ESE
  SERVICIO: 6, // Servicios
  CATEGORIA_DETERMINANTE: 12, // Categoría del determinante
  SUBCATEGORIA: 13, // Subcategoría
  MOTIVO_CANALIZACION: 30, // Motivo de canalización
  TIPO_CANALIZACION: 31, // Tipo de Canalización (Receptor) *
  MOMENTO: 35, // Momento de la ruta
  ATENCION: 36, // Atención clave
  ACTIVIDAD: 37, // Actividad esperada
  INDICADOR: 38, // Indicador de seguimiento
  META_ESTABLECIDA: 39,
  META_ALCANZADA: 40,
  BRECHA_CSV: 41,
  SEMAFORO_CSV: 42,
  TIPO_BARRERA: 46, // Tipo de Barrera
  BARRERA: 47, // Barrera de acceso o continuidad
  TIPO_DETERMINANTE: 48, // Tipo de determinante
  DETERMINANTE_RELACIONADO: 49,
  OPORTUNIDAD_MEJORA: 52, // Oportunidad de mejora (Propongo...)
};

/* ------------------------------------------------------------------ */
/* Parser CSV RFC 4180 (soporta comillas, comillas dobles y saltos)    */
/* ------------------------------------------------------------------ */
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
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
      } else if (c === "\r") {
        // saltar CR
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function clean(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/* ------------------------------------------------------------------ */
/* Utilidades de cálculo (idénticas a las fórmulas del Excel)          */
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
/* Carga + filtra filas de encabezado intercaladas                      */
/* ------------------------------------------------------------------ */
const rawText = readFileSync(CSV_PATH, "utf8");
const allRows = parseCSV(rawText);

// La fila 0 es la cabecera (contiene el texto "Momento de la ruta", etc.).
// Se descarta para no tratarla como registro de datos.
const dataRows = allRows
  .slice(1)
  .filter((r) => r.length > COL.MOMENTO && clean(r[COL.MOMENTO]) !== "");

// Anexo: "Remisión y referencia oportuna - Hoja 1.csv"
// Columnas: Momento de la ruta(0), Atención clave(1), Actividad esperada(2),
// Indicador de seguimiento(3). Aporta el momento "Remisión y referencia
// oportuna" con su cascada de ruta (sin métricas ni territorio).
const annexRows = parseCSV(readFileSync(ANNEX_PATH, "utf8"))
  .slice(1)
  .filter((r) => r.length >= 4 && clean(r[0]) !== "");

// Master territorial: "REGION MUNICIPIO ESE - Hoja 1 (3).csv"
// Columnas: Región Salud(0), Municipio(1), NOMBRE DEL PRESTADOR - ESE(2).
// Define las 14 regiones en salud con su municipio y ESE asignada.
const territorioRows = parseCSV(readFileSync(MASTER_TERRITORY_PATH, "utf8"))
  .slice(1)
  .filter((r) => r.length >= 3 && clean(r[0]) !== "");

/* ------------------------------------------------------------------ */
/* MÓDULO A: cascada Momento -> Atención -> Actividad -> Indicador     */
/* ------------------------------------------------------------------ */
const momentosSet = new Map(); // key -> nombre
const atencionesMap = new Map(); // "momento" -> Set(atencion)
const actividadesMap = new Map(); // "momento|atencion" -> Set(actividad)
const indicadoresMap = new Map(); // "momento|atencion|actividad" -> Set(indicador)
const matrixCombos = new Map(); // key -> {m,a,act,i}

function keyMomento(m) {
  return m;
}
function keyAtencion(m, a) {
  return `${m}\u0000${a}`;
}
function keyActividad(m, a, act) {
  return `${m}\u0000${a}\u0000${act}`;
}

for (const r of dataRows) {
  const m = clean(r[COL.MOMENTO]);
  const a = clean(r[COL.ATENCION]);
  const act = clean(r[COL.ACTIVIDAD]);
  const i = clean(r[COL.INDICADOR]);
  if (m) momentosSet.set(m, m);
  if (m && a) {
    if (!atencionesMap.has(keyMomento(m)))
      atencionesMap.set(keyMomento(m), new Set());
    atencionesMap.get(keyMomento(m)).add(a);
  }
  if (m && a && act) {
    const k = keyAtencion(m, a);
    if (!actividadesMap.has(k)) actividadesMap.set(k, new Set());
    actividadesMap.get(k).add(act);
  }
  if (m && a && act && i) {
    const k = keyActividad(m, a, act);
    if (!indicadoresMap.has(k)) indicadoresMap.set(k, new Set());
    indicadoresMap.get(k).add(i);
    const ck = `${m}\u0000${a}\u0000${act}\u0000${i}`;
    matrixCombos.set(ck, { m, a, act, i });
  }
}

// Combos del anexo "Remisión y referencia oportuna" (momentos de la ruta)
for (const r of annexRows) {
  const m = clean(r[0]);
  const a = clean(r[1]);
  const act = clean(r[2]);
  const i = clean(r[3]);
  if (m) momentosSet.set(m, m);
  if (m && a) {
    if (!atencionesMap.has(keyMomento(m)))
      atencionesMap.set(keyMomento(m), new Set());
    atencionesMap.get(keyMomento(m)).add(a);
  }
  if (m && a && act) {
    const k = keyAtencion(m, a);
    if (!actividadesMap.has(k)) actividadesMap.set(k, new Set());
    actividadesMap.get(k).add(act);
  }
  if (m && a && act && i) {
    const k = keyActividad(m, a, act);
    if (!indicadoresMap.has(k)) indicadoresMap.set(k, new Set());
    indicadoresMap.get(k).add(i);
    const ck = `${m}\u0000${a}\u0000${act}\u0000${i}`;
    matrixCombos.set(ck, { m, a, act, i });
  }
}

/* ------------------------------------------------------------------ */
/* MÓDULO B: cascada Región -> Municipio -> ESE -> Servicio            */
/* El territorio maestro (14 regiones) viene de REGION MUNICIPIO ESE    */
/* - Hoja 1 (3).csv. Cada ESE ofrece el catálogo completo de servicios. */
/* ------------------------------------------------------------------ */
const regionesSet = new Map();
const municipiosMap = new Map(); // region -> Set(municipio)
const esesMap = new Map(); // region|municipio -> Set(ese)
const serviciosMap = new Map(); // region|municipio|ese -> Set(servicio)
const esesRecordSet = new Map(); // key completo -> registro

for (const r of territorioRows) {
  const region = clean(r[0]);
  const municipio = clean(r[1]);
  const ese = clean(r[2]);
  if (!region) continue;
  regionesSet.set(region, region);
  if (municipio) {
    if (!municipiosMap.has(region)) municipiosMap.set(region, new Set());
    municipiosMap.get(region).add(municipio);
  }
  if (municipio && ese) {
    const k = `${region}\u0000${municipio}`;
    if (!esesMap.has(k)) esesMap.set(k, new Set());
    esesMap.get(k).add(ese);
    const sk = `${region}\u0000${municipio}\u0000${ese}`;
    if (!serviciosMap.has(sk)) serviciosMap.set(sk, new Set(SERVICIOS_CANONICOS));
  }
}

for (const [key, servicios] of serviciosMap) {
  const [region, municipio, ese] = key.split("\u0000");
  for (const servicio of servicios) {
    esesRecordSet.set(`${key}\u0000${servicio}`, {
      region,
      municipio,
      ese,
      servicio,
    });
  }
}

/* ------------------------------------------------------------------ */
/* MÓDULO C: cascadas de determinantes / barreras / canalización       */
/* ------------------------------------------------------------------ */
const categoriasMap = new Map(); // categoria -> Set(subcategoria)
const tiposBarreraMap = new Map(); // tipo -> Set(barrera)
const motivosMap = new Map(); // motivo -> Set(tipo canalizacion)
const tipoDeterminanteSet = new Map();
const determinanteSet = new Map();

for (const r of dataRows) {
  const cat = clean(r[COL.CATEGORIA_DETERMINANTE]);
  const sub = clean(r[COL.SUBCATEGORIA]);
  if (cat && sub) {
    if (!categoriasMap.has(cat)) categoriasMap.set(cat, new Set());
    categoriasMap.get(cat).add(sub);
  }
  const tb = clean(r[COL.TIPO_BARRERA]);
  const ba = clean(r[COL.BARRERA]);
  if (tb && ba) {
    if (!tiposBarreraMap.has(tb)) tiposBarreraMap.set(tb, new Set());
    tiposBarreraMap.get(tb).add(ba);
  }
  const motivo = clean(r[COL.MOTIVO_CANALIZACION]);
  const tc = clean(r[COL.TIPO_CANALIZACION]);
  if (motivo && tc && motivo !== "Nomal") {
    if (!motivosMap.has(motivo)) motivosMap.set(motivo, new Set());
    motivosMap.get(motivo).add(tc);
  }
  const td = clean(r[COL.TIPO_DETERMINANTE]);
  if (td) tipoDeterminanteSet.set(td, td);
  const det = clean(r[COL.DETERMINANTE_RELACIONADO]);
  if (det) determinanteSet.set(det, det);
}

/* ------------------------------------------------------------------ */
/* REGISTROS MÉTRICOS (solo filas con meta alcanzada numérica)         */
/* Se recalcula brecha (calcularDiferencia) y semáforo                 */
/* (obtenerClasificacion) — fuente de verdad = fórmulas, no CSV.       */
/* ------------------------------------------------------------------ */
const metrics = [];
for (const r of dataRows) {
  const alc = parsePercent(r[COL.META_ALCANZADA]);
  if (alc === null) continue; // excluye 12 filas con texto desplazado
  const estab = parsePercent(r[COL.META_ESTABLECIDA]);
  const brecha = calcularDiferencia(estab, alc);
  const semaforo = obtenerClasificacion(alc / 100);
  metrics.push({
    region: clean(r[COL.REGION]),
    municipio: clean(r[COL.MUNICIPIO]),
    ese: clean(r[COL.ESE]),
    servicio: clean(r[COL.SERVICIO]),
    momento: clean(r[COL.MOMENTO]),
    atencion: clean(r[COL.ATENCION]),
    actividad: clean(r[COL.ACTIVIDAD]),
    indicador: clean(r[COL.INDICADOR]),
    metaEstablecida: estab,
    metaAlcanzada: alc,
    brecha,
    semaforo,
    tipoBarrera: clean(r[COL.TIPO_BARRERA]),
    barrera: clean(r[COL.BARRERA]),
    tipoDeterminante: clean(r[COL.TIPO_DETERMINANTE]),
    determinanteRelacionado: clean(r[COL.DETERMINANTE_RELACIONADO]),
    oportunidadMejora: clean(r[COL.OPORTUNIDAD_MEJORA]),
    motivoCanalizacion: clean(r[COL.MOTIVO_CANALIZACION]),
    tipoCanalizacion: clean(r[COL.TIPO_CANALIZACION]),
  });
}

/* ------------------------------------------------------------------ */
/* Serialización determinística (orden alfabético)                     */
/* ------------------------------------------------------------------ */
function toSortedArray(mapOrSet) {
  if (mapOrSet instanceof Map) {
    return [...mapOrSet.keys()].sort((a, b) => a.localeCompare(b, "es"));
  }
  return [...mapOrSet].sort((a, b) => a.localeCompare(b, "es"));
}

const output = {
  _meta: {
    source: basename(CSV_PATH),
    generatedAt: new Date().toISOString(),
    rowsPhysical: allRows.length,
    rowsWithData: dataRows.length,
    metrics: metrics.length,
  },
  moduloA: {
    momentos: toSortedArray(momentosSet),
    atenciones: Object.fromEntries(
      [...atencionesMap.entries()]
        .sort()
        .map(([k, v]) => [k, toSortedArray(v)])
    ),
    actividades: Object.fromEntries(
      [...actividadesMap.entries()]
        .sort()
        .map(([k, v]) => [k, toSortedArray(v)])
    ),
    indicadores: Object.fromEntries(
      [...indicadoresMap.entries()]
        .sort()
        .map(([k, v]) => [k, toSortedArray(v)])
    ),
    combos: [...matrixCombos.values()],
  },
  moduloB: {
    regiones: toSortedArray(regionesSet),
    municipios: Object.fromEntries(
      [...municipiosMap.entries()]
        .sort()
        .map(([k, v]) => [k, toSortedArray(v)])
    ),
    eses: Object.fromEntries(
      [...esesMap.entries()].sort().map(([k, v]) => [k, toSortedArray(v)])
    ),
    servicios: Object.fromEntries(
      [...serviciosMap.entries()]
        .sort()
        .map(([k, v]) => [k, toSortedArray(v)])
    ),
    registros: [...esesRecordSet.values()],
  },
  moduloC: {
    categorias: Object.fromEntries(
      [...categoriasMap.entries()]
        .sort()
        .map(([k, v]) => [k, toSortedArray(v)])
    ),
    tiposBarrera: Object.fromEntries(
      [...tiposBarreraMap.entries()]
        .sort()
        .map(([k, v]) => [k, toSortedArray(v)])
    ),
    motivos: Object.fromEntries(
      [...motivosMap.entries()].sort().map(([k, v]) => [k, toSortedArray(v)])
    ),
    tipoDeterminante: toSortedArray(tipoDeterminanteSet),
    determinantesRelacionados: toSortedArray(determinanteSet),
  },
  metrics,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(output, null, 0), "utf8");

const counts = {
  momentos: output.moduloA.momentos.length,
  atenciones: Object.keys(output.moduloA.atenciones).length,
  actividades: Object.keys(output.moduloA.actividades).length,
  indicadores: Object.keys(output.moduloA.indicadores).length,
  combos: output.moduloA.combos.length,
  regiones: output.moduloB.regiones.length,
  municipios: output.moduloB.municipios.length,
  eses: Object.keys(output.moduloB.eses).length,
  servicios: Object.keys(output.moduloB.servicios).length,
  registrosESE: output.moduloB.registros.length,
  categorias: Object.keys(output.moduloC.categorias).length,
  tiposBarrera: Object.keys(output.moduloC.tiposBarrera).length,
  motivos: Object.keys(output.moduloC.motivos).length,
  metrics: output.metrics.length,
};
writeFileSync(COUNTS_PATH, JSON.stringify(counts, null, 2), "utf8");

console.log("✅ Datos generados:", OUT_PATH);
console.log("   Conteos:", JSON.stringify(counts, null, 2));
