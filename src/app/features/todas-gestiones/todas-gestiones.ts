import { Component } from "@angular/core";
import { Breadcrumbs } from "../../shared/components/breadcrumbs/breadcrumbs";
import {
  GestionListado,
  GestionListadoItem,
} from "../../shared/components/gestion-listado/gestion-listado";
import { EstadoSemaforoBitacora } from "../bitacora/bitacora";
import { Tramite } from "../tramites/models/tramite";
import { TramitesMock } from "../tramites/services/tramites-mock";

type EstadoSemaforo = EstadoSemaforoBitacora;

interface GestionGlobal extends GestionListadoItem {
  rutRepresentanteLegal: string;
  tieneDetalle: boolean;
}

interface DatosAsociados {
  rutRazonSocial: string;
  representanteLegal: string;
  rutRepresentanteLegal: string;
  semaforo: EstadoSemaforo;
}

const ETIQUETAS_SEMAFORO: Record<EstadoSemaforo, string> = {
  "al-dia": "Al día",
  "proximo-vencer": "Próximo a vencer",
  atrasado: "Requiere atención",
};

const CODIGOS_GESTIONES: Record<number, string> = {
  1001: "N1-MUN-001",
  1002: "N1-SAN-002",
  1003: "N1-SAN-003",
  1004: "N1-DOM-004",
  1005: "N1-MUN-005",
  2001: "N1-SII-006",
  2002: "N2-ELE-007",
  2003: "N1-URB-008",
};

const DATOS_ASOCIADOS: Record<number, DatosAsociados> = {
  1001: {
    rutRazonSocial: "76.543.210-3",
    representanteLegal: "María José Soto Pérez",
    rutRepresentanteLegal: "12.345.678-5",
    semaforo: "al-dia",
  },
  1002: {
    rutRazonSocial: "76.222.111-K",
    representanteLegal: "Andrés Fuentes Díaz",
    rutRepresentanteLegal: "15.842.367-7",
    semaforo: "proximo-vencer",
  },
  1003: {
    rutRazonSocial: "77.101.990-0",
    representanteLegal: "Paula Andrea Rojas Silva",
    rutRepresentanteLegal: "9.876.543-3",
    semaforo: "atrasado",
  },
  1004: {
    rutRazonSocial: "76.908.440-1",
    representanteLegal: "Felipe Muñoz Contreras",
    rutRepresentanteLegal: "13.579.246-2",
    semaforo: "al-dia",
  },
  1005: {
    rutRazonSocial: "77.450.320-K",
    representanteLegal: "Carolina Pérez Lagos",
    rutRepresentanteLegal: "17.223.456-9",
    semaforo: "atrasado",
  },
  2001: {
    rutRazonSocial: "76.811.450-2",
    representanteLegal: "Camila Herrera Soto",
    rutRepresentanteLegal: "16.450.778-1",
    semaforo: "proximo-vencer",
  },
  2002: {
    rutRazonSocial: "77.064.219-8",
    representanteLegal: "Rodrigo Martínez Díaz",
    rutRepresentanteLegal: "14.028.369-4",
    semaforo: "proximo-vencer",
  },
  2003: {
    rutRazonSocial: "76.390.841-6",
    representanteLegal: "Daniela Castro Rojas",
    rutRepresentanteLegal: "18.206.945-7",
    semaforo: "atrasado",
  },
};

const GESTIONES_GLOBALES_ADICIONALES: Tramite[] = [
  {
    id: 2001,
    idEstacion: "60006",
    tipoTramite: "Servicio de Impuestos Internos",
    tramiteEspecifico: "Regularización de inicio de actividades",
    estacionServicio: "Copec Santiago Centro",
    razonSocial: "Servicios Alameda SpA",
    comuna: "Santiago",
    direccion: "Av. Libertador Bernardo O'Higgins 1.234",
    estado: "En tramitación",
    prioridad: "Media",
    responsableInterno: "José Luis Rosa",
    solicitanteCopec: "Claudio Doñas",
    fechaApertura: "15-07-2026",
    fechaEstimadaTermino: "30-08-2026",
  },
  {
    id: 2002,
    idEstacion: "60007",
    tipoTramite: "Certificación SEC",
    tramiteEspecifico: "Declaración de instalación eléctrica interior",
    estacionServicio: "Copec Maipú",
    razonSocial: "Operaciones Ruta 78 Ltda.",
    comuna: "Maipú",
    direccion: "Camino a Melipilla 9.450",
    estado: "Ingresado",
    prioridad: "Alta",
    responsableInterno: "Claudio Doñas",
    solicitanteCopec: "José Luis Rosa",
    fechaApertura: "18-07-2026",
    fechaEstimadaTermino: "05-09-2026",
    modalidadCreacion: "subtramite",
  },
  {
    id: 2003,
    idEstacion: "60008",
    tipoTramite: "Urbanismo y vialidad",
    tramiteEspecifico: "Factibilidad de acceso vehicular",
    estacionServicio: "Copec La Florida",
    razonSocial: "Inversiones Vicuña SpA",
    comuna: "La Florida",
    direccion: "Av. Vicuña Mackenna 8.120",
    estado: "Observado",
    prioridad: "Alta",
    responsableInterno: "Claudio Henríquez",
    solicitanteCopec: "José Luis Rosa",
    fechaApertura: "22-07-2026",
    fechaEstimadaTermino: "18-08-2026",
  },
];

