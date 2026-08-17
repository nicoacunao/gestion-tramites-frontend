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
import { SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { TextareaModule } from "primeng/textarea";
import { ToggleSwitchModule } from "primeng/toggleswitch";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";
import {
  ESTADOS_ANTECEDENTE,
  ESTADOS_HITO,
  ESTADOS_TRAMITE,
  resolverSeveridadEstado,
  TagSeverity,
} from "../../models/estado-tramite";
import { TIPOS_DOCUMENTO_COMPLEMENTARIO } from "../../models/tipo-documento";
import { TramitesMock } from "../../services/tramites-mock";

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
  readonly estadosTramite = [...ESTADOS_TRAMITE];
  readonly estadosAntecedente = [...ESTADOS_ANTECEDENTE];
  readonly estadosHito = [...ESTADOS_HITO];
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

  hitosGestion = [
    {
      hito: "Ingreso de solicitud",
      estado: "Completado",
      fechaEstimada: "02/07/2026",
      fechaReal: "02/07/2026",
      responsable: "Carlos Ramírez",
      observacion: "Solicitud ingresada correctamente.",
    },
    {
      hito: "Revisión técnica",
      estado: "En curso",
      fechaEstimada: "08/07/2026",
      fechaReal: "",
      responsable: "María González",
      observacion: "Revisión documental y técnica en proceso.",
    },
  ];

  constructor(
    route: ActivatedRoute,
    private readonly router: Router,
    private readonly tramitesMock: TramitesMock,
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

    this.breadcrumbs = [
      { label: "Módulo de Gestión de Trámites", route: "/tramites" },
      {
        label: `Trámite ${this.tramiteId}`,
        route: `/tramites/${this.tramiteId}`,
      },
      { label: "Modificar" },
    ];
  }

  agregarAntecedenteComplementario(): void {
    this.antecedentesComplementarios.push(this.crearAntecedenteVacio());
  }

  grabar(): void {
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

    void this.router.navigate(["/tramites", this.tramiteId], {
      state: { tramiteActualizado: true },
    });
  }

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
