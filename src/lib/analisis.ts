/**
 * Análisis narrativo y exportación a PDF de una consulta de la
 * Ruta Materna Perinatal. El análisis se construye siempre con los
 * datos disponibles; el PDF incluye TODA la información de la consulta
 * (Módulos A, B y C) además del resultado y el análisis.
 */
import { SEMAFORO_META } from "@/lib/semaforo";
import { calcularDiferencia } from "@/lib/calcularDiferencia";
import type { MetricRecord } from "@/lib/types";

export interface ConsultaA {
  region: string;
  municipio: string;
  ese: string;
  servicio: string;
}

export interface ConsultaB {
  momento: string;
  atencion: string;
  actividad: string;
  indicador: string;
}

export interface ConsultaC {
  categoria: string;
  subcategoria: string;
  tipoBarrera: string;
  barrera: string;
  motivo: string;
  tipoCanalizacion: string;
}

export interface ConsultaD {
  fecha: string;
  problemaTrazador: string;
  fuenteInformacion: string;
  responsable: string;
}

export interface AnalisisContexto {
  record?: MetricRecord;
  a?: ConsultaA;
  b?: ConsultaB;
  c?: ConsultaC;
  d?: ConsultaD;
  rutaCompleta: boolean;
}

export interface SeccionAnalisis {
  titulo: string;
  parrafos: string[];
}

const VACIA: ConsultaA = {
  region: "",
  municipio: "",
  ese: "",
  servicio: "",
};
const VACIA_C: ConsultaC = {
  categoria: "",
  subcategoria: "",
  tipoBarrera: "",
  barrera: "",
  motivo: "",
  tipoCanalizacion: "",
};

function o(v?: string): string {
  return v?.trim() ? v : "-";
}

function recomendar(semaforo: string): string {
  switch (semaforo) {
    case "Muy bueno":
      return "Se recomienda mantener las acciones actuales y continuar con el seguimiento periódico para sostener el cumplimiento alcanzado.";
    case "Bueno":
      return "Se recomienda reforzar las estrategias para cerrar la brecha restante y consolidar la meta en el próximo periodo de seguimiento.";
    case "Regular":
      return "Se recomienda priorizar acciones correctivas, revisar las barreras de acceso registradas y ajustar el plan de intervención de la ESE.";
    case "Malo":
      return "Se recomienda intervención inmediata: revisar el cumplimiento, activar la canalización oportuna y hacer seguimiento de forma periódica.";
    default:
      return "El indicador no presenta clasificación de semáforo en la lista maestra; verifique la fuente del dato antes de tomar decisiones.";
  }
}

export function brechaDe(record?: MetricRecord): number | "" {
  if (!record) return "";
  return calcularDiferencia(record.metaEstablecida, record.metaAlcanzada);
}

/**
 * Construye el análisis narrativo. Siempre devuelve al menos el contexto
 * de la consulta y las selecciones del Módulo C, más el resultado cuando
 * existe registro métrico.
 */
