export interface AntecedenteRequeridoDetalle {
  id: string;
  nivel: "N2" | "N3" | "N4";
  padreId: string | null;
  expandido: boolean;
  antecedente: string;
  obligatorio: boolean;
  responsable: string;
  responsableId?: string;
  estado: string;
  fechaCarga: string;
  archivo: string;
  observaciones?: string;
  version?: number;
  isSpecificManagement?: boolean;
  specificManagementId?: string | null;
  specificManagementCode?: string;
}

export interface AntecedenteComplementarioDetalle {
  id: string;
  nivel: "N2" | "N3" | "N4";
  padreId: string | null;
  expandido: boolean;
  tipoDocumento: string;
  solicitadoPor: string;
  responsable: string;
  responsableId?: string;
  estado: string;
  fechaCarga: string;
  archivo: string;
  version?: number;
}

export interface EtapaDetalle {
  id?: string;
  version?: number;
  etapa: string;
  porcentaje: number;
  estado: string;
  fechaEstimada: string;
  fechaReal: string;
  responsable: string;
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
