import { CommonModule } from "@angular/common";
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { ButtonDirective } from "primeng/button";
import { CheckboxModule } from "primeng/checkbox";
import { DatePickerModule } from "primeng/datepicker";
import { DialogModule } from "primeng/dialog";
import { FileSelectEvent, FileUploadModule } from "primeng/fileupload";
import { CheckIcon } from "primeng/icons/check";
import { InfoCircleIcon } from "primeng/icons/infocircle";
import { PlusIcon } from "primeng/icons/plus";
import { UploadIcon } from "primeng/icons/upload";
import { InputTextModule } from "primeng/inputtext";
import { MessageModule } from "primeng/message";
import { PopoverModule } from "primeng/popover";
import { ProgressBarModule } from "primeng/progressbar";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { TextareaModule } from "primeng/textarea";
import { TooltipModule } from "primeng/tooltip";
import { TrashIcon } from "primeng/icons/trash";
import { catchError, forkJoin, from, map, mergeMap, Observable, of, switchMap, toArray } from "rxjs";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";
import {
  ESTADOS_ANTECEDENTE,
  ESTADOS_ETAPA,
} from "../../models/estado-tramite";
import {
  BackendUser,
  LogEntryWrite,
  ManagementPriority,
  ManagementStatus,
  ManagementTypeNode,
  ManagementWrite,
  StageCatalogItem,
  StageStatus,
} from "../../../../shared/services/api-models";
import { ApiClientError, mensajeDeError } from "../../../../shared/services/api-base";
import { FILE_MAX_BYTES, FilesApiService } from "../../../../shared/services/files-api";
import { fechaVistaAIso } from "../../../../shared/services/management-presentation";
import { BitacoraApiService } from "../../../../shared/services/bitacora-api";
import { CatalogApiService } from "../../../../shared/services/catalog-api";
import { IdentityApiService } from "../../../../shared/services/identity-api";
import { ManagementApiService } from "../../../../shared/services/management-api";
import { UserSessionService } from "../../../../shared/services/user-session";

interface EstacionServicio {
  codigo: string;
  nombre: string;
  direccion: string;
  comuna: string;
  concesionario: string;
  rut: string;
}

/** `N2`, `N3`… según el nivel del tipo de gestión. */
type NivelAntecedente = string;

/** Tipo de gestión del catálogo que puede registrarse como antecedente. */
interface AntecedenteCatalogo {
  /** Id del tipo de gestión (`managementTypeId`). */
  id: string;
  name: string;
  level: NivelAntecedente;
  parentBackgroundId: string | null;
  required?: boolean;
  /** Nodo N2: la gestión específica misma. */
  isSpecificManagement?: boolean;
}

interface TramiteEspecifico {
  id: string;
  nombre: string;
  level: "N2";
  /** El N2 y sus documentos requeridos (N3+). */
  antecedentes: AntecedenteCatalogo[];
  /** Documentos complementarios (no requeridos) del N2. */
  complementarios?: AntecedenteCatalogo[];
}

interface OpcionCatalogo {
  label: string;
  value: string;
}

/** Antecedente a registrar en `POST /gestiones/items/{id}/backgrounds`. */
interface AntecedenteACrear {
  managementTypeId: string;
  nombre: string;
  responsibleUserId: string | null;
  estado: string;
  archivo: File | null;
}

const ESTADOS_RECIBIDO = ["Recibido", "Recibido conforme"];
const PRIORIDADES: ManagementPriority[] = ["Alta", "Media", "Baja"];
const SOLICITANTE_MAX = 150;
const NOTAS_ETAPA_MAX = 300;
/** Solicitudes de antecedentes en paralelo durante la creación. */
const CONCURRENCIA_CREACION = 4;

interface TipoTramite {
  id: string;
  nombre: string;
  scopeCode?: string;
  segundoNivelLabel: string;
  requiereSeleccionSegundoNivelParaPrincipal: boolean;
  tramitesEspecificos: TramiteEspecifico[];
}

type ModalidadCreacion = "principal" | "subtramite";

@Component({
  selector: "app-tramite-nuevo",
  standalone: true,
  imports: [
    Breadcrumbs,
    ButtonDirective,
    CheckIcon,
    CheckboxModule,
    CommonModule,
    DatePickerModule,
    DialogModule,
    FileUploadModule,
    FormsModule,
    InfoCircleIcon,
    InputTextModule,
    MessageModule,
    PlusIcon,
    PopoverModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    SelectModule,
    TableModule,
    TextareaModule,
    TooltipModule,
    TrashIcon,
    UploadIcon,
  ],
  templateUrl: "./tramite-nuevo.html",
  styleUrl: "./tramite-nuevo.scss",
})
export class TramiteNuevo implements OnInit, OnDestroy {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly identityApi = inject(IdentityApiService);
  private readonly managementApi = inject(ManagementApiService);
  private readonly bitacoraApi = inject(BitacoraApiService);
  private readonly filesApi = inject(FilesApiService);
  private readonly userSession = inject(UserSessionService);
  private temporizadorRedireccion?: ReturnType<typeof setInterval>;

