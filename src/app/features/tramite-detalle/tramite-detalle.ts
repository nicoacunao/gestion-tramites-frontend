import { CommonModule } from "@angular/common";
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Optional,
  Output,
  ViewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { finalize, forkJoin, map, switchMap } from "rxjs";
import { ButtonDirective } from "primeng/button";
import { DatePickerModule } from "primeng/datepicker";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { PanelModule } from "primeng/panel";
import { ProgressBarModule } from "primeng/progressbar";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { SelectModule } from "primeng/select";
import { TagModule } from "primeng/tag";
import { TextareaModule } from "primeng/textarea";
import {
  BitacoraPanel,
  EntradaBitacora,
} from "../../shared/components/bitacora-panel/bitacora-panel";
import { UserSessionService } from "../../shared/services/user-session";
import {
  ESTADOS_ANTECEDENTE,
  ESTADOS_ETAPA,
  ETAPAS_ESTANDAR,
  resolverSeveridadEstado,
  TagSeverity,
} from "../tramites/models/estado-tramite";
import {
  AntecedenteComplementarioDetalle,
  AntecedenteRequeridoDetalle,
  DetalleEditableTramite,
  EtapaDetalle,
  Tramite,
} from "../tramites/models/tramite";
import { TramitesMock } from "../../shared/services/tramites-mock";
import { BackendBackground, BackendStage, BackendUser } from "../../shared/services/api-models";
import { BitacoraApiService } from "../../shared/services/bitacora-api";
import { CatalogApiService } from "../../shared/services/catalog-api";
import { IdentityApiService } from "../../shared/services/identity-api";
import { ManagementApiService } from "../../shared/services/management-api";

type NivelGestion = "N1" | "N2" | "N3" | "N4";

interface AntecedenteConNivel {
  id: string;
  nivel: Exclude<NivelGestion, "N1">;
  padreId: string | null;
  expandido: boolean;
}

interface AntecedenteVisible<T extends AntecedenteConNivel> {
  antecedente: T;
  profundidad: number;
}

@Component({
  selector: "app-tramite-detalle",
  standalone: true,
  imports: [
    BitacoraPanel,
    ButtonDirective,
    CommonModule,
    DatePickerModule,
    DialogModule,
    FormsModule,
    InputTextModule,
    PanelModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    SelectModule,
    TagModule,
    TextareaModule,
  ],
  templateUrl: "./tramite-detalle.html",
  styleUrl: "./tramite-detalle.scss",
})
export class TramiteDetalle {
  private readonly entradasPorTramite = new Map<string | number, EntradaBitacora[]>();
  private _tramiteId: string | number | null = null;
  private _visible = false;

  @Input()
  set visible(visible: boolean) {
    const seAbreDetalle = visible && !this._visible;

    this._visible = visible;

    if (seAbreDetalle) {
      this.cargarDatosEditables();
      this.registrarUltimaRevision();
    }
  }

  get visible(): boolean {
    return this._visible;
  }

  @Output() readonly visibleChange = new EventEmitter<boolean>();
  @ViewChild("archivoInput") archivoInput?: ElementRef<HTMLInputElement>;

  @Input()
  set tramiteId(tramiteId: string | number | null) {
    this._tramiteId = tramiteId;
    this.cargandoDetalle = Boolean(tramiteId && this.managementApi);
    this.tramite = tramiteId
      ? this.tramitesMock.obtenerPorId(tramiteId)
      : undefined;
    if (tramiteId && this.managementApi) {
      // El listado puede tener una copia previa. Se muestra de inmediato, pero
      // el detalle siempre se refresca para evitar presentar información obsoleta.
      this.solicitudesDetallePendientes = 4 + (this.catalogApi ? 1 : 0);
      this.tramitesMock.cargarPorId(tramiteId).pipe(
        finalize(() => this.finalizarCargaDetalle()),
      ).subscribe({
        next: (tramite) => {
          if (this._tramiteId === tramiteId) {
            this.tramite = tramite;
            this.cargarDatosEditables();
          }
          this.cargarDatosBackend(tramite);
        },
        error: () => {
          if (this.tramite) {
            this.cargarDatosBackend(this.tramite);
          } else {
            this.cancelarCargaDetalle();
          }
        },
      });
    }
    this.cargarDatosEditables();

    if (this.visible) {
      this.registrarUltimaRevision();
    }

    this.limpiarFormularioDocumento();
    this.restablecerJerarquiaAntecedentes();
  }

