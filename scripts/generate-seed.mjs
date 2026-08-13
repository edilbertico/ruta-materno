/**
 * generate-seed.mjs
 * ---------------------------------------------------------------
 * Genera db/seed.sql (PostgreSQL / Supabase) a partir de
 * src/lib/data/generated-data.json.
 *
 * - Los IDs se asignan de forma determinística (mismo orden alfabético
 *   que usa generate-data.mjs) para que las claves foráneas siempre
 *   referencien filas ya insertadas.
 * - Registro métrico: brecha y semáforo NO se persisten porque se
 *   calculan SIEMPRE en la app (fuente de verdad = fórmulas).
 * ---------------------------------------------------------------
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const DATA_PATH = join(ROOT, "src", "lib", "data", "generated-data.json");
const OUT_DIR = join(ROOT, "db");
const OUT_PATH = join(OUT_DIR, "seed.sql");

const SEP = "\u0000";
const data = JSON.parse(readFileSync(DATA_PATH, "utf8"));

function sqlStr(v) {
  if (v === null || v === undefined) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlNum(v, fallback = null) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) {
    return fallback === null ? "NULL" : String(fallback);
  }
  return String(Number(v));
}

const lines = [];
lines.push("-- ============================================================================");
lines.push("-- SEED: Ruta Materna Perinatal");
lines.push("-- Generado por scripts/generate-seed.mjs a partir de generated-data.json");
lines.push("-- Fecha: " + new Date().toISOString());
lines.push("-- Ejecutar DESPUÉS de db/schema.sql (destino: Supabase / PostgreSQL 15+).");
lines.push("-- ============================================================================");
lines.push("");
lines.push("BEGIN;");

/* ------------------------------------------------------------------ */
/* MÓDULO B: región -> municipio -> ESE -> servicio                    */
/* ------------------------------------------------------------------ */
const regiones = data.moduloB.regiones;
const regionId = new Map();
regiones.forEach((nombre, idx) => regionId.set(nombre, idx + 1));
regiones.forEach((nombre, idx) => {
  lines.push(
    `INSERT INTO region_salud (id, nombre) VALUES (${idx + 1}, ${sqlStr(nombre)}) ON CONFLICT DO NOTHING;`
  );
});

const municipioId = new Map(); // region\u0000municipio -> id
const eseId = new Map(); // region\u0000municipio\u0000ese -> id
const servicioId = new Map(); // region\u0000municipio\u0000ese\u0000servicio -> id

let id = 1;
for (const [region, municipios] of Object.entries(data.moduloB.municipios)) {
  for (const municipio of municipios) {
    const rId = regionId.get(region);
    if (!rId) continue;
    municipioId.set(`${region}${SEP}${municipio}`, id);
    lines.push(
      `INSERT INTO municipio (id, region_id, nombre) VALUES (${id}, ${rId}, ${sqlStr(municipio)}) ON CONFLICT DO NOTHING;`
    );
    id++;
  }
}

for (const [keyRegion, eses] of Object.entries(data.moduloB.eses)) {
  const [region, municipio] = keyRegion.split(SEP);
  const mId = municipioId.get(`${region}${SEP}${municipio}`);
  if (!mId) continue;
  for (const ese of eses) {
    eseId.set(`${keyRegion}${SEP}${ese}`, id);
    lines.push(
      `INSERT INTO ese (id, municipio_id, nombre) VALUES (${id}, ${mId}, ${sqlStr(ese)}) ON CONFLICT DO NOTHING;`
    );
    id++;
  }
}

for (const [keyRM, servicios] of Object.entries(data.moduloB.servicios)) {
  const [region, municipio, ese] = keyRM.split(SEP);
  const eId = eseId.get(`${region}${SEP}${municipio}${SEP}${ese}`);
  if (!eId) continue;
  for (const servicio of servicios) {
    servicioId.set(`${keyRM}${SEP}${servicio}`, id);
    lines.push(
      `INSERT INTO servicio (id, ese_id, nombre) VALUES (${id}, ${eId}, ${sqlStr(servicio)}) ON CONFLICT DO NOTHING;`
    );
    id++;
  }
}

/* ------------------------------------------------------------------ */
/* MÓDULO A: momento -> atención -> actividad -> indicador             */
/* ------------------------------------------------------------------ */
const momentos = data.moduloA.momentos;
const momentoId = new Map();
momentos.forEach((nombre, idx) => momentoId.set(nombre, idx + 1));
momentos.forEach((nombre, idx) => {
  lines.push(
    `INSERT INTO momento_ruta (id, nombre) VALUES (${idx + 1}, ${sqlStr(nombre)}) ON CONFLICT DO NOTHING;`
  );
});

