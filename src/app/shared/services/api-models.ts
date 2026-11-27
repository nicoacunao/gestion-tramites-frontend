/** Metadatos comunes de toda respuesta del API (`ApiMeta` en OpenAPI). */
export interface ApiMeta {
  requestId: string;
}

/** Metadatos de colecciones paginadas por el servidor. */
export interface ApiPageMeta extends ApiMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Respuesta exitosa: los datos viajan en `mensaje`. */
export interface ApiEnvelope<T, M extends ApiMeta = ApiMeta> {
  exito: true;
  mensaje: T;
  meta: M;
}

/** Respuesta de error (`ApiError` en OpenAPI). */
export interface ApiErrorBody {
  exito?: false;
  mensaje?: string;
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
  level: "N2";
  active: boolean;
  backgrounds?: Array<{
    id: string;
    name: string;
    level: "N2" | "N3" | "N4";
    parentBackgroundId: string | null;
  }>;
}

export interface BackendSpecificManagementReference {
  id: string;
  name: string;
  code: string;
  level: "N2";
  managementTypeId: string;
  managementTypeName?: string | null;
}

export interface BackendCatalogBackground {
  id: string;
  name: string;
  version: number;
}

export const MANAGEMENT_STATUSES = [
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

export type ManagementStatus = (typeof MANAGEMENT_STATUSES)[number];
export type ManagementPriority = "Alta" | "Media" | "Baja";
export type TrafficLight = "al-dia" | "proximo-vencer" | "atrasado";

/** Gestión según el contrato vigente (`Management` en OpenAPI). */
export interface ManagementContract {
  id: string;
  stationId: string;
  responsibleUserId: string;
  createdAt?: string;
  openedOn: string;
  estimatedCompletionOn: string | null;
  lastReviewedOn: string | null;
  priority: ManagementPriority;
  status: ManagementStatus;
  requesterName: string;
  stationName?: string | null;
  legalName?: string | null;
  responsibleName?: string | null;
  commune?: string | null;
  address?: string | null;
  legalRut?: string | null;
  legalRepresentative?: string | null;
  legalRepresentativeRut?: string | null;
  /** Tipos de gestión asociados; si hay varios, vienen separados por coma. */
  managementTypeName?: string | null;
  level?: string | null;
  scopeCode?: string | null;
  scopeName?: string | null;
  sequence?: number | null;
  /** Código de presentación, por ejemplo `N1-MUN-001`; `null` si no hay ámbito único. */
  code?: string | null;
  trafficLight?: TrafficLight;
  trafficLightLabel?: string;
  /** Alias en español de los campos de presentación. */
  codigo?: string | null;
  nivel?: string | null;
  ambito?: string | null;
  codigoAmbito?: string | null;
  correlativo?: number | null;
  semaforo?: TrafficLight;
  semaforoEtiqueta?: string;
}

export type BackendManagement = ManagementContract;

export interface BackendBackground {
  id: string;
  managementId: string;
  parentManagementBackgroundId: string | null;
  managementTypeId: string;
  backgroundId: string;
  specificManagementId?: string | null;
  level: "N2" | "N3" | "N4";
  category?: "requerido" | "complementario" | "adicional" | null;
  required: boolean;
  responsibleUserId: string;
  status: string;
  fileReference: string | null;
  uploadedAt: string | null;
  observations?: string | null;
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

export type LogEntryType = "inicio" | "novedad" | "seguimiento" | "contacto";

/** Entrada de bitácora (`LogEntry` en OpenAPI). Fecha y hora en America/Santiago. */
export interface BackendLogEntry {
  id: string;
  managementId: string;
  userId: string | null;
  /** `YYYY-MM-DD` */
  registeredOn: string;
  /** `HH:mm:ss` */
  registeredAt: string;
  title: string;
  comment: string;
  type: LogEntryType | null;
}

/** Cuerpo de `POST /bitacora/items` (`LogEntryWrite`). */
export interface LogEntryWrite {
  managementId: string;
  /** 1 a 80 caracteres. */
  title: string;
  /** 1 a 1000 caracteres. */
  comment: string;
  type?: LogEntryType | null;
  /** Si se omite, el backend usa el usuario autenticado. */
  userId?: string | null;
  registeredOn?: string;
  registeredAt?: string;
}

export interface BackendStationSummary {
  stationId: string;
  activeCount: number;
  pendingCount: number;
  daysWithoutProgress: number;
  overallStatus: string;
}

/** Estación en `GET /consultas/stations` y en la importación. */
export interface BackendStation {
  stationId: string;
  legalName: string;
  address: string;
  comuna: string;
  zoneManager: string | null;
  commercialManager: string | null;
  companyRut: string | null;
  legalRepresentative: string | null;
  legalRepresentativeRut: string | null;
  estado: string;
}

export interface BackendStationPage {
  data: BackendStation[];
  meta: ApiPageMeta;
}

/** Fila rechazada en una importación de estaciones. */
export interface StationImportRowError {
  row: number;
  message: string;
}

export interface ImportStationsMeta extends ApiMeta {
  created: number;
  updated: number;
  rejected: number;
  rejectedRows?: StationImportRowError[];
}

export interface ImportStationsResponse {
  data: BackendStation[];
  meta: ImportStationsMeta;
}
