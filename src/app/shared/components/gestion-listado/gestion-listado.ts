import { CommonModule } from "@angular/common";
import { Component, Input, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { FilterMetadata } from "primeng/api";
import { InputTextModule } from "primeng/inputtext";
import { ListboxModule } from "primeng/listbox";
import { Table, TableModule, TablePageEvent } from "primeng/table";
import { TooltipModule } from "primeng/tooltip";
import { Bitacora, GestionBitacora } from "../../../features/bitacora/bitacora";
import { TramiteDetalle } from "../../../features/tramite-detalle/tramite-detalle";

type FiltrosTabla = Record<string, FilterMetadata | FilterMetadata[]>;

interface FiltrosPendientes {
  codigo: string[];
  idEstacion: string[];
  comuna: string[];
  razonSocial: string[];
  responsableInterno: string[];
  semaforoEtiqueta: string[];
}

interface OpcionFiltro<T> {
  label: string;
  value: T | typeof VALOR_TODOS;
}

export interface GestionListadoItem extends GestionBitacora {
  rutRazonSocial: string;
  fechaIngreso: string;
  fechaIngresoOrden: string;
  tieneDetalle?: boolean;
}

const VALOR_TODOS = "__todos__";

@Component({
  selector: "app-gestion-listado",
  standalone: true,
  imports: [
    Bitacora,
    CommonModule,
    FormsModule,
    InputTextModule,
    ListboxModule,
    TableModule,
    TramiteDetalle,
    TooltipModule,
  ],
  templateUrl: "./gestion-listado.html",
  styleUrl: "./gestion-listado.scss",
})
export class GestionListado {
  @ViewChild("tabla") tabla?: Table;

  @Input({ required: true }) titulo = "";
  @Input() ariaLabelBusqueda = "Buscar gestiones";
  @Input() ariaLabelTabla = "Tabla de gestiones";
  @Input() mostrarCantidadResultados = false;
  @Input() mostrarResponsableInterno = false;
  @Input() bitacoraPersonal = false;

  private _gestiones: GestionListadoItem[] = [];
  private _detalleInicialId: number | null = null;
  private _idEstacionInicial: string | null = null;

  @Input({ required: true })
  set gestiones(gestiones: GestionListadoItem[]) {
    this._gestiones = gestiones ?? [];
    this.actualizarOpcionesFiltros();
    this.aplicarSeleccionInicial();
  }

  get gestiones(): GestionListadoItem[] {
    return this._gestiones;
  }

  @Input()
  set detalleInicialId(detalleInicialId: number | null) {
    this._detalleInicialId = detalleInicialId;
    this.aplicarDetalleInicial();
  }

  @Input()
  set idEstacionInicial(idEstacionInicial: string | null) {
    this._idEstacionInicial = idEstacionInicial;
    this.aplicarFiltroEstacionInicial();
  }

  codigos: OpcionFiltro<string>[] = [];
  idsEstacion: OpcionFiltro<string>[] = [];
  comunas: OpcionFiltro<string>[] = [];
  razonesSociales: OpcionFiltro<string>[] = [];
  opcionesResponsables: OpcionFiltro<string>[] = [];
  estadosSemaforo: OpcionFiltro<string>[] = [];

  filtrosTabla: FiltrosTabla = this.crearFiltrosTablaVacios();
  filtrosPendientes: FiltrosPendientes = this.crearFiltrosPendientes();
  busquedaGeneral = "";
  fechaFiltroIso = "";
  first = 0;
  rows = 10;
  readonly opcionesFilasPorPagina = [10, 25, 50, 100];
  readonly campoOrdenInicial = "fechaIngresoOrden";
  readonly direccionOrdenInicial = -1;
  gestionBitacoraSeleccionada: GestionBitacora | null = null;
  bitacoraVisible = false;
  tramiteDetalleId: number | null = null;
  detalleTramiteVisible = false;

  get cantidadResultados(): number {
    return this.tabla?.filteredValue?.length ?? this.gestiones.length;
  }

  get camposBusquedaGeneral(): string[] {
    const campos = [
      "codigo",
      "nivel",
      "idEstacion",
      "estacionServicio",
      "direccion",
      "comuna",
      "rutRazonSocial",
      "razonSocial",
      "fechaIngreso",
      "semaforoEtiqueta",
    ];

    if (this.mostrarResponsableInterno) {
      campos.push("responsableInterno");
    }

    return campos;
  }

  buscarGestiones(): void {
    const filtros = this.construirFiltrosTabla();

    this.filtrosTabla = filtros;

    if (this.tabla) {
      this.tabla.filters = filtros;
      this.tabla._filter();
    }

    this.first = 0;
  }

  limpiarFiltros(): void {
    this.busquedaGeneral = "";
    this.fechaFiltroIso = "";
    this.filtrosPendientes = this.crearFiltrosPendientes();
    const filtros = this.construirFiltrosTabla();

    this.filtrosTabla = filtros;

    if (this.tabla) {
      this.tabla.filters = filtros;
      this.tabla._filter();
    }

    this.first = 0;
  }

  actualizarFiltroFecha(fechaIso: string): void {
    this.fechaFiltroIso = fechaIso;
  }

  limpiarFiltroFecha(): void {
    this.fechaFiltroIso = "";
  }

  abrirBitacora(gestion: GestionListadoItem): void {
    this.gestionBitacoraSeleccionada = gestion;
    this.bitacoraVisible = true;
  }

  abrirDetalle(gestion: GestionListadoItem): void {
    if (gestion.tieneDetalle === false) {
      return;
    }

    this.tramiteDetalleId = gestion.id;
    this.detalleTramiteVisible = true;
  }

  pageChange(event: TablePageEvent): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  private aplicarSeleccionInicial(): void {
    this.aplicarFiltroEstacionInicial();
    this.aplicarDetalleInicial();
  }

  private aplicarFiltroEstacionInicial(): void {
    if (!this._idEstacionInicial) {
      return;
    }

    this.filtrosPendientes.idEstacion = [this._idEstacionInicial];
    this.filtrosTabla = this.construirFiltrosTabla();
    this.first = 0;
  }

  private aplicarDetalleInicial(): void {
    if (!this._detalleInicialId) {
      return;
    }

    const gestion = this.gestiones.find(
      ({ id }) => id === this._detalleInicialId,
    );

    if (gestion?.tieneDetalle !== false) {
      this.tramiteDetalleId = gestion?.id ?? null;
      this.detalleTramiteVisible = Boolean(gestion);
    }
  }

  private actualizarOpcionesFiltros(): void {
    this.codigos = this.crearOpciones(
      this.ordenarTexto(this.gestiones.map(({ codigo }) => codigo)),
    );
    this.idsEstacion = this.crearOpciones(
      this.ordenarTexto(this.gestiones.map(({ idEstacion }) => idEstacion)),
    );
    this.comunas = this.crearOpciones(
      this.ordenarTexto(this.gestiones.map(({ comuna }) => comuna)),
    );
    this.razonesSociales = this.crearOpciones(
      this.ordenarTexto(this.gestiones.map(({ razonSocial }) => razonSocial)),
    );
    this.opcionesResponsables = this.crearOpciones(
      this.ordenarTexto(
        this.gestiones.map(({ responsableInterno }) => responsableInterno),
      ),
    );
    this.estadosSemaforo = this.crearOpciones(
      this.ordenarTexto(
        this.gestiones.map(({ semaforoEtiqueta }) => semaforoEtiqueta),
      ),
    );
  }

  private construirFiltrosTabla(): FiltrosTabla {
    const filtros = this.crearFiltrosTablaVacios();

    this.agregarFiltroOpciones(
      filtros,
      "codigo",
      this.filtrosPendientes.codigo,
    );
    this.agregarFiltroOpciones(
      filtros,
      "idEstacion",
      this.filtrosPendientes.idEstacion,
    );
    this.agregarFiltroOpciones(
      filtros,
      "comuna",
      this.filtrosPendientes.comuna,
    );
    this.agregarFiltroOpciones(
      filtros,
      "razonSocial",
      this.filtrosPendientes.razonSocial,
    );
    this.agregarFiltroOpciones(
      filtros,
      "responsableInterno",
      this.filtrosPendientes.responsableInterno,
    );
    this.agregarFiltroOpciones(
      filtros,
      "semaforoEtiqueta",
      this.filtrosPendientes.semaforoEtiqueta,
    );

    const busqueda = this.busquedaGeneral.trim().toLocaleLowerCase("es-CL");

    if (busqueda) {
      filtros["global"] = { value: busqueda, matchMode: "contains" };
    }

    if (this.fechaFiltroIso) {
      filtros["fechaIngreso"] = [
        {
          value: this.convertirFechaIso(this.fechaFiltroIso),
          matchMode: "equals",
          operator: "and",
        },
      ];
    }

    return filtros;
  }

  private agregarFiltroOpciones(
    filtros: FiltrosTabla,
    campo: keyof FiltrosPendientes,
    valores: string[],
  ): void {
    if (!valores.length || valores.includes(VALOR_TODOS)) {
      return;
    }

    filtros[campo] = [{ value: valores, matchMode: "in", operator: "and" }];
  }

  private crearFiltrosTablaVacios(): FiltrosTabla {
    return {
      codigo: [{ value: null, matchMode: "in", operator: "and" }],
      idEstacion: [{ value: null, matchMode: "in", operator: "and" }],
      comuna: [{ value: null, matchMode: "in", operator: "and" }],
      razonSocial: [{ value: null, matchMode: "in", operator: "and" }],
      responsableInterno: [{ value: null, matchMode: "in", operator: "and" }],
      semaforoEtiqueta: [{ value: null, matchMode: "in", operator: "and" }],
      fechaIngreso: [{ value: null, matchMode: "equals", operator: "and" }],
    };
  }

  private crearFiltrosPendientes(): FiltrosPendientes {
    return {
      codigo: [],
      idEstacion: [],
      comuna: [],
      razonSocial: [],
      responsableInterno: [],
      semaforoEtiqueta: [],
    };
  }

  private crearOpciones<T>(valores: T[]): OpcionFiltro<T>[] {
    return [
      { label: "Todos", value: VALOR_TODOS },
      ...valores.map((valor) => ({ label: String(valor), value: valor })),
    ];
  }

  private ordenarTexto(valores: string[]): string[] {
    return [...new Set(valores)].sort((a, b) =>
      a.localeCompare(b, "es-CL", { sensitivity: "base", numeric: true }),
    );
  }

  private convertirFechaIso(fechaIso: string): string {
    const [anio, mes, dia] = fechaIso.split("-");
    return `${dia}-${mes}-${anio}`;
  }
}
