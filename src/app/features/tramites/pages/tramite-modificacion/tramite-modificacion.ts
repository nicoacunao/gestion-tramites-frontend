import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { ButtonDirective } from "primeng/button";
import { DatePickerModule } from "primeng/datepicker";
import { FileSelectEvent, FileUploadModule } from "primeng/fileupload";
import { PlusIcon } from "primeng/icons/plus";
import { InputGroupModule } from "primeng/inputgroup";
import { InputGroupAddonModule } from "primeng/inputgroupaddon";
import { InputTextModule } from "primeng/inputtext";
import { MessageModule } from "primeng/message";
import { PanelModule } from "primeng/panel";
import { SelectModule } from "primeng/select";
import { TagModule } from "primeng/tag";
import { TextareaModule } from "primeng/textarea";
import { ToggleSwitchModule } from "primeng/toggleswitch";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";
import {
  resolverSeveridadEstado,
  TagSeverity,
} from "../../models/estado-tramite";
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
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    MessageModule,
    PanelModule,
    PlusIcon,
    RouterLink,
    SelectModule,
    TagModule,
    TextareaModule,
    ToggleSwitchModule,
  ],
  templateUrl: "./tramite-modificacion.html",
  styleUrl: "./tramite-modificacion.scss",
})
export class TramiteModificacion {
  readonly tramiteId: string;
  readonly estados = ["Pendiente", "En revisión", "Recibido", "Finalizado"];
  readonly responsables = [
    "María González",
    "Carlos Ramírez",
    "Oficina técnica",
    "Concesionario",
  ];

  breadcrumbs: Array<{ label: string; route?: string }>;

  readonly tramite = {
    estacionServicio: "Copec Concón",
    concesionario: "Comercial Los Pinos SpA",
    prioridad: "Alta",
    estado: "En revisión",
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

  antecedentesExtraordinarios = [
    {
      antecedente: "Informe complementario de seguridad",
      obligatorio: false,
      responsable: "Oficina técnica",
      estado: "En revisión",
      observaciones: "Se solicitaron aclaraciones menores.",
      archivo: null as File | null,
      archivoNombre: "",
    },
  ];

  hitosGestion = [
    {
      hito: "Ingreso de solicitud",
      estado: "Finalizado",
      fechaEstimada: "02/07/2026",
      fechaReal: "02/07/2026",
      responsable: "Carlos Ramírez",
      observacion: "Solicitud ingresada correctamente.",
    },
    {
      hito: "Revisión técnica",
      estado: "En revisión",
      fechaEstimada: "08/07/2026",
      fechaReal: "",
      responsable: "María González",
      observacion: "Revisión documental y técnica en proceso.",
    },
  ];

  constructor(
    route: ActivatedRoute,
    private readonly router: Router,
    tramitesMock: TramitesMock,
  ) {
    this.tramiteId = route.snapshot.paramMap.get("id") ?? "1001";
    const tramiteRegistrado = tramitesMock.obtenerPorId(Number(this.tramiteId));

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

  agregarAntecedenteRequerido(): void {
    this.antecedentesRequeridos.push(this.crearAntecedenteVacio());
  }

  agregarAntecedenteExtraordinario(): void {
    this.antecedentesExtraordinarios.push(this.crearAntecedenteVacio());
  }

  agregarHito(): void {
    this.hitosGestion.push({
      hito: "",
      estado: "",
      fechaEstimada: "",
      fechaReal: "",
      responsable: "",
      observacion: "",
    });
  }

  grabar(): void {
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
      estado: "",
      observaciones: "",
      archivo: null as File | null,
      archivoNombre: "",
    };
  }
}
