import raw from "./data/generated-data.json";
import type {
  GeneratedData,
  MetricRecord,
  RutaCombo,
} from "@/lib/types";

const data = raw as GeneratedData;

export function getMomentos(): string[] {
  return data.moduloA.momentos;
}

export function getAtenciones(momento: string): string[] {
  return data.moduloA.atenciones[momento] ?? [];
}

export function getActividades(
  momento: string,
  atencion: string
): string[] {
  const key = `${momento}\u0000${atencion}`;
  return data.moduloA.actividades[key] ?? [];
}

export function getIndicadores(
  momento: string,
  atencion: string,
  actividad: string
): string[] {
  const key = `${momento}\u0000${atencion}\u0000${actividad}`;
  return data.moduloA.indicadores[key] ?? [];
}

export function getRegiones(): string[] {
  return data.moduloB.regiones;
}

export function getMunicipios(region: string): string[] {
  return data.moduloB.municipios[region] ?? [];
}

export function getESEs(region: string, municipio: string): string[] {
  const key = `${region}\u0000${municipio}`;
  return data.moduloB.eses[key] ?? [];
}

export function getServicios(
  region: string,
  municipio: string,
  ese: string
): string[] {
  const key = `${region}\u0000${municipio}\u0000${ese}`;
  return data.moduloB.servicios[key] ?? [];
}

export function getCategorias(): string[] {
  return Object.keys(data.moduloC.categorias);
}

export function getSubcategorias(categoria: string): string[] {
  return data.moduloC.categorias[categoria] ?? [];
}

export function getTiposBarrera(): string[] {
  return Object.keys(data.moduloC.tiposBarrera);
}

export function getBarreras(tipo: string): string[] {
  return data.moduloC.tiposBarrera[tipo] ?? [];
}

export function getMotivos(): string[] {
  return Object.keys(data.moduloC.motivos);
}

export function getTiposCanalizacion(motivo: string): string[] {
  return data.moduloC.motivos[motivo] ?? [];
}

/**
 * Busca el registro métrico del indicador seleccionado en el Módulo B
 * (momento, atención, actividad, indicador). El territorio del Módulo A es
 * SOLO identificación de quien responde (independiente de los indicadores),
 * por lo que se usa para preferir coincidencias exactas cuando existen, pero
 * NUNCA bloquea el resultado.
 */
export function findMetric(
  sel: {
    momento?: string;
    atencion?: string;
    actividad?: string;
    indicador?: string;
    region?: string;
    municipio?: string;
    ese?: string;
    servicio?: string;
  }
): MetricRecord | undefined {
  const { momento, atencion, actividad, indicador, region, municipio, ese, servicio } =
    sel;
  if (!momento || !atencion || !actividad || !indicador) return undefined;

  const pool = data.metrics.filter(
    (m) =>
      m.momento === momento &&
      m.atencion === atencion &&
      m.actividad === actividad &&
      m.indicador === indicador
  );
  if (pool.length === 0) return undefined;

  if (region && municipio && ese && servicio) {
    const exact = pool.find(
      (m) =>
        m.region === region &&
        m.municipio === municipio &&
        m.ese === ese &&
        m.servicio === servicio
    );
    if (exact) return exact;
  }
  if (region) {
    const byRegion = pool.find((m) => m.region === region);
    if (byRegion) return byRegion;
  }
  return pool[0];
}

/** Todos los registros métricos (para agregación/export). */
export function getAllMetrics(): MetricRecord[] {
  return data.metrics;
}

export function getAllCombos(): RutaCombo[] {
  return data.moduloA.combos;
}

/** Devuelve el `GeneratedData` completo (para el script de validación). */
export function getRawData(): GeneratedData {
  return data;
}