  readonly segundosRedireccion = 6;
  readonly breadcrumbs = [
    { label: "Todas las gestiones", route: "/todas-las-gestiones" },
    { label: "Nuevo Trámite" },
  ];
  readonly modalidadesCreacion = [
    {
      label: "Trámite completo",
      descripcion: "Incluye todas las gestiones asociadas al tipo de trámite.",
      value: "principal" as ModalidadCreacion,
    },
    {
      label: "Una gestión/subtrámite específico",
      descripcion: "Permite gestionar únicamente una alternativa específica.",
      value: "subtramite" as ModalidadCreacion,
    },
  ];
  readonly estadosIniciales: ManagementStatus[] = ["Borrador", "Pendiente", "Ingresado"];
  readonly estadosAntecedente = [...ESTADOS_ANTECEDENTE];
  readonly estadosEtapa = [...ESTADOS_ETAPA];
  /** Documentos complementarios disponibles para la gestión configurada. */
  tiposDocumentoComplementario: OpcionCatalogo[] = [];

  estacionesServicio: EstacionServicio[] = [];
  readonly prioridades = [...PRIORIDADES];
  opcionesResponsables: OpcionCatalogo[] = [];
  /** Catálogo de etapas (`GET /catalogos/stages`). */
  etapasCatalogo: StageCatalogItem[] = [];
  tiposTramite: TipoTramite[] = [];
  tramitesEspecificos: TramiteEspecifico[] = [];

  modalidadCreacion: ModalidadCreacion | null = null;
  catalogosError = "";
  catalogosCargando = false;
  creacionError = "";
  creacionErrorCode = "";
  creacionRequestId = "";
  /** Errores de validación detectados antes de enviar. */
  erroresValidacion: string[] = [];
  /** Partes que no se pudieron registrar después de crear la gestión. */
  avisosCreacion: string[] = [];
  creando = false;
  private responsablesApi: BackendUser[] = [];
  private antecedentesCatalogoPorId = new Map<string, AntecedenteCatalogo>();
  tramiteCreadoId: string | number = "";
  segundosRestantes = this.segundosRedireccion;
  mensajeCreacionVisible = false;

  form = {
    tipoTramite: "",
    tramiteEspecifico: "",
    estacionServicio: "",
    razonSocial: "",
    nombreConcesionario: "",
    prioridad: "",
    estado: "Borrador",
    /** Id del usuario responsable. */
    responsableInterno: "",
    solicitanteCopec: "",
    fechaApertura: "",
    fechaEstimadaTermino: "",
  };

  antecedentesRequeridos: Array<ReturnType<typeof this.crearAntecedente>> = [];
  antecedentesDisponibles: AntecedenteCatalogo[] = [];
  antecedentesSeleccionadosBorrador: string[] = [];
  selectorAntecedentesVisible = false;
  antecedentesComplementarios: Array<ReturnType<typeof this.crearAntecedenteComplementario>> = [];
  etapasGestion: Array<ReturnType<typeof this.crearEtapa>> = [];

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  ngOnDestroy(): void {
    this.detenerTemporizadorRedireccion();
  }

  get tipoSeleccionado(): TipoTramite | undefined {
    return this.tiposTramite.find((tipo) => tipo.id === this.form.tipoTramite);
  }

  get gestionEspecificaSeleccionada(): TramiteEspecifico | undefined {
    return this.tiposTramite
      .find((tipo) => tipo.id === this.form.tipoTramite)
      ?.tramitesEspecificos.find((item) => item.id === this.form.tramiteEspecifico);
  }

  get requiereSeleccionSegundoNivel(): boolean {
    return Boolean(
      this.tipoSeleccionado &&
        (this.modalidadCreacion === "subtramite" ||
          (this.modalidadCreacion === "principal" &&
            this.tipoSeleccionado.requiereSeleccionSegundoNivelParaPrincipal)),
    );
  }

  get configuracionLista(): boolean {
    const tipo = this.tipoSeleccionado;

    if (!tipo || !this.modalidadCreacion) {
      return false;
    }

    if (this.modalidadCreacion === "principal") {
      return this.tipoSeleccionado.requiereSeleccionSegundoNivelParaPrincipal
        ? Boolean(this.form.tramiteEspecifico)
        : !this.form.tramiteEspecifico;
    }

    return tipo.tramitesEspecificos.some(
      (item) => item.id === this.form.tramiteEspecifico,
    );
  }

