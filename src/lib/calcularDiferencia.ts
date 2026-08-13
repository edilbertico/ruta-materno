/**
 * Fórmula oficial de la celda "Brecha" del CSV:
 * Brecha = Meta establecida − Meta alcanzada.
 * Si cualquiera de los dos valores es null/undefined/vacío devuelve "".
 */
export function calcularDiferencia(
  valorAN: number | null,
  valorAO: number | null
): number | "" {
  if (valorAN === null || valorAO === null) {
    return "";
  }
  return valorAN - valorAO;
}
