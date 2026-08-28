import { CommonModule } from "@angular/common";
import { Component, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { FilterMetadata } from "primeng/api";
import { InputTextModule } from "primeng/inputtext";
import { ListboxModule } from "primeng/listbox";
import { Table, TableModule, TablePageEvent } from "primeng/table";
import { TooltipModule } from "primeng/tooltip";
import { Breadcrumbs } from "../../shared/components/breadcrumbs/breadcrumbs";
import {
  Bitacora,
  EstadoSemaforoBitacora,
  GestionBitacora,
} from "../bitacora/bitacora";
import { Tramite } from "../tramites/models/tramite";
import { TramitesMock } from "../tramites/services/tramites-mock";

type EstadoSemaforo = EstadoSemaforoBitacora;
type FiltrosTabla = Record<string, FilterMetadata | FilterMetadata[]>;

interface FiltrosPendientes {
  codigo: string[];
  idEstacion: string[];
  comuna: string[];
  razonSocial: string[];
  descripcion: string[];
  responsableInterno: string[];
  semaforoEtiqueta: string[];
}

interface OpcionFiltro<T> {
  label: string;
  value: T | typeof VALOR_TODOS;
}

interface GestionGlobal extends GestionBitacora {
  rutRazonSocial: string;
  rutRepresentanteLegal: string;
  fechaIngreso: string;
  fechaIngresoOrden: string;
  tieneDetalle: boolean;
}

interface DatosAsociados {
  rutRazonSocial: string;
  representanteLegal: string;
  rutRepresentanteLegal: string;
  semaforo: EstadoSemaforo;
}

const ETIQUETAS_SEMAFORO: Record<EstadoSemaforo, string> = {
  "al-dia": "Al día",
  "proximo-vencer": "Próximo a vencer",
  atrasado: "Requiere atención",
};

const VALOR_TODOS = "__todos__";

const CODIGOS_GESTIONES: Record<number, string> = {
  1001: "N1-MUN-001",
  1002: "N1-SAN-002",
  1003: "N1-SAN-003",
  1004: "N1-DOM-004",
  1005: "N1-MUN-005",
  2001: "N1-SII-006",
  2002: "N2-ELE-007",
  2003: "N1-URB-008",
};

const DATOS_ASOCIADOS: Record<number, DatosAsociados> = {
  1001: {
    rutRazonSocial: "76.543.210-3",
    representanteLegal: "María José Soto Pérez",
    rutRepresentanteLegal: "12.345.678-5",
    semaforo: "al-dia",
  },
  1002: {
    rutRazonSocial: "76.222.111-K",
    representanteLegal: "Andrés Fuentes Díaz",
    rutRepresentanteLegal: "15.842.367-7",
    semaforo: "proximo-vencer",
  },
  1003: {
    rutRazonSocial: "77.101.990-0",
    representanteLegal: "Paula Andrea Rojas Silva",
    rutRepresentanteLegal: "9.876.543-3",
    semaforo: "atrasado",
  },
  1004: {
    rutRazonSocial: "76.908.440-1",
    representanteLegal: "Felipe Muñoz Contreras",
    rutRepresentanteLegal: "13.579.246-2",
    semaforo: "al-dia",
  },
  1005: {
    rutRazonSocial: "77.450.320-K",
    representanteLegal: "Carolina Pérez Lagos",
    rutRepresentanteLegal: "17.223.456-9",
    semaforo: "atrasado",
  },
  2001: {
    rutRazonSocial: "76.811.450-2",
    representanteLegal: "Camila Herrera Soto",
    rutRepresentanteLegal: "16.450.778-1",
    semaforo: "proximo-vencer",
  },
  2002: {
    rutRazonSocial: "77.064.219-8",
    representanteLegal: "Rodrigo Martínez Díaz",
    rutRepresentanteLegal: "14.028.369-4",
    semaforo: "proximo-vencer",
  },
  2003: {
    rutRazonSocial: "76.390.841-6",
    representanteLegal: "Daniela Castro Rojas",
    rutRepresentanteLegal: "18.206.945-7",
    semaforo: "atrasado",
  },
};

const GESTIONES_GLOBALES_ADICIONALES: Tramite[] = [
  {
    id: 2001,
    idEstacion: "60006",
    tipoTramite: "Servicio de Impuestos Internos",
    tramiteEspecifico: "Regularización de inicio de actividades",
    estacionServicio: "Copec Santiago Centro",
    razonSocial: "Servicios Alameda SpA",
    comuna: "Santiago",
    direccion: "Av. Libertador Bernardo O'Higgins 1.234",
    estado: "En tramitación",
    prioridad: "Media",
    responsableInterno: "José Luis Rosa",
    solicitanteCopec: "Claudio Doñas",
    fechaApertura: "15-07-2026",
    fechaEstimadaTermino: "30-08-2026",
  },
  {
    id: 2002,
    idEstacion: "60007",
    tipoTramite: "Certificación SEC",
    tramiteEspecifico: "Declaración de instalación eléctrica interior",
    estacionServicio: "Copec Maipú",
    razonSocial: "Operaciones Ruta 78 Ltda.",
    comuna: "Maipú",
    direccion: "Camino a Melipilla 9.450",
    estado: "Ingresado",
    prioridad: "Alta",
    responsableInterno: "Claudio Doñas",
    solicitanteCopec: "José Luis Rosa",
    fechaApertura: "18-07-2026",
    fechaEstimadaTermino: "05-09-2026",
    modalidadCreacion: "subtramite",
  },
  {
    id: 2003,
    idEstacion: "60008",
    tipoTramite: "Urbanismo y vialidad",
    tramiteEspecifico: "Factibilidad de acceso vehicular",
    estacionServicio: "Copec La Florida",
    razonSocial: "Inversiones Vicuña SpA",
    comuna: "La Florida",
    direccion: "Av. Vicuña Mackenna 8.120",
    estado: "Observado",
    prioridad: "Alta",
    responsableInterno: "Claudio Henríquez",
    solicitanteCopec: "José Luis Rosa",
    fechaApertura: "22-07-2026",
    fechaEstimadaTermino: "18-08-2026",
  },
];

@Component({
  selector: "app-todas-gestiones",
  standalone: true,
  imports: [
    Bitacora,
    Breadcrumbs,
    CommonModule,
    FormsModule,
    InputTextModule,
    ListboxModule,
    RouterLink,
    TableModule,
    TooltipModule,
  ],
  templateUrl: "./todas-gestiones.html",
  styleUrl: "./todas-gestiones.scss",
})
export class TodasGestiones {
  @ViewChild("tabla") tabla?: Table;

  readonly breadcrumbs = [
    { label: "Módulo de Gestión de Trámites", route: "/home" },
    { label: "Todas las gestiones" },
  ];

  readonly gestiones: GestionGlobal[];
  readonly responsables: string[];
  readonly codigos: OpcionFiltro<string>[];
  readonly idsEstacion: OpcionFiltro<string>[];
  readonly comunas: OpcionFiltro<string>[];
  readonly razonesSociales: OpcionFiltro<string>[];
  readonly descripciones: OpcionFiltro<string>[];
  readonly opcionesResponsables: OpcionFiltro<string>[];
  readonly estadosSemaforo: OpcionFiltro<string>[];

  filtrosTabla: FiltrosTabla = this.crearFiltrosTablaVacios();
  filtrosPendientes: FiltrosPendientes = this.crearFiltrosPendientes();
  busquedaGeneral = "";
  fechaFiltroIso = "";
  first = 0;
  rows = 10;
  gestionBitacoraSeleccionada: GestionBitacora | null = null;
  bitacoraVisible = false;

  constructor(tramitesMock: TramitesMock) {
    const tramitesGlobales = [
      ...tramitesMock.obtenerTodos(),
      ...GESTIONES_GLOBALES_ADICIONALES,
    ];

    this.gestiones = tramitesGlobales.map((tramite) =>
      this.crearGestionGlobal(tramite),
    );
    this.responsables = [
      ...new Set(
        this.gestiones.map(({ responsableInterno }) => responsableInterno),
      ),
    ].sort((a, b) => a.localeCompare(b, "es-CL", { sensitivity: "base" }));
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
    this.descripciones = this.crearOpciones(
      this.ordenarTexto(this.gestiones.map(({ descripcion }) => descripcion)),
    );
    this.opcionesResponsables = this.crearOpciones(this.responsables);
    this.estadosSemaforo = this.crearOpciones(
      this.ordenarTexto(
        this.gestiones.map(({ semaforoEtiqueta }) => semaforoEtiqueta),
      ),
    );
  }

  get cantidadResultados(): number {
    return this.tabla?.filteredValue?.length ?? this.gestiones.length;
  }

  get cantidadResponsables(): number {
    return this.responsables.length;
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

  abrirBitacora(gestion: GestionGlobal): void {
    this.gestionBitacoraSeleccionada = gestion;
    this.bitacoraVisible = true;
  }

  pageChange(event: TablePageEvent): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  private crearGestionGlobal(tramite: Tramite): GestionGlobal {
    const datos = DATOS_ASOCIADOS[tramite.id];
    const responsableInterno = this.normalizarResponsable(
      tramite.responsableInterno,
    );

    return {
      id: tramite.id,
      codigo: CODIGOS_GESTIONES[tramite.id] ?? `N1-OTR-${tramite.id}`,
      nivel: tramite.modalidadCreacion === "subtramite" ? "N2" : "N1",
      idEstacion: tramite.idEstacion,
      estacionServicio: tramite.estacionServicio,
      direccion: tramite.direccion,
      comuna: tramite.comuna,
      rutRazonSocial: datos.rutRazonSocial,
      razonSocial: tramite.razonSocial,
      representanteLegal: datos.representanteLegal,
      rutRepresentanteLegal: datos.rutRepresentanteLegal,
      descripcion: tramite.tramiteEspecifico,
      fechaInicio: tramite.fechaApertura,
      fechaIngreso: tramite.fechaApertura,
      fechaIngresoOrden: this.convertirFechaAOrden(tramite.fechaApertura),
      fechaEstimadaTermino: tramite.fechaEstimadaTermino,
      concesionario: tramite.razonSocial.replace(/\s+(SpA|Ltda\.)$/i, ""),
      responsableInterno,
      semaforo: datos.semaforo,
      semaforoEtiqueta: ETIQUETAS_SEMAFORO[datos.semaforo],
      tieneDetalle: tramite.id < 2000,
    };
  }

  private normalizarResponsable(responsable: string): string {
    const nombre = this.normalizarTexto(responsable);

    if (nombre.includes("jose")) {
      return "José Luis Rosa";
    }
    if (nombre.includes("donas")) {
      return "Claudio Doñas";
    }

    return "Claudio Henríquez";
  }

  private normalizarTexto(valor: string): string {
    return valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es-CL");
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
      "descripcion",
      this.filtrosPendientes.descripcion,
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
      descripcion: [{ value: null, matchMode: "in", operator: "and" }],
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
      descripcion: [],
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

  private convertirFechaAOrden(fecha: string): string {
    const [dia, mes, anio] = fecha.split("-");
    return `${anio}-${mes}-${dia}`;
  }

  private convertirFechaIso(fechaIso: string): string {
    const [anio, mes, dia] = fechaIso.split("-");
    return `${dia}-${mes}-${anio}`;
  }
}
