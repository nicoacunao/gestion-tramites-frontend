import { CommonModule } from "@angular/common";
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Optional,
  Output,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TimelineModule } from "primeng/timeline";
import { catchError, forkJoin, of, Subscription } from "rxjs";
import { mensajeDeError } from "../../services/api-base";
import { BackendLogEntry, BackendUser } from "../../services/api-models";
import { BitacoraApiService, LOG_COMMENT_MAX, LOG_TITLE_MAX } from "../../services/bitacora-api";
import { IdentityApiService } from "../../services/identity-api";
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

const ZONA_HORARIA = "America/Santiago";
const AUTOR_DESCONOCIDO = "Usuario del sistema";

/**
 * Bitácora de una gestión: carga el historial (`GET /bitacora/items`) y
 * registra novedades (`POST /bitacora/items`). La usan el diálogo de bitácora
 * del listado y el detalle del trámite.
 */
@Component({
  selector: "app-bitacora-panel",
  standalone: true,
  imports: [CommonModule, FormsModule, TimelineModule],
  templateUrl: "./bitacora-panel.html",
  styleUrl: "./bitacora-panel.scss",
})
export class BitacoraPanel implements OnDestroy {
  private _gestionId: string | null = null;
  private carga?: Subscription;
  private guardado?: Subscription;
  private autores = new Map<string, string>();

  @Input() idBase = "bitacora";

  /** Id de la gestión en el backend; al cambiar se recarga el historial. */
  @Input()
  set gestionId(gestionId: string | number | null | undefined) {
    const id = gestionId === null || gestionId === undefined || gestionId === "" ? null : String(gestionId);
    if (id === this._gestionId) return;
    this._gestionId = id;
    this.limpiarFormulario();
    this.cargar();
  }

  get gestionId(): string | null {
    return this._gestionId;
  }

  @Input()
  set activo(activo: boolean) {
    if (!activo) {
      this.limpiarFormulario();
    }
  }

  /** Emite la entrada ya confirmada por el servidor. */
  @Output() readonly entradaRegistrada = new EventEmitter<EntradaBitacora>();

  readonly maximoCaracteres = LOG_COMMENT_MAX;
  readonly maximoCaracteresTitulo = LOG_TITLE_MAX;
  readonly filasCarga = [1, 2, 3];
  entradas: EntradaBitacora[] = [];
  cargando = false;
  errorCarga = "";
  guardando = false;
  tituloNuevo = "";
  comentarioNuevo = "";
  mensajeValidacion = "";
  mensajeConfirmacion = "";

  constructor(
    private readonly userSession: UserSessionService = new UserSessionService(),
    @Optional() private readonly api: BitacoraApiService | null = null,
    @Optional() private readonly identityApi: IdentityApiService | null = null,
    @Optional() private readonly changeDetectorRef: ChangeDetectorRef | null = null,
  ) {}

