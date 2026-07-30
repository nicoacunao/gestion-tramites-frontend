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
import {
  AutoCompleteCompleteEvent,
  AutoCompleteModule,
} from "primeng/autocomplete";
import { ButtonDirective } from "primeng/button";
import { DatePickerModule } from "primeng/datepicker";
import { DialogModule } from "primeng/dialog";
import { FileSelectEvent, FileUploadModule } from "primeng/fileupload";
import { InputGroupModule } from "primeng/inputgroup";
import { InputGroupAddonModule } from "primeng/inputgroupaddon";
import { InputTextModule } from "primeng/inputtext";
import { MessageModule } from "primeng/message";
import { ProgressBarModule } from "primeng/progressbar";
import { SelectModule } from "primeng/select";
import { TextareaModule } from "primeng/textarea";
import { ToggleSwitchModule } from "primeng/toggleswitch";
import { CheckIcon } from "primeng/icons/check";
import { PlusIcon } from "primeng/icons/plus";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";
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
}

interface TipoTramite {
  id: string;
  nombre: string;
  tramitesEspecificos: TramiteEspecifico[];
}

interface CatalogosTramite {
  estacionesServicio: EstacionServicio[];
  prioridades: string[];
  estados: string[];
  responsables: string[];
  solicitantesCopec: string[];
  tiposTramite: TipoTramite[];
}

