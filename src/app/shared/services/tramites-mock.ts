import { Injectable } from "@angular/core";
import { Observable, map, tap, throwError } from "rxjs";
import { Tramite } from "../../features/tramites/models/tramite";
import { gestionATramite } from "./management-presentation";
import { ManagementApiService } from "./management-api";

/** Adaptador de gestiones del backend; no contiene datos locales. */
@Injectable({ providedIn: "root" })
export class TramitesMock {
  private tramites: Tramite[] = [];

  constructor(private readonly api?: ManagementApiService) {}

  get usaApi(): boolean { return Boolean(this.api); }

  cargarTodos(assignedToMe = false): Observable<Tramite[]> {
    if (!this.api) {
      return throwError(() => new Error("El cliente API no está disponible."));
    }
    return this.api.managements(assignedToMe).pipe(
      map((items) => items.map(gestionATramite)),
      tap((items) => { this.tramites = items; }),
    );
  }

  obtenerTodos(): Tramite[] { return this.tramites.map((tramite) => ({ ...tramite })); }

  cargarPorId(id: string | number): Observable<Tramite> {
    if (!this.api) {
      return throwError(() => new Error("El cliente API no está disponible."));
    }
    return this.api.management(String(id)).pipe(
      map(gestionATramite),
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
}
