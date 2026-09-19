import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { DialogModule } from "primeng/dialog";
import {
  BitacoraPanel,
  EntradaBitacora,
} from "../../shared/components/bitacora-panel/bitacora-panel";
import { UserSessionService } from "../../shared/services/user-session";

export type EstadoSemaforoBitacora = "al-dia" | "proximo-vencer" | "atrasado";

export interface GestionBitacora {
  id: number;
  codigo: string;
  nivel: `N${number}`;
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

@Component({
  selector: "app-bitacora",
  standalone: true,
  imports: [BitacoraPanel, CommonModule, DialogModule],
  templateUrl: "./bitacora.html",
  styleUrl: "./bitacora.scss",
})
export class Bitacora {
  private gestionSeleccionada: GestionBitacora | null = null;
  private readonly entradasPorGestion = new Map<number, EntradaBitacora[]>();

  @Input()
  set gestion(gestion: GestionBitacora | null) {
    this.gestionSeleccionada = gestion;
  }

  get gestion(): GestionBitacora | null {
    return this.gestionSeleccionada;
  }

  @Input() visible = false;
  @Input() usarUsuarioActualComoAutor = false;
  @Output() readonly visibleChange = new EventEmitter<boolean>();

  constructor(
    private readonly userSession: UserSessionService = new UserSessionService(),
  ) {}

  get entradas(): EntradaBitacora[] {
    if (!this.gestion) {
      return [];
    }

    let entradas = this.entradasPorGestion.get(this.gestion.id);

    if (!entradas) {
      entradas = this.crearEntradasIniciales(this.gestion);
      this.entradasPorGestion.set(this.gestion.id, entradas);
    }

    return entradas;
  }

  agregarEntrada(entrada: EntradaBitacora): void {
    if (!this.gestion) {
      return;
    }

    this.entradasPorGestion.set(this.gestion.id, [entrada, ...this.entradas]);
  }

  actualizarVisibilidad(visible: boolean): void {
    this.visible = visible;
    this.visibleChange.emit(visible);
  }

  cerrar(): void {
    this.actualizarVisibilidad(false);
  }

  private crearEntradasIniciales(gestion: GestionBitacora): EntradaBitacora[] {
    const usuarioActual = this.userSession.currentUser();
    const autor = this.usarUsuarioActualComoAutor
      ? usuarioActual.fullName
      : gestion.responsableInterno;
    const iniciales = this.usarUsuarioActualComoAutor
      ? usuarioActual.initials
      : this.obtenerIniciales(autor);
    const fechaSeguimiento = this.sumarDias(gestion.fechaInicio, 6);
    const fechaContacto = this.sumarDias(gestion.fechaInicio, 3);

    return [
      {
        id: `BIT-${gestion.id}-seguimiento`,
        fecha: fechaSeguimiento,
        fechaIso: this.convertirFechaAIso(fechaSeguimiento),
        hora: "16:40",
        usuario: autor,
        iniciales,
        tipo: "seguimiento",
        titulo: "Gestión de seguimiento",
        comentario:
          "Se solicitó una actualización a la institución sobre el estado de la revisión. La respuesta continúa pendiente.",
        automatica: false,
      },
      {
        id: `BIT-${gestion.id}-contacto`,
        fecha: fechaContacto,
        fechaIso: this.convertirFechaAIso(fechaContacto),
        hora: "11:25",
        usuario: autor,
        iniciales,
        tipo: "contacto",
        titulo: "Contacto con la institución",
        comentario:
          "Se tomó contacto para confirmar la recepción de los antecedentes y consultar si existen solicitudes adicionales.",
        automatica: false,
      },
      {
        id: `BIT-${gestion.id}-inicio`,
        fecha: gestion.fechaInicio,
        fechaIso: this.convertirFechaAIso(gestion.fechaInicio),
        hora: "09:00",
        usuario: autor,
        iniciales,
        tipo: "inicio",
        titulo: "Inicio del trámite",
        comentario: `El trámite ${gestion.codigo} fue creado e ingresado al sistema.`,
        automatica: true,
      },
    ];
  }

  private obtenerIniciales(nombre: string): string {
    return nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toLocaleUpperCase("es-CL"))
      .join("");
  }

  private sumarDias(fecha: string, cantidad: number): string {
    const [dia, mes, anio] = fecha.split("-").map(Number);
    const fechaCalculada = new Date(Date.UTC(anio, mes - 1, dia + cantidad));

    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    })
      .format(fechaCalculada)
      .replaceAll("/", "-");
  }

  private convertirFechaAIso(fecha: string): string {
    const [dia, mes, anio] = fecha.split("-");
    return `${anio}-${mes}-${dia}`;
  }
}
