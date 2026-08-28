import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { DialogModule } from "primeng/dialog";

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

interface AntecedenteBitacora {
  id: string;
  nivel: `N${number}`;
  idGestionTramite: string;
  descripcion: string;
  requisito: boolean;
  completado: boolean;
  archivoAdjunto: string | null;
  observacion: string;
  fechaSolicitada: string;
  fechaEntrega: string | null;
  padreId: string | null;
}

@Component({
  selector: "app-bitacora",
  standalone: true,
  imports: [CommonModule, DialogModule],
  templateUrl: "./bitacora.html",
  styleUrl: "./bitacora.scss",
})
export class Bitacora {
  @Input() gestion: GestionBitacora | null = null;
  @Input() visible = false;
  @Output() readonly visibleChange = new EventEmitter<boolean>();

  nivelesExpandidos = new Set<string>();

  get antecedentes(): AntecedenteBitacora[] {
    if (!this.gestion) {
      return [];
    }

    return [
      {
        id: `ANT-${this.sufijoCodigo(1)}`,
        nivel: this.obtenerNivelDependiente(1),
        idGestionTramite: `${this.obtenerNivelDependiente(1)}-SAN-${this.sufijoCodigo(1)}`,
        descripcion: "Informe sanitario del establecimiento",
        requisito: true,
        completado: false,
        archivoAdjunto: "informe-sanitario.pdf",
        observacion: "Documento ingresado; pendiente validación técnica.",
        fechaSolicitada: this.sumarDias(this.gestion.fechaInicio, 1),
        fechaEntrega: this.sumarDias(this.gestion.fechaInicio, 6),
        padreId: null,
      },
      {
        id: `ANT-${this.sufijoCodigo(2)}`,
        nivel: this.obtenerNivelDependiente(2),
        idGestionTramite: `${this.obtenerNivelDependiente(2)}-MUN-${this.sufijoCodigo(2)}`,
        descripcion: "Certificado de número municipal",
        requisito: true,
        completado: true,
        archivoAdjunto: "certificado-numero.pdf",
        observacion: "Antecedente completo y vigente.",
        fechaSolicitada: this.sumarDias(this.gestion.fechaInicio, 2),
        fechaEntrega: this.sumarDias(this.gestion.fechaInicio, 4),
        padreId: `ANT-${this.sufijoCodigo(1)}`,
      },
      {
        id: `ANT-${this.sufijoCodigo(3)}`,
        nivel: this.obtenerNivelDependiente(2),
        idGestionTramite: `${this.obtenerNivelDependiente(2)}-OTR-${this.sufijoCodigo(3)}`,
        descripcion: "Formulario de ingreso y planos de respaldo",
        requisito: true,
        completado: false,
        archivoAdjunto: null,
        observacion: "A la espera de documentación del concesionario.",
        fechaSolicitada: this.sumarDias(this.gestion.fechaInicio, 3),
        fechaEntrega: null,
        padreId: `ANT-${this.sufijoCodigo(1)}`,
      },
      {
        id: `ANT-${this.sufijoCodigo(4)}`,
        nivel: this.obtenerNivelDependiente(3),
        idGestionTramite: `${this.obtenerNivelDependiente(3)}-DOC-${this.sufijoCodigo(4)}`,
        descripcion: "Declaración simple del concesionario",
        requisito: false,
        completado: false,
        archivoAdjunto: null,
        observacion: "Se solicitará únicamente si existen observaciones.",
        fechaSolicitada: this.sumarDias(this.gestion.fechaInicio, 3),
        fechaEntrega: null,
        padreId: `ANT-${this.sufijoCodigo(3)}`,
      },
      {
        id: `ANT-${this.sufijoCodigo(5)}`,
        nivel: this.obtenerNivelDependiente(1),
        idGestionTramite: `${this.obtenerNivelDependiente(1)}-MUN-${this.sufijoCodigo(5)}`,
        descripcion: "Certificado de informaciones previas",
        requisito: true,
        completado: true,
        archivoAdjunto: "informaciones-previas.pdf",
        observacion: "Documento aprobado y asociado a la gestión.",
        fechaSolicitada: this.gestion.fechaInicio,
        fechaEntrega: this.sumarDias(this.gestion.fechaInicio, 3),
        padreId: null,
      },
    ];
  }

  get antecedentesVisibles(): AntecedenteBitacora[] {
    return this.antecedentes.filter((antecedente) =>
      this.estaRamaVisible(antecedente),
    );
  }

