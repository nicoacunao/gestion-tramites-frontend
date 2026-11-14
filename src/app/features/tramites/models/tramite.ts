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

export interface Tramite {
  id: string | number;
  apiId?: string;
  codigo: string;
  nivel: `N${number}`;
  ambito: string;
  codigoAmbito: string;
  correlativo: number;
  semaforo: "al-dia" | "proximo-vencer" | "atrasado";
  semaforoEtiqueta: string;
  idEstacion: string;
  tipoTramite: string;
  estacionServicio: string;
  razonSocial: string;
  comuna: string;
  direccion: string;
  estado: string;
  fechaApertura: string;
  fechaInicio: string;
  fechaIngreso: string;
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
  modalidadCreacion?: "principal" | "subtramite";
  specificManagementId?: string | null;
  specificManagementName?: string | null;
  specificManagement?: {
    id: string;
    name: string;
    code: string;
    level: "N2";
    managementTypeId: string;
    managementTypeName?: string | null;
  } | null;
  specificManagements?: Array<NonNullable<Tramite["specificManagement"]>>;
  subtramitesAsociados?: string[];
  antecedentesConfigurados?: string[];
  antecedentesComplementariosConfigurados?: string[];
  etapasConfiguradas?: string[];
  detalleEditable?: DetalleEditableTramite;
}