  onTipoTramiteChange(tipoTramiteId: string | null): void {
    this.form.tipoTramite = tipoTramiteId ?? "";
    this.modalidadCreacion = null;
    this.form.tramiteEspecifico = "";
    this.tramitesEspecificos = this.tipoSeleccionado?.tramitesEspecificos ?? [];
    this.reconfigurarFormulario();
  }

  onModalidadChange(modalidad: ModalidadCreacion): void {
    if (!this.tipoSeleccionado) {
      this.modalidadCreacion = null;
      this.form.tramiteEspecifico = "";
      this.reconfigurarFormulario();
      return;
    }

    if (this.modalidadCreacion === modalidad) {
      return;
    }

    this.modalidadCreacion = modalidad;
    this.form.tramiteEspecifico = "";
    this.reconfigurarFormulario();
  }

  onTramiteEspecificoChange(tramiteEspecificoId: string): void {
    const tramiteEspecificoValido =
      this.requiereSeleccionSegundoNivel &&
      this.tramitesEspecificos.some((item) => item.id === tramiteEspecificoId);
    const nuevoTramiteEspecifico = tramiteEspecificoValido
      ? tramiteEspecificoId
      : "";

    if (this.form.tramiteEspecifico === nuevoTramiteEspecifico) {
      return;
    }

    this.form.tramiteEspecifico = nuevoTramiteEspecifico;
    this.reconfigurarFormulario();
  }

  onEstacionChange(): void {
    const estacion = this.estacionesServicio.find(
      (item) => item.codigo === this.form.estacionServicio,
    );

    this.form.razonSocial = estacion?.concesionario ?? "";
    this.form.nombreConcesionario = estacion
      ? this.obtenerNombreConcesionario(estacion.concesionario)
      : "";
  }

  onResponsablePrincipalChange(responsableId: string | null): void {
    this.form.responsableInterno = responsableId ?? "";

    for (const antecedente of [
      ...this.antecedentesRequeridos,
      ...this.antecedentesComplementarios,
    ]) {
      antecedente.responsable = this.form.responsableInterno;
    }
  }

  agregarAntecedenteComplementario(): void {
    if (!this.configuracionLista) {
      return;
    }

    this.antecedentesComplementarios = [
      ...this.antecedentesComplementarios,
      this.crearAntecedenteComplementario(),
    ];
  }

  eliminarAntecedenteComplementario(indice: number): void {
    if (!this.configuracionLista) {
      return;
    }

    this.antecedentesComplementarios = this.antecedentesComplementarios.filter(
      (_, indiceActual) => indiceActual !== indice,
    );
  }

  abrirSelectorAntecedentes(): void {
    if (!this.configuracionLista) {
      return;
    }

    this.antecedentesSeleccionadosBorrador = this.antecedentesRequeridos.map(
      (item) => item.backgroundId ?? item.antecedente,
    );
    this.selectorAntecedentesVisible = true;
  }

  get todosAntecedentesSeleccionados(): boolean {
    return (
      this.antecedentesDisponibles.length > 0 &&
      this.antecedentesSeleccionadosBorrador.length ===
        this.antecedentesDisponibles.length
    );
  }

  seleccionarTodosAntecedentes(seleccionarTodos: boolean): void {
    this.antecedentesSeleccionadosBorrador = seleccionarTodos
      ? this.antecedentesDisponibles.map(({ id }) => id)
      : [];
  }

  cambiarSeleccionAntecedente(
    antecedente: AntecedenteCatalogo,
    seleccionado: boolean,
  ): void {
    const seleccionados = new Set(this.antecedentesSeleccionadosBorrador);

    if (seleccionado) {
      this.agregarAntecedenteYPadres(antecedente, seleccionados);
      if (antecedente.level === "N2") {
        this.agregarDescendientes(antecedente.id, seleccionados);
      }
    } else {
      this.eliminarAntecedenteYDescendientes(antecedente.id, seleccionados);
    }

    this.antecedentesSeleccionadosBorrador = this.antecedentesDisponibles
      .filter(({ id }) => seleccionados.has(id))
      .map(({ id }) => id);
  }

  estaSeleccionado(antecedente: AntecedenteCatalogo): boolean {
    return this.antecedentesSeleccionadosBorrador.includes(antecedente.id);
  }

  estaParcialmenteSeleccionado(antecedente: AntecedenteCatalogo): boolean {
    const descendientes = this.descendientesDe(antecedente.id);
    const seleccionados = descendientes.filter(({ id }) =>
      this.antecedentesSeleccionadosBorrador.includes(id),
    ).length;

    return (
      descendientes.length > 0 &&
      seleccionados > 0 &&
      seleccionados < descendientes.length
    );
  }