  get otrosAntecedentesGestiones(): AntecedenteBitacora[] {
    if (!this.gestion) {
      return [];
    }

    return [
      {
        id: `ASO-${this.sufijoCodigo(10)}`,
        nivel: this.obtenerNivelDependiente(1),
        idGestionTramite: `${this.obtenerNivelDependiente(1)}-LEG-${this.sufijoCodigo(10)}`,
        descripcion: "Certificado de matrimonio del representante legal",
        requisito: false,
        completado: true,
        archivoAdjunto: "certificado-matrimonio.pdf",
        observacion:
          "Documento recibido y asociado como antecedente complementario.",
        fechaSolicitada: this.sumarDias(this.gestion.fechaInicio, 1),
        fechaEntrega: this.sumarDias(this.gestion.fechaInicio, 2),
        padreId: null,
      },
      {
        id: `ASO-${this.sufijoCodigo(11)}`,
        nivel: this.obtenerNivelDependiente(2),
        idGestionTramite: `${this.obtenerNivelDependiente(2)}-LEG-${this.sufijoCodigo(11)}`,
        descripcion: "Validación de vigencia del certificado",
        requisito: false,
        completado: false,
        archivoAdjunto: null,
        observacion:
          "Pendiente de confirmación por parte del organismo emisor.",
        fechaSolicitada: this.sumarDias(this.gestion.fechaInicio, 2),
        fechaEntrega: null,
        padreId: `ASO-${this.sufijoCodigo(10)}`,
      },
      {
        id: `ASO-${this.sufijoCodigo(12)}`,
        nivel: this.obtenerNivelDependiente(1),
        idGestionTramite: `${this.obtenerNivelDependiente(1)}-LEG-${this.sufijoCodigo(12)}`,
        descripcion: "Copia autorizada de escritura social",
        requisito: false,
        completado: true,
        archivoAdjunto: "escritura-social.pdf",
        observacion: "Copia autorizada vigente y disponible para consulta.",
        fechaSolicitada: this.gestion.fechaInicio,
        fechaEntrega: this.sumarDias(this.gestion.fechaInicio, 3),
        padreId: null,
      },
    ];
  }

  get otrosAntecedentesGestionesVisibles(): AntecedenteBitacora[] {
    return this.otrosAntecedentesGestiones.filter((elemento) =>
      this.estaRamaVisible(elemento),
    );
  }

  alternarNivelesInferiores(antecedenteId: string): void {
    const nivelesExpandidos = new Set(this.nivelesExpandidos);

    if (nivelesExpandidos.has(antecedenteId)) {
      nivelesExpandidos.delete(antecedenteId);

      this.obtenerDescendientes(antecedenteId).forEach((id) =>
        nivelesExpandidos.delete(id),
      );
    } else {
      nivelesExpandidos.add(antecedenteId);
    }

    this.nivelesExpandidos = nivelesExpandidos;
  }

  estaExpandido(antecedenteId: string): boolean {
    return this.nivelesExpandidos.has(antecedenteId);
  }

  tieneNivelesInferiores(antecedenteId: string): boolean {
    return this.elementosJerarquicos.some(
      ({ padreId }) => padreId === antecedenteId,
    );
  }

  cantidadNivelesInferiores(antecedenteId: string): number {
    return this.elementosJerarquicos.filter(
      ({ padreId }) => padreId === antecedenteId,
    ).length;
  }

  etiquetaNivelesInferiores(antecedenteId: string): string {
    const cantidad = this.cantidadNivelesInferiores(antecedenteId);
    return `${cantidad} ${cantidad === 1 ? "nivel inferior" : "niveles inferiores"}`;
  }

  obtenerSangria(nivel: `N${number}`): number {
    const nivelGestion = Number(this.gestion?.nivel.slice(1)) || 1;
    const nivelAntecedente = Number(nivel.slice(1)) || nivelGestion + 1;

    return Math.max(0, nivelAntecedente - nivelGestion - 1) * 18;
  }

  actualizarVisibilidad(visible: boolean): void {
    this.visible = visible;
    this.visibleChange.emit(visible);
  }

  cerrar(): void {
    this.actualizarVisibilidad(false);
  }

  private estaRamaVisible(antecedente: AntecedenteBitacora): boolean {
    let padreId = antecedente.padreId;

    while (padreId) {
      if (!this.nivelesExpandidos.has(padreId)) {
        return false;
      }

      padreId =
        this.elementosJerarquicos.find(({ id }) => id === padreId)?.padreId ??
        null;
    }

    return true;
  }

  private obtenerDescendientes(antecedenteId: string): string[] {
    const hijos = this.elementosJerarquicos.filter(
      ({ padreId }) => padreId === antecedenteId,
    );

    return hijos.flatMap(({ id }) => [id, ...this.obtenerDescendientes(id)]);
  }

  private get elementosJerarquicos(): AntecedenteBitacora[] {
    return [...this.antecedentes, ...this.otrosAntecedentesGestiones];
  }

  private obtenerNivelDependiente(salto: number): `N${number}` {
    const nivelActual = Number(this.gestion?.nivel.slice(1)) || 1;
    return `N${Math.min(nivelActual + salto, 4)}`;
  }

  private sufijoCodigo(incremento: number): string {
    const base = (this.gestion?.id ?? 0) % 1000;
    return String(base + incremento).padStart(3, "0");
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
}
