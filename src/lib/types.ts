export interface MetricRecord {
  region: string;
  municipio: string;
  ese: string;
  servicio: string;
  momento: string;
  atencion: string;
  actividad: string;
  indicador: string;
  metaEstablecida: number | null;
  metaAlcanzada: number | null;
  brecha: number | "";
  semaforo: string;
  tipoBarrera: string;
  barrera: string;
  tipoDeterminante: string;
  determinanteRelacionado: string;
  oportunidadMejora: string;
  motivoCanalizacion: string;
  tipoCanalizacion: string;
}

export interface RutaCombo {
  m: string;
  a: string;
  act: string;
  i: string;
}

export interface GeneratedData {
  _meta: {
    source: string;
    generatedAt: string;
    rowsPhysical: number;
    rowsWithData: number;
    metrics: number;
  };
  moduloA: {
    momentos: string[];
    atenciones: Record<string, string[]>;
    actividades: Record<string, string[]>;
    indicadores: Record<string, string[]>;
    combos: RutaCombo[];
  };
  moduloB: {
    regiones: string[];
    municipios: Record<string, string[]>;
    eses: Record<string, string[]>;
    servicios: Record<string, string[]>;
    registros: { region: string; municipio: string; ese: string; servicio: string }[];
  };
  moduloC: {
    categorias: Record<string, string[]>;
    tiposBarrera: Record<string, string[]>;
    motivos: Record<string, string[]>;
    tipoDeterminante: string[];
    determinantesRelacionados: string[];
  };
  metrics: MetricRecord[];
}
