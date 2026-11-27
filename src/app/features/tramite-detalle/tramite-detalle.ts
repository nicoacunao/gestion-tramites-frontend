import { CommonModule } from "@angular/common";
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Optional,
  Output,
  ViewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { catchError, finalize, forkJoin, Observable, of, switchMap } from "rxjs";
import { ButtonDirective } from "primeng/button";
import { DatePickerModule } from "primeng/datepicker";
import { DialogModule } from "primeng/dialog";
import { FileUploadModule } from "primeng/fileupload";
import { InputGroupModule } from "primeng/inputgroup";
import { InputGroupAddonModule } from "primeng/inputgroupaddon";
import { InputTextModule } from "primeng/inputtext";
import { UploadIcon } from "primeng/icons/upload";
import { PanelModule } from "primeng/panel";
import { ProgressBarModule } from "primeng/progressbar";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { SelectModule } from "primeng/select";
import { TagModule } from "primeng/tag";
import { TextareaModule } from "primeng/textarea";
import { BitacoraPanel } from "../../shared/components/bitacora-panel/bitacora-panel";
import { UserSessionService } from "../../shared/services/user-session";
import {
  ESTADOS_ANTECEDENTE,
  ESTADOS_ETAPA,
  resolverSeveridadEstado,
  TagSeverity,
} from "../tramites/models/estado-tramite";
import {
  AntecedenteComplementarioDetalle,
  AntecedenteRequeridoDetalle,
  DetalleEditableTramite,
  EtapaDetalle,
  Tramite,
} from "../tramites/models/tramite";
import { TramitesMock } from "../../shared/services/tramites-mock";
import {
  BackendBackground,
  BackendStage,
  BackendUser,
  MANAGEMENT_STATUSES,
  ManagementPriority,
  ManagementStatus,
  ManagementWrite,
  StageCatalogItem,
  StageStatus,
} from "../../shared/services/api-models";
import { FILE_MAX_BYTES, FilesApiService, nombreDeArchivo } from "../../shared/services/files-api";
import { fechaIsoAVista, fechaVistaAIso, gestionATramite } from "../../shared/services/management-presentation";
import { mensajeDeError } from "../../shared/services/api-base";
import { BitacoraApiService, LOG_COMMENT_MAX, LOG_TITLE_MAX } from "../../shared/services/bitacora-api";
import { CatalogApiService } from "../../shared/services/catalog-api";
import { IdentityApiService } from "../../shared/services/identity-api";
import { aManagementWrite, ManagementApiService } from "../../shared/services/management-api";


const PRIORIDADES: readonly ManagementPriority[] = ["Alta", "Media", "Baja"];
/** Estados que exigen archivo asociado en antecedentes N2+. */
const ESTADOS_RECIBIDO = ["Recibido", "Recibido conforme"];
/** Máximo de `requesterName` en `ManagementWrite`. */
const SOLICITANTE_MAX = 150;

/** Datos generales editables (`ManagementWrite`). Las fechas en `DD-MM-YYYY`. */
export interface CabeceraEditable {
  estado: string;
  prioridad: string;
  responsableId: string;
  solicitante: string;
  fechaApertura: string;
  fechaEstimada: string;
}

export type ErroresCabecera = Partial<Record<keyof CabeceraEditable, string>>;

/** Máximo de `notes` en `PUT /gestiones/stages/{id}`. */
const NOTAS_ETAPA_MAX = 300;

interface OpcionResponsable {
  label: string;
  value: string;
}

/** Valores editables de una etapa, para detectar cambios antes de guardar. */
interface ValoresEtapa {
  estado: string;
  fechaEstimada: string;
  fechaReal: string;
  responsableId: string | null;
  observacion: string;
}

interface AntecedenteConNivel {
  id: string;
  nivel: string;
  padreId: string | null;
  expandido: boolean;
}

interface AntecedenteVisible<T extends AntecedenteConNivel> {
  antecedente: T;
  profundidad: number;
}

@Component({
  selector: "app-tramite-detalle",
  standalone: true,
  imports: [
    BitacoraPanel,
    ButtonDirective,
    CommonModule,
    DatePickerModule,
    DialogModule,
    FileUploadModule,
    FormsModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    UploadIcon,
    PanelModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    SelectModule,
    TagModule,
    TextareaModule,
  ],
  templateUrl: "./tramite-detalle.html",
  styleUrl: "./tramite-detalle.scss",
})
export class TramiteDetalle {
  private _tramiteId: string | number | null = null;
  private _visible = false;
  private ultimaRevisionEnviada: string | null = null;

  @Input()
  set visible(visible: boolean) {
    const seAbreDetalle = visible && !this._visible;

    this._visible = visible;

    if (seAbreDetalle) {
      this.registrarUltimaRevision();
    }
  }

  get visible(): boolean {
    return this._visible;
  }

  @Output() readonly visibleChange = new EventEmitter<boolean>();
  /** Emite el trámite actualizado tras guardar, para refrescar el listado. */
  @Output() readonly tramiteActualizado = new EventEmitter<Tramite>();
  @ViewChild("archivoInput") archivoInput?: ElementRef<HTMLInputElement>;
  @ViewChild(BitacoraPanel) bitacoraPanel?: BitacoraPanel;

