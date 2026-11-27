import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { DialogModule } from "primeng/dialog";
import { BitacoraPanel } from "../../shared/components/bitacora-panel/bitacora-panel";

export type EstadoSemaforoBitacora = "al-dia" | "proximo-vencer" | "atrasado";

export interface GestionBitacora {
  /** Id de la gestión en el backend. */
  id: string | number;
  codigo: string;
  nivel: string;
  idEstacion: string;
  estacionServicio: string;
  direccion: string;
  comuna: string;
  fechaInicio: string;
  fechaEstimadaTermino: string;
  concesionario: string;
  razonSocial: string;
  representanteLegal: string;
  descripcion: string;
  semaforo: EstadoSemaforoBitacora;
  semaforoEtiqueta: string;
  responsableInterno: string;
}

/** Diálogo con la bitácora de una gestión; el historial lo gestiona `BitacoraPanel`. */
@Component({
  selector: "app-bitacora",
  standalone: true,
  imports: [BitacoraPanel, CommonModule, DialogModule],
  templateUrl: "./bitacora.html",
  styleUrl: "./bitacora.scss",
})
export class Bitacora {
  @Input() gestion: GestionBitacora | null = null;
  @Input() visible = false;
  @Output() readonly visibleChange = new EventEmitter<boolean>();

  actualizarVisibilidad(visible: boolean): void {
    this.visible = visible;
    this.visibleChange.emit(visible);
  }

  cerrar(): void {
    this.actualizarVisibilidad(false);
  }
}