@Component({
  selector: "app-todas-gestiones",
  standalone: true,
  imports: [Breadcrumbs, GestionListado],
  templateUrl: "./todas-gestiones.html",
  styleUrl: "./todas-gestiones.scss",
})
export class TodasGestiones {
  readonly breadcrumbs = [
    { label: "Módulo de Gestión de Trámites", route: "/home" },
    { label: "Todas las gestiones" },
  ];

  readonly gestiones: GestionGlobal[];

  constructor(tramitesMock: TramitesMock) {
    const tramitesConDetalle = tramitesMock.obtenerTodos();
    const idsConDetalle = new Set(tramitesConDetalle.map(({ id }) => id));
    const tramitesGlobales = [
      ...tramitesConDetalle,
      ...GESTIONES_GLOBALES_ADICIONALES,
    ];

    this.gestiones = tramitesGlobales.map((tramite) =>
      this.crearGestionGlobal(tramite, idsConDetalle.has(tramite.id)),
    );
  }

  private crearGestionGlobal(
    tramite: Tramite,
    tieneDetalle: boolean,
  ): GestionGlobal {
    const datos = DATOS_ASOCIADOS[tramite.id] ?? {
      rutRazonSocial:
        tramite.datosAdicionales?.["rutRazonSocial"] ?? "Sin registrar",
      representanteLegal:
        tramite.datosAdicionales?.["representanteLegal"] ?? "Sin registrar",
      rutRepresentanteLegal:
        tramite.datosAdicionales?.["rutRepresentanteLegal"] ?? "Sin registrar",
      semaforo: "al-dia",
    };
    const responsableInterno = this.normalizarResponsable(
      tramite.responsableInterno,
    );

    return {
      id: tramite.id,
      codigo: CODIGOS_GESTIONES[tramite.id] ?? `N1-OTR-${tramite.id}`,
      nivel: tramite.modalidadCreacion === "subtramite" ? "N2" : "N1",
      idEstacion: tramite.idEstacion,
      estacionServicio: tramite.estacionServicio,
      direccion: tramite.direccion,
      comuna: tramite.comuna,
      rutRazonSocial: datos.rutRazonSocial,
      razonSocial: tramite.razonSocial,
      representanteLegal: datos.representanteLegal,
      rutRepresentanteLegal: datos.rutRepresentanteLegal,
      descripcion: tramite.tramiteEspecifico,
      fechaInicio: tramite.fechaApertura,
      fechaIngreso: tramite.fechaApertura,
      fechaIngresoOrden: this.convertirFechaAOrden(tramite.fechaApertura),
      fechaEstimadaTermino: tramite.fechaEstimadaTermino,
      concesionario: tramite.razonSocial.replace(/\s+(SpA|Ltda\.)$/i, ""),
      responsableInterno,
      semaforo: datos.semaforo,
      semaforoEtiqueta: ETIQUETAS_SEMAFORO[datos.semaforo],
      tieneDetalle,
    };
  }

  private normalizarResponsable(responsable: string): string {
    const nombre = this.normalizarTexto(responsable);

    if (nombre.includes("jose")) {
      return "José Luis Rosa";
    }
    if (nombre.includes("donas")) {
      return "Claudio Doñas";
    }

    return "Claudio Henríquez";
  }

  private normalizarTexto(valor: string): string {
    return valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es-CL");
  }

  private convertirFechaAOrden(fecha: string): string {
    const [dia, mes, anio] = fecha.split("-");
    return `${anio}-${mes}-${dia}`;
  }
}
