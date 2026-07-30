import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class TramitesNavegacion {
  private idEstacionPendiente: string | null = null;
  private readonly listadoCompletoSubject = new Subject<void>();

  readonly listadoCompleto$ = this.listadoCompletoSubject.asObservable();

  prepararFiltroEstacion(idEstacion: string): void {
    this.idEstacionPendiente = idEstacion;
  }

  consumirFiltroEstacion(): string | null {
    const idEstacion = this.idEstacionPendiente;
    this.idEstacionPendiente = null;
    return idEstacion;
  }

  solicitarListadoCompleto(): void {
    this.idEstacionPendiente = null;
    this.listadoCompletoSubject.next();
  }
}
