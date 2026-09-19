import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DialogModule } from "primeng/dialog";
import { TimelineModule } from "primeng/timeline";
import {
  ConnectedUser,
  UserSessionService,
} from "../../shared/services/user-session";

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

export interface EntradaBitacora {
  id: string;
  fecha: string;
  fechaIso: string;
  hora: string;
  usuario: string;
  iniciales: string;
  tipo: "inicio" | "novedad" | "seguimiento" | "contacto";
  titulo: string;
  comentario: string;
  automatica: boolean;
}

@Component({
  selector: "app-bitacora",
  standalone: true,
  imports: [CommonModule, DialogModule, FormsModule, TimelineModule],
  templateUrl: "./bitacora.html",
  styleUrl: "./bitacora.scss",
})
export class Bitacora {
  private gestionSeleccionada: GestionBitacora | null = null;
  private readonly entradasPorGestion = new Map<number, EntradaBitacora[]>();

  @Input()
  set gestion(gestion: GestionBitacora | null) {
    this.gestionSeleccionada = gestion;
    this.tituloNuevo = "";
    this.comentarioNuevo = "";
    this.mensajeValidacion = "";
    this.mensajeConfirmacion = "";
  }

  get gestion(): GestionBitacora | null {
    return this.gestionSeleccionada;
  }

  @Input() visible = false;
  @Input() usarUsuarioActualComoAutor = false;
  @Output() readonly visibleChange = new EventEmitter<boolean>();

  readonly maximoCaracteres = 1000;
  readonly maximoCaracteresTitulo = 80;
  tituloNuevo = "";
  comentarioNuevo = "";
  mensajeValidacion = "";
  mensajeConfirmacion = "";

  constructor(
    private readonly userSession: UserSessionService = new UserSessionService(),
  ) {}

  get usuarioActual(): ConnectedUser {
    return this.userSession.currentUser();
  }

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

  get caracteresRestantes(): number {
    return this.maximoCaracteres - this.comentarioNuevo.length;
  }

  get caracteresRestantesTitulo(): number {
    return this.maximoCaracteresTitulo - this.tituloNuevo.length;
  }

  get puedeRegistrar(): boolean {
    return (
      this.tituloNuevo.trim().length > 0 &&
      this.comentarioNuevo.trim().length > 0
    );
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

    if (!this.gestion) {
      return;
    }

    const ahora = new Date();
    const usuario = this.usuarioActual;
    const entrada: EntradaBitacora = {
      id: `BIT-${this.gestion.id}-${ahora.getTime()}`,
      fecha: this.formatearFecha(ahora),
      fechaIso: this.formatearFechaIso(ahora),
      hora: this.formatearHora(ahora),
      usuario: usuario.fullName,
      iniciales: usuario.initials,
      tipo: "novedad",
      titulo,
      comentario,
      automatica: false,
    };

    this.entradasPorGestion.set(this.gestion.id, [entrada, ...this.entradas]);
    this.tituloNuevo = "";
    this.comentarioNuevo = "";
    this.mensajeValidacion = "";
    this.mensajeConfirmacion = "La novedad se agregó correctamente.";
  }

  limpiarMensajes(): void {
    this.mensajeValidacion = "";
    this.mensajeConfirmacion = "";
  }

  actualizarVisibilidad(visible: boolean): void {
    this.visible = visible;

    if (!visible) {
      this.tituloNuevo = "";
      this.comentarioNuevo = "";
      this.limpiarMensajes();
    }

    this.visibleChange.emit(visible);
  }

  cerrar(): void {
    this.actualizarVisibilidad(false);
  }

  private crearEntradasIniciales(gestion: GestionBitacora): EntradaBitacora[] {
    const autor = this.usarUsuarioActualComoAutor
      ? this.usuarioActual.fullName
      : gestion.responsableInterno;
    const iniciales = this.usarUsuarioActualComoAutor
      ? this.usuarioActual.initials
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