  @Input()
  set tramiteId(tramiteId: string | number | null) {
    if (this._tramiteId !== tramiteId) {
      this.ultimaRevisionEnviada = null;
    }

    this._tramiteId = tramiteId;
    this.cargandoDetalle = Boolean(tramiteId && this.managementApi);
    this.erroresCarga = [];
    this.mensajeArchivo = "";
    this.errorGuardado = "";
    this.cancelarEdicionCabecera();
    this.tramite = tramiteId
      ? this.tramitesMock.obtenerPorId(tramiteId)
      : undefined;
    // Primero se prepara la vista con la copia local; los datos del backend se
    // aplican después y no deben ser pisados por esta preparación.
    this.cargarDatosEditables();
    if (this.visible) {
      this.registrarUltimaRevision();
    }
    this.limpiarFormularioDocumento();
    this.restablecerJerarquiaAntecedentes();

    if (tramiteId && this.managementApi) {
      // El listado puede tener una copia previa. Se muestra de inmediato, pero
      // el detalle siempre se refresca para evitar presentar información obsoleta.
      // Gestión + usuarios + antecedentes + etapas (con su catálogo).
      this.solicitudesDetallePendientes = 4;
      this.tramitesMock.cargarPorId(tramiteId).pipe(
        finalize(() => this.finalizarCargaDetalle()),
      ).subscribe({
        next: (tramite) => {
          if (this._tramiteId !== tramiteId) {
            this.cancelarCargaDetalle();
            return;
          }
          this.tramite = tramite;
          this.cargarDatosEditables();
          if (this.visible) {
            this.registrarUltimaRevision();
          }
          this.cargarDatosBackend(tramite);
        },
        error: (error: unknown) => {
          if (this.tramite && this._tramiteId === tramiteId) {
            this.cargarDatosBackend(this.tramite);
          } else {
            this.agregarErrorCarga(mensajeDeError(error, "No fue posible cargar el trámite."));
            this.cancelarCargaDetalle();
          }
        },
      });
    }
  }


  get tramiteId(): string | number | null {
    return this._tramiteId;
  }

  tramite: Tramite | undefined;
  private responsablesApi: BackendUser[] = [];
  /** Valores cargados del backend, para enviar solo lo que cambió. */
  private readonly antecedentesOriginales = new Map<string, { estado: string; responsableId: string | null }>();
  private readonly etapasOriginales = new Map<EtapaDetalle, ValoresEtapa>();
  opcionesResponsables: OpcionResponsable[] = [];
  readonly estadosTramite = [...MANAGEMENT_STATUSES];
  readonly prioridades = [...PRIORIDADES];
  readonly solicitanteMax = SOLICITANTE_MAX;
  editandoCabecera = false;
  cabecera: CabeceraEditable = this.cabeceraVacia();
  erroresCabecera: ErroresCabecera = {};
  /** Avisos de secciones que no se pudieron cargar. */
  erroresCarga: string[] = [];
  /** Antecedente cuyo archivo se está subiendo o descargando. */
  archivoEnCursoId: string | null = null;
  mensajeArchivo = "";
  mensajeArchivoEsError = false;
  guardando = false;
  cargandoDetalle = false;
  private solicitudesDetallePendientes = 0;
  errorGuardado = "";
  tipoAntecedenteNuevo: string | null = null;
  archivoAntecedenteNuevo: File | null = null;
  contextoDocumentoNuevo = "";
  mensajeDocumento = "";
  mensajeDocumentoEsError = false;
  readonly estadosAntecedente = [...ESTADOS_ANTECEDENTE];
  readonly estadosEtapa = [...ESTADOS_ETAPA];

  tiposAntecedenteAdicional: string[] = [];

  antecedentesRequeridos: AntecedenteRequeridoDetalle[] = [];

  antecedentesComplementarios: AntecedenteComplementarioDetalle[] = [];

  etapasGestion: EtapaDetalle[] = [];

  readonly archivosAdjuntos: Array<{
    archivo: string; categoria: string; documento: string;
    fechaCarga: string; cargadoPor: string;
  }> = [];

  private readonly datosEditablesIniciales = this.clonarDatosEditables({
    antecedentesRequeridos: this.antecedentesRequeridos,
    antecedentesComplementarios: this.antecedentesComplementarios,
    etapas: this.etapasGestion,
  });

  constructor(
    private readonly tramitesMock: TramitesMock,
    readonly userSession: UserSessionService,
    @Optional() private readonly managementApi: ManagementApiService | null = null,
    @Optional() private readonly identityApi: IdentityApiService | null = null,
    @Optional() private readonly bitacoraApi: BitacoraApiService | null = null,
    @Optional() private readonly catalogApi: CatalogApiService | null = null,
    @Optional() private readonly changeDetectorRef: ChangeDetectorRef | null = null,
    @Optional() private readonly filesApi: FilesApiService | null = null,
  ) {}