  profundidadAntecedente(antecedente: AntecedenteCatalogo): number {
    let profundidad = 0;
    let parentId = antecedente.parentBackgroundId;
    const visitados = new Set<string>();

    while (parentId && !visitados.has(parentId)) {
      visitados.add(parentId);
      profundidad += 1;
      parentId = this.antecedentesCatalogoPorId.get(parentId)?.parentBackgroundId ?? null;
    }

    return profundidad;
  }

  estadoSeleccionAntecedente(antecedente: AntecedenteCatalogo): string {
    if (this.estaParcialmenteSeleccionado(antecedente)) {
      return "Parcialmente seleccionado";
    }

    return this.estaSeleccionado(antecedente)
      ? "Seleccionado"
      : "No seleccionado";
  }

  puedeSeleccionarAntecedente(antecedente: AntecedenteCatalogo): boolean {
    let parentId = antecedente.parentBackgroundId;
    const visitados = new Set<string>();

    while (parentId && !visitados.has(parentId)) {
      if (!this.antecedentesCatalogoPorId.has(parentId)) {
        return false;
      }

      visitados.add(parentId);
      parentId = this.antecedentesCatalogoPorId.get(parentId)?.parentBackgroundId ?? null;
    }

    return true;
  }

  guardarSeleccionAntecedentes(): void {
    if (!this.antecedentesSeleccionadosBorrador.length) {
      return;
    }

    const antecedentesConfigurados = new Map(
      this.antecedentesRequeridos.map((item) => [item.backgroundId ?? item.antecedente, item]),
    );
    const seleccionados = new Set(this.antecedentesSeleccionadosBorrador);

    this.antecedentesRequeridos = this.antecedentesDisponibles
      .filter(({ id }) => seleccionados.has(id))
      .map(
        (antecedente) => antecedentesConfigurados.get(antecedente.id) ??
          this.crearAntecedente(antecedente),
      );
    this.selectorAntecedentesVisible = false;
  }

  onFileSelect(
    event: FileSelectEvent,
    item: { archivo: File | null; archivoNombre: string },
  ): void {
    const archivo = event.currentFiles.at(-1) ?? event.files.at(-1) ?? null;
    if (archivo && archivo.size > FILE_MAX_BYTES) {
      item.archivo = null;
      item.archivoNombre = "";
      this.erroresValidacion = [`El archivo ${archivo.name} supera el máximo de 10 MB.`];
      return;
    }

    item.archivo = archivo;
    item.archivoNombre = archivo?.name ?? "";
  }

  crearTramite(): void {
    this.guardarTramite();
  }

  cancelar(): void {
    void this.router.navigate(["/todas-las-gestiones"]);
  }

  irAlDetalleCreado(): void {
    this.detenerTemporizadorRedireccion();
    this.mensajeCreacionVisible = false;
    void this.router.navigate(["/todas-las-gestiones"], {
      queryParams: { detalle: this.tramiteCreadoId },
    });
  }

  get progresoRedireccion(): number {
    return (
      ((this.segundosRedireccion - this.segundosRestantes) /
        this.segundosRedireccion) *
      100
    );
  }

  private reconfigurarFormulario(): void {
    const tipo = this.tipoSeleccionado;

    this.antecedentesDisponibles = [];
    this.antecedentesCatalogoPorId = new Map();
    this.antecedentesRequeridos = [];
    this.antecedentesSeleccionadosBorrador = [];
    this.selectorAntecedentesVisible = false;
    this.antecedentesComplementarios = [];
    this.tiposDocumentoComplementario = [];
    this.etapasGestion = [];

    if (!tipo || !this.modalidadCreacion) {
      return;
    }

    let subtramites: TramiteEspecifico[] = [];

    if (this.requiereSeleccionSegundoNivel) {
      const seleccionado = tipo.tramitesEspecificos.find(
        (item) => item.id === this.form.tramiteEspecifico,
      );
      subtramites = seleccionado ? [seleccionado] : [];
    } else {
      subtramites = tipo.tramitesEspecificos;
    }

    const antecedentes = this.construirAntecedentesDisponibles(subtramites);
    this.antecedentesCatalogoPorId = new Map(
      antecedentes.map((antecedente) => [antecedente.id, antecedente]),
    );
    this.antecedentesDisponibles = antecedentes;
    const complementarios = new Map<string, AntecedenteCatalogo>();
    subtramites.flatMap((gestion) => gestion.complementarios ?? [])
      .forEach((item) => complementarios.set(item.id, item));
    this.tiposDocumentoComplementario = [...complementarios.values()]
      .map(({ id, name }) => ({ label: name, value: id }));

    if (!subtramites.length) {
      return;
    }

    this.etapasGestion = [...this.etapasCatalogo]
      .sort((a, b) => a.order - b.order)
      .map(({ id, name, percentage }) => this.crearEtapa(id, name, percentage));
  }

