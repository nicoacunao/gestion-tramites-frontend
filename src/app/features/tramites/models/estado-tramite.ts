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

export const ESTADOS_ETAPA = ["Pendiente", "En curso", "Completado"] as const;

export const ETAPAS_ESTANDAR = [
  { nombre: "Consulta y definición de antecedentes", porcentaje: 10 },
  {
    nombre: "Recolección de antecedentes y preparación del expediente",
    porcentaje: 20,
  },
  { nombre: "Ingreso del expediente", porcentaje: 30 },
  {
    nombre: "Revisión del expediente y emisión de observaciones",
    porcentaje: 40,
  },
  { nombre: "Respuesta a las observaciones", porcentaje: 50 },
  { nombre: "Aprobación del expediente", porcentaje: 80 },
  {
    nombre: "Emisión o entrega del documento definitivo",
    porcentaje: 100,
  },
] as const;

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
