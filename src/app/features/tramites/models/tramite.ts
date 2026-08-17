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
  prioridad: string;
  responsableInterno: string;
  tramiteEspecifico: string;
  solicitanteCopec: string;
  modalidadCreacion?: "principal" | "subtramite";
  datosAdicionales?: Record<string, string>;
  subtramitesAsociados?: string[];
  antecedentesConfigurados?: string[];
  hitosConfigurados?: string[];
}
