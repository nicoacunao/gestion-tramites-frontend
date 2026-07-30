export type TagSeverity =
  | "success"
  | "secondary"
  | "info"
  | "warn"
  | "danger"
  | "contrast";

const SEVERIDADES_ESTADO: Record<string, TagSeverity> = {
  Ingresado: "secondary",
  "En revisión": "warn",
  Observado: "info",
  Aprobado: "success",
  Finalizado: "contrast",
  Borrador: "secondary",
  Pendiente: "secondary",
  Recibido: "success",
  "En curso": "info",
  Rechazado: "danger",
  Reingresado: "warn",
  Completado: "success",
};

export function resolverSeveridadEstado(estado: string): TagSeverity {
  return SEVERIDADES_ESTADO[estado] ?? "secondary";
}
