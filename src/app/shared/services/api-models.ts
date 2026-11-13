export interface ApiEnvelope<T> {
  data: T;
  meta: {
    requestId: string;
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
  meta?: { requestId?: string };
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  user: BackendUser;
}

export interface BackendUser {
  id: string;
  rut: string;
  names: string;
  firstSurname: string;
  secondSurname: string | null;
  email: string;
  phone?: string | null;
  description?: string | null;
  role: string;
  organization?: string | null;
  version?: number;
}

export interface BackendCatalogStation {
  id: string;
  name?: string | null;
  address: string;
  commune: string;
  legalName: string;
  companyRut: string;
}

export interface BackendManagementType {
  id: string;
  name: string;
  version: number;
  secondLevelLabel?: string;
  requiresSpecificSelection?: boolean;
}

export interface BackendSpecificManagement {
  id: string;
  managementTypeId: string;
  code: string;
  name: string;
  active: boolean;
  backgrounds?: Array<{
    id: string;
    name: string;
    level: "N2" | "N3" | "N4";
    parentBackgroundId: string | null;
  }>;
}

export interface BackendCatalogBackground {
  id: string;
  name: string;
  version: number;
}

export interface BackendManagement {
  id: string;
  stationId: string;
  managementTypeId: string;
  scopeCode: string;
  responsibleUserId: string;
  level: "N1" | "N2" | "N3" | "N4";
  sequence: number;
  openedOn: string;
  estimatedCompletionOn: string | null;
  lastReviewedOn: string | null;
  priority: "Alta" | "Media" | "Baja";
  requesterName: string;
  status: string | null;
  version: number;
  codigo: string;
  nivel: `N${number}`;
  ambito: string;
  codigoAmbito: string;
  correlativo: number;
  semaforo: "al-dia" | "proximo-vencer" | "atrasado";
  semaforoEtiqueta: string;
  fechaInicio: string;
  fechaIngreso: string;
  fechaIngresoOrden: string;
  fechaEstimadaTermino: string;
  responsableInterno: string;
  idEstacion: string;
  estacionServicio: string;
  direccion: string;
  comuna: string;
  rutRazonSocial: string;
  razonSocial: string;
  representanteLegal: string;
  rutRepresentanteLegal: string;
  concesionario: string;
  descripcion: string;
  stationName?: string | null;
  legalName?: string | null;
  responsibleName?: string | null;
  managementTypeName?: string | null;
  managementTypeCode?: string | null;
  legalRut?: string | null;
  legalRepresentative?: string | null;
  creationMode?: "principal" | "subtramite";
  specificManagementId?: string | null;
}

export interface BackendBackground {
  id: string;
  managementId: string;
  parentManagementBackgroundId: string | null;
  managementTypeId: string;
  backgroundId: string;
  level: "N2" | "N3" | "N4";
  required: boolean;
  responsibleUserId: string;
  status: string;
  fileReference: string | null;
  uploadedAt: string | null;
  version: number;
}

export interface BackendStage {
  id: string;
  managementId: string;
  stageId: string;
  stageName: string;
  percentage: number;
  status: string;
  estimatedOn: string | null;
  completedOn: string | null;
  responsible: string | null;
  notes: string | null;
  version: number;
}

export interface BackendLogEntry {
  id: string;
  managementId: string;
  userId: string | null;
  registeredOn: string;
  registeredAt: string;
  title: string;
  comment: string;
  authorName?: string | null;
  authorInitials?: string | null;
  type?: "inicio" | "novedad" | "seguimiento" | "contacto" | null;
  automatic?: boolean;
  version: number;
}

export interface BackendStationSummary {
  stationId: string;
  activeCount: number;
  pendingCount: number;
  daysWithoutProgress: number;
  overallStatus: string;
}

export interface BackendStation {
  stationId: string;
  legalName: string;
  address: string;
  comuna: string;
  zoneManager: string;
  commercialManager: string;
  companyRut: string;
  legalRepresentative: string;
  legalRepresentativeRut: string;
  status: string;
}

export interface BackendStationPage {
  data: BackendStation[];
  meta: {
    requestId: string;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  allData?: BackendStation[];
}

export interface ImportStationsMeta {
  requestId: string;
  created: number;
  updated: number;
  rejected: number;
}

export interface ImportStationsResponse {
  data: BackendStation[];
  meta: ImportStationsMeta;
}
