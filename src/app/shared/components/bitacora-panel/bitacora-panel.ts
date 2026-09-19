import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TimelineModule } from "primeng/timeline";
import { UserSessionService } from "../../services/user-session";

export type TipoEntradaBitacora =
  "inicio" | "novedad" | "seguimiento" | "contacto";

export interface EntradaBitacora {
  id: string;
  fecha: string;
  fechaIso: string;
  hora: string;
  usuario: string;
  iniciales: string;
  tipo?: TipoEntradaBitacora;
  titulo: string;
  comentario: string;
  automatica: boolean;
}

@Component({
  selector: "app-bitacora-panel",
  standalone: true,
  imports: [CommonModule, FormsModule, TimelineModule],
  templateUrl: "./bitacora-panel.html",
  styleUrl: "./bitacora-panel.scss",
})
export class BitacoraPanel {
  private _contextoId: string | number = "general";

  @Input() entradas: EntradaBitacora[] = [];
  @Input() idBase = "bitacora";

  @Input()
  set contextoId(contextoId: string | number) {
    if (contextoId !== this._contextoId) {
      this._contextoId = contextoId;
      this.limpiarFormulario();
    }
  }

  get contextoId(): string | number {
    return this._contextoId;
  }

  @Input()
  set activo(activo: boolean) {
    if (!activo) {
      this.limpiarFormulario();
    }
  }

  @Output() readonly entradaRegistrada = new EventEmitter<EntradaBitacora>();

  readonly maximoCaracteres = 1000;
  readonly maximoCaracteresTitulo = 80;
  tituloNuevo = "";
  comentarioNuevo = "";
  mensajeValidacion = "";
  mensajeConfirmacion = "";

  constructor(
    private readonly userSession: UserSessionService = new UserSessionService(),
  ) {}

  get tituloId(): string {
    return `${this.idBase}-titulo-${this.contextoId}`;
  }

  get comentarioId(): string {
    return `${this.idBase}-comentario-${this.contextoId}`;
  }

  get errorId(): string {
    return `${this.idBase}-error-${this.contextoId}`;
  }

  get formularioTituloId(): string {
    return `${this.idBase}-formulario-titulo-${this.contextoId}`;
  }

  get historialTituloId(): string {
    return `${this.idBase}-historial-titulo-${this.contextoId}`;
  }

  get caracteresRestantes(): number {
    return this.maximoCaracteres - this.comentarioNuevo.length;
  }

  get caracteresRestantesTitulo(): number {
    return this.maximoCaracteresTitulo - this.tituloNuevo.length;
  }

  get puedeRegistrar(): boolean {
    return Boolean(this.tituloNuevo.trim() && this.comentarioNuevo.trim());
  }

  registrarEntrada(): void {
    const titulo = this.tituloNuevo.trim();
    const comentario = this.comentarioNuevo.trim();

    this.mensajeConfirmacion = "";

    if (!titulo) {
      this.mensajeValidacion =
        "Escribe un título que identifique la novedad de la bitácora.";
      return;
    }

    if (!comentario) {
      this.mensajeValidacion =
        "Escribe un comentario antes de agregarlo a la bitácora.";
      return;
    }

    const ahora = new Date();
    const usuario = this.userSession.currentUser();

    this.entradaRegistrada.emit({
      id: `BIT-${this.contextoId}-${ahora.getTime()}`,
      fecha: this.formatearFecha(ahora),
      fechaIso: this.formatearFechaIso(ahora),
      hora: this.formatearHora(ahora),
      usuario: usuario.fullName,
      iniciales: usuario.initials,
      tipo: "novedad",
      titulo,
      comentario,
      automatica: false,
    });

    this.tituloNuevo = "";
    this.comentarioNuevo = "";
    this.mensajeValidacion = "";
    this.mensajeConfirmacion = "La novedad se agregó correctamente.";
  }

  limpiarMensajes(): void {
    this.mensajeValidacion = "";
    this.mensajeConfirmacion = "";
  }

  limpiarFormulario(): void {
    this.tituloNuevo = "";
    this.comentarioNuevo = "";
    this.limpiarMensajes();
  }

  private formatearFecha(fecha: Date): string {
    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Santiago",
    })
      .format(fecha)
      .replaceAll("/", "-");
  }

  private formatearFechaIso(fecha: Date): string {
    const partes = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "America/Santiago",
    }).formatToParts(fecha);
    const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
      partes.find(({ type }) => type === tipo)?.value ?? "";

    return `${valor("year")}-${valor("month")}-${valor("day")}`;
  }

  private formatearHora(fecha: Date): string {
    return new Intl.DateTimeFormat("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Santiago",
    }).format(fecha);
  }
}
