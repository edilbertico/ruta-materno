# Ruta Materna Perinatal

Aplicativo web para consultar la **Ruta Integral de Atención en Salud (RIAS) Materna y Perinatal** del departamento de Cundinamarca: determinantes, barreras de acceso, canalizaciones y semáforo de metas alcanzadas.

Los datos provienen de la `LISTA MAESTRA DETERMINANATES Ruta Materna Perinatal - Hoja 1 (1).csv` (determinantes, ruta y metas), del anexo `Remisión y referencia oportuna - Hoja 1.csv` (momento de la ruta con 3 atenciones y 3 indicadores) y del maestro `REGION MUNICIPIO ESE - Hoja 1 (3).csv` (14 regiones, 117 municipios y 122 ESEs). Todo se normaliza a un JSON embebido (sin backend requerido).

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4** con **shadcn/ui** (Base UI)
- **lucide-react** (iconos)
- Datos cargados desde `src/lib/data/generated-data.json`

## Funcionalidad

- **Módulo A · Territorial**: cascada `Región en Salud → Municipio → Prestador ESE → Servicio` para **identificar quién responde** (independiente de los indicadores; catálogo de **71 servicios** para cada ESE).
- **Módulo B · Ruta**: cascada `Momento → Atención clave → Actividad esperada → Indicador de seguimiento` (`17` momentos, `655` combos, incluye el momento *Remisión y referencia oportuna* del anexo).
- **Módulo C · Determinantes**: cascadas interactivas de `Categoría → Subcategoría`, `Tipo de barrera → Barrera`, y `Motivo → Tipo de canalización`.
- **Tarjeta de resultados**: muestra el **prestador que responde** (Módulo A), el semáforo, meta establecida, meta alcanzada y **brecha** (Malo < 40 %, Regular < 70 %, Bueno < 90 %, Muy bueno ≥ 90 %). Incluye botones **Restablecer** y **Exportar JSON**.
- El panel se activa al completar los **4 niveles del Módulo B (ruta)**; el territorio (A) solo identifica al prestador y **no bloquea** las métricas: si no hay coincidencia territorial exacta se muestra la métrica departamental del indicador.

> Nota: 12 filas del CSV tienen la meta alcanzada desplazada de columna (texto). Se excluyen de las métricas pero se conservan intactas en la matriz. El semáforo y la brecha **siempre se recalculan** con las fórmulas oficiales definidas en `src/lib/calcularDiferencia.ts` y `src/lib/semaforo.ts`.

## Scripts

```bash
npm install        # instala dependencias
npm run dev        # servidor de desarrollo → http://localhost:3000
npm run build      # build de producción (Next.js 16 + Turbopack)
npm run start      # sirve el build
npm run lint       # ESLint
```

### Datos y QA

```bash
npm run generate:data    # CSV → src/lib/data/generated-data.json (+ data-counts.json)
npm run generate:seed    # generated-data.json → db/seed.sql (opcional, Supabase)
npm run validate         # QA integral (44 validaciones) — revisar CI
```

`npm run validate` verifica: conteos esperados, opciones sin vacíos/duplicados/null por contexto, integridad del 100 % de las cascadas, casos unitarios de ambas fórmulas, consistencia del semáforo, codificación UTF-8 (acentos) y que las filas corruptas no generen métricas.

## Base de datos (opcional — Supabase / PostgreSQL)

La app funciona **sin base de datos**. Si además quieres la capa SQL:

1. `npm run generate:data` y `npm run generate:seed`.
2. En Supabase: **SQL Editor** → pegar y ejecutar `db/schema.sql`.
3. Ejecutar `db/seed.sql` después.
4. Copiar `.env.example` → `.env.local` y completar si se conecta una API.

## Despliegue

### 1. GitHub

```bash
git init
git add -A
git commit -m "Primera versión Ruta Materna Perinatal"
git branch -M main
git remote add origin https://github.com/<TU_USUARIO>/ruta-materna-perinatal.git
git push -u origin main
```

> Alternativa simplificada: crea el repositorio vacío en GitHub.com y sigue sus instrucciones de "…or push an existing repository". **No** publiques el CSV fuente con datos institucionales si fuera sensible; si se añade, usar soporte de Git LFS.

### 2. Vercel

1. Ve a https://vercel.com/import y conecta tu cuenta con GitHub.
2. Importa el repositorio `ruta-materna-perinatal`.
3. Framework preset: **Next.js** (detectado automáticamente).
4. Build command: `npm run build` · Output: `(.next)`.
5. Haz clic en **Deploy**. El proyecto ya precompila los datos en build (no requiere variables de entorno ni base de datos).

Para despliegues posteriores, Vercel se enlaza al branch `main` y despliega en cada push.

## Estructura

```
scripts/
  generate-data.mjs     Parser CSV (RFC 4180 por posición) → JSON
  generate-seed.mjs     JSON → db/seed.sql (IDs determinísticos)
  validate-data.mjs     QA integral de datos y fórmulas
src/
  app/                  Página principal (cliente) + layout
  components/           Módulos A/B/C, tarjeta de resultados, badges
  lib/
    data/               generated-data.json + data-counts.json
    types.ts            Tipos de datos normalizados
    data.ts             Acceso a datos + consulta de métricas
    cascade.ts          Helpers de opciones en cascada
    semaforo.ts         Fórmula oficial del semáforo + colores
    calcularDiferencia.ts  Fórmula oficial de la brecha
db/
  schema.sql            Schema PostgreSQL/Supabase
  seed.sql              Datos (generado)
```