export function buildAnalisis(ctx: AnalisisContexto): SeccionAnalisis[] {
  const { record, a = VACIA, b, c = VACIA_C, rutaCompleta } = ctx;
  const secciones: SeccionAnalisis[] = [];

  const contexto: string[] = [];
  if (b?.momento) {
    contexto.push(
      `La consulta corresponde a la ruta ${b.momento} → ${o(b.atencion)} → ${o(b.actividad)}, con el indicador de seguimiento «${o(b.indicador)}».`
    );
  } else {
    contexto.push(
      "Aún no se ha seleccionado un indicador en el Módulo B (ruta)."
    );
  }
  if (a.servicio) {
    contexto.push(
      `El prestador que responde es ${a.ese} (${a.region}, ${o(a.municipio)}), en el servicio asistencial ${a.servicio}.`
    );
  } else if (a.region) {
    contexto.push(
      "La identificación del prestador (Módulo A) está incompleta: complete Región, Municipio, ESE y Servicio."
    );
  } else {
    contexto.push(
      "La identificación de quién responde (Módulo A) aún no se ha completado; es independiente de las métricas del indicador."
    );
  }
  secciones.push({ titulo: "Contexto de la consulta", parrafos: contexto });

  if (record) {
    const semaforo =
      SEMAFORO_META[record.semaforo]?.label ?? o(record.semaforo);
    const brecha = brechaDe(record);
    const parrafos: string[] = [
      `El indicador alcanzó ${o(String(record.metaAlcanzada))}% de la meta establecida (${o(String(record.metaEstablecida))}%).${
        brecha === ""
          ? ""
          : ` La brecha pendiente es de ${brecha} puntos porcentuales.`
      }`,
      `El semáforo del indicador es «${semaforo}», clasificación obtenida con la fórmula oficial en la aplicación.`,
      recomendar(record.semaforo),
    ];
    if (record.tipoDeterminante || record.determinanteRelacionado) {
      parrafos.push(
        `Determinante social relacionado: ${o(record.tipoDeterminante)} — ${o(record.determinanteRelacionado)}.`
      );
    }
    if (record.tipoBarrera || record.barrera) {
      parrafos.push(
        `Barrera de acceso o continuidad identificada: ${o(record.tipoBarrera)} — ${o(record.barrera)}.`
      );
    }
    if (record.oportunidadMejora) {
      parrafos.push(`Oportunidad de mejora: ${record.oportunidadMejora}.`);
    }
    if (record.motivoCanalizacion || record.tipoCanalizacion) {
      parrafos.push(
        `Canalización recomendada por motivo «${o(record.motivoCanalizacion)}», con tipo de receptor «${o(record.tipoCanalizacion)}».`
      );
    }
    secciones.push({
      titulo: "Resultado del indicador y semáforo",
      parrafos,
    });
  } else if (rutaCompleta) {
    secciones.push({
      titulo: "Registro métrico no disponible",
      parrafos: [
        "Este indicador no cuenta con registro métrico (meta o semáforo) en la lista maestra. Puede usar el Módulo C para explorar determinantes, barreras y canalizaciones asociadas.",
      ],
    });
  } else {
    secciones.push({
      titulo: "Pendiente por completar",
      parrafos: [
        "Complete los 4 niveles del Módulo B (momento, atención, actividad e indicador) para habilitar el resultado del indicador. El Módulo A solo identifica quién responde.",
      ],
    });
  }

  const seleccionC: string[] = [];
  if (c.categoria) {
    seleccionC.push(`Categoría de determinante: ${c.categoria}${c.subcategoria ? ` → ${c.subcategoria}` : ""}.`);
  }
  if (c.tipoBarrera) {
    seleccionC.push(`Tipo de barrera: ${c.tipoBarrera}${c.barrera ? ` → ${c.barrera}` : ""}.`);
  }
  if (c.motivo) {
    seleccionC.push(`Motivo de canalización: ${c.motivo}${c.tipoCanalizacion ? ` → receptor ${c.tipoCanalizacion}` : ""}.`);
  }
  if (seleccionC.length > 0) {
    seleccionC.push(
      "Estas selecciones del Módulo C complementan el contexto de la consulta para fines de análisis y canalización."
    );
    secciones.push({
      titulo: "Determinantes y canalización consultados (Módulo C)",
      parrafos: seleccionC,
    });
  }

  return secciones;
}

/* ------------------------------------------------------------------ */
/* Exportación a PDF                                                   */
/* ------------------------------------------------------------------ */

interface Fila {
  rotulo: string;
  valor: string;
}

function filasConsultaA(a: ConsultaA): Fila[] {
  return [
    { rotulo: "Región en Salud", valor: o(a.region) },
    { rotulo: "Municipio", valor: o(a.municipio) },
    { rotulo: "Nombre del Prestador - ESE", valor: o(a.ese) },
    { rotulo: "Servicio asistencial", valor: o(a.servicio) },
  ];
}

function filasConsultaB(b: ConsultaB | undefined): Fila[] {
  return [
    { rotulo: "Momento de la ruta", valor: o(b?.momento) },
    { rotulo: "Atención clave", valor: o(b?.atencion) },
    { rotulo: "Actividad esperada", valor: o(b?.actividad) },
    { rotulo: "Indicador de seguimiento", valor: o(b?.indicador) },
  ];
}

function filasResultado(record: MetricRecord | undefined): Fila[] {
  if (!record) {
    return [{ rotulo: "Registro métrico", valor: "No disponible para el indicador seleccionado" }];
  }
  const brecha = brechaDe(record);
  return [
    {
      rotulo: "Semáforo",
      valor: SEMAFORO_META[record.semaforo]?.label ?? o(record.semaforo),
    },
    { rotulo: "Meta establecida (%)", valor: o(String(record.metaEstablecida)) },
    { rotulo: "Meta alcanzada (%)", valor: o(String(record.metaAlcanzada)) },
    { rotulo: "Brecha (%)", valor: brecha === "" ? "-" : String(brecha) },
    { rotulo: "Determinante social", valor: `${o(record.tipoDeterminante)} — ${o(record.determinanteRelacionado)}` },
    { rotulo: "Barrera detectada", valor: `${o(record.tipoBarrera)} — ${o(record.barrera)}` },
    { rotulo: "Oportunidad de mejora", valor: o(record.oportunidadMejora) },
    { rotulo: "Motivo de canalización", valor: o(record.motivoCanalizacion) },
    { rotulo: "Tipo de canalización (receptor)", valor: o(record.tipoCanalizacion) },
  ];
}

