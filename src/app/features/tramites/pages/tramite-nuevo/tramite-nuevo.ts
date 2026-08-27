import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
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
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";
import { ESTADOS_ANTECEDENTE, ESTADOS_HITO } from "../../models/estado-tramite";
import { TIPOS_DOCUMENTO_COMPLEMENTARIO } from "../../models/tipo-documento";
import { TramitesMock } from "../../services/tramites-mock";

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
  hitosGestion?: string[];
}

interface TipoTramite {
  id: string;
  nombre: string;
  segundoNivelLabel: string;
  requiereSeleccionSegundoNivelParaPrincipal: boolean;
  hitosGestion: string[];
  tramitesEspecificos: TramiteEspecifico[];
}

interface CatalogosTramite {
  estacionesServicio: EstacionServicio[];
  prioridades: string[];
  responsables: string[];
  tiposTramite: TipoTramite[];
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
  private readonly http = inject(HttpClient);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly tramitesMock = inject(TramitesMock);
  private temporizadorRedireccion?: ReturnType<typeof setInterval>;

  readonly segundosRedireccion = 6;
  readonly breadcrumbs = [
    { label: "Módulo de Gestión de Trámites", route: "/tramites" },
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
  readonly estadosHito = [...ESTADOS_HITO];
  readonly tiposDocumentoComplementario = [...TIPOS_DOCUMENTO_COMPLEMENTARIO];

  estacionesServicio: EstacionServicio[] = [];
  prioridades: string[] = [];
  responsables: string[] = [];
  tiposTramite: TipoTramite[] = [];
  tramitesEspecificos: TramiteEspecifico[] = [];

  modalidadCreacion: ModalidadCreacion = "principal";
  catalogosError = "";
  tramiteCreadoId = 1006;
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
  antecedentesDisponibles: string[] = [];
  antecedentesSeleccionadosBorrador: string[] = [];
  selectorAntecedentesVisible = false;
  antecedentesComplementarios = [this.crearAntecedenteComplementario()];
  hitosGestion: Array<ReturnType<typeof this.crearHito>> = [];

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
    return (
      this.modalidadCreacion === "subtramite" ||
      this.tipoSeleccionado?.requiereSeleccionSegundoNivelParaPrincipal === true
    );
  }

  get configuracionLista(): boolean {
    return Boolean(
      this.tipoSeleccionado &&
      (!this.requiereSeleccionSegundoNivel || this.form.tramiteEspecifico),
    );
  }

  onTipoTramiteChange(tipoTramiteId: string): void {
    this.form.tipoTramite = tipoTramiteId;
    this.form.tramiteEspecifico = "";
    this.tramitesEspecificos = this.tipoSeleccionado?.tramitesEspecificos ?? [];
    this.reconfigurarFormulario();
  }

  onModalidadChange(modalidad: ModalidadCreacion): void {
    if (this.modalidadCreacion === modalidad) {
      return;
    }

    this.modalidadCreacion = modalidad;
    this.form.tramiteEspecifico = "";
    this.reconfigurarFormulario();
  }

  onTramiteEspecificoChange(tramiteEspecificoId: string): void {
    if (this.form.tramiteEspecifico === tramiteEspecificoId) {
      return;
    }

    this.form.tramiteEspecifico = tramiteEspecificoId;
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
    void this.router.navigate(["/tramites"]);
  }

