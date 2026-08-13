/**
 * Fórmula oficial de la celda "Semáforo" del CSV.
 * `porcentaje` se expresa como fracción (0 a 1). Devuelve la clasificación
 * en texto ("Muy bueno", "Bueno", "Regular", "Malo") o "" si es inválido.
 */
export function obtenerClasificacion(
  porcentaje: number | null | undefined
): string {
  if (
    porcentaje === null ||
    porcentaje === undefined ||
    isNaN(porcentaje)
  ) {
    return "";
  }

  if (porcentaje < 0.4) {
    return "Malo";
  } else if (porcentaje < 0.7) {
    return "Regular";
  } else if (porcentaje < 0.9) {
    return "Bueno";
  } else {
    return "Muy bueno";
  }
}

export type SemaforoValue =
  | "Muy bueno"
  | "Bueno"
  | "Regular"
  | "Malo"
  | "";

export type SemaforoColor = "green" | "blue" | "amber" | "red";

export const SEMAFORO_META: Record<string, { color: SemaforoColor; label: string }> = {
  "Muy bueno": { color: "green", label: "Muy bueno" },
  Bueno: { color: "blue", label: "Bueno" },
  Regular: { color: "amber", label: "Regular" },
  Malo: { color: "red", label: "No cumple / Malo" },
};
