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
import { SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { TextareaModule } from "primeng/textarea";
import { forkJoin } from "rxjs";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";
import {
  ESTADOS_ANTECEDENTE,
  ESTADOS_ETAPA,
  ETAPAS_ESTANDAR,
} from "../../models/estado-tramite";
import {
  ApiClient,
  ApiClientError,
  BackendManagementType,
  BackendSpecificManagement,
  BackendUser,
} from "../../../../shared/services/api-client";

interface EstacionServicio {
  codigo: string;
  nombre: string;
  direccion: string;
  comuna: string;
  concesionario: string;
  rut: string;
}

interface TramiteEspecifico {
  id: string;
  nombre: string;
  antecedentes: string[];
}

interface TipoTramite {
  id: string;
  nombre: string;
  scopeCode?: string;
  datosAdicionales?: Array<{ id: string; label: string; tipo: "text" | "select"; requerido: boolean; opciones?: string[] }>;
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
    SelectModule,
    TableModule,
    TextareaModule,
    UploadIcon,
  ],
  templateUrl: "./tramite-nuevo.html",
  styleUrl: "./tramite-nuevo.scss",
})
export class TramiteNuevo implements OnInit, OnDestroy {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly api = inject(ApiClient);
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
  creacionError = "";
  creacionErrorCode = "";
  creacionRequestId = "";
  creando = false;
  private responsablesApi: BackendUser[] = [];
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
    datosAdicionales: {} as Record<string, string>,
  };

  antecedentesRequeridos: Array<ReturnType<typeof this.crearAntecedente>> = [];
  antecedentesDisponibles: string[] = [];
  antecedentesSeleccionadosBorrador: string[] = [];
  selectorAntecedentesVisible = false;
  antecedentesComplementarios = [this.crearAntecedenteComplementario()];
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
    this.form.datosAdicionales = Object.fromEntries(
      (this.tipoSeleccionado?.datosAdicionales ?? []).map(({ id }) => [id, ""]),
    );
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

  abrirSelectorAntecedentes(): void {
    if (!this.configuracionLista) {
      return;
    }

    this.antecedentesSeleccionadosBorrador = this.antecedentesRequeridos.map(
      (item) => item.antecedente,
    );
    this.selectorAntecedentesVisible = true;
  }

  guardarSeleccionAntecedentes(): void {
    if (!this.antecedentesSeleccionadosBorrador.length) {
      return;
    }

    const antecedentesConfigurados = new Map(
      this.antecedentesRequeridos.map((item) => [item.antecedente, item]),
    );
    const seleccionados = new Set(this.antecedentesSeleccionadosBorrador);

    this.antecedentesRequeridos = this.antecedentesDisponibles
      .filter((antecedente) => seleccionados.has(antecedente))
      .map(
        (antecedente) =>
          antecedentesConfigurados.get(antecedente) ??
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
    this.antecedentesRequeridos = [];
    this.antecedentesSeleccionadosBorrador = [];
    this.selectorAntecedentesVisible = false;
    this.antecedentesComplementarios = [this.crearAntecedenteComplementario()];
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

    const antecedentes = [
      ...new Set(subtramites.flatMap((item) => item.antecedentes)),
    ];
    this.antecedentesDisponibles = antecedentes;

    if (!subtramites.length) {
      return;
    }

    this.etapasGestion = ETAPAS_ESTANDAR.map(({ nombre, porcentaje }) =>
      this.crearEtapa(nombre, porcentaje),
    );
  }

  private crearAntecedente(antecedente: string) {
    return {
      antecedente,
      obligatorio: true,
      responsable: this.form.responsableInterno,
      estado: "Pendiente",
      observaciones: "",
      archivo: null as File | null,
      archivoNombre: "",
    };
  }

  private crearAntecedenteComplementario() {
    return {
      antecedente: "",
      obligatorio: false,
      responsable: this.form.responsableInterno,
      estado: "Pendiente",
      observaciones: "",
      archivo: null as File | null,
      archivoNombre: "",
    };
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
    this.api.createManagement(this.crearPayload(this.modalidadCreacion)).subscribe({
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
      datosAdicionales: {
        nombreConcesionario: this.form.nombreConcesionario || "Sin especificar",
        ...this.form.datosAdicionales,
      },
      subtramitesAsociados: modalidadCreacion === "principal" && !subtramite ? this.tramitesEspecificos.map((item) => item.id) : subtramite ? [subtramite.id] : [],
      antecedentesConfigurados: this.antecedentesRequeridos.map((item) => item.antecedente),
      antecedentesComplementariosConfigurados: this.antecedentesComplementarios.map((item) => item.antecedente.trim()).filter(Boolean),
      etapasConfiguradas: this.etapasGestion.map((item) => item.etapa),
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
    return this.responsablesApi.find(
      (user) => [user.names, user.firstSurname, user.secondSurname]
        .filter(Boolean)
        .join(" ") === this.form.responsableInterno,
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
    this.cargarAntecedentesComplementarios();

    forkJoin({
      estaciones: this.api.catalogStations(),
      tipos: this.api.managementTypes(),
      responsables: this.api.users(),
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
          tipos.map((tipo) => this.api.specificManagements(tipo.id)),
        ).subscribe({
          next: (gestionesPorTipo) => {
            this.tiposTramite = tipos.map((tipo, index) =>
              this.mapearTipoTramite(tipo, gestionesPorTipo[index] ?? []),
            );
            this.catalogosError = "";
            this.changeDetectorRef.markForCheck();
          },
          error: (error: ApiClientError) => {
            this.catalogosError =
              error.status === 403
                ? "No tiene autorización para consultar las gestiones específicas del catálogo."
                : "No fue posible cargar las gestiones específicas del catálogo.";
            this.changeDetectorRef.markForCheck();
          },
        });
      },
      error: (error: ApiClientError) => {
        this.catalogosError = error.status === 403
          ? "No tiene autorización para consultar los catálogos del formulario."
          : "No fue posible cargar los catálogos del formulario.";
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  private cargarAntecedentesComplementarios(): void {
    this.api.backgroundCatalog("complementario").subscribe({
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
          antecedentes: gestion.backgrounds?.map((background) => background.name) ?? [],
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