  get tramiteId(): string | number | null {
    return this._tramiteId;
  }

  tramite: Tramite | undefined;
  private responsablesApi: BackendUser[] = [];
  private nombresAntecedentes = new Map<string, string>();
  guardando = false;
  cargandoDetalle = false;
  private solicitudesDetallePendientes = 0;
  errorGuardado = "";
  tipoAntecedenteNuevo: string | null = null;
  archivoAntecedenteNuevo: File | null = null;
  contextoDocumentoNuevo = "";
  mensajeDocumento = "";
  mensajeDocumentoEsError = false;
  readonly estadosAntecedente = [...ESTADOS_ANTECEDENTE];
  readonly estadosEtapa = [...ESTADOS_ETAPA];

  tiposAntecedenteAdicional: string[] = [];

  antecedentesRequeridos: AntecedenteRequeridoDetalle[] = [];

  antecedentesComplementarios: AntecedenteComplementarioDetalle[] = [];

  etapasGestion: EtapaDetalle[] = [];

  readonly archivosAdjuntos: Array<{
    archivo: string; categoria: string; documento: string;
    fechaCarga: string; cargadoPor: string;
  }> = [];

  private readonly datosEditablesIniciales = this.clonarDatosEditables({
    antecedentesRequeridos: this.antecedentesRequeridos,
    antecedentesComplementarios: this.antecedentesComplementarios,
    etapas: this.etapasGestion,
  });

  constructor(
    private readonly tramitesMock: TramitesMock,
    readonly userSession: UserSessionService,
    @Optional() private readonly managementApi: ManagementApiService | null = null,
    @Optional() private readonly identityApi: IdentityApiService | null = null,
    @Optional() private readonly bitacoraApi: BitacoraApiService | null = null,
    @Optional() private readonly catalogApi: CatalogApiService | null = null,
  ) {}

  private aplicarAntecedentesBackend(items: BackendBackground[]): void {
    this.tiposAntecedenteAdicional = [...new Set(items.filter((item) => !item.required).map((item) => this.nombreAntecedente(item.backgroundId)))];
    this.antecedentesRequeridos = items.filter((item) => item.required).map((item) => ({ id: item.id, version: item.version, nivel: item.level, padreId: item.parentManagementBackgroundId, expandido: true, antecedente: this.nombreAntecedente(item.backgroundId), obligatorio: item.required, responsableId: item.responsibleUserId, responsable: this.nombreResponsable(item.responsibleUserId), estado: item.status, fechaCarga: item.uploadedAt ?? "", archivo: item.fileReference ?? "" }));
    this.antecedentesComplementarios = items.filter((item) => !item.required).map((item) => ({ id: item.id, version: item.version, nivel: item.level, padreId: item.parentManagementBackgroundId, expandido: true, tipoDocumento: this.nombreAntecedente(item.backgroundId), solicitadoPor: "", responsableId: item.responsibleUserId, responsable: this.nombreResponsable(item.responsibleUserId), estado: item.status, fechaCarga: item.uploadedAt ?? "", archivo: item.fileReference ?? "" }));
  }

  private aplicarEtapasBackend(items: BackendStage[]): void {
    this.etapasGestion = items.map((item, indice) => {
      const etapaEstandar = ETAPAS_ESTANDAR[indice];
      return { id: item.id, version: item.version, etapa: item.stageName || etapaEstandar?.nombre || item.stageId, porcentaje: item.percentage ?? etapaEstandar?.porcentaje ?? 0, estado: item.status, fechaEstimada: item.estimatedOn ?? "", fechaReal: item.completedOn ?? "", responsable: item.responsible ?? "", observacion: item.notes ?? "" };
    });
  }

