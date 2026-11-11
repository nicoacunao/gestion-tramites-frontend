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
  readonly tiposDocumentoComplementario: string[] = [];
  responsables: string[] = [];

  breadcrumbs: Array<{ label: string; route?: string }>;

  readonly tramite = {
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

  antecedentesRequeridos: Array<{
    antecedente: string; obligatorio: boolean; responsable: string;
    estado: string; observaciones: string; archivo: File | null; archivoNombre: string;
  }> = [];

  antecedentesComplementarios: Array<{
    antecedente: string; obligatorio: boolean; responsable: string;
    estado: string; observaciones: string; archivo: File | null; archivoNombre: string;
  }> = [];

  etapasGestion: Array<{
    etapa: string; porcentaje: number; estado: string; fechaEstimada: string;
    fechaReal: string; responsable: string; observacion: string;
  }> = [];

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
    private readonly api: ApiClient,
  ) {
    this.tramiteId = route.snapshot.paramMap.get("id") ?? "";
    this.api.management(this.tramiteId).subscribe({
      next: (management) => {
        this.backendManagement = management;
        this.responsables = [management.responsibleName ?? management.responsibleUserId];
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
    this.api.users().subscribe({
      next: (users) => {
        this.responsables = users.map((user) => [user.names, user.firstSurname, user.secondSurname].filter(Boolean).join(" "));
      },
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