  private construirAntecedentesDisponibles(
    subtramites: TramiteEspecifico[],
  ): AntecedenteCatalogo[] {
    return subtramites.flatMap((gestion) => gestion.antecedentes);
  }

  private crearAntecedente(catalogo: AntecedenteCatalogo) {
    return {
      antecedente: catalogo.name,
      backgroundId: catalogo.id,
      level: catalogo.level,
      parentBackgroundId: catalogo.parentBackgroundId,
      obligatorio: true,
      /** Id del usuario responsable. */
      responsable: this.form.responsableInterno,
      estado: "Pendiente",
      archivo: null as File | null,
      archivoNombre: "",
      isSpecificManagement: catalogo.isSpecificManagement ?? false,
    };
  }

  private crearAntecedenteComplementario() {
    return {
      antecedente: "",
      /** Id del tipo de documento complementario seleccionado. */
      backgroundId: null as string | null,
      level: "N3",
      parentBackgroundId: null,
      obligatorio: false,
      responsable: this.form.responsableInterno,
      estado: "Pendiente",
      archivo: null as File | null,
      archivoNombre: "",
    };
  }

  private agregarAntecedenteYPadres(
    antecedente: AntecedenteCatalogo,
    seleccionados: Set<string>,
  ): void {
    seleccionados.add(antecedente.id);

    if (!antecedente.parentBackgroundId) {
      return;
    }

    const padre = this.antecedentesCatalogoPorId.get(antecedente.parentBackgroundId);
    if (padre) {
      this.agregarAntecedenteYPadres(padre, seleccionados);
    }
  }

  private agregarDescendientes(
    antecedenteId: string,
    seleccionados: Set<string>,
  ): void {
    this.antecedentesDisponibles
      .filter(({ parentBackgroundId }) => parentBackgroundId === antecedenteId)
      .forEach((hijo) => {
        seleccionados.add(hijo.id);
        this.agregarDescendientes(hijo.id, seleccionados);
      });
  }

  private eliminarAntecedenteYDescendientes(
    antecedenteId: string,
    seleccionados: Set<string>,
  ): void {
    seleccionados.delete(antecedenteId);
    this.antecedentesDisponibles
      .filter(({ parentBackgroundId }) => parentBackgroundId === antecedenteId)
      .forEach((hijo) => this.eliminarAntecedenteYDescendientes(hijo.id, seleccionados));
  }

  private descendientesDe(antecedenteId: string): AntecedenteCatalogo[] {
    return this.antecedentesDisponibles.filter(({ parentBackgroundId }) => {
      let currentParentId = parentBackgroundId;
      const visitados = new Set<string>();

      while (currentParentId && !visitados.has(currentParentId)) {
        if (currentParentId === antecedenteId) {
          return true;
        }

        visitados.add(currentParentId);
        currentParentId = this.antecedentesCatalogoPorId.get(currentParentId)?.parentBackgroundId ?? null;
      }

      return false;
    });
  }

  private crearEtapa(stageId: string, etapa: string, porcentaje: number) {
    return {
      stageId,
      etapa,
      porcentaje,
      estado: "Pendiente",
      fechaEstimada: "",
      fechaReal: "",
      /** Id del usuario responsable. */
      responsable: "",
      observacion: "",
    };
  }