const atencionId = new Map(); // momento\u0000atencion -> id
const actividadId = new Map(); // momento\u0000atencion\u0000actividad -> id
const indicadorId = new Map(); // momento\u0000atencion\u0000actividad\u0000indicador -> id

for (const [momento, atenciones] of Object.entries(data.moduloA.atenciones)) {
  const mId = momentoId.get(momento);
  if (!mId) continue;
  for (const atencion of atenciones) {
    atencionId.set(`${momento}${SEP}${atencion}`, id);
    lines.push(
      `INSERT INTO atencion_clave (id, momento_id, nombre) VALUES (${id}, ${mId}, ${sqlStr(atencion)}) ON CONFLICT DO NOTHING;`
    );
    id++;
  }
}

for (const [keyMA, actividades] of Object.entries(data.moduloA.actividades)) {
  const [momento, atencion] = keyMA.split(SEP);
  const aId = atencionId.get(`${momento}${SEP}${atencion}`);
  if (!aId) continue;
  for (const actividad of actividades) {
    actividadId.set(`${keyMA}${SEP}${actividad}`, id);
    lines.push(
      `INSERT INTO actividad_esperada (id, atencion_id, nombre) VALUES (${id}, ${aId}, ${sqlStr(actividad)}) ON CONFLICT DO NOTHING;`
    );
    id++;
  }
}

for (const [keyMAA, indicadores] of Object.entries(data.moduloA.indicadores)) {
  const [momento, atencion, actividad] = keyMAA.split(SEP);
  const actId = actividadId.get(`${momento}${SEP}${atencion}${SEP}${actividad}`);
  if (!actId) continue;
  for (const indicador of indicadores) {
    indicadorId.set(`${keyMAA}${SEP}${indicador}`, id);
    lines.push(
      `INSERT INTO indicador_seguimiento (id, actividad_id, nombre) VALUES (${id}, ${actId}, ${sqlStr(indicador)}) ON CONFLICT DO NOTHING;`
    );
    id++;
  }
}

/* ------------------------------------------------------------------ */
/* Registros métricos (102 filas con meta alcanzada numérica)          */
/* - Brecha y semáforo se calculan en la app, NO se persisten.         */
/* - Las categorías de determinante del CSV no viajan en metrics: se   */
/*   persisten como NULL (el dato vive en moduloC).                    */
/* ------------------------------------------------------------------ */
const seen = new Set();
let metricRows = 0;
for (const m of data.metrics) {
  const sId = servicioId.get(`${m.region}${SEP}${m.municipio}${SEP}${m.ese}${SEP}${m.servicio}`);
  const iId = indicadorId.get(`${m.momento}${SEP}${m.atencion}${SEP}${m.actividad}${SEP}${m.indicador}`);
  if (!sId || !iId) continue;
  const dedupeKey = `${sId}\u0000${iId}`;
  if (seen.has(dedupeKey)) continue;
  seen.add(dedupeKey);

  lines.push(
    `INSERT INTO registro_metrico ` +
      `(id, servicio_id, indicador_id, meta_establecida, meta_alcanzada, ` +
      `categoria_determinante, subcategoria, tipo_barrera, barrera, ` +
      `tipo_determinante, determinante_relacionado, oportunidad_mejora, ` +
      `motivo_canalizacion, tipo_canalizacion) ` +
      `VALUES (${id}, ${sId}, ${iId}, ${sqlNum(m.metaEstablecida, 100)}, ` +
      `${sqlNum(m.metaAlcanzada)}, NULL, NULL, ${sqlStr(m.tipoBarrera)}, ` +
      `${sqlStr(m.barrera)}, ${sqlStr(m.tipoDeterminante)}, ` +
      `${sqlStr(m.determinanteRelacionado)}, ${sqlStr(m.oportunidadMejora)}, ` +
      `${sqlStr(m.motivoCanalizacion)}, ${sqlStr(m.tipoCanalizacion)}) ` +
      `ON CONFLICT DO NOTHING;`
  );
  metricRows++;
  id++;
}

lines.push("");
lines.push("COMMIT;");

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_PATH, lines.join("\n"), "utf8");

const counts = {
  regiones: regiones.length,
  municipios: municipioId.size,
  eses: eseId.size,
  servicios: servicioId.size,
  momentos: momentos.length,
  atenciones: atencionId.size,
  actividades: actividadId.size,
  indicadores: indicadorId.size,
  registrosMetricos: metricRows,
};
console.log("✅ Seed generado:", OUT_PATH);
console.log("   Conteos:", JSON.stringify(counts, null, 2));