  get bitacora(): EntradaBitacora[] {
    if (!this.tramite) {
      return [];
    }

    let entradas = this.entradasPorTramite.get(this.tramite.id);

    if (!entradas) {
      entradas = this.crearEntradasIniciales(this.tramite);
      this.entradasPorTramite.set(this.tramite.id, entradas);
    }

    return entradas;
  }

  get puedeAdjuntarAntecedente(): boolean {
    return Boolean(this.tipoAntecedenteNuevo && this.archivoAntecedenteNuevo);
  }

  get porcentajeAvance(): number {
    return this.etapasGestion.reduce(
      (porcentaje, etapa) =>
        etapa.estado !== "Pendiente"
          ? Math.max(porcentaje, etapa.porcentaje)
          : porcentaje,
      0,
    );
  }

  get antecedentesRequeridosVisibles(): AntecedenteVisible<AntecedenteRequeridoDetalle>[] {
    return this.obtenerAntecedentesVisibles(this.antecedentesRequeridos);
  }

  get antecedentesComplementariosVisibles(): AntecedenteVisible<AntecedenteComplementarioDetalle>[] {
    return this.obtenerAntecedentesVisibles(this.antecedentesComplementarios);
  }

  actualizarVisibilidad(visible: boolean): void {
    this.visible = visible;

    if (!visible) {
      this.limpiarFormularioDocumento();
    }

    this.visibleChange.emit(visible);
  }

  cerrar(): void {
    this.actualizarVisibilidad(false);
  }

  agregarEntradaBitacora(entrada: EntradaBitacora): void {
    if (!this.tramite) {
      return;
    }

    this.entradasPorTramite.set(this.tramite.id, [entrada, ...this.bitacora]);
  }

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.item(0) ?? null;

    if (archivo && archivo.size > 10_000_000) {
      this.archivoAntecedenteNuevo = null;
      this.mensajeDocumento = "El archivo supera el tamaño máximo de 10 MB.";
      this.mensajeDocumentoEsError = true;
      input.value = "";
      return;
    }

