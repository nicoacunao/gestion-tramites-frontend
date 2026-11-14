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
import { forkJoin, map, of, switchMap } from "rxjs";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";
import {
  ESTADOS_ANTECEDENTE,
  ESTADOS_ETAPA,
  ETAPAS_ESTANDAR,
} from "../../models/estado-tramite";
import {
  BackendManagementType,
  BackendSpecificManagement,
  BackendUser,
} from "../../../../shared/services/api-models";
import { ApiClientError } from "../../../../shared/services/api-base";
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

type NivelAntecedente = "N2" | "N3" | "N4";

interface AntecedenteCatalogo {
  id: string;
  name: string;
  level: NivelAntecedente;
  parentBackgroundId: string | null;
  isSpecificManagement?: boolean;
}

interface TramiteEspecifico {
  id: string;
  nombre: string;
  level: "N2";
  antecedentes: AntecedenteCatalogo[];
}

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
  readonly estadosIniciales = ["Borrador", "Pendiente", "Ingresado"];
  readonly estadosAntecedente = [...ESTADOS_ANTECEDENTE];
  readonly estadosEtapa = [...ESTADOS_ETAPA];
  tiposDocumentoComplementario: string[] = [];

  estacionesServicio: EstacionServicio[] = [];
  prioridades: string[] = [];
  responsables: string[] = [];
  tiposTramite: TipoTramite[] = [];
  tramitesEspecificos: TramiteEspecifico[] = [];

  modalidadCreacion: ModalidadCreacion | null = null;
  catalogosError = "";
  catalogosCargando = false;
  creacionError = "";
  creacionErrorCode = "";
  creacionRequestId = "";
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

  onResponsablePrincipalChange(responsable: string): void {
    this.form.responsableInterno = responsable;

    for (const antecedente of [
      ...this.antecedentesRequeridos,
      ...this.antecedentesComplementarios,
    ]) {
      antecedente.responsable = responsable;
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

    if (!subtramites.length) {
      return;
    }

    this.etapasGestion = ETAPAS_ESTANDAR.map(({ nombre, porcentaje }) =>
      this.crearEtapa(nombre, porcentaje),
    );
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
      responsable: this.form.responsableInterno,
      estado: "Pendiente",
      observaciones: "",
      archivo: null as File | null,
      archivoNombre: "",
      isSpecificManagement: catalogo.isSpecificManagement ?? false,
    };
  }

  private crearAntecedenteComplementario() {
    return {
      antecedente: "",
      backgroundId: null,
      level: "N3" as const,
      parentBackgroundId: null,
      obligatorio: false,
      responsable: this.form.responsableInterno,
      estado: "Pendiente",
      observaciones: "",
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

  private crearEtapa(etapa: string, porcentaje: number) {
    return {
      etapa,
      porcentaje,
      estado: "Pendiente",
      fechaEstimada: "",
      fechaReal: "",
      responsable: "",
      observacion: "",
    };
  }

  private guardarTramite(): void {
    if (
      this.mensajeCreacionVisible ||
      !this.configuracionLista ||
      !this.modalidadCreacion
    ) {
      return;
    }

    this.creando = true;
    this.creacionError = "";
    this.creacionErrorCode = "";
    this.creacionRequestId = "";
    if (!this.obtenerResponsableSeleccionado()) {
      this.creando = false;
      this.creacionError = "Seleccione un responsable válido del catálogo de usuarios.";
      return;
    }
    this.managementApi.createManagement(this.crearPayload(this.modalidadCreacion)).pipe(
      switchMap((tramite) =>
        this.form.estado === "Ingresado"
          ? this.bitacoraApi
              .createLog(this.crearLogIngreso(tramite.id))
              .pipe(map(() => tramite))
          : of(tramite),
      ),
    ).subscribe({
      next: (tramite) => {
        this.tramiteCreadoId = tramite.id;
        this.creando = false;
        this.creacionErrorCode = "";
        this.creacionRequestId = "";
        this.segundosRestantes = this.segundosRedireccion;
        this.mensajeCreacionVisible = true;
        this.iniciarRedireccionAutomatica();
      },
      error: (error: Error) => {
        this.creando = false;
        this.creacionError = error.message;
        this.creacionErrorCode = error instanceof ApiClientError ? error.code ?? "" : "";
        this.creacionRequestId = error instanceof ApiClientError ? error.requestId ?? "" : "";
      },
    });
  }

  private crearLogIngreso(managementId: string): object {
    const usuario = this.userSession.currentUser();

    return {
      managementId,
      userId: usuario.id ?? null,
      registeredOn: this.normalizarFechaApi(this.form.fechaApertura),
      registeredAt: this.obtenerHoraActual(),
      title: "Ingreso del trámite",
      comment: "Se ha ingresado el trámite al sistema.",
      type: "inicio",
      automatic: true,
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

  private crearPayload(modalidadCreacion: ModalidadCreacion): object {
    const estacion = this.estacionesServicio.find((item) => item.codigo === this.form.estacionServicio);
    const tipo = this.tipoSeleccionado;
    const subtramite = tipo?.tramitesEspecificos.find((item) => item.id === this.form.tramiteEspecifico);
    const responsable = this.obtenerResponsableSeleccionado();
    return {
      stationId: estacion?.codigo || this.form.estacionServicio,
      managementTypeId: tipo?.id || this.form.tipoTramite,
      scopeCode: tipo?.scopeCode || this.obtenerScopeCode(tipo?.id),
      responsibleUserId: responsable!.id,
      level: modalidadCreacion === "subtramite" ? "N2" : "N1",
      openedOn: this.normalizarFechaApi(this.form.fechaApertura),
      estimatedCompletionOn: this.form.fechaEstimadaTermino ? this.normalizarFechaApi(this.form.fechaEstimadaTermino) : null,
      lastReviewedOn: null, priority: this.form.prioridad || "Media",
      requesterName: this.form.solicitanteCopec || "Sin especificar", status: this.form.estado || "Borrador",
      creationMode: modalidadCreacion, specificManagementId: subtramite?.id ?? null,
      subtramitesAsociados: modalidadCreacion === "principal" && !subtramite ? this.tramitesEspecificos.map((item) => item.id) : subtramite ? [subtramite.id] : [],
      ...(subtramite ? {} : {
        requiredBackgrounds: this.antecedentesRequeridos
          .filter((item) => !item.isSpecificManagement)
          .map((item) => ({
        backgroundId: item.backgroundId,
        parentBackgroundId: item.parentBackgroundId,
        level: item.level,
        name: item.antecedente,
        category: "requerido",
        required: true,
        responsibleUserId: this.obtenerResponsablePorNombre(item.responsable)?.id ?? null,
        status: item.estado,
        observations: item.observaciones || null,
          })),
        complementaryBackgrounds: this.antecedentesComplementarios
        .filter((item) => item.antecedente.trim())
        .map((item) => ({
          backgroundId: item.backgroundId,
          parentBackgroundId: item.parentBackgroundId,
          level: item.level,
          name: item.antecedente.trim(),
          category: "complementario",
          required: false,
          responsibleUserId: this.obtenerResponsablePorNombre(item.responsable)?.id ?? null,
          status: item.estado,
          observations: item.observaciones || null,
        })),
        stages: this.etapasGestion.map((item) => ({
        stageId: null,
        name: item.etapa,
        status: item.estado,
        estimatedOn: item.fechaEstimada ? this.normalizarFechaApi(item.fechaEstimada) : null,
        completedOn: item.fechaReal ? this.normalizarFechaApi(item.fechaReal) : null,
        responsibleUserId: this.obtenerResponsablePorNombre(item.responsable)?.id ?? null,
        notes: item.observacion || null,
        })),
      }),
    };
  }

  private normalizarFechaApi(fecha: string): string {
    const [dia, mes, anio] = fecha.replaceAll("/", "-").split("-");
    return `${anio}-${mes}-${dia}`;
  }

  private obtenerNombreConcesionario(razonSocial: string): string {
    return razonSocial.replace(/\s+(SpA|Ltda\.?|Limitada|S\.?A\.?)$/i, "");
  }

  private obtenerResponsableSeleccionado(): BackendUser | undefined {
    return this.obtenerResponsablePorNombre(this.form.responsableInterno);
  }

  private obtenerResponsablePorNombre(nombre: string): BackendUser | undefined {
    const nombreNormalizado = nombre.trim().toLocaleLowerCase("es-CL");
    return this.responsablesApi.find(
      (user) => [user.names, user.firstSurname, user.secondSurname]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("es-CL") === nombreNormalizado,
    );
  }

  private obtenerScopeCode(tipoId = ""): string {
    const prefijoPorTipo: Record<string, string> = {
      "patente-comercial": "MUN",
      "resolucion-sanitaria-alimentos": "SAN",
      "informe-sanitario-establecimientos": "SAN",
      "regularizacion-obras": "DOM",
    };
    return prefijoPorTipo[tipoId] ?? "OTR";
  }

  private cargarCatalogos(): void {
    this.catalogosCargando = true;
    this.cargarAntecedentesComplementarios();

    forkJoin({
      estaciones: this.catalogApi.catalogStations(),
      tipos: this.catalogApi.managementTypes(),
      responsables: this.identityApi.users(),
    }).subscribe({
      next: ({ estaciones, tipos, responsables }) => {
        this.estacionesServicio = estaciones.map((estacion) => ({
          codigo: estacion.id,
          nombre: estacion.name ?? estacion.legalName,
          direccion: estacion.address,
          comuna: estacion.commune,
          concesionario: estacion.legalName,
          rut: estacion.companyRut,
        }));
        this.prioridades = ["Alta", "Media", "Baja"];
        this.responsablesApi = responsables;
        this.responsables = responsables.map((user) =>
          [user.names, user.firstSurname, user.secondSurname]
            .filter(Boolean)
            .join(" "),
        );

        this.tiposTramite = tipos.map((tipo) =>
          this.mapearTipoTramite(tipo, []),
        );
        this.catalogosError = "";
        this.changeDetectorRef.markForCheck();

        forkJoin(
          tipos.map((tipo) => this.catalogApi.specificManagements(tipo.id)),
        ).subscribe({
          next: (gestionesPorTipo) => {
            this.tiposTramite = tipos.map((tipo, index) =>
              this.mapearTipoTramite(tipo, gestionesPorTipo[index] ?? []),
            );
            this.catalogosError = "";
            this.catalogosCargando = false;
            this.changeDetectorRef.markForCheck();
          },
          error: (error: ApiClientError) => {
            this.catalogosError =
              error.status === 403
                ? "No tiene autorización para consultar las gestiones específicas del catálogo."
                : "No fue posible cargar las gestiones específicas del catálogo.";
            this.catalogosCargando = false;
            this.changeDetectorRef.markForCheck();
          },
        });
      },
      error: (error: ApiClientError) => {
        this.catalogosError = error.status === 403
          ? "No tiene autorización para consultar los catálogos del formulario."
          : "No fue posible cargar los catálogos del formulario.";
        this.catalogosCargando = false;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  private cargarAntecedentesComplementarios(): void {
    this.catalogApi.backgroundCatalog("complementario").subscribe({
      next: (antecedentes) => {
        this.tiposDocumentoComplementario = antecedentes.map(
          ({ name }) => name,
        );
        this.changeDetectorRef.markForCheck();
      },
      error: (error: ApiClientError) => {
        this.tiposDocumentoComplementario = [];
        this.catalogosError = error.status === 403
          ? "No tiene autorización para consultar los antecedentes complementarios."
          : "No fue posible cargar los antecedentes complementarios.";
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  private mapearTipoTramite(
    tipo: BackendManagementType,
    gestiones: BackendSpecificManagement[],
  ): TipoTramite {
    return {
      id: tipo.id,
      nombre: tipo.name,
      segundoNivelLabel: tipo.secondLevelLabel ?? "Gestión específica",
      requiereSeleccionSegundoNivelParaPrincipal:
        tipo.requiresSpecificSelection ?? false,
      tramitesEspecificos: gestiones
        .filter((gestion) => gestion.active)
        .map((gestion) => ({
          id: gestion.id,
          nombre: gestion.name,
          level: gestion.level,
          antecedentes: gestion.backgrounds ?? [],
        })),
    };
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
