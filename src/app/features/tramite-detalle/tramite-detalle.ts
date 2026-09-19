import { CommonModule } from "@angular/common";
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ButtonDirective } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { PanelModule } from "primeng/panel";
import { SelectModule } from "primeng/select";
import { TagModule } from "primeng/tag";
import { TextareaModule } from "primeng/textarea";
import {
  BitacoraPanel,
  EntradaBitacora,
} from "../../shared/components/bitacora-panel/bitacora-panel";
import { UserSessionService } from "../../shared/services/user-session";
import {
  resolverSeveridadEstado,
  TagSeverity,
} from "../tramites/models/estado-tramite";
import { Tramite } from "../tramites/models/tramite";
import { TramitesMock } from "../tramites/services/tramites-mock";

type NivelGestion = "N1" | "N2" | "N3" | "N4";

interface AntecedenteConNivel {
  id: string;
  nivel: Exclude<NivelGestion, "N1">;
  padreId: string | null;
  expandido: boolean;
}

interface AntecedenteRequerido extends AntecedenteConNivel {
  antecedente: string;
  obligatorio: boolean;
  responsable: string;
  estado: string;
  fechaCarga: string;
  archivo: string;
}

interface AntecedenteComplementario extends AntecedenteConNivel {
  tipoDocumento: string;
  solicitadoPor: string;
  responsable: string;
  estado: string;
  fechaCarga: string;
  archivo: string;
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
    DialogModule,
    FormsModule,
    InputTextModule,
    PanelModule,
    SelectModule,
    TagModule,
    TextareaModule,
  ],
  templateUrl: "./tramite-detalle.html",
  styleUrl: "./tramite-detalle.scss",
})
export class TramiteDetalle {
  private readonly entradasPorTramite = new Map<number, EntradaBitacora[]>();
  private _tramiteId: number | null = null;

  @Input() visible = false;
  @Output() readonly visibleChange = new EventEmitter<boolean>();
  @ViewChild("archivoInput") archivoInput?: ElementRef<HTMLInputElement>;

  @Input()
  set tramiteId(tramiteId: number | null) {
    this._tramiteId = tramiteId;
    this.tramite = tramiteId
      ? this.tramitesMock.obtenerPorId(tramiteId)
      : undefined;
    this.limpiarFormularioDocumento();
    this.restablecerJerarquiaAntecedentes();
  }

  get tramiteId(): number | null {
    return this._tramiteId;
  }

  tramite: Tramite | undefined;
  tipoAntecedenteNuevo: string | null = null;
  archivoAntecedenteNuevo: File | null = null;
  contextoDocumentoNuevo = "";
  mensajeDocumento = "";
  mensajeDocumentoEsError = false;

  readonly tiposAntecedenteAdicional = [
    "Formulario de ingreso de solicitud",
    "Informe técnico",
    "Documento de Dirección de Obras",
    "Antecedente complementario",
    "Documento solicitado posteriormente por una institución",
    "Otro documento",
  ];

  readonly antecedentesRequeridos: AntecedenteRequerido[] = [
    {
      id: "antecedente-dominio",
      nivel: "N2",
      padreId: null,
      expandido: true,
      antecedente: "Certificado de dominio vigente",
      obligatorio: true,
      responsable: "Concesionario",
      estado: "Recibido conforme",
      fechaCarga: "02-07-2026",
      archivo: "certificado-dominio.pdf",
    },
    {
      id: "antecedente-plano",
      nivel: "N3",
      padreId: "antecedente-dominio",
      expandido: false,
      antecedente: "Plano de instalaciones",
      obligatorio: true,
      responsable: "Oficina técnica",
      estado: "Recibido",
      fechaCarga: "07-07-2026",
      archivo: "plano-instalaciones-v2.pdf",
    },
    {
      id: "antecedente-formulario",
      nivel: "N3",
      padreId: "antecedente-dominio",
      expandido: false,
      antecedente: "Formulario de ingreso",
      obligatorio: true,
      responsable: "Concesionario",
      estado: "Pendiente",
      fechaCarga: "—",
      archivo: "—",
    },
  ];

  readonly antecedentesComplementarios: AntecedenteComplementario[] = [
    {
      id: "antecedente-seguridad",
      nivel: "N2",
      padreId: null,
      expandido: true,
      tipoDocumento: "Informe complementario de seguridad",
      solicitadoPor: "Municipalidad de Concón",
      responsable: "Prevención de riesgos",
      estado: "Recibido",
      fechaCarga: "08-07-2026",
      archivo: "informe-seguridad.pdf",
    },
    {
      id: "antecedente-matrimonio",
      nivel: "N3",
      padreId: "antecedente-seguridad",
      expandido: false,
      tipoDocumento: "Certificado de matrimonio",
      solicitadoPor: "Municipalidad de Concón",
      responsable: "Concesionario",
      estado: "Pendiente",
      fechaCarga: "—",
      archivo: "—",
    },
  ];

