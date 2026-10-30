export interface AntecedenteRequeridoDetalle {
  id: string;
  nivel: "N2" | "N3" | "N4";
  padreId: string | null;
  expandido: boolean;
  antecedente: string;
  obligatorio: boolean;
  responsable: string;
  estado: string;
  fechaCarga: string;
  archivo: string;
}

export interface AntecedenteComplementarioDetalle {
  id: string;
  nivel: "N2" | "N3" | "N4";
  padreId: string | null;
  expandido: boolean;
  tipoDocumento: string;
  solicitadoPor: string;
  responsable: string;
  estado: string;
  fechaCarga: string;
  archivo: string;
}

export interface EtapaDetalle {
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
  id: number;
  idEstacion: string;
  tipoTramite: string;
  estacionServicio: string;
  razonSocial: string;
  comuna: string;
  direccion: string;
  estado: string;
  fechaApertura: string;
  fechaEstimadaTermino: string;
  fechaUltimaRevision?: string | null;
  prioridad: string;
  responsableInterno: string;
  tramiteEspecifico: string;
  solicitanteCopec: string;
  modalidadCreacion?: "principal" | "subtramite";
  datosAdicionales?: Record<string, string>;
  subtramitesAsociados?: string[];
  antecedentesConfigurados?: string[];
  antecedentesComplementariosConfigurados?: string[];
  etapasConfiguradas?: string[];
  detalleEditable?: DetalleEditableTramite;
}