function filasConsultaC(c: ConsultaC): Fila[] {
  return [
    { rotulo: "Categoría de determinante", valor: o(c.categoria) },
    { rotulo: "Subcategoría", valor: o(c.subcategoria) },
    { rotulo: "Tipo de barrera", valor: o(c.tipoBarrera) },
    { rotulo: "Barrera", valor: o(c.barrera) },
    { rotulo: "Motivo de canalización", valor: o(c.motivo) },
    { rotulo: "Tipo de canalización (receptor)", valor: o(c.tipoCanalizacion) },
  ];
}

function formatearFecha(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha.trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : o(fecha);
}

function filasDiligenciamiento(d: ConsultaD): Fila[] {
  return [
    { rotulo: "Fecha de diligenciamiento", valor: formatearFecha(d.fecha) },
    { rotulo: "Problema trazador priorizado", valor: o(d.problemaTrazador) },
    { rotulo: "Fuente de información", valor: o(d.fuenteInformacion) },
    {
      rotulo: "Responsable del diligenciamiento",
      valor: o(d.responsable),
    },
  ];
}

/**
 * Genera y descarga el PDF con TODOS los datos de la consulta y el análisis.
 */
export async function exportarAnalisisPdf(
  ctx: AnalisisContexto
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");
  const a = ctx.a ?? VACIA;
  const b = ctx.b;
  const c = ctx.c ?? VACIA_C;
  const d = ctx.d ?? { fecha: "", problemaTrazador: "", fuenteInformacion: "", responsable: "" };

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 14;
  const pageW = 210;

  let y = 15;
  const nuevaPagina = () => {
    if (y > 260) {
      doc.addPage();
      y = 15;
    }
  };

  const titulo = (texto: string) => {
    nuevaPagina();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 77);
    doc.text(texto, M, y);
    y += 5;
  };

  const subTitulo = (texto: string) => {
    nuevaPagina();
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    doc.text(texto, M, y);
    doc.setTextColor(0);
    y += 4.5;
  };

  const parrafo = (texto: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(texto, pageW - M * 2);
    for (const line of lines) {
      nuevaPagina();
      doc.text(line, M, y);
      y += 4;
    }
    y += 1.5;
  };

  const tabla = (head: string[][], body: (string[][]) | undefined) => {
    nuevaPagina();
    autoTable(doc, {
      startY: y,
      head,
      body,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 1.6 },
      headStyles: { fillColor: [13, 96, 70] },
      alternateRowStyles: { fillColor: [240, 245, 244] },
      margin: { left: M, right: M },
    });
    const fin =
      (
        doc as unknown as { lastAutoTable?: { finalY: number } }
      ).lastAutoTable?.finalY ?? y;
    y = fin + 7;
  };

  const filasValor = (filas: Fila[]): string[][] =>
    filas.map((f) => [f.rotulo, f.valor]);

  /* Portada mínima dentro del mismo documento */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(13, 96, 70);
  doc.text("Ruta Materna Perinatal", M, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text("Análisis técnico de la consulta", M, y);
  y += 5;
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 110);
  doc.text(`Generado: ${new Date().toLocaleString("es-CO")}`, M, y);
  y += 4;
  doc.text(
    "Fuente: Lista maestra de determinantes - Ruta Materna Perinatal (Cundinamarca).",
    M,
    y
  );
  doc.setTextColor(0);
  y += 9;

  titulo("1. Datos del diligenciamiento");
  tabla([["Campo", "Valor"]], filasValor(filasDiligenciamiento(d)));

  titulo("2. Identificación del prestador que responde (Módulo A)");
  tabla([["Campo", "Valor"]], filasValor(filasConsultaA(a)));

  titulo("3. Ruta consultada (Módulo B)");
  tabla([["Campo", "Valor"]], filasValor(filasConsultaB(b)));

  titulo("4. Resultado del indicador");
  subTitulo(
    ctx.rutaCompleta
      ? "Semáforo, metas y brecha calculados con las fórmulas oficiales"
      : "Seleccione los 4 niveles del Módulo B para obtener el semáforo y las metas"
  );
  tabla([["Campo", "Valor"]], filasValor(filasResultado(ctx.record)));

  titulo("5. Análisis");
  for (const seccion of buildAnalisis(ctx)) {
    subTitulo(seccion.titulo);
    for (const p of seccion.parrafos) parrafo(p);
  }

  titulo("6. Determinantes consultados (Módulo C)");
  tabla([["Campo", "Valor"]], filasValor(filasConsultaC(c)));

  doc.save(
    `analisis-ruta-materno-perinatal-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.pdf`
  );
}