  private guardarTramite(): void {
    if (
      this.creando ||
      this.mensajeCreacionVisible ||
      !this.configuracionLista ||
      !this.modalidadCreacion
    ) {
      return;
    }

    this.creacionError = "";
    this.creacionErrorCode = "";
    this.creacionRequestId = "";
    this.avisosCreacion = [];
    this.erroresValidacion = this.validarFormulario();
    if (this.erroresValidacion.length > 0) {
      return;
    }

    this.creando = true;
    const estadoInicial = this.form.estado as ManagementStatus;
    const antecedentes = this.antecedentesACrear();
    const etapas = this.etapasACrear();

    this.managementApi.createManagement(this.crearPayload()).pipe(
      switchMap((gestion) => forkJoin({
        antecedentes: this.crearAntecedentes(gestion.id, antecedentes),
        etapas: this.crearEtapas(gestion.id, etapas),
        bitacora: estadoInicial === "Ingresado"
          ? this.bitacoraApi.createLog(this.crearLogIngreso(gestion.id)).pipe(
              map(() => [] as string[]),
              catchError((error: unknown) => of([`Bitácora: ${mensajeDeError(error, "no se registró la entrada de ingreso.")}`])),
            )
          : of([] as string[]),
      }).pipe(map((avisos) => ({ gestion, avisos: [...avisos.antecedentes, ...avisos.etapas, ...avisos.bitacora] })))),
    ).subscribe({
      next: ({ gestion, avisos }) => {
        this.tramiteCreadoId = gestion.id;
        this.creando = false;
        this.avisosCreacion = avisos;
        this.segundosRestantes = this.segundosRedireccion;
        this.mensajeCreacionVisible = true;
        // Con avisos no se redirige solo: la persona debe poder leerlos.
        if (avisos.length === 0) {
          this.iniciarRedireccionAutomatica();
        }
        this.changeDetectorRef.markForCheck();
      },
      error: (error: unknown) => {
        this.creando = false;
        this.creacionError = mensajeDeError(error, "No fue posible crear el trámite. Inténtalo nuevamente.");
        this.creacionErrorCode = error instanceof ApiClientError ? error.code ?? "" : "";
        this.creacionRequestId = error instanceof ApiClientError ? error.requestId ?? "" : "";
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  /** Reglas del backend comprobables antes de enviar. */
  private validarFormulario(): string[] {
    const errores: string[] = [];
    const f = this.form;
    if (!this.estacionesServicio.some(({ codigo }) => codigo === f.estacionServicio)) {
      errores.push("Selecciona la estación de servicio.");
    }
    if (!PRIORIDADES.includes(f.prioridad as ManagementPriority)) {
      errores.push("Selecciona la prioridad.");
    }
    if (!this.obtenerResponsableSeleccionado()) {
      errores.push("Selecciona el responsable principal.");
    }
    if (!this.estadosIniciales.includes(f.estado as ManagementStatus)) {
      errores.push("Selecciona el estado inicial.");
    }
    const solicitante = f.solicitanteCopec.trim();
    if (!solicitante) {
      errores.push("Ingresa el solicitante.");
    } else if (solicitante.length > SOLICITANTE_MAX) {
      errores.push(`El solicitante no puede superar los ${SOLICITANTE_MAX} caracteres.`);
    }
    const apertura = fechaVistaAIso(f.fechaApertura);
    const estimada = fechaVistaAIso(f.fechaEstimadaTermino);
    if (!apertura) {
      errores.push("Ingresa una fecha de apertura válida.");
    }
    if (f.fechaEstimadaTermino && !estimada) {
      errores.push("Ingresa una fecha estimada de término válida o déjala vacía.");
    } else if (apertura && estimada && estimada < apertura) {
      errores.push("La fecha estimada de término no puede ser anterior a la de apertura.");
    }
    [...this.antecedentesRequeridos, ...this.antecedentesComplementarios]
      .filter((item) => ESTADOS_RECIBIDO.includes(item.estado) && !item.archivo)
      .forEach((item) => errores.push(
        `Para marcar «${this.nombreAntecedente(item)}» como recibido debes adjuntar su archivo.`,
      ));
    this.etapasGestion.forEach((etapa) => {
      const est = fechaVistaAIso(etapa.fechaEstimada);
      const real = fechaVistaAIso(etapa.fechaReal);
      if ((etapa.fechaEstimada && !est) || (etapa.fechaReal && !real)) {
        errores.push(`Revisa las fechas de la etapa «${etapa.etapa}».`);
      } else if (est && real && real < est) {
        errores.push(`En la etapa «${etapa.etapa}», la fecha real no puede ser anterior a la estimada.`);
      }
      if (etapa.observacion.trim().length > NOTAS_ETAPA_MAX) {
        errores.push(`La observación de la etapa «${etapa.etapa}» supera los ${NOTAS_ETAPA_MAX} caracteres.`);
      }
    });
    return errores;
  }

  private nombreAntecedente(item: { antecedente: string; backgroundId: string | null }): string {
    return item.antecedente
      || this.tiposDocumentoComplementario.find(({ value }) => value === item.backgroundId)?.label
      || "documento complementario";
  }

  /**
   * Tipo N1, gestiones N2 (todas en modo completo, o la elegida) y los
   * documentos seleccionados, sin repetir tipos.
   */
  private antecedentesACrear(): AntecedenteACrear[] {
    const tipo = this.tipoSeleccionado!;
    const responsable = this.form.responsableInterno || null;
    const porTipo = new Map<string, AntecedenteACrear>();
    const agregar = (item: AntecedenteACrear) => porTipo.set(item.managementTypeId, item);

    agregar({ managementTypeId: tipo.id, nombre: tipo.nombre, responsibleUserId: responsable, estado: "Pendiente", archivo: null });
    const gestiones = this.requiereSeleccionSegundoNivel
      ? tipo.tramitesEspecificos.filter(({ id }) => id === this.form.tramiteEspecifico)
      : tipo.tramitesEspecificos;
    gestiones.forEach(({ id, nombre }) => agregar({ managementTypeId: id, nombre, responsibleUserId: responsable, estado: "Pendiente", archivo: null }));
    [...this.antecedentesRequeridos, ...this.antecedentesComplementarios]
      .filter((item) => item.backgroundId)
      .forEach((item) => agregar({
        managementTypeId: item.backgroundId!,
        nombre: this.nombreAntecedente(item),
        responsibleUserId: item.responsable || responsable,
        estado: item.estado,
        archivo: item.archivo,
      }));
    return [...porTipo.values()];
  }

  /**
   * Crea cada antecedente; si trae archivo, lo sube y luego fija su estado.
   * Devuelve los avisos de lo que no se pudo registrar.
   */
  private crearAntecedentes(managementId: string, items: AntecedenteACrear[]): Observable<string[]> {
    return from(items).pipe(
      mergeMap((item) => this.registrarAntecedente(managementId, item).pipe(
        catchError((error: unknown) => of(`«${item.nombre}»: ${mensajeDeError(error, "no se pudo registrar.")}`)),
      ), CONCURRENCIA_CREACION),
      toArray(),
      map((avisos) => avisos.filter((aviso): aviso is string => Boolean(aviso))),
    );
  }

  private registrarAntecedente(managementId: string, item: AntecedenteACrear): Observable<string | null> {
    // Sin archivo no se puede marcar como recibido: se crea pendiente y,
    // si hay archivo, se actualiza el estado después de subirlo.
    const estadoInicial = item.archivo ? "Pendiente" : item.estado;
    return this.managementApi.createBackground(managementId, {
      managementTypeId: item.managementTypeId,
      responsibleUserId: item.responsibleUserId,
      status: estadoInicial,
    }).pipe(
      switchMap((antecedente) => {
        if (!item.archivo) return of(null);
        return this.filesApi.upload(item.archivo, antecedente.id).pipe(
          switchMap((archivo) => item.estado === estadoInicial
            ? of(null)
            : this.managementApi.updateBackground(antecedente.id, {
                responsibleUserId: item.responsibleUserId,
                status: item.estado,
                fileReference: archivo.storageReference,
              }).pipe(map(() => null))),
          catchError((error: unknown) => of(
            `«${item.nombre}»: quedó registrado como Pendiente, pero el archivo no se cargó. ${mensajeDeError(error, "")}`.trim(),
          )),
        );
      }),
    );
  }

  /** Etapas con datos distintos de los valores por defecto. */
  private etapasACrear() {
    return this.etapasGestion.filter((etapa) =>
      etapa.estado !== "Pendiente"
      || etapa.fechaEstimada
      || etapa.fechaReal
      || etapa.responsable
      || etapa.observacion.trim());
  }

  private crearEtapas(managementId: string, etapas: ReturnType<typeof this.etapasACrear>): Observable<string[]> {
    return from(etapas).pipe(
      mergeMap((etapa) => this.managementApi.createStage(managementId, {
        stageId: etapa.stageId,
        status: etapa.estado as StageStatus,
        estimatedOn: fechaVistaAIso(etapa.fechaEstimada),
        completedOn: fechaVistaAIso(etapa.fechaReal),
        responsibleUserId: etapa.responsable || null,
        notes: etapa.observacion.trim() || null,
      }).pipe(
        map(() => null),
        catchError((error: unknown) => of(`Etapa «${etapa.etapa}»: ${mensajeDeError(error, "no se pudo registrar.")}`)),
      ), CONCURRENCIA_CREACION),
      toArray(),
      map((avisos) => avisos.filter((aviso): aviso is string => Boolean(aviso))),
    );
  }

  private crearLogIngreso(managementId: string): LogEntryWrite {
    // Fecha y hora de Chile; el autor lo asigna el backend desde la sesión.
    return {
      managementId,
      registeredOn: fechaVistaAIso(this.form.fechaApertura) ?? undefined,
      registeredAt: this.obtenerHoraActual(),
      title: "Ingreso del trámite",
      comment: "Se ha ingresado el trámite al sistema.",
      type: "inicio",
    };
  }


  private obtenerHoraActual(): string {
    return new Intl.DateTimeFormat("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "America/Santiago",
    }).format(new Date());
  }

  /** Cuerpo de `POST /gestiones/items` (`ManagementWrite`). */
  private crearPayload(): ManagementWrite {
    return {
      stationId: this.form.estacionServicio,
      responsibleUserId: this.obtenerResponsableSeleccionado()!.id,
      openedOn: fechaVistaAIso(this.form.fechaApertura)!,
      estimatedCompletionOn: fechaVistaAIso(this.form.fechaEstimadaTermino),
      lastReviewedOn: null,
      priority: this.form.prioridad as ManagementPriority,
      status: this.form.estado as ManagementStatus,
      requesterName: this.form.solicitanteCopec.trim(),
    };
  }



  private obtenerNombreConcesionario(razonSocial: string): string {
    return razonSocial.replace(/\s+(SpA|Ltda\.?|Limitada|S\.?A\.?)$/i, "");
  }

  private obtenerResponsableSeleccionado(): BackendUser | undefined {
    return this.responsablesApi.find(({ id }) => id === this.form.responsableInterno);
  }





  private cargarCatalogos(): void {
    this.catalogosCargando = true;
    this.catalogosError = "";

    forkJoin({
      estaciones: this.catalogApi.catalogStations(),
      tipos: this.catalogApi.managementTypes(),
      responsables: this.identityApi.cachedUsers(),
      // Sin catálogo de etapas el trámite se crea igual; las etapas se editan después.
      etapas: this.catalogApi.stageCatalog().pipe(catchError(() => of([] as StageCatalogItem[]))),
    }).subscribe({
      next: ({ estaciones, tipos, responsables, etapas }) => {
        this.estacionesServicio = estaciones.map((estacion) => ({
          codigo: estacion.id,
          nombre: estacion.legalName,
          direccion: estacion.address,
          comuna: estacion.commune,
          concesionario: estacion.legalName,
          rut: estacion.companyRut ?? "",
        }));
        this.responsablesApi = responsables;
        this.opcionesResponsables = responsables.map((user) => ({
          label: [user.names, user.firstSurname, user.secondSurname].filter(Boolean).join(" "),
          value: user.id,
        }));
        this.etapasCatalogo = etapas;
        this.tiposTramite = this.construirTiposTramite(tipos);
        this.catalogosCargando = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (error: unknown) => {
        this.catalogosError = error instanceof ApiClientError && error.status === 403
          ? "No tienes autorización para consultar los catálogos del formulario."
          : mensajeDeError(error, "No fue posible cargar los catálogos del formulario.");
        this.catalogosCargando = false;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  /**
   * Convierte el catálogo jerárquico: N1 = tipo de trámite, N2 = gestión
   * específica, N3+ = documentos (requeridos o complementarios).
   */
  private construirTiposTramite(nodos: ManagementTypeNode[]): TipoTramite[] {
    const hijos = new Map<string, ManagementTypeNode[]>();
    nodos.forEach((nodo) => {
      if (!nodo.parentId) return;
      hijos.set(nodo.parentId, [...(hijos.get(nodo.parentId) ?? []), nodo]);
    });
    const ordenar = (lista: ManagementTypeNode[]) =>
      [...lista].sort((a, b) => a.name.localeCompare(b.name, "es-CL"));
    const descendientes = (id: string, visitados = new Set<string>()): ManagementTypeNode[] =>
      ordenar(hijos.get(id) ?? []).flatMap((hijo) => {
        if (visitados.has(hijo.id)) return [];
        visitados.add(hijo.id);
        return [hijo, ...descendientes(hijo.id, visitados)];
      });
    const aCatalogo = (nodo: ManagementTypeNode, parentId: string | null): AntecedenteCatalogo => ({
      id: nodo.id,
      name: nodo.name,
      level: `N${nodo.level}`,
      parentBackgroundId: parentId,
      required: nodo.required,
    });

    return ordenar(nodos.filter(({ level }) => level === 1)).map((tipo) => ({
      id: tipo.id,
      nombre: tipo.name,
      segundoNivelLabel: "Gestión específica",
      requiereSeleccionSegundoNivelParaPrincipal: false,
      tramitesEspecificos: ordenar((hijos.get(tipo.id) ?? []).filter(({ level }) => level === 2)).map((gestion) => {
        const documentos = descendientes(gestion.id);
        return {
          id: gestion.id,
          nombre: gestion.name,
          level: "N2" as const,
          antecedentes: [
            { ...aCatalogo(gestion, null), isSpecificManagement: true },
            ...documentos.filter(({ required }) => required).map((doc) => aCatalogo(doc, doc.parentId)),
          ],
          complementarios: documentos.filter(({ required }) => !required).map((doc) => aCatalogo(doc, doc.parentId)),
        };
      }),
    }));
  }

  private iniciarRedireccionAutomatica(): void {
    this.detenerTemporizadorRedireccion();

    this.temporizadorRedireccion = setInterval(() => {
      this.segundosRestantes -= 1;

      if (this.segundosRestantes <= 0) {
        this.irAlDetalleCreado();
        return;
      }

      this.changeDetectorRef.markForCheck();
    }, 1000);
  }

  private detenerTemporizadorRedireccion(): void {
    if (!this.temporizadorRedireccion) {
      return;
    }

    clearInterval(this.temporizadorRedireccion);
    this.temporizadorRedireccion = undefined;
  }
}
