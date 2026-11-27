import { MANAGEMENT_STATUSES, STAGE_STATUSES } from "../../../shared/services/api-models";

export type TagSeverity =
  "success" | "secondary" | "info" | "warn" | "danger" | "contrast";

/** Estados de una gestión; fuente única: el contrato (`ManagementStatus`). */
export const ESTADOS_TRAMITE = MANAGEMENT_STATUSES;

export const ESTADOS_ANTECEDENTE = [
  "Pendiente",
  "Recibido",
  "Recibido conforme",
] as const;

/** Estados de una etapa; fuente única: el contrato (`StageStatus`). */
export const ESTADOS_ETAPA = STAGE_STATUSES;


const SEVERIDADES_ESTADO: Record<string, TagSeverity> = {
  Borrador: "secondary",
  Pendiente: "warn",
  Ingresado: "info",
  "En tramitación": "info",
  Observado: "warn",
  Reingresado: "info",
  Rechazado: "danger",
  "Terminado aprobado": "success",
  "Terminado desfavorable": "danger",
  Recibido: "info",
  "Recibido conforme": "success",
  "En curso": "info",
  Completado: "success",
};

export function resolverSeveridadEstado(estado: string): TagSeverity {
  return SEVERIDADES_ESTADO[estado] ?? "secondary";
}