@Component({
  selector: "app-tramite-nuevo",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Breadcrumbs,
    AutoCompleteModule,
    ButtonDirective,
    CheckIcon,
    DatePickerModule,
    DialogModule,
    FileUploadModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    MessageModule,
    ProgressBarModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
    PlusIcon,
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
  tramiteCreadoId = 1006;
  segundosRestantes = this.segundosRedireccion;
  mensajeCreacionVisible = false;

  breadcrumbs = [
    {
      label: "Módulo de Gestión de Trámites",
      route: "/tramites",
    },
    {
      label: "Nuevo Trámite",
    },
  ];

  estacionesServicio: EstacionServicio[] = [];

  concesionarios: string[] = [];

  concesionariosSugeridos: string[] = [];

  prioridades: string[] = [];

  estados: string[] = [];

  responsables: string[] = [];

  tiposTramite: TipoTramite[] = [];

  tramitesEspecificos: TramiteEspecifico[] = [];

  solicitantesCopec: string[] = [];

  antecedentes: string[] = [];

  catalogosError = "";

  form = {
    estacionServicio: "",
    concesionario: "",
    prioridad: "",
    estado: "",
    responsableInterno: "",
    tipoTramite: "",
    tramiteEspecifico: "",
    solicitanteCopec: "",
    fechaApertura: "",
    fechaEstimadaTermino: "",
  };

  antecedentesRequeridos = [this.crearAntecedenteVacio()];

  antecedentesExtraordinarios = [this.crearAntecedenteVacio()];

  hitosGestion = [this.crearHitoVacio()];

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  ngOnDestroy(): void {
    this.detenerTemporizadorRedireccion();
  }

  onEstacionChange(): void {
    const estacion = this.estacionesServicio.find(
      (item) => item.codigo === this.form.estacionServicio,
    );

    this.form.concesionario = estacion
      ? `${estacion.concesionario} · RUT ${estacion.rut}`
      : "";
  }

  filtrarConcesionarios(event: AutoCompleteCompleteEvent): void {
    const consulta = this.normalizarTexto(event.query);

    this.concesionariosSugeridos = this.concesionarios.filter((concesionario) =>
      this.normalizarTexto(concesionario).includes(consulta),
    );
  }

  onTipoTramiteChange(tipoTramiteId: string): void {
    const tipo = this.tiposTramite.find(
      (item) => item.id === tipoTramiteId,
    );

    this.form.tipoTramite = tipoTramiteId;
    this.form.tramiteEspecifico = "";
    this.tramitesEspecificos = tipo?.tramitesEspecificos ?? [];
    this.actualizarAntecedentes([]);
  }

  onTramiteEspecificoChange(tramiteEspecificoId: string): void {
    const tramite = this.tramitesEspecificos.find(
      (item) => item.id === tramiteEspecificoId,
    );

    this.form.tramiteEspecifico = tramiteEspecificoId;
    this.actualizarAntecedentes(tramite?.antecedentes ?? []);
  }

  agregarAntecedenteRequerido(): void {
    this.antecedentesRequeridos.push(this.crearAntecedenteVacio());
  }

  agregarAntecedenteExtraordinario(): void {
    this.antecedentesExtraordinarios.push(this.crearAntecedenteVacio());
  }

  agregarHitoGestion(): void {
    this.hitosGestion.push(this.crearHitoVacio());
  }

  onFileSelect(
    event: FileSelectEvent,
    item: { archivo: File | null; archivoNombre: string },
  ): void {
    const archivo = event.currentFiles.at(-1) ?? event.files.at(-1) ?? null;

    item.archivo = archivo;
    item.archivoNombre = archivo?.name ?? "";
  }

  private crearAntecedenteVacio() {
    return {
      antecedente: "",
      obligatorio: true,
      responsable: "",
      estado: "",
      observaciones: "",
      archivo: null as File | null,
      archivoNombre: "",
    };
  }

  private crearHitoVacio() {
    return {
      hito: "",
      estado: "",
      fechaEstimada: "",
      fechaReal: "",
      responsable: "",
      observacion: "",
    };
  }

  crearTramite(): void {
    console.log("Crear trámite", this.form);

    if (this.mensajeCreacionVisible) {
      return;
    }

    this.tramiteCreadoId = 1006;
    this.registrarTramiteCreado();
    this.segundosRestantes = this.segundosRedireccion;
    this.mensajeCreacionVisible = true;
    this.iniciarRedireccionAutomatica();
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

  guardarBorrador(): void {
    console.log("Guardar borrador", this.form);
  }

  cancelar(): void {
    console.log("Cancelar");
  }

  private registrarTramiteCreado(): void {
    const estacion = this.estacionesServicio.find(
      (item) => item.codigo === this.form.estacionServicio,
    );
    const tipoTramite = this.tiposTramite.find(
      (item) => item.id === this.form.tipoTramite,
    );
    const tramiteEspecifico = tipoTramite?.tramitesEspecificos.find(
      (item) => item.id === this.form.tramiteEspecifico,
    );

    this.tramitesMock.guardar({
      id: this.tramiteCreadoId,
      idEstacion:
        estacion?.codigo || this.form.estacionServicio || "Sin especificar",
      estacionServicio:
        estacion?.nombre || this.form.estacionServicio || "Sin especificar",
      razonSocial:
        this.form.concesionario.split(" · RUT ")[0] || "Sin especificar",
      comuna: estacion?.comuna ?? "Sin especificar",
      direccion: estacion?.direccion ?? "Sin especificar",
      estado: this.form.estado || "Ingresado",
      prioridad: this.form.prioridad || "Sin especificar",
      responsableInterno:
        this.form.responsableInterno || "Sin especificar",
      tipoTramite:
        tipoTramite?.nombre || this.form.tipoTramite || "Sin especificar",
      tramiteEspecifico:
        tramiteEspecifico?.nombre ||
        this.form.tramiteEspecifico ||
        "Sin especificar",
      solicitanteCopec: this.form.solicitanteCopec || "Sin especificar",
      fechaApertura: this.normalizarFechaListado(this.form.fechaApertura),
      fechaEstimadaTermino: this.normalizarFechaListado(
        this.form.fechaEstimadaTermino,
      ),
    });
  }

  private normalizarFechaListado(fecha: string): string {
    return fecha ? fecha.replaceAll("/", "-") : "Sin especificar";
  }

  private cargarCatalogos(): void {
    this.http
      .get<CatalogosTramite>("/data/tramite-catalogos.json")
      .subscribe({
        next: (catalogos) => {
          this.estacionesServicio = catalogos.estacionesServicio;
          this.concesionarios = [
            ...new Set(
              catalogos.estacionesServicio.map(
                (estacion) =>
                  `${estacion.concesionario} · RUT ${estacion.rut}`,
              ),
            ),
          ];
          this.concesionariosSugeridos = [...this.concesionarios];
          this.prioridades = catalogos.prioridades;
          this.estados = catalogos.estados;
          this.responsables = catalogos.responsables;
          this.solicitantesCopec = catalogos.solicitantesCopec;
          this.tiposTramite = catalogos.tiposTramite;
          this.form.estado ||= "Borrador";
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

  private actualizarAntecedentes(antecedentes: string[]): void {
    this.antecedentes = antecedentes;

    for (const item of this.antecedentesRequeridos) {
      item.antecedente = "";
    }
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
    if (this.temporizadorRedireccion) {
      clearInterval(this.temporizadorRedireccion);
      this.temporizadorRedireccion = undefined;
    }
  }

  private normalizarTexto(texto: string): string {
    return texto
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("es-CL");
  }
}
