-- ============================================================================
-- SCHEMA: Ruta Materna Perinatal (Supabase / PostgreSQL)
-- Aplicativo de consulta de determinantes, barreras y semáforo.
-- Compatible con PostgreSQL 15+ (Supabase).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Regiones en salud
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS region_salud (
  id           SERIAL PRIMARY KEY,
  nombre       TEXT NOT NULL UNIQUE
);

-- ----------------------------------------------------------------------------
-- 2) Municipios (dependen de la región)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS municipio (
  id             SERIAL PRIMARY KEY,
  region_id      INTEGER NOT NULL REFERENCES region_salud(id),
  nombre         TEXT NOT NULL,
  UNIQUE (region_id, nombre)
);

-- ----------------------------------------------------------------------------
-- 3) Prestadores ESE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ese (
  id          SERIAL PRIMARY KEY,
  municipio_id INTEGER NOT NULL REFERENCES municipio(id),
  nombre      TEXT NOT NULL,
  UNIQUE (municipio_id, nombre)
);

-- ----------------------------------------------------------------------------
-- 4) Servicios asistenciales (dependen del prestador)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicio (
  id      SERIAL PRIMARY KEY,
  ese_id  INTEGER NOT NULL REFERENCES ese(id),
  nombre  TEXT NOT NULL,
  UNIQUE (ese_id, nombre)
);

-- ----------------------------------------------------------------------------
-- 5) Matriz de la ruta: momentos, atenciones, actividades e indicadores
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS momento_ruta (
  id     SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS atencion_clave (
  id            SERIAL PRIMARY KEY,
  momento_id    INTEGER NOT NULL REFERENCES momento_ruta(id),
  nombre        TEXT NOT NULL,
  UNIQUE (momento_id, nombre)
);

CREATE TABLE IF NOT EXISTS actividad_esperada (
  id          SERIAL PRIMARY KEY,
  atencion_id INTEGER NOT NULL REFERENCES atencion_clave(id),
  nombre      TEXT NOT NULL,
  UNIQUE (atencion_id, nombre)
);

CREATE TABLE IF NOT EXISTS indicador_seguimiento (
  id           SERIAL PRIMARY KEY,
  actividad_id INTEGER NOT NULL REFERENCES actividad_esperada(id),
  nombre       TEXT NOT NULL,
  UNIQUE (actividad_id, nombre)
);

-- ----------------------------------------------------------------------------
-- 6) Registros métricos (semáforo, brecha, determinantes, barreras)
-- La brecha y el semáforo se calculan SIEMPRE en la app:
--   brecha  = meta_establecida - meta_alcanzada
--   semáforo = f(meta_alcanzada / 100)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registro_metrico (
  id                        SERIAL PRIMARY KEY,
  servicio_id               INTEGER NOT NULL REFERENCES servicio(id),
  indicador_id              INTEGER NOT NULL REFERENCES indicador_seguimiento(id),
  meta_establecida          NUMERIC(6,2) NOT NULL DEFAULT 100,
  meta_alcanzada            NUMERIC(6,2),
  categoria_determinante    TEXT,
  subcategoria              TEXT,
  tipo_barrera              TEXT,
  barrera                   TEXT,
  tipo_determinante         TEXT,
  determinante_relacionado  TEXT,
  oportunidad_mejora        TEXT,
  motivo_canalizacion       TEXT,
  tipo_canalizacion         TEXT,
  creado_en                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (servicio_id, indicador_id)
);

-- ----------------------------------------------------------------------------
-- Índices de búsqueda en cascada
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_servicio_ese        ON servicio(ese_id);
CREATE INDEX IF NOT EXISTS idx_ese_municipio       ON ese(municipio_id);
CREATE INDEX IF NOT EXISTS idx_municipio_region    ON municipio(region_id);
CREATE INDEX IF NOT EXISTS idx_atencion_momento    ON atencion_clave(momento_id);
CREATE INDEX IF NOT EXISTS idx_actividad_atencion  ON actividad_esperada(atencion_id);
CREATE INDEX IF NOT EXISTS idx_indicador_actividad ON indicador_seguimiento(actividad_id);
CREATE INDEX IF NOT EXISTS idx_metrico_servicio    ON registro_metrico(servicio_id);
CREATE INDEX IF NOT EXISTS idx_metrico_indicador   ON registro_metrico(indicador_id);

COMMIT;