  irAlDetalleCreado(): void {
    this.detenerTemporizadorRedireccion();
    this.mensajeCreacionVisible = false;
    void this.router.navigate(["/tramites", this.tramiteCreadoId]);
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

    if (!tipo) {
      this.antecedentesDisponibles = [];
      this.antecedentesRequeridos = [];
      this.antecedentesSeleccionadosBorrador = [];
      this.selectorAntecedentesVisible = false;
      this.hitosGestion = [];
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
    this.antecedentesRequeridos = [];
    this.antecedentesSeleccionadosBorrador = [];
    this.selectorAntecedentesVisible = false;

    if (!subtramites.length) {
      this.hitosGestion = [];
      return;
    }

    const hitos =
      this.modalidadCreacion === "subtramite"
        ? [
            "Ingreso del subtrámite",
            "Revisión de antecedentes",
            "Gestión ante la institución",
            "Observaciones y subsanación",
            "Finalización",
          ]
        : tipo.hitosGestion;
    this.hitosGestion = hitos.map((hito) => this.crearHito(hito));
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

  private crearHito(hito: string) {
    return {
      hito,
      estado: "Pendiente",
      fechaEstimada: "",
      fechaReal: "",
      responsable: "",
      observacion: "",
    };
  }

  private guardarTramite(): void {
    if (this.mensajeCreacionVisible || !this.configuracionLista) {
      return;
    }

    this.registrarTramiteCreado();
    this.segundosRestantes = this.segundosRedireccion;
    this.mensajeCreacionVisible = true;
    this.iniciarRedireccionAutomatica();
  }

  private registrarTramiteCreado(): void {
    const estacion = this.estacionesServicio.find(
      (item) => item.codigo === this.form.estacionServicio,
    );
    const tipo = this.tipoSeleccionado;
    const subtramite = tipo?.tramitesEspecificos.find(
      (item) => item.id === this.form.tramiteEspecifico,
    );

    this.tramitesMock.guardar({
      id: this.tramiteCreadoId,
      idEstacion:
        estacion?.codigo || this.form.estacionServicio || "Sin especificar",
      estacionServicio:
        estacion?.nombre || this.form.estacionServicio || "Sin especificar",
      razonSocial: this.form.razonSocial || "Sin especificar",
      comuna: estacion?.comuna ?? "Sin especificar",
      direccion: estacion?.direccion ?? "Sin especificar",
      estado: this.form.estado,
      prioridad: this.form.prioridad || "Sin especificar",
      responsableInterno: this.form.responsableInterno || "Sin especificar",
      tipoTramite: tipo?.nombre || "Sin especificar",
      tramiteEspecifico:
        subtramite?.nombre ||
        (this.modalidadCreacion === "principal"
          ? "Trámite principal completo"
          : "Sin especificar"),
      solicitanteCopec: this.form.solicitanteCopec || "Sin especificar",
      modalidadCreacion: this.modalidadCreacion,
      datosAdicionales: {
        nombreConcesionario: this.form.nombreConcesionario || "Sin especificar",
      },
      subtramitesAsociados:
        this.modalidadCreacion === "principal" && !subtramite
          ? this.tramitesEspecificos.map((item) => item.nombre)
          : subtramite
            ? [subtramite.nombre]
            : [],
      antecedentesConfigurados: this.antecedentesRequeridos.map(
        (item) => item.antecedente,
      ),
      hitosConfigurados: this.hitosGestion.map((item) => item.hito),
      fechaApertura: this.normalizarFechaListado(this.form.fechaApertura),
      fechaEstimadaTermino: this.normalizarFechaListado(
        this.form.fechaEstimadaTermino,
      ),
    });
  }

  private normalizarFechaListado(fecha: string): string {
    return fecha ? fecha.replaceAll("/", "-") : "Sin especificar";
  }

  private obtenerNombreConcesionario(razonSocial: string): string {
    return razonSocial.replace(/\s+(SpA|Ltda\.?|Limitada|S\.?A\.?)$/i, "");
  }

  private cargarCatalogos(): void {
    this.http.get<CatalogosTramite>("/data/tramite-catalogos.json").subscribe({
      next: (catalogos) => {
        this.estacionesServicio = catalogos.estacionesServicio;
        this.prioridades = catalogos.prioridades;
        this.responsables = catalogos.responsables;
        this.tiposTramite = catalogos.tiposTramite;
        this.catalogosError = "";
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.catalogosError =
          "No fue posible cargar los catálogos del formulario.";
        this.changeDetectorRef.markForCheck();
      },
    });
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
