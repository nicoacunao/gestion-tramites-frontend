/** Nivel de un antecedente (`N2`, `N3`…); el N1 es el tipo principal de la gestión. */
export type NivelAntecedente = string;

export interface AntecedenteRequeridoDetalle {
  id: string;
  nivel: NivelAntecedente;
  padreId: string | null;
  expandido: boolean;
  antecedente: string;
  obligatorio: boolean;
  responsable: string;
  responsableId?: string;
  estado: string;
  /** `DD-MM-YYYY` de la última carga de archivo, o vacío. */
  fechaCarga: string;
  /** Nombre legible del archivo, o vacío si no tiene. */
  archivo: string;
  /** Referencia de almacenamiento que exige el backend al actualizar (N2+). */
  referenciaArchivo?: string | null;
  observaciones?: string;
}

export interface AntecedenteComplementarioDetalle {
  id: string;
  nivel: NivelAntecedente;
  padreId: string | null;
  expandido: boolean;
  tipoDocumento: string;
  solicitadoPor: string;
  responsable: string;
  responsableId?: string;
  estado: string;
  fechaCarga: string;
  archivo: string;
  referenciaArchivo?: string | null;
}

export interface EtapaDetalle {
  /** Id de `etapa_gestion`; vacío si la etapa todavía no existe en la gestión. */
  id?: string;
  /** Id de la etapa del catálogo. */
  stageId?: string;
  etapa: string;
  porcentaje: number;
  estado: string;
  /** `DD-MM-YYYY` */
  fechaEstimada: string;
  /** `DD-MM-YYYY` */
  fechaReal: string;
  /** Nombre para mostrar del responsable. */
  responsable: string;
  responsableId?: string | null;
  observacion: string;
}

export interface DetalleEditableTramite {
  antecedentesRequeridos: AntecedenteRequeridoDetalle[];
  antecedentesComplementarios: AntecedenteComplementarioDetalle[];
  etapas: EtapaDetalle[];
}

/**
 * Modelo de vista de una gestión. Se construye desde el contrato vigente con
 * `gestionATramite` (shared/services/management-presentation.ts).
 */
export interface Tramite {
  id: string | number;
  apiId?: string;
  /** Código de presentación del backend (`N1-MUN-001`) o `Gestión <id>` si no tiene. */
  codigo: string;
  /** Nivel (`N1`, `N2`…); vacío si el backend no lo informa. */
  nivel: string;
  ambito: string;
  codigoAmbito: string;
  correlativo: number | null;
  semaforo: "al-dia" | "proximo-vencer" | "atrasado";
  semaforoEtiqueta: string;
  idEstacion: string;
  tipoTramite: string;
  estacionServicio: string;
  razonSocial: string;
  comuna: string;
  direccion: string;
  estado: string;
  /** Fechas en formato `DD-MM-YYYY` para mostrar. */
  fechaApertura: string;
  fechaInicio: string;
  fechaIngreso: string;
  /** Fecha `YYYY-MM-DD` usada para ordenar. */
  fechaIngresoOrden: string;
  fechaEstimadaTermino: string;
  fechaUltimaRevision?: string | null;
  prioridad: string;
  responsableInterno: string;
  responsableUserId?: string;
  tramiteEspecifico: string;
  descripcion: string;
  rutRazonSocial: string;
  representanteLegal: string;
  rutRepresentanteLegal: string;
  concesionario: string;
  solicitanteCopec: string;
  detalleEditable?: DetalleEditableTramite;
}