  readonly hitosGestion = [
    {
      hito: "Preparación del expediente",
      estado: "Completado",
      fechaEstimada: "06-07-2026",
      fechaReal: "06-07-2026",
      responsable: "Oficina técnica",
      observacion: "Expediente consolidado para ingreso.",
    },
    {
      hito: "Ingreso ante la institución",
      estado: "Completado",
      fechaEstimada: "07-07-2026",
      fechaReal: "07-07-2026",
      responsable: "Carlos Ramírez",
      observacion: "Folio de ingreso DOM-2841.",
    },
    {
      hito: "Revisión institucional",
      estado: "En curso",
      fechaEstimada: "15-07-2026",
      fechaReal: "—",
      responsable: "María González",
      observacion: "En revisión por la Dirección de Obras Municipales.",
    },
    {
      hito: "Recepción de observaciones",
      estado: "Pendiente",
      fechaEstimada: "17-07-2026",
      fechaReal: "—",
      responsable: "María González",
      observacion: "A la espera del pronunciamiento institucional.",
    },
    {
      hito: "Reingreso de antecedentes",
      estado: "Pendiente",
      fechaEstimada: "18-07-2026",
      fechaReal: "—",
      responsable: "Oficina técnica",
      observacion: "Sujeto a la subsanación de observaciones.",
    },
    {
      hito: "Recepción o aprobación final",
      estado: "Pendiente",
      fechaEstimada: "25-07-2026",
      fechaReal: "—",
      responsable: "María González",
      observacion: "Pendiente del pronunciamiento de la institución.",
    },
  ];

  readonly archivosAdjuntos = [
    {
      archivo: "certificado-dominio.pdf",
      categoria: "Antecedente requerido",
      documento: "Certificado de dominio vigente",
      fechaCarga: "02-07-2026 10:12",
      cargadoPor: "Carlos Ramírez",
    },
    {
      archivo: "plano-instalaciones-v2.pdf",
      categoria: "Antecedente requerido",
      documento: "Plano de instalaciones",
      fechaCarga: "07-07-2026 17:05",
      cargadoPor: "Oficina técnica",
    },
    {
      archivo: "informe-seguridad.pdf",
      categoria: "Antecedente complementario",
      documento: "Informe complementario de seguridad",
      fechaCarga: "08-07-2026 15:48",
      cargadoPor: "Prevención de riesgos",
    },
  ];

  constructor(
    private readonly tramitesMock: TramitesMock,
    readonly userSession: UserSessionService,
  ) {}

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

  get antecedentesRequeridosVisibles(): AntecedenteVisible<AntecedenteRequerido>[] {
    return this.obtenerAntecedentesVisibles(this.antecedentesRequeridos);
  }

  get antecedentesComplementariosVisibles(): AntecedenteVisible<AntecedenteComplementario>[] {
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
    return [
      {
        id: `BIT-${tramite.id}-solicitud-adicional`,
        fecha: "08-07-2026",
        fechaIso: "2026-07-08",
        hora: "16:40",
        usuario: "María González",
        iniciales: "MG",
        titulo: "Solicitud adicional de la institución",
        comentario:
          "La municipalidad solicitó complementar el plano con la ubicación de los accesos.",
        automatica: false,
      },
      {
        id: `BIT-${tramite.id}-seguimiento`,
        fecha: "05-07-2026",
        fechaIso: "2026-07-05",
        hora: "12:10",
        usuario: tramite.responsableInterno,
        iniciales: this.obtenerIniciales(tramite.responsableInterno),
        titulo: "Gestión de seguimiento",
        comentario:
          "Se consultó por el plazo de respuesta. La institución informó una demora debido al alto volumen de solicitudes.",
        automatica: false,
      },
      {
        id: `BIT-${tramite.id}-contacto`,
        fecha: "04-07-2026",
        fechaIso: "2026-07-04",
        hora: "10:25",
        usuario: "Carlos Ramírez",
        iniciales: "CR",
        titulo: "Contacto con profesional externo",
        comentario:
          "Se coordinó con el arquitecto la entrega de una versión actualizada de los planos.",
        automatica: false,
      },
      {
        id: `BIT-${tramite.id}-inicio`,
        fecha: tramite.fechaApertura,
        fechaIso: this.convertirFechaAIso(tramite.fechaApertura),
        hora: "09:00",
        usuario: tramite.solicitanteCopec,
        iniciales: this.obtenerIniciales(tramite.solicitanteCopec),
        titulo: "Inicio del trámite",
        comentario: `El trámite #${tramite.id} fue creado e ingresado al sistema.`,
        automatica: true,
      },
    ];
  }

  private limpiarFormularioDocumento(): void {
    this.tipoAntecedenteNuevo = null;
    this.archivoAntecedenteNuevo = null;
    this.contextoDocumentoNuevo = "";
    this.mensajeDocumento = "";
    this.mensajeDocumentoEsError = false;
    this.limpiarArchivoSeleccionado();
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