  get contextoId(): string {
    return this._gestionId ?? "general";
  }

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
    return Boolean(
      this._gestionId
      && !this.guardando
      && this.tituloNuevo.trim()
      && this.comentarioNuevo.trim(),
    );
  }

  ngOnDestroy(): void {
    this.carga?.unsubscribe();
    this.guardado?.unsubscribe();
  }

  /** Vuelve a consultar el historial (por ejemplo, tras registrar un documento). */
  cargar(): void {
    this.carga?.unsubscribe();
    this.entradas = [];
    this.errorCarga = "";
    const gestionId = this._gestionId;
    if (!gestionId || !this.api) {
      this.cargando = false;
      this.actualizarVista();
      return;
    }

    this.cargando = true;
    this.actualizarVista();
    // Los nombres de autor son un complemento: si fallan, se muestra el historial igual.
    const usuarios = this.identityApi?.cachedUsers().pipe(catchError(() => of([] as BackendUser[])))
      ?? of([] as BackendUser[]);
    this.carga = forkJoin({ entradas: this.api.logs(gestionId), usuarios }).subscribe({
      next: ({ entradas, usuarios: lista }) => {
        this.autores = new Map(lista.map((usuario) => [usuario.id, this.nombreCompleto(usuario)]));
        this.entradas = entradas.map((entrada) => this.aEntrada(entrada));
        this.cargando = false;
        this.actualizarVista();
      },
      error: (error: unknown) => {
        this.errorCarga = mensajeDeError(error, "No fue posible cargar la bitácora. Inténtalo nuevamente.");
        this.cargando = false;
        this.actualizarVista();
      },
    });
  }

  registrarEntrada(): void {
    const titulo = this.tituloNuevo.trim();
    const comentario = this.comentarioNuevo.trim();

    this.mensajeConfirmacion = "";

    if (this.guardando) {
      return;
    }

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

    if (!this._gestionId || !this.api) {
      this.mensajeValidacion = "No es posible registrar novedades sin una gestión seleccionada.";
      return;
    }

    const ahora = new Date();
    const gestionId = this._gestionId;
    this.guardando = true;
    this.mensajeValidacion = "";
    this.actualizarVista();
    // Se envían fecha y hora de Chile: el backend interpreta ambos valores en
    // America/Santiago. El autor lo asigna el backend desde la sesión.
    this.guardado = this.api.createLog({
      managementId: gestionId,
      title: titulo,
      comment: comentario,
      type: "novedad",
      registeredOn: this.formatearFechaIso(ahora),
      registeredAt: this.formatearHora(ahora, true),
    }).subscribe({
      next: (registrada) => {
        this.guardando = false;
        if (gestionId !== this._gestionId) return;
        const entrada = this.aEntrada(registrada);
        this.entradas = [entrada, ...this.entradas];
        this.tituloNuevo = "";
        this.comentarioNuevo = "";
        this.mensajeConfirmacion = "La novedad se agregó correctamente.";
        this.entradaRegistrada.emit(entrada);
        this.actualizarVista();
      },
      error: (error: unknown) => {
        this.guardando = false;
        // Se conserva el texto escrito para que la persona pueda reintentar.
        this.mensajeValidacion = mensajeDeError(
          error,
          "No fue posible guardar la novedad. Inténtalo nuevamente.",
        );
        this.actualizarVista();
      },
    });
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

  private aEntrada(entrada: BackendLogEntry): EntradaBitacora {
    const usuario = this.nombreAutor(entrada.userId);
    const [anio, mes, dia] = entrada.registeredOn.split("-");
    return {
      id: entrada.id,
      fechaIso: entrada.registeredOn,
      fecha: anio && mes && dia ? `${dia}-${mes}-${anio}` : entrada.registeredOn,
      hora: entrada.registeredAt.slice(0, 5),
      usuario,
      iniciales: this.iniciales(usuario),
      tipo: entrada.type ?? "novedad",
      titulo: entrada.title,
      comentario: entrada.comment,
      // Las entradas de inicio las registra el sistema al ingresar el trámite.
      automatica: entrada.type === "inicio",
    };
  }

  private nombreAutor(userId: string | null): string {
    if (!userId) return AUTOR_DESCONOCIDO;
    const conocido = this.autores.get(userId);
    if (conocido) return conocido;
    const actual = this.userSession.currentUser();
    return actual.id === userId && actual.fullName ? actual.fullName : AUTOR_DESCONOCIDO;
  }

  private nombreCompleto(usuario: BackendUser): string {
    return [usuario.names, usuario.firstSurname, usuario.secondSurname].filter(Boolean).join(" ");
  }

  private iniciales(nombre: string): string {
    return nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toLocaleUpperCase("es-CL"))
      .join("");
  }

  private actualizarVista(): void {
    this.changeDetectorRef?.markForCheck();
  }

  private formatearFechaIso(fecha: Date): string {
    const partes = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: ZONA_HORARIA,
    }).formatToParts(fecha);
    const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
      partes.find(({ type }) => type === tipo)?.value ?? "";

    return `${valor("year")}-${valor("month")}-${valor("day")}`;
  }

  private formatearHora(fecha: Date, conSegundos = false): string {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      ...(conSegundos ? { second: "2-digit" as const } : {}),
      hourCycle: "h23",
      timeZone: ZONA_HORARIA,
    }).format(fecha);
  }
}