    this.archivoAntecedenteNuevo = archivo;
    this.mensajeDocumento = "";
    this.mensajeDocumentoEsError = false;
  }

  cargarArchivoAntecedente(
    event: Event,
    antecedente: AntecedenteRequeridoDetalle | AntecedenteComplementarioDetalle,
  ): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.item(0) ?? null;

    if (!archivo || archivo.size > 10_000_000) {
      input.value = "";
      return;
    }

    antecedente.archivo = archivo.name;
    antecedente.fechaCarga = this.formatearFecha(new Date());
    input.value = "";
  }

  actualizarEstadoEtapa(indice: number, estado: string): void {
    if (!this.puedeEditarEtapa(indice)) {
      return;
    }

    this.etapasGestion[indice].estado = estado;

    if (estado === "Completado") {
      return;
    }

    this.etapasGestion.slice(indice + 1).forEach((etapa) => {
      etapa.estado = "Pendiente";
    });
  }

  puedeEditarEtapa(indice: number): boolean {
    return (
      indice === 0 || this.etapasGestion[indice - 1].estado === "Completado"
    );
  }

  private finalizarCargaDetalle(): void {
    this.solicitudesDetallePendientes -= 1;

    if (this.solicitudesDetallePendientes <= 0) {
      this.cargandoDetalle = false;
    }
  }

  private cancelarCargaDetalle(): void {
    this.solicitudesDetallePendientes = 0;
    this.cargandoDetalle = false;
  }

  private cargarDatosBackend(tramite: Tramite): void {
    if (!this.managementApi || !this.identityApi || !this.bitacoraApi || !tramite.apiId) {
      this.cancelarCargaDetalle();
      return;
    }

    const apiId = tramite.apiId;
    this.identityApi.users().pipe(finalize(() => this.finalizarCargaDetalle())).subscribe({ next: (users) => { this.responsablesApi = users; this.actualizarNombresResponsables(); } });
    this.managementApi.backgrounds(apiId).pipe(finalize(() => this.finalizarCargaDetalle())).subscribe({ next: (items) => this.aplicarAntecedentesBackend(items) });
    this.managementApi.stages(apiId).pipe(finalize(() => this.finalizarCargaDetalle())).subscribe({ next: (items) => this.aplicarEtapasBackend(items) });
    this.bitacoraApi.logs(apiId).pipe(finalize(() => this.finalizarCargaDetalle())).subscribe({ next: (items) => this.entradasPorTramite.set(tramite.id, items.map((item) => ({ id: item.id, fechaIso: item.registeredOn, fecha: this.formatearFechaIsoComoVista(item.registeredOn), hora: item.registeredAt.slice(0, 5), usuario: item.authorName ?? "Usuario del sistema", iniciales: item.authorInitials ?? "US", tipo: item.type ?? "novedad", titulo: item.title, comentario: item.comment, automatica: item.automatic ?? false }))) });
    if (this.catalogApi) {
      this.catalogApi.backgroundCatalog().pipe(finalize(() => this.finalizarCargaDetalle())).subscribe({
        next: (items) => {
          this.nombresAntecedentes = new Map(items.map(({ id, name }) => [id, name]));
          this.recargarNombresAntecedentes();
        },
      });
    } else {
      this.finalizarCargaDetalle();
    }
  }

  private nombreAntecedente(id: string): string {
    return this.nombresAntecedentes.get(id) ?? id;
  }

  private recargarNombresAntecedentes(): void {
    this.antecedentesRequeridos.forEach((item) => { item.antecedente = this.nombreAntecedente(item.antecedente); });
    this.antecedentesComplementarios.forEach((item) => { item.tipoDocumento = this.nombreAntecedente(item.tipoDocumento); });
    this.tiposAntecedenteAdicional = this.tiposAntecedenteAdicional.map((id) => this.nombreAntecedente(id));
  }

  private actualizarNombresResponsables(): void {
    [...this.antecedentesRequeridos, ...this.antecedentesComplementarios].forEach((item) => {
      if (item.responsableId) {
        item.responsable = this.nombreResponsable(item.responsableId);
      }
    });
  }

  guardarCambios(): void {
    if (!this.tramite) {
      return;
    }

    const tramiteActualizado: Tramite = {
      ...this.tramite,
      detalleEditable: this.clonarDatosEditables({
        antecedentesRequeridos: this.antecedentesRequeridos,
        antecedentesComplementarios: this.antecedentesComplementarios,
        etapas: this.etapasGestion,
      }),
    };

    if (this.managementApi && this.tramite.apiId) {
      this.guardando = true;
      this.errorGuardado = "";
      const antecedentes = [...this.antecedentesRequeridos, ...this.antecedentesComplementarios]
        .filter((item) => item.id && item.version !== undefined)
        .map((item) => this.managementApi!.updateBackground(item.id, { responsibleUserId: this.resolverResponsable(item.responsable), status: item.estado, fileReference: item.archivo || null, version: item.version }));
      const etapas = this.etapasGestion
        .filter((item) => item.id && item.version !== undefined)
        .map((item) => this.managementApi!.updateStage(item.id!, { status: item.estado, estimatedOn: item.fechaEstimada || null, completedOn: item.fechaReal || null, responsible: this.resolverResponsable(item.responsable), notes: item.observacion || null, version: item.version }));
      this.managementApi.management(this.tramite.apiId).pipe(
        map((management) => this.managementApi!.updateManagement(this.tramite!.apiId!, { ...management, status: this.tramite!.estado, priority: this.tramite!.prioridad })),
        switchMap((managementUpdate) => forkJoin([...antecedentes, ...etapas, managementUpdate])),
      ).subscribe({
        next: () => { this.guardando = false; this.tramite = tramiteActualizado; this.actualizarVisibilidad(false); },
        error: (error: Error) => { this.guardando = false; this.errorGuardado = error.message; },
      });
      return;
    }
    this.tramitesMock.guardar(tramiteActualizado);
    this.tramite = tramiteActualizado;
    this.actualizarVisibilidad(false);
  }

  adjuntarAntecedente(): void {
    if (
      !this.tramite ||
      !this.tipoAntecedenteNuevo ||
      !this.archivoAntecedenteNuevo
    ) {
      return;
    }

    const ahora = new Date();
    const usuario = this.userSession.currentUser();
    const tipoDocumento = this.tipoAntecedenteNuevo;
    const archivo = this.archivoAntecedenteNuevo.name;
    const contexto = this.contextoDocumentoNuevo.trim();
    const fecha = this.formatearFecha(ahora);
    const hora = this.formatearHora(ahora);

    this.antecedentesComplementarios.unshift({
      id: `antecedente-adicional-${ahora.getTime()}`,
      nivel: "N2",
      padreId: null,
      expandido: false,
      tipoDocumento,
      solicitadoPor: "Durante la gestión",
      responsable: usuario.fullName,
      estado: "Recibido",
      fechaCarga: fecha,
      archivo,
    });
    this.archivosAdjuntos.unshift({
      archivo,
      categoria: "Antecedente adicional",
      documento: tipoDocumento,
      fechaCarga: `${fecha} ${hora}`,
      cargadoPor: usuario.fullName,
    });

    const entrada: EntradaBitacora = {
      id: `BIT-${this.tramite.id}-documento-${ahora.getTime()}`,
      fecha,
      fechaIso: this.formatearFechaIso(ahora),
      hora,
      usuario: usuario.fullName,
      iniciales: usuario.initials,
      titulo: `Documento incorporado: ${tipoDocumento}`,
      comentario:
        contexto ||
        `Se incorporó el archivo ${archivo} como evidencia del trámite.`,
      automatica: false,
    };

    this.entradasPorTramite.set(this.tramite.id, [entrada, ...this.bitacora]);
    this.tipoAntecedenteNuevo = null;
    this.archivoAntecedenteNuevo = null;
    this.contextoDocumentoNuevo = "";
    this.mensajeDocumento =
      "El documento quedó asociado al trámite y la recepción fue registrada en la bitácora.";
    this.mensajeDocumentoEsError = false;
    this.limpiarArchivoSeleccionado();
  }

  alternarAntecedente(
    antecedente: AntecedenteConNivel,
    antecedentes: readonly AntecedenteConNivel[],
  ): void {
    if (!this.cantidadAntecedentesHijos(antecedente, antecedentes)) {
      return;
    }

    antecedente.expandido = !antecedente.expandido;

    if (!antecedente.expandido) {
      this.contraerDescendientes(antecedente, antecedentes);
    }
  }

  cantidadAntecedentesHijos(
    antecedente: AntecedenteConNivel,
    antecedentes: readonly AntecedenteConNivel[],
  ): number {
    return antecedentes.filter(({ padreId }) => padreId === antecedente.id)
      .length;
  }

  limpiarMensajeDocumento(): void {
    this.mensajeDocumento = "";
    this.mensajeDocumentoEsError = false;
  }

  tieneArchivo(archivo: string): boolean {
    return archivo !== "—";
  }

  obtenerSeveridadEstado(estado: string): TagSeverity {
    return resolverSeveridadEstado(estado);
  }

  private crearEntradasIniciales(tramite: Tramite): EntradaBitacora[] {
    return [];
  }

  private limpiarFormularioDocumento(): void {
    this.tipoAntecedenteNuevo = null;
    this.archivoAntecedenteNuevo = null;
    this.contextoDocumentoNuevo = "";
    this.mensajeDocumento = "";
    this.mensajeDocumentoEsError = false;
    this.limpiarArchivoSeleccionado();
  }

  private cargarDatosEditables(): void {
    const datos = this.tramite?.detalleEditable ?? this.datosEditablesIniciales;
    const copia = this.clonarDatosEditables(datos);

    this.antecedentesRequeridos = copia.antecedentesRequeridos;
    this.antecedentesComplementarios = copia.antecedentesComplementarios;
    this.etapasGestion = copia.etapas;
  }

  private clonarDatosEditables(
    datos: DetalleEditableTramite,
  ): DetalleEditableTramite {
    return {
      antecedentesRequeridos: datos.antecedentesRequeridos.map(
        (antecedente) => ({ ...antecedente }),
      ),
      antecedentesComplementarios: datos.antecedentesComplementarios.map(
        (antecedente) => ({ ...antecedente }),
      ),
      etapas: datos.etapas.map((etapa) => ({ ...etapa })),
    };
  }

  private limpiarArchivoSeleccionado(): void {
    if (this.archivoInput) {
      this.archivoInput.nativeElement.value = "";
    }
  }

  private obtenerAntecedentesVisibles<T extends AntecedenteConNivel>(
    antecedentes: readonly T[],
  ): AntecedenteVisible<T>[] {
    const antecedentesPorId = new Map(
      antecedentes.map((antecedente) => [antecedente.id, antecedente]),
    );

    return antecedentes.flatMap((antecedente) => {
      let profundidad = 0;
      let padreId = antecedente.padreId;
      const idsVisitados = new Set<string>();

      while (padreId) {
        if (idsVisitados.has(padreId)) {
          return [];
        }

        idsVisitados.add(padreId);
        const padre = antecedentesPorId.get(padreId);

        if (!padre || !padre.expandido) {
          return [];
        }

        profundidad += 1;
        padreId = padre.padreId;
      }

      return [{ antecedente, profundidad }];
    });
  }

  private restablecerJerarquiaAntecedentes(): void {
    [this.antecedentesRequeridos, this.antecedentesComplementarios].forEach(
      (antecedentes) => {
        antecedentes.forEach((antecedente) => {
          antecedente.expandido =
            antecedente.padreId === null &&
            this.cantidadAntecedentesHijos(antecedente, antecedentes) > 0;
        });
      },
    );
  }

  private contraerDescendientes(
    antecedente: AntecedenteConNivel,
    antecedentes: readonly AntecedenteConNivel[],
  ): void {
    antecedentes
      .filter(({ padreId }) => padreId === antecedente.id)
      .forEach((hijo) => {
        hijo.expandido = false;
        this.contraerDescendientes(hijo, antecedentes);
      });
  }

  private obtenerIniciales(nombre: string): string {
    return nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toLocaleUpperCase("es-CL"))
      .join("");
  }

  private registrarUltimaRevision(): void {
    if (!this.tramite) {
      return;
    }

    this.tramite = {
      ...this.tramite,
      fechaUltimaRevision: this.formatearFecha(new Date()),
    };
    this.tramitesMock.guardar(this.tramite);
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

  private formatearFechaIsoComoVista(fechaIso: string): string {
    const [anio, mes, dia] = fechaIso.split("-");
    return `${dia}-${mes}-${anio}`;
  }

  private nombreResponsable(id: string): string {
    const user = this.responsablesApi.find(({ id: userId }) => userId === id);
    return user
      ? [user.names, user.firstSurname, user.secondSurname].filter(Boolean).join(" ")
      : id;
  }

  private resolverResponsable(nombre: string): string | null {
    if (!nombre) {
      return null;
    }
    const user = this.responsablesApi.find(
      (item) => [item.names, item.firstSurname, item.secondSurname].filter(Boolean).join(" ") === nombre || item.id === nombre,
    );
    return user?.id ?? null;
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
