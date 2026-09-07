"use client";

import { useMemo, useState } from "react";
import { HeartPulse } from "lucide-react";

import { ModuleA, type ModuleASelection } from "@/components/module-a";
import { ModuleB, type ModuleBSelection } from "@/components/module-b";
import { ModuleC, type ModuleCSelection } from "@/components/module-c";
import {
  DatosDiligenciamiento,
  type ModuleDSelection,
} from "@/components/datos-diligenciamiento";
import { ResultCard } from "@/components/result-card";
import {
  getMomentos,
  getRegiones,
  getCategorias,
  getTiposBarrera,
  getMotivos,
  findMetric,
} from "@/lib/data";
import { exportarAnalisisPdf } from "@/lib/analisis";

const emptyA: ModuleASelection = {
  region: "",
  municipio: "",
  ese: "",
  servicio: "",
};
const emptyB: ModuleBSelection = {
  momento: "",
  atencion: "",
  actividad: "",
  indicador: "",
};
const emptyC: ModuleCSelection = {
  categoria: "",
  subcategoria: "",
  tipoBarrera: "",
  barrera: "",
  motivo: "",
  tipoCanalizacion: "",
};
const emptyD: ModuleDSelection = {
  fecha: "",
  problemaTrazador: "",
  fuenteInformacion: "",
  responsable: "",
};

export default function HomePage() {
  const [selA, setSelA] = useState<ModuleASelection>(emptyA);
  const [selB, setSelB] = useState<ModuleBSelection>(emptyB);
  const [selC, setSelC] = useState<ModuleCSelection>(emptyC);
  const [selD, setSelD] = useState<ModuleDSelection>(emptyD);

  const momentos = useMemo(() => getMomentos(), []);
  const regiones = useMemo(() => getRegiones(), []);
  const categorias = useMemo(() => getCategorias(), []);
  const tiposBarrera = useMemo(() => getTiposBarrera(), []);
  const motivos = useMemo(() => getMotivos(), []);

  const moduleBComplete = Boolean(
    selB.momento && selB.atencion && selB.actividad && selB.indicador
  );

  // El panel depende de la ruta (Módulo B); el territorio (A) es solo
  // identificación de quién responde y no bloquea las métricas.
  const selectionComplete = moduleBComplete;

  const record = useMemo(
    () => (selectionComplete ? findMetric({ ...selB, ...selA }) : undefined),
    [selA, selB, selectionComplete]
  );

  const handleReset = () => {
    setSelA(emptyA);
    setSelB(emptyB);
    setSelC(emptyC);
    setSelD(emptyD);
  };

  const handleExportPdf = () => {
    void exportarAnalisisPdf({
      record,
      a: selA,
      b: selB,
      c: selC,
      d: selD,
      rutaCompleta: selectionComplete,
    });
  };

  const handleExport = () => {
    if (!record) return;
    const payload = {
      consulta: {
        diligenciamiento: selD,
        territorio: selA,
        ruta: selB,
        barreras: selC,
      },
      resultado: record,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consulta-ruta-materno-perinatal-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
      {/* Encabezado */}
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow">
            <HeartPulse className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ruta Materna Perinatal
            </h1>
            <p className="text-sm text-muted-foreground">
              Consulta de ruta, territorio y análisis de barreras ·
              Cundinamarca
            </p>
          </div>
        </div>
      </header>

      {/* Datos del diligenciamiento */}
      <div className="mb-6">
        <DatosDiligenciamiento value={selD} onChange={setSelD} />
      </div>

      {/* Módulos A + B */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ModuleA value={selA} regiones={regiones} onChange={setSelA} />
        <ModuleB value={selB} momentos={momentos} onChange={setSelB} />
      </div>

      {/* Módulo C (opcional, se habilita con la ruta del Módulo B completa) */}
      <div className="mt-6">
        <ModuleC
          value={selC}
          categorias={categorias}
          tiposBarrera={tiposBarrera}
          motivos={motivos}
          onChange={setSelC}
          disabled={!selectionComplete}
        />
      </div>

      {/* Panel de resultados */}
      <div className="mt-6">
        <ResultCard
          record={record}
          selectionComplete={selectionComplete}
          identificacion={selA}
          ruta={selB}
          consultaC={selC}
          diligenciamiento={selD}
          onReset={handleReset}
          onExportJson={handleExport}
          onExportPdf={handleExportPdf}
        />
      </div>

      <footer className="mt-10 border-t pt-4 text-center text-xs text-muted-foreground">
        Fuente: Lista maestra de determinantes — Ruta Materna Perinatal
        (Cundinamarca). Datos normalizados automáticamente desde el CSV.
      </footer>
    </main>
  );
}