  private aplicarAntecedentesBackend(items: BackendBackground[]): void {
    // El N1 es el tipo principal de la gestión (ya visible en la cabecera).
    const antecedentes = items.filter((item) => item.level !== "N1");
    const ids = new Set(antecedentes.map(({ id }) => id));
    // Un padre que no se muestra (por ejemplo, el N1) deja al hijo en la raíz.
    const padreDe = (item: BackendBackground) =>
      item.parentManagementBackgroundId && ids.has(item.parentManagementBackgroundId)
        ? item.parentManagementBackgroundId
        : null;
    const comunes = (item: BackendBackground) => ({
      id: item.id,
      nivel: item.level,
      padreId: padreDe(item),
      expandido: true,
      responsableId: item.responsibleUserId,
      responsable: this.nombreResponsable(item.responsibleUserId),
      estado: item.status,
      archivo: nombreDeArchivo(item.fileReference),
      referenciaArchivo: item.fileReference,
      fechaCarga: item.fileReference ? this.formatearFechaBackend(item.uploadedAt) : "",
    });

    this.antecedentesOriginales.clear();
    antecedentes.forEach((item) => this.antecedentesOriginales.set(item.id, {
      estado: item.status,
      responsableId: item.responsibleUserId,
    }));
    this.antecedentesRequeridos = this.ordenarAntecedentesFisicos(
      antecedentes.filter((item) => item.required).map((item) => ({
        ...comunes(item),
        antecedente: item.managementTypeName,
        obligatorio: true,
      })),
    );
    this.antecedentesComplementarios = this.ordenarAntecedentesFisicos(
      antecedentes.filter((item) => !item.required).map((item) => ({
        ...comunes(item),
        tipoDocumento: item.managementTypeName,
        solicitadoPor: "",
      })),
    );
    this.tiposAntecedenteAdicional = [...new Set(this.antecedentesComplementarios.map(({ tipoDocumento }) => tipoDocumento))];
    this.restablecerJerarquiaAntecedentes();
  }

  private ordenarAntecedentesFisicos<T extends { id: string; padreId: string | null }>(
    antecedentes: T[],
  ): T[] {
    const hijos = new Map<string, T[]>();
    antecedentes.forEach((antecedente) => {
      if (!antecedente.padreId) return;
      const grupo = hijos.get(antecedente.padreId) ?? [];
      grupo.push(antecedente);
      hijos.set(antecedente.padreId, grupo);
    });

    const visitados = new Set<string>();
    const resultado: T[] = [];
    const agregarConDescendientes = (antecedente: T): void => {
      if (visitados.has(antecedente.id)) return;
      visitados.add(antecedente.id);
      resultado.push(antecedente);
      (hijos.get(antecedente.id) ?? []).forEach(agregarConDescendientes);
    };

    antecedentes.filter(({ padreId }) => !padreId).forEach(agregarConDescendientes);
    antecedentes.forEach(agregarConDescendientes);
    return resultado;
  }

  /**
   * Combina las etapas de la gestión con el catálogo: las que aún no existen se
   * muestran pendientes y se crean (`POST`) solo si se editan.
   */
  private aplicarEtapasBackend(items: BackendStage[], catalogo: StageCatalogItem[] = []): void {
    const desdeBackend = (item: BackendStage): EtapaDetalle => ({
      id: item.id,
      stageId: item.stageId,
      etapa: item.stageName || item.stageId,
      porcentaje: item.percentage ?? 0,
      estado: item.status,
      fechaEstimada: this.formatearFechaBackend(item.estimatedOn),
      fechaReal: this.formatearFechaBackend(item.completedOn),
      responsableId: item.responsibleUserId,
      responsable: item.responsible ?? "",
      observacion: item.notes ?? "",
    });
    const porEtapa = new Map(items.map((item) => [item.stageId, item]));
    const delCatalogo = [...catalogo]
      .sort((a, b) => a.order - b.order)
      .map((etapa): EtapaDetalle => {
        const existente = porEtapa.get(etapa.id);
        return existente
          ? desdeBackend(existente)
          : {
              stageId: etapa.id,
              etapa: etapa.name,
              porcentaje: etapa.percentage,
              estado: "Pendiente",
              fechaEstimada: "",
              fechaReal: "",
              responsableId: null,
              responsable: "",
              observacion: "",
            };
      });
    const enCatalogo = new Set(catalogo.map(({ id }) => id));
    this.etapasGestion = [
      ...delCatalogo,
      ...items.filter((item) => !enCatalogo.has(item.stageId)).map(desdeBackend),
    ];
    this.etapasOriginales.clear();
    this.etapasGestion.forEach((etapa) => this.etapasOriginales.set(etapa, this.valoresEtapa(etapa)));
  }

  private valoresEtapa(etapa: EtapaDetalle): ValoresEtapa {
    return {
      estado: etapa.estado,
      fechaEstimada: etapa.fechaEstimada ?? "",
      fechaReal: etapa.fechaReal ?? "",
      responsableId: etapa.responsableId ?? null,
      observacion: etapa.observacion ?? "",
    };
  }


  get puedeAdjuntarAntecedente(): boolean {
    return Boolean(this.tipoAntecedenteNuevo && this.archivoAntecedenteNuevo);
  }

  get porcentajeAvance(): number {
    return this.etapasGestion.reduce(
      (porcentaje, etapa) =>
        etapa.estado !== "Pendiente"
          ? Math.max(porcentaje, etapa.porcentaje)
          : porcentaje,
      0,
    );
  }

  get antecedentesRequeridosVisibles(): AntecedenteVisible<AntecedenteRequeridoDetalle>[] {
    return this.obtenerAntecedentesVisibles(this.antecedentesRequeridos);
  }

  get antecedentesComplementariosVisibles(): AntecedenteVisible<AntecedenteComplementarioDetalle>[] {
    return this.obtenerAntecedentesVisibles(this.antecedentesComplementarios);
  }

