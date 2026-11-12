import { Injectable } from "@angular/core";
import { Observable, map, tap, throwError } from "rxjs";
import { Tramite } from "../../features/tramites/models/tramite";
import { BackendManagement } from "./api-models";
import { ManagementApiService } from "./management-api";

/** Adaptador de gestiones del backend; no contiene datos locales. */
@Injectable({ providedIn: "root" })
export class TramitesMock {
  private tramites: Tramite[] = [];

  constructor(private readonly api?: ManagementApiService) {}

  get usaApi(): boolean { return Boolean(this.api); }

  cargarTodos(): Observable<Tramite[]> {
    if (!this.api) {
      return throwError(() => new Error("El cliente API no está disponible."));
    }
    return this.api.managements().pipe(
      map((items) => items.map((item) => this.fromBackend(item))),
      tap((items) => { this.tramites = items; }),
    );
  }

  obtenerTodos(): Tramite[] { return this.tramites.map((tramite) => ({ ...tramite })); }

  cargarPorId(id: string | number): Observable<Tramite> {
    if (!this.api) {
      return throwError(() => new Error("El cliente API no está disponible."));
    }
    return this.api.management(String(id)).pipe(
      map((item) => this.fromBackend(item)),
      tap((item) => this.guardar(item)),
    );
  }

  obtenerPorId(id: string | number): Tramite | undefined {
    const tramite = this.tramites.find((item) => String(item.id) === String(id));
    return tramite ? { ...tramite } : undefined;
  }

  guardar(tramite: Tramite): void {
    const indice = this.tramites.findIndex((item) => String(item.id) === String(tramite.id));
    if (indice >= 0) {
      this.tramites[indice] = { ...tramite };
      return;
    }
    this.tramites.push({ ...tramite });
  }

  private fromBackend(item: BackendManagement): Tramite {
    return {
      id: item.id,
      apiId: item.id,
      codigo: item.codigo,
      nivel: item.nivel,
      ambito: item.ambito,
      codigoAmbito: item.codigoAmbito,
      correlativo: item.correlativo,
      semaforo: item.semaforo,
      semaforoEtiqueta: item.semaforoEtiqueta,
      idEstacion: item.idEstacion,
      tipoTramite: item.managementTypeName ?? item.managementTypeId,
      tramiteEspecifico: item.descripcion,
      descripcion: item.descripcion,
      estacionServicio: item.estacionServicio,
      razonSocial: item.razonSocial,
      comuna: item.comuna,
      direccion: item.direccion,
      rutRazonSocial: item.rutRazonSocial,
      representanteLegal: item.representanteLegal,
      rutRepresentanteLegal: item.rutRepresentanteLegal,
      concesionario: item.concesionario,
      estado: item.status ?? "Pendiente",
      prioridad: item.priority,
      responsableInterno: item.responsableInterno,
      solicitanteCopec: item.requesterName,
      fechaApertura: item.fechaInicio,
      fechaInicio: item.fechaInicio,
      fechaIngreso: item.fechaIngreso,
      fechaIngresoOrden: item.fechaIngresoOrden,
      fechaEstimadaTermino: item.fechaEstimadaTermino,
      fechaUltimaRevision: this.fechaParaVista(item.lastReviewedOn),
      modalidadCreacion: item.creationMode,
      datosAdicionales: {
        rutRazonSocial: item.rutRazonSocial,
        representanteLegal: item.representanteLegal,
      },
    };
  }

  private fechaParaVista(fecha: string | null): string | null {
    if (!fecha) {
      return null;
    }

    const [anio, mes, dia] = fecha.slice(0, 10).split("-");
    return anio?.length === 4 ? `${dia}-${mes}-${anio}` : fecha;
  }
}
