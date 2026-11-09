import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { ButtonDirective } from "primeng/button";
import { DatePickerModule } from "primeng/datepicker";
import { FileSelectEvent, FileUploadModule } from "primeng/fileupload";
import { InfoCircleIcon } from "primeng/icons/infocircle";
import { PlusIcon } from "primeng/icons/plus";
import { UploadIcon } from "primeng/icons/upload";
import { InputTextModule } from "primeng/inputtext";
import { PanelModule } from "primeng/panel";
import { PopoverModule } from "primeng/popover";
import { ProgressBarModule } from "primeng/progressbar";
import { SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { TextareaModule } from "primeng/textarea";
import { ToggleSwitchModule } from "primeng/toggleswitch";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";
import {
  ESTADOS_ANTECEDENTE,
  ESTADOS_ETAPA,
  ESTADOS_TRAMITE,
  ETAPAS_ESTANDAR,
  resolverSeveridadEstado,
  TagSeverity,
} from "../../models/estado-tramite";
import { TIPOS_DOCUMENTO_COMPLEMENTARIO } from "../../models/tipo-documento";
import { TramitesMock } from "../../services/tramites-mock";
import { ApiClient, BackendManagement } from "../../../../shared/services/api-client";

@Component({
  selector: "app-tramite-modificacion",
  standalone: true,
  imports: [
    Breadcrumbs,
    ButtonDirective,
    CommonModule,
    DatePickerModule,
    FileUploadModule,
    FormsModule,
    InfoCircleIcon,
    InputTextModule,
    PanelModule,
    PopoverModule,
    ProgressBarModule,
    PlusIcon,
    RouterLink,
    SelectModule,
    TableModule,
    TagModule,
    TextareaModule,
    ToggleSwitchModule,
    UploadIcon,
  ],
  templateUrl: "./tramite-modificacion.html",
  styleUrl: "./tramite-modificacion.scss",
})
export class TramiteModificacion {
  readonly tramiteId: string;
  loading = true;
  errorMessage = "";
  private backendManagement?: BackendManagement;
  readonly estadosTramite = [...ESTADOS_TRAMITE];
  readonly estadosAntecedente = [...ESTADOS_ANTECEDENTE];
  readonly estadosEtapa = [...ESTADOS_ETAPA];
  readonly tiposDocumentoComplementario = [...TIPOS_DOCUMENTO_COMPLEMENTARIO];
  readonly responsables = [
    "José L. Rosas",
    "Claudio Doñas",
    "Claudio Henríquez",
    "María González",
    "Carlos Ramírez",
    "Oficina técnica",
    "Concesionario",
    "Otros",
  ];

  breadcrumbs: Array<{ label: string; route?: string }>;

  readonly tramite = {
    estacionServicio: "Copec Concón",
    concesionario: "Comercial Los Pinos SpA",
    prioridad: "Alta",
    estado: "En tramitación",
    responsableInterno: "María González",
    tipoTramite: "Patente comercial",
    tramiteEspecifico: "Regularización de instalaciones",
    solicitanteCopec: "Carlos Ramírez",
    fechaApertura: "02-07-2026",
    fechaEstimadaTermino: "12-07-2026",
  };

  antecedentesRequeridos = [
    {
      antecedente: "Certificado de dominio vigente",
      obligatorio: true,
      responsable: "Concesionario",
      estado: "Recibido",
      observaciones: "Documento revisado y vigente.",
      archivo: null as File | null,
      archivoNombre: "",
    },
    {
      antecedente: "Plano de instalaciones",
      obligatorio: true,
      responsable: "Oficina técnica",
      estado: "Pendiente",
      observaciones: "Pendiente de entrega por parte del solicitante.",
      archivo: null as File | null,
      archivoNombre: "",
    },
  ];

  antecedentesComplementarios = [
    {
      antecedente: "Informe complementario de seguridad",
      obligatorio: false,
      responsable: "Oficina técnica",
      estado: "Recibido",
      observaciones: "Se solicitaron aclaraciones menores.",
      archivo: null as File | null,
      archivoNombre: "",
    },
  ];

  etapasGestion = ETAPAS_ESTANDAR.map((etapa, indice) => ({
    etapa: etapa.nombre,
    porcentaje: etapa.porcentaje,
    estado: indice < 3 ? "Completado" : indice === 3 ? "En curso" : "Pendiente",
    fechaEstimada: "",
    fechaReal: "",
    responsable: "",
    observacion: "",
  }));

  get porcentajeAvance(): number {
    return this.etapasGestion.reduce(
      (porcentaje, etapa) =>
        etapa.estado !== "Pendiente"
          ? Math.max(porcentaje, etapa.porcentaje)
          : porcentaje,
      0,
    );
  }

  constructor(
    route: ActivatedRoute,
    private readonly router: Router,
    private readonly tramitesMock: TramitesMock,
    private readonly api: ApiClient,
  ) {
    this.tramiteId = route.snapshot.paramMap.get("id") ?? "1001";
    const tramiteRegistrado = this.tramitesMock.obtenerPorId(
      Number(this.tramiteId),
    );

    if (tramiteRegistrado) {
      Object.assign(this.tramite, {
        estacionServicio: tramiteRegistrado.estacionServicio,
        concesionario: tramiteRegistrado.razonSocial,
        prioridad: tramiteRegistrado.prioridad,
        estado: tramiteRegistrado.estado,
        responsableInterno: tramiteRegistrado.responsableInterno,
        tipoTramite: tramiteRegistrado.tipoTramite,
        tramiteEspecifico: tramiteRegistrado.tramiteEspecifico,
        solicitanteCopec: tramiteRegistrado.solicitanteCopec,
        fechaApertura: tramiteRegistrado.fechaApertura,
        fechaEstimadaTermino: tramiteRegistrado.fechaEstimadaTermino,
      });
    }
    this.api.management(this.tramiteId).subscribe({
      next: (management) => {
        this.backendManagement = management;
        Object.assign(this.tramite, {
          estacionServicio: management.stationName ?? management.stationId,
          concesionario: management.legalName ?? this.tramite.concesionario,
          prioridad: management.priority,
          estado: management.status ?? this.tramite.estado,
          responsableInterno: management.responsibleName ?? management.responsibleUserId,
          tipoTramite: management.managementTypeName ?? management.managementTypeId,
          solicitanteCopec: management.requesterName,
          fechaApertura: this.toDisplayDate(management.openedOn),
          fechaEstimadaTermino: management.estimatedCompletionOn ? this.toDisplayDate(management.estimatedCompletionOn) : "",
        });
        this.loading = false;
      },
      error: (error: Error) => { this.loading = false; this.errorMessage = error.message; },
    });

    this.breadcrumbs = [
      { label: "Todas las gestiones", route: "/todas-las-gestiones" },
      {
        label: `Trámite ${this.tramiteId}`,
        route: `/todas-las-gestiones?detalle=${this.tramiteId}`,
      },
      { label: "Modificar" },
    ];
  }

  agregarAntecedenteComplementario(): void {
    this.antecedentesComplementarios.push(this.crearAntecedenteVacio());
  }

  grabar(): void {
    if (this.backendManagement) {
      this.api.updateManagement(this.tramiteId, {
        ...this.backendManagement,
        priority: this.tramite.prioridad,
        status: this.tramite.estado,
        responsibleUserId: this.backendManagement.responsibleUserId,
        requesterName: this.tramite.solicitanteCopec,
        openedOn: this.backendManagement.openedOn,
        estimatedCompletionOn: this.backendManagement.estimatedCompletionOn,
        lastReviewedOn: this.backendManagement.lastReviewedOn,
      }).subscribe({
        next: () => this.navegarTrasGuardar(),
        error: (error: Error) => { this.errorMessage = error.message; },
      });
      return;
    }
    const tramiteRegistrado = this.tramitesMock.obtenerPorId(
      Number(this.tramiteId),
    );

    if (tramiteRegistrado) {
      this.tramitesMock.guardar({
        ...tramiteRegistrado,
        estado: this.tramite.estado,
        responsableInterno: this.tramite.responsableInterno,
      });
    }

    this.navegarTrasGuardar();
  }

  private navegarTrasGuardar(): void {
    void this.router.navigate(["/todas-las-gestiones"], {
      queryParams: { detalle: this.tramiteId },
      state: { tramiteActualizado: true },
    });
  }

  private toDisplayDate(value: string): string { const [year, month, day] = value.split("-"); return `${day}-${month}-${year}`; }

  obtenerSeveridadEstado(estado: string): TagSeverity {
    return resolverSeveridadEstado(estado);
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
      obligatorio: false,
      responsable: "",
      estado: "Pendiente",
      observaciones: "",
      archivo: null as File | null,
      archivoNombre: "",
    };
  }
}