  actualizarVisibilidad(visible: boolean): void {
    this.visible = visible;

    if (!visible) {
      this.limpiarFormularioDocumento();
      this.guardarUltimaRevision();
    }

    this.visibleChange.emit(visible);
  }

  cerrar(): void {
    this.actualizarVisibilidad(false);
  }

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.item(0) ?? null;

    if (archivo && archivo.size > 10_000_000) {
      this.archivoAntecedenteNuevo = null;
      this.mensajeDocumento = "El archivo supera el tamaño máximo de 10 MB.";
      this.mensajeDocumentoEsError = true;
      input.value = "";
      return;
    }

    this.archivoAntecedenteNuevo = archivo;
    this.mensajeDocumento = "";
    this.mensajeDocumentoEsError = false;
  }

  /** Sube el archivo de un antecedente (`POST /archivos/items`). */
  cargarArchivoAntecedente(
    event: Event | { files?: File[] },
    antecedente: AntecedenteRequeridoDetalle | AntecedenteComplementarioDetalle,
  ): void {
    const archivo = "files" in event
      ? event.files?.[0] ?? null
      : ((event as Event).target as HTMLInputElement).files?.item(0) ?? null;
    if ("target" in event) {
      ((event as Event).target as HTMLInputElement).value = "";
    }

    if (!archivo) {
      return;
    }

    if (archivo.size > FILE_MAX_BYTES) {
      this.mostrarMensajeArchivo("El archivo supera el tamaño máximo de 10 MB.", true);
      return;
    }

    if (!this.filesApi) {
      this.mostrarMensajeArchivo("La carga de archivos no está disponible.", true);
      return;
    }

    if (this.archivoEnCursoId) {
      return;
    }

    this.archivoEnCursoId = antecedente.id;
    this.mostrarMensajeArchivo("", false);
    this.filesApi.upload(archivo, antecedente.id).pipe(
      finalize(() => {
        this.archivoEnCursoId = null;
        this.changeDetectorRef?.markForCheck();
      }),
    ).subscribe({
      next: (registro) => {
        antecedente.referenciaArchivo = registro.storageReference;
        antecedente.archivo = nombreDeArchivo(registro.storageReference) || archivo.name;
        antecedente.fechaCarga = this.formatearFechaBackend(registro.uploadedAt);
        this.mostrarMensajeArchivo(`Se cargó el archivo de «${this.nombreDeAntecedente(antecedente)}».`, false);
      },
      error: (error: unknown) => this.mostrarMensajeArchivo(
        mensajeDeError(error, "No fue posible subir el archivo. Inténtalo nuevamente."),
        true,
      ),
    });
  }

  /** Descarga o abre el archivo de un antecedente (`GET /archivos/items/{id}/download`). */
  descargarArchivo(
    antecedente: AntecedenteRequeridoDetalle | AntecedenteComplementarioDetalle,
    visualizar = false,
  ): void {
    if (!this.filesApi || !antecedente.referenciaArchivo || this.archivoEnCursoId) {
      return;
    }

    this.archivoEnCursoId = antecedente.id;
    this.mostrarMensajeArchivo("", false);
    this.filesApi.download(antecedente.id).pipe(
      finalize(() => {
        this.archivoEnCursoId = null;
        this.changeDetectorRef?.markForCheck();
      }),
    ).subscribe({
      next: (blob) => this.entregarArchivo(blob, antecedente.archivo || `archivo-${antecedente.id}`, visualizar),
      error: (error: unknown) => this.mostrarMensajeArchivo(
        mensajeDeError(error, "No fue posible obtener el archivo. Inténtalo nuevamente."),
        true,
      ),
    });
  }

  actualizarEstadoEtapa(indice: number, estado: string): void {
    if (!this.puedeEditarEtapa(indice)) {
      return;
    }

    this.etapasGestion[indice].estado = estado;

    if (estado === "Completado") {
      return;
    }

    this.etapasGestion.slice(indice + 1).forEach((etapa) => {
      etapa.estado = "Pendiente";
    });
  }

  puedeEditarEtapa(indice: number): boolean {
    return (
      indice === 0 || this.etapasGestion[indice - 1].estado === "Completado"
    );
  }

  private finalizarCargaDetalle(): void {
    this.solicitudesDetallePendientes -= 1;

    if (this.solicitudesDetallePendientes <= 0) {
      this.cargandoDetalle = false;
      this.changeDetectorRef?.markForCheck();
    }
  }

  private cancelarCargaDetalle(): void {
    this.solicitudesDetallePendientes = 0;
    this.cargandoDetalle = false;
    this.changeDetectorRef?.markForCheck();
  }

  private cargarDatosBackend(tramite: Tramite): void {
    if (!this.managementApi || !this.identityApi || !tramite.apiId) {
      this.cancelarCargaDetalle();
      return;
    }

    const apiId = tramite.apiId;
    this.erroresCarga = [];
    this.identityApi.cachedUsers().pipe(finalize(() => this.finalizarCargaDetalle())).subscribe({
      next: (users) => {
        this.responsablesApi = users;
        this.opcionesResponsables = users.map((user) => ({ label: this.nombreUsuario(user), value: user.id }));
        this.actualizarNombresResponsables();
      },
      error: () => this.agregarErrorCarga("No fue posible cargar la lista de responsables."),
    });
    this.managementApi.backgrounds(apiId).pipe(finalize(() => this.finalizarCargaDetalle())).subscribe({
      next: (items) => this.aplicarAntecedentesBackend(items),
      error: (error: unknown) => this.agregarErrorCarga(mensajeDeError(error, "No fue posible cargar los antecedentes.")),
    });
    // El catálogo de etapas es complementario: si falla, se muestran las etapas de la gestión.
    const catalogo: Observable<StageCatalogItem[]> = this.catalogApi
      ? this.catalogApi.stageCatalog().pipe(catchError(() => of([])))
      : of([]);
    forkJoin({ etapas: this.managementApi.stages(apiId), catalogo }).pipe(
      finalize(() => this.finalizarCargaDetalle()),
    ).subscribe({
      next: ({ etapas, catalogo: items }) => this.aplicarEtapasBackend(etapas, items),
      error: (error: unknown) => this.agregarErrorCarga(mensajeDeError(error, "No fue posible cargar las etapas.")),
    });
    // La bitácora la carga `BitacoraPanel` con el id de la gestión.
  }

  private agregarErrorCarga(mensaje: string): void {
    this.erroresCarga = [...this.erroresCarga, mensaje];
    this.changeDetectorRef?.markForCheck();
  }

  private actualizarNombresResponsables(): void {
    [...this.antecedentesRequeridos, ...this.antecedentesComplementarios].forEach((item) => {
      if (item.responsableId) {
        item.responsable = this.nombreResponsable(item.responsableId);
      }
    });
  }

  iniciarEdicionCabecera(): void {
    if (!this.tramite || this.guardando) return;
    this.cabecera = {
      estado: this.tramite.estado,
      prioridad: this.tramite.prioridad,
      responsableId: this.tramite.responsableUserId ?? "",
      solicitante: this.tramite.solicitanteCopec,
      fechaApertura: this.fechaEditable(this.tramite.fechaApertura),
      fechaEstimada: this.fechaEditable(this.tramite.fechaEstimadaTermino),
    };
    this.erroresCabecera = {};
    this.editandoCabecera = true;
  }

  cancelarEdicionCabecera(): void {
    this.editandoCabecera = false;
    this.cabecera = this.cabeceraVacia();
    this.erroresCabecera = {};
  }

  /** Limpia el error de un campo cuando la persona lo corrige. */
  limpiarErrorCabecera(campo: keyof CabeceraEditable): void {
    if (this.erroresCabecera[campo]) {
      const { [campo]: _, ...resto } = this.erroresCabecera;
      this.erroresCabecera = resto;
    }
  }

  /** Reglas de `ManagementWrite` y de la base (`fecha_estimada_termino >= fecha_apertura`). */
  validarCabecera(): ErroresCabecera {
    const errores: ErroresCabecera = {};
    const c = this.cabecera;
    if (!MANAGEMENT_STATUSES.includes(c.estado as ManagementStatus)) {
      errores.estado = "Selecciona un estado válido.";
    }
    if (!PRIORIDADES.includes(c.prioridad as ManagementPriority)) {
      errores.prioridad = "Selecciona una prioridad.";
    }
    if (!/^[1-9]\d*$/.test(c.responsableId)) {
      errores.responsableId = "Selecciona un responsable.";
    }
    const solicitante = c.solicitante.trim();
    if (!solicitante) {
      errores.solicitante = "Ingresa el solicitante.";
    } else if (solicitante.length > SOLICITANTE_MAX) {
      errores.solicitante = `El solicitante no puede superar los ${SOLICITANTE_MAX} caracteres.`;
    }
    const apertura = this.fechaParaApi(c.fechaApertura);
    const estimada = this.fechaParaApi(c.fechaEstimada);
    if (!apertura) {
      errores.fechaApertura = "Ingresa una fecha de apertura válida (DD-MM-AAAA).";
    }
    if (c.fechaEstimada && !estimada) {
      errores.fechaEstimada = "Ingresa una fecha válida (DD-MM-AAAA) o déjala vacía.";
    } else if (apertura && estimada && estimada < apertura) {
      errores.fechaEstimada = "La fecha estimada de término no puede ser anterior a la de apertura.";
    }
    return errores;
  }

  guardarCambios(): void {
    if (!this.tramite || this.guardando) {
      return;
    }

    const tramiteActualizado: Tramite = {
      ...this.tramite,
      detalleEditable: this.clonarDatosEditables({
        antecedentesRequeridos: this.antecedentesRequeridos,
        antecedentesComplementarios: this.antecedentesComplementarios,
        etapas: this.etapasGestion,
      }),
    };

    if (!this.managementApi || !this.tramite.apiId) {
      this.tramitesMock.guardar(tramiteActualizado);
      this.tramite = tramiteActualizado;
      this.actualizarVisibilidad(false);
      return;
    }

    if (this.editandoCabecera) {
      this.erroresCabecera = this.validarCabecera();
      if (Object.keys(this.erroresCabecera).length > 0) {
        this.errorGuardado = "Revisa los datos generales marcados antes de guardar.";
        return;
      }
    }

    const errores = this.validarCambios();
    if (errores.length > 0) {
      this.errorGuardado = errores.join(" ");
      return;
    }

    const apiId = this.tramite.apiId;
    const api = this.managementApi;
    const antecedentes = this.antecedentesModificados().map((item) => api.updateBackground(item.id, {
      responsibleUserId: item.responsableId ?? null,
      status: item.estado,
      fileReference: item.referenciaArchivo ?? null,
    }));
    const etapas = this.etapasModificadas().map((etapa) => {
      const cuerpo = {
        status: etapa.estado as StageStatus,
        estimatedOn: this.fechaParaApi(etapa.fechaEstimada),
        completedOn: this.fechaParaApi(etapa.fechaReal),
        responsibleUserId: etapa.responsableId ?? null,
        notes: etapa.observacion.trim() || null,
      };
      return etapa.id
        ? api.updateStage(etapa.id, cuerpo)
        : api.createStage(apiId, { stageId: etapa.stageId!, ...cuerpo });
    });
    const fechaRevision = this.tramite.fechaUltimaRevision ?? null;
    const edicion = this.editandoCabecera ? this.cabeceraParaApi() : {};
    // La cabecera se reenvía completa (`ManagementWrite`) con la última revisión
    // y, si se editaron, los datos generales.
    const cabecera = api.management(apiId).pipe(
      switchMap((management) => api.updateManagement(apiId, {
        ...aManagementWrite(management),
        ...edicion,
        lastReviewedOn: this.fechaRevisionParaApi(fechaRevision),
      })),
    );

    this.guardando = true;
    this.errorGuardado = "";
    forkJoin([cabecera, ...antecedentes, ...etapas]).pipe(
      finalize(() => {
        this.guardando = false;
        this.changeDetectorRef?.markForCheck();
      }),
    ).subscribe({
      next: ([gestionGuardada]) => {
        // La respuesta del PUT trae los datos de presentación recalculados
        // (responsable, semáforo…); se conserva lo editable de esta vista.
        const actualizado: Tramite = {
          ...gestionATramite(gestionGuardada),
          fechaUltimaRevision: fechaRevision,
          detalleEditable: tramiteActualizado.detalleEditable,
        };
        this.tramite = actualizado;
        this.tramitesMock.guardar(actualizado);
        this.ultimaRevisionEnviada = fechaRevision;
        this.cancelarEdicionCabecera();
        this.tramiteActualizado.emit(actualizado);
        this.actualizarVisibilidad(false);
      },
      error: (error: unknown) => {
        this.errorGuardado = `${mensajeDeError(error, "No fue posible guardar los cambios.")} Es posible que parte de los cambios se haya guardado; vuelve a abrir el detalle para revisarlos.`;
      },
    });
  }

  private cabeceraParaApi(): Partial<ManagementWrite> {
    const c = this.cabecera;
    const apertura = this.fechaParaApi(c.fechaApertura);
    return {
      status: c.estado as ManagementStatus,
      priority: c.prioridad as ManagementPriority,
      responsibleUserId: c.responsableId,
      requesterName: c.solicitante.trim(),
      // Validada antes de llegar aquí; si faltara, se conserva la del backend.
      ...(apertura ? { openedOn: apertura } : {}),
      estimatedCompletionOn: this.fechaParaApi(c.fechaEstimada),
    };
  }

  private cabeceraVacia(): CabeceraEditable {
    return { estado: "", prioridad: "", responsableId: "", solicitante: "", fechaApertura: "", fechaEstimada: "" };
  }

  /** Las fechas de vista pueden traer textos como "Sin especificar". */
  private fechaEditable(fecha: string | null | undefined): string {
    return fecha && this.fechaParaApi(fecha) ? fecha : "";
  }

  /** Reglas del backend que se pueden comprobar antes de enviar. */
  private validarCambios(): string[] {
    const errores: string[] = [];
    // El backend exige archivo solo para marcar un antecedente N2+ como recibido.
    this.antecedentesModificados()
      .filter((item) => ESTADOS_RECIBIDO.includes(item.estado) && !item.referenciaArchivo)
      .forEach((item) => errores.push(
        `Para marcar «${this.nombreDeAntecedente(item)}» como recibido primero debes cargar su archivo.`,
      ));
    this.etapasModificadas().forEach((etapa) => {
      const estimada = this.fechaParaApi(etapa.fechaEstimada);
      const real = this.fechaParaApi(etapa.fechaReal);
      if ((etapa.fechaEstimada && !estimada) || (etapa.fechaReal && !real)) {
        errores.push(`Revisa las fechas de la etapa «${etapa.etapa}» (formato DD-MM-AAAA).`);
      } else if (estimada && real && real < estimada) {
        errores.push(`En la etapa «${etapa.etapa}», la fecha real no puede ser anterior a la estimada.`);
      }
      if (etapa.observacion.trim().length > NOTAS_ETAPA_MAX) {
        errores.push(`La observación de la etapa «${etapa.etapa}» supera los ${NOTAS_ETAPA_MAX} caracteres.`);
      }
      if (!etapa.id && !etapa.stageId) {
        errores.push(`La etapa «${etapa.etapa}» no está en el catálogo y no se puede crear.`);
      }
    });
    return errores;
  }

  private antecedentesModificados(): Array<AntecedenteRequeridoDetalle | AntecedenteComplementarioDetalle> {
    return [...this.antecedentesRequeridos, ...this.antecedentesComplementarios].filter((item) => {
      const original = this.antecedentesOriginales.get(item.id);
      return original !== undefined
        && (original.estado !== item.estado || original.responsableId !== (item.responsableId ?? null));
    });
  }

  private etapasModificadas(): EtapaDetalle[] {
    return this.etapasGestion.filter((etapa) => {
      const original = this.etapasOriginales.get(etapa);
      if (!original) return false;
      const actual = this.valoresEtapa(etapa);
      return (Object.keys(actual) as Array<keyof ValoresEtapa>).some((clave) => actual[clave] !== original[clave]);
    });
  }

  adjuntarAntecedente(): void {
    if (
      !this.tramite ||
      !this.tipoAntecedenteNuevo ||
      !this.archivoAntecedenteNuevo
    ) {
      return;
    }

    const ahora = new Date();
    const usuario = this.userSession.currentUser();
    const tipoDocumento = this.tipoAntecedenteNuevo;
    const archivo = this.archivoAntecedenteNuevo.name;
    const contexto = this.contextoDocumentoNuevo.trim();
    const fecha = this.formatearFecha(ahora);
    const hora = this.formatearHora(ahora);

    this.antecedentesComplementarios.unshift({
      id: `antecedente-adicional-${ahora.getTime()}`,
      nivel: "N2",
      padreId: null,
      expandido: false,
      tipoDocumento,
      solicitadoPor: "Durante la gestión",
      responsable: usuario.fullName,
      estado: "Recibido",
      fechaCarga: fecha,
      archivo,
    });
    this.archivosAdjuntos.unshift({
      archivo,
      categoria: "Antecedente adicional",
      documento: tipoDocumento,
      fechaCarga: `${fecha} ${hora}`,
      cargadoPor: usuario.fullName,
    });

    this.tipoAntecedenteNuevo = null;
    this.archivoAntecedenteNuevo = null;
    this.contextoDocumentoNuevo = "";
    this.mensajeDocumento = "El documento quedó asociado al trámite.";
    this.mensajeDocumentoEsError = false;
    this.limpiarArchivoSeleccionado();
    this.registrarDocumentoEnBitacora(
      tipoDocumento,
      contexto || `Se incorporó el archivo ${archivo} como evidencia del trámite.`,
    );
  }

  /** Registra la recepción del documento en la bitácora (`POST /bitacora/items`). */
  private registrarDocumentoEnBitacora(tipoDocumento: string, comentario: string): void {
    const managementId = this.tramite?.apiId;
    if (!this.bitacoraApi || !managementId) return;

    this.bitacoraApi.createLog({
      managementId,
      title: `Documento incorporado: ${tipoDocumento}`.slice(0, LOG_TITLE_MAX),
      comment: comentario.slice(0, LOG_COMMENT_MAX),
      type: "novedad",
      // Fecha, hora (America/Santiago) y autor los asigna el backend.
    }).subscribe({
      next: () => {
        this.mensajeDocumento =
          "El documento quedó asociado al trámite y la recepción fue registrada en la bitácora.";
        this.bitacoraPanel?.cargar();
        this.changeDetectorRef?.markForCheck();
      },
      error: (error: unknown) => {
        this.mensajeDocumento = `El documento quedó asociado al trámite, pero no se registró en la bitácora. ${mensajeDeError(error, "Inténtalo nuevamente más tarde.")}`;
        this.mensajeDocumentoEsError = true;
        this.changeDetectorRef?.markForCheck();
      },
    });
  }

  alternarAntecedente(
    antecedente: AntecedenteConNivel,
    antecedentes: readonly AntecedenteConNivel[],
  ): void {
    if (!this.cantidadAntecedentesHijos(antecedente, antecedentes)) {
      return;
    }

    antecedente.expandido = !antecedente.expandido;

    if (!antecedente.expandido) {
      this.contraerDescendientes(antecedente, antecedentes);
    }
  }

  cantidadAntecedentesHijos(
    antecedente: AntecedenteConNivel,
    antecedentes: readonly AntecedenteConNivel[],
  ): number {
    return antecedentes.filter(({ padreId }) => padreId === antecedente.id)
      .length;
  }

  limpiarMensajeDocumento(): void {
    this.mensajeDocumento = "";
    this.mensajeDocumentoEsError = false;
  }

  tieneArchivo(archivo: string | null | undefined): boolean {
    return Boolean(archivo && archivo !== "—");
  }

  obtenerSeveridadEstado(estado: string): TagSeverity {
    return resolverSeveridadEstado(estado);
  }

  private limpiarFormularioDocumento(): void {
    this.tipoAntecedenteNuevo = null;
    this.archivoAntecedenteNuevo = null;
    this.contextoDocumentoNuevo = "";
    this.mensajeDocumento = "";
    this.mensajeDocumentoEsError = false;
    this.limpiarArchivoSeleccionado();
  }

  private cargarDatosEditables(): void {
    const datos = this.tramite?.detalleEditable ?? this.datosEditablesIniciales;
    const copia = this.clonarDatosEditables(datos);

    this.antecedentesRequeridos = copia.antecedentesRequeridos;
    this.antecedentesComplementarios = copia.antecedentesComplementarios;
    this.etapasGestion = copia.etapas;
  }

  private clonarDatosEditables(
    datos: DetalleEditableTramite,
  ): DetalleEditableTramite {
    return {
      antecedentesRequeridos: datos.antecedentesRequeridos.map(
        (antecedente) => ({ ...antecedente }),
      ),
      antecedentesComplementarios: datos.antecedentesComplementarios.map(
        (antecedente) => ({ ...antecedente }),
      ),
      etapas: datos.etapas.map((etapa) => ({ ...etapa })),
    };
  }

  private limpiarArchivoSeleccionado(): void {
    if (this.archivoInput) {
      this.archivoInput.nativeElement.value = "";
    }
  }

  private obtenerAntecedentesVisibles<T extends AntecedenteConNivel>(
    antecedentes: readonly T[],
  ): AntecedenteVisible<T>[] {
    const antecedentesPorId = new Map(
      antecedentes.map((antecedente) => [antecedente.id, antecedente]),
    );

    return antecedentes.flatMap((antecedente) => {
      let profundidad = 0;
      let padreId = antecedente.padreId;
      const idsVisitados = new Set<string>();

      while (padreId) {
        if (idsVisitados.has(padreId)) {
          return [];
        }

        idsVisitados.add(padreId);
        const padre = antecedentesPorId.get(padreId);

        if (!padre || !padre.expandido) {
          return [];
        }

        profundidad += 1;
        padreId = padre.padreId;
      }

      return [{ antecedente, profundidad }];
    });
  }

  private restablecerJerarquiaAntecedentes(): void {
    [this.antecedentesRequeridos, this.antecedentesComplementarios].forEach(
      (antecedentes) => {
        antecedentes.forEach((antecedente) => {
          antecedente.expandido =
            antecedente.padreId === null &&
            this.cantidadAntecedentesHijos(antecedente, antecedentes) > 0;
        });
      },
    );
  }

  private contraerDescendientes(
    antecedente: AntecedenteConNivel,
    antecedentes: readonly AntecedenteConNivel[],
  ): void {
    antecedentes
      .filter(({ padreId }) => padreId === antecedente.id)
      .forEach((hijo) => {
        hijo.expandido = false;
        this.contraerDescendientes(hijo, antecedentes);
      });
  }

  private registrarUltimaRevision(): void {
    if (!this.tramite) {
      return;
    }

    const fecha = this.formatearFecha(new Date());
    this.tramite = {
      ...this.tramite,
      fechaUltimaRevision: fecha,
    };
    this.tramitesMock.guardar(this.tramite);
  }

  private guardarUltimaRevision(): void {
    if (
      !this.managementApi ||
      !this.tramite?.apiId ||
      !this.tramite.fechaUltimaRevision ||
      this.ultimaRevisionEnviada === this.tramite.fechaUltimaRevision
    ) {
      return;
    }

    const api = this.managementApi;
    const apiId = this.tramite.apiId;
    const fechaRevision = this.tramite.fechaUltimaRevision;
    api.management(apiId).pipe(
      switchMap((management) => api.updateManagement(apiId, {
        ...aManagementWrite(management),
        lastReviewedOn: this.fechaRevisionParaApi(fechaRevision),
      })),
    ).subscribe({
      next: () => {
        this.ultimaRevisionEnviada = fechaRevision;
      },
      // Registrar la revisión es secundario: si falla, se reintenta al volver a cerrar.
      error: () => undefined,
    });
  }

  private fechaRevisionParaApi(fecha: string | null | undefined): string | null {
    if (!fecha) {
      return null;
    }

    const [dia, mes, anio] = fecha.split("-");
    return `${anio}-${mes}-${dia}`;
  }

  private formatearFecha(fecha: Date): string {
    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Santiago",
    })
      .format(fecha)
      .replaceAll("/", "-");
  }

  /** Fecha o instante del backend (`YYYY-MM-DD…`) → `DD-MM-YYYY`; vacío si no hay. */
  private formatearFechaBackend(fecha: string | null | undefined): string {
    return fechaIsoAVista(fecha) ?? "";
  }


  /** `DD-MM-YYYY` o `DD/MM/YYYY` → `YYYY-MM-DD`; `null` si está vacía o no es válida. */
  private fechaParaApi(fecha: string | null | undefined): string | null {
    return fechaVistaAIso(fecha);
  }


  private nombreResponsable(id: string | null | undefined): string {
    if (!id) return "";
    const user = this.responsablesApi.find(({ id: userId }) => userId === id);
    return user ? this.nombreUsuario(user) : `Usuario ${id}`;
  }

  private nombreUsuario(user: BackendUser): string {
    return [user.names, user.firstSurname, user.secondSurname].filter(Boolean).join(" ");
  }

  private nombreDeAntecedente(item: AntecedenteRequeridoDetalle | AntecedenteComplementarioDetalle): string {
    return "antecedente" in item ? item.antecedente : item.tipoDocumento;
  }

  private mostrarMensajeArchivo(mensaje: string, esError: boolean): void {
    this.mensajeArchivo = mensaje;
    this.mensajeArchivoEsError = esError;
    this.changeDetectorRef?.markForCheck();
  }

  private entregarArchivo(blob: Blob, nombre: string, visualizar: boolean): void {
    if (typeof URL === "undefined" || typeof document === "undefined") return;
    const url = URL.createObjectURL(blob);
    if (visualizar) {
      window.open(url, "_blank", "noopener");
    } else {
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombre;
      enlace.click();
    }
    // Se libera después de que el navegador tome el archivo.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }



  private formatearHora(fecha: Date): string {
    return new Intl.DateTimeFormat("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Santiago",
    }).format(fecha);
  }
}
