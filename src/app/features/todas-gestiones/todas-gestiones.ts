import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Breadcrumbs } from "../../shared/components/breadcrumbs/breadcrumbs";
import { GestionAlcanceInfo } from "../../shared/components/gestion-alcance-info/gestion-alcance-info";
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

const ETIQUETAS_SEMAFORO: Record<EstadoSemaforo, string> = {
  "al-dia": "Al día",
  "proximo-vencer": "Próximo a vencer",
  atrasado: "Requiere atención",
};

@Component({
  selector: "app-todas-gestiones",
  standalone: true,
  imports: [Breadcrumbs, GestionAlcanceInfo, GestionListado],
  templateUrl: "./todas-gestiones.html",
  styleUrl: "./todas-gestiones.scss",
})
export class TodasGestiones {
  readonly tituloInformacionAlcance = "¿Qué es la vista Todas las Gestiones?";
  readonly informacionAlcance =
    "En esta vista, ves todas las gestiones del sistema, de todos los responsables.";

  readonly breadcrumbs = [
    { label: "Módulo de Gestión de Trámites", route: "/home" },
    { label: "Todas las gestiones" },
  ];

  gestiones: GestionGlobal[] = [];
  loading = true;
  errorMessage = "";
  readonly tramiteDetalleInicialId: string | number | null;
  readonly idEstacionInicial: string | null;

  constructor(tramitesMock: TramitesMock, route?: ActivatedRoute) {
    const detalleParam = route?.snapshot.queryParamMap.get("detalle") ?? null;
    this.tramiteDetalleInicialId = detalleParam && /^\d+$/.test(detalleParam)
      ? Number(detalleParam)
      : detalleParam;
    this.idEstacionInicial =
      route?.snapshot.queryParamMap.get("estacion") ?? null;

    tramitesMock.cargarTodos().subscribe({
      next: (tramites) => {
        this.gestiones = tramites.map((tramite) => this.crearGestionGlobal(tramite, true));
        this.loading = false;
      },
      error: (error: Error) => { this.loading = false; this.errorMessage = error.message; },
    });
  }

  private crearGestionGlobal(
    tramite: Tramite,
    tieneDetalle: boolean,
  ): GestionGlobal {
    const datos = {
      rutRazonSocial:
        tramite.datosAdicionales?.["rutRazonSocial"] ?? "Sin registrar",
      representanteLegal:
        tramite.datosAdicionales?.["representanteLegal"] ?? "Sin registrar",
      rutRepresentanteLegal:
        tramite.datosAdicionales?.["rutRepresentanteLegal"] ?? "Sin registrar",
      semaforo: this.obtenerSemaforo(tramite),
    };
    const responsableInterno = this.normalizarResponsable(
      tramite.responsableInterno,
    );

    return {
      id: tramite.id,
      codigo: `N${tramite.modalidadCreacion === "subtramite" ? 2 : 1}-OTR-${tramite.id}`,
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
    return responsable;
  }

  private obtenerSemaforo(tramite: Tramite): EstadoSemaforo {
    return tramite.estado === "Observado" || tramite.estado === "Rechazado"
      ? "atrasado"
      : "al-dia";
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
