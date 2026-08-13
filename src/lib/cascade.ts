/**
 * Helpers de cascada reutilizables. Cada función devuelve las opciones del
 * desplegable hijo según la selección del desplegable padre.
 */
import {
  getAtenciones,
  getActividades,
  getIndicadores,
  getMunicipios,
  getESEs,
  getServicios,
  getSubcategorias,
  getBarreras,
  getTiposCanalizacion,
} from "@/lib/data";

/** Módulo A */
export function optionsAtenciones(momento?: string): string[] {
  return momento ? getAtenciones(momento) : [];
}
export function optionsActividades(
  momento?: string,
  atencion?: string
): string[] {
  return momento && atencion ? getActividades(momento, atencion) : [];
}
export function optionsIndicadores(
  momento?: string,
  atencion?: string,
  actividad?: string
): string[] {
  return momento && atencion && actividad
    ? getIndicadores(momento, atencion, actividad)
    : [];
}

/** Módulo B */
export function optionsMunicipios(region?: string): string[] {
  return region ? getMunicipios(region) : [];
}
export function optionsESEs(region?: string, municipio?: string): string[] {
  return region && municipio ? getESEs(region, municipio) : [];
}
export function optionsServicios(
  region?: string,
  municipio?: string,
  ese?: string
): string[] {
  return region && municipio && ese
    ? getServicios(region, municipio, ese)
    : [];
}

/** Módulo C */
export function optionsSubcategorias(categoria?: string): string[] {
  return categoria ? getSubcategorias(categoria) : [];
}
export function optionsBarreras(tipo?: string): string[] {
  return tipo ? getBarreras(tipo) : [];
}
export function optionsTiposCanalizacion(motivo?: string): string[] {
  return motivo ? getTiposCanalizacion(motivo) : [];
}
