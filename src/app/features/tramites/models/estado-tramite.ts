export type TagSeverity =
  "success" | "secondary" | "info" | "warn" | "danger" | "contrast";

export const ESTADOS_TRAMITE = [
  "Borrador",
  "Pendiente",
  "Ingresado",
  "En tramitación",
  "Observado",
  "Reingresado",
  "Rechazado",
  "Terminado aprobado",
  "Terminado desfavorable",
] as const;

export const ESTADOS_ANTECEDENTE = [
  "Pendiente",
  "Recibido",
  "Recibido conforme",
] as const;

export const ESTADOS_HITO = ["Pendiente", "En curso", "Completado"] as const;

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
