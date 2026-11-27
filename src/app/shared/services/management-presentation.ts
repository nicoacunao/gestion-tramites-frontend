import { Tramite } from "../../features/tramites/models/tramite";
import { ManagementContract, TrafficLight } from "./api-models";

/** Texto para datos que la gestión no tiene registrados. */
export const SIN_REGISTRAR = "Sin registrar";
/** Texto para fechas opcionales vacías. */
export const SIN_ESPECIFICAR = "Sin especificar";

const ETIQUETAS_SEMAFORO: Record<TrafficLight, string> = {
  "al-dia": "Al día",
  "proximo-vencer": "Próximo a vencer",
  atrasado: "Atrasado",
};

/** `YYYY-MM-DD` (o ISO con hora) → `DD-MM-YYYY`. Devuelve `null` si no hay fecha válida. */
export function fechaIsoAVista(fecha: string | null | undefined): string | null {
  if (!fecha) return null;
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return anio?.length === 4 && mes && dia ? `${dia}-${mes}-${anio}` : null;
}

/**
 * `DD-MM-YYYY` o `DD/MM/YYYY` (también acepta `YYYY-MM-DD`) → `YYYY-MM-DD`.
 * Devuelve `null` si está vacía o no es una fecha real.
 */
export function fechaVistaAIso(fecha: string | null | undefined): string | null {
  if (!fecha) return null;
  const limpia = fecha.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpia)) return esFechaReal(limpia) ? limpia : null;
  const [dia, mes, anio] = limpia.split(/[/-]/);
  if (!/^\d{1,2}$/.test(dia ?? "") || !/^\d{1,2}$/.test(mes ?? "") || !/^\d{4}$/.test(anio ?? "")) return null;
  const iso = `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  return esFechaReal(iso) ? iso : null;
}

function esFechaReal(iso: string): boolean {
  const fecha = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === iso;
}

function texto(valor: string | null | undefined, respaldo = SIN_REGISTRAR): string {
  const limpio = valor?.trim();
  return limpio ? limpio : respaldo;
}

/** Nombre corto de la razón social para mostrar como concesionario. */
function nombreConcesionario(razonSocial: string | null | undefined): string {
  return texto(razonSocial).replace(/\s+(SpA|Ltda\.?)$/i, "");
}

function semaforoDe(item: ManagementContract): TrafficLight {
  const valor = item.trafficLight ?? item.semaforo;
  return valor && valor in ETIQUETAS_SEMAFORO ? valor : "al-dia";
}

/**
 * Convierte una gestión del contrato vigente (`Management`) al modelo de vista
 * `Tramite`. Los datos de presentación (código, nivel, ámbito, semáforo) los
 * calcula el backend; aquí solo se formatean fechas y se completan vacíos.
 */
export function gestionATramite(item: ManagementContract): Tramite {
  const semaforo = semaforoDe(item);
  const fechaApertura = fechaIsoAVista(item.openedOn) ?? SIN_ESPECIFICAR;
  const tipo = item.managementTypeName?.trim() ?? "";

  return {
    id: item.id,
    apiId: item.id,
    codigo: texto(item.code ?? item.codigo, `Gestión ${item.id}`),
    nivel: texto(item.level ?? item.nivel, ""),
    ambito: texto(item.scopeName ?? item.ambito, ""),
    codigoAmbito: texto(item.scopeCode ?? item.codigoAmbito, ""),
    correlativo: item.sequence ?? item.correlativo ?? null,
    semaforo,
    semaforoEtiqueta: texto(item.trafficLightLabel ?? item.semaforoEtiqueta, ETIQUETAS_SEMAFORO[semaforo]),
    idEstacion: item.stationId,
    tipoTramite: tipo || "Sin tipo asignado",
    tramiteEspecifico: tipo,
    descripcion: tipo,
    estacionServicio: texto(item.stationName ?? item.legalName, item.stationId),
    razonSocial: texto(item.legalName),
    comuna: texto(item.commune),
    direccion: texto(item.address),
    rutRazonSocial: texto(item.legalRut),
    representanteLegal: texto(item.legalRepresentative),
    rutRepresentanteLegal: texto(item.legalRepresentativeRut),
    concesionario: nombreConcesionario(item.legalName),
    estado: item.status,
    prioridad: item.priority,
    responsableInterno: texto(item.responsibleName, `Usuario ${item.responsibleUserId}`),
    responsableUserId: item.responsibleUserId,
    solicitanteCopec: item.requesterName,
    fechaApertura,
    fechaInicio: fechaApertura,
    fechaIngreso: fechaApertura,
    fechaIngresoOrden: item.openedOn.slice(0, 10),
    fechaEstimadaTermino: fechaIsoAVista(item.estimatedCompletionOn) ?? SIN_ESPECIFICAR,
    fechaUltimaRevision: fechaIsoAVista(item.lastReviewedOn),
  };
}
