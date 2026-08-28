import { CommonModule } from "@angular/common";
import { Component, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { FilterMetadata, SortMeta } from "primeng/api";
import { InputTextModule } from "primeng/inputtext";
import { SortAmountDownIcon } from "primeng/icons/sortamountdown";
import { SortAmountUpAltIcon } from "primeng/icons/sortamountupalt";
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
type NivelGestion = `N${number}`;

interface EventoOrdenamientoMultiple {
  multisortmeta?: SortMeta[];
}

interface AmbitoGestion {
  codigo: string;
  nombre: string;
  terminos: string[];
}

interface FiltrosPendientes {
  codigo: string[];
  idEstacion: string[];
  comuna: string[];
  razonSocial: string[];
  descripcion: string[];
  semaforoEtiqueta: string[];
}

interface OpcionFiltro<T> {
  label: string;
  value: T | typeof VALOR_TODOS;
}

interface DatosAsociados {
  rutRazonSocial: string;
  representanteLegal: string;
  rutRepresentanteLegal: string;
  semaforo: EstadoSemaforo;
}

interface GestionEscritorio extends GestionBitacora {
  ambito: string;
  codigoAmbito: string;
  correlativo: number;
  rutRazonSocial: string;
  rutRepresentanteLegal: string;
  fechaIngreso: string;
  fechaIngresoOrden: string;
}

const VALOR_TODOS = "__todos__";

const AMBITOS_GESTION: AmbitoGestion[] = [
  {
    codigo: "MUN",
    nombre: "Municipalidades",
    terminos: ["patente", "municipalidad", "permiso municipal"],
  },
  {
    codigo: "DOM",
    nombre: "Dirección de Obras Municipales",
    terminos: [
      "direccion de obras",
      "obra menor",
      "regularizacion de obras",
      "edificacion",
      "recepcion final",
      "dom",
    ],
  },
  {
    codigo: "LEG",
    nombre: "Legales",
    terminos: ["legal", "contrato", "notari", "societario"],
  },
  {
    codigo: "SAN",
    nombre: "Sanitarios",
    terminos: ["sanitari", "seremi", "alimento", "salud"],
  },
  {
    codigo: "SII",
    nombre: "Servicio de Impuestos Internos",
    terminos: ["impuesto", "tributari", "sii"],
  },
  {
    codigo: "URB",
    nombre: "Serviu/MOP o urbanismo",
    terminos: ["serviu", "mop", "urbanismo", "vialidad", "camino"],
  },
  {
    codigo: "ORP",
    nombre: "Organismos particulares",
    terminos: ["organismo particular", "organismo privado"],
  },
  {
    codigo: "ESA",
    nombre: "Empresas sanitarias",
    terminos: ["empresa sanitaria", "agua potable", "alcantarillado"],
  },
  {
    codigo: "ELE",
    nombre: "Empresas eléctricas",
    terminos: ["electric", "energia", "sec"],
  },
  {
    codigo: "OSE",
    nombre: "Otros servicios",
    terminos: ["otro servicio"],
  },
];

const AMBITO_OTROS: AmbitoGestion = {
  codigo: "OTR",
  nombre: "Otros",
  terminos: [],
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
};

const ETIQUETAS_SEMAFORO: Record<EstadoSemaforo, string> = {
  "al-dia": "Al día",
  "proximo-vencer": "Próximo a vencer",
  atrasado: "Requiere atención",
};

@Component({
  selector: "app-escritorio",
  standalone: true,
  imports: [
    Bitacora,
    Breadcrumbs,
    CommonModule,
    FormsModule,
    InputTextModule,
    ListboxModule,
    RouterLink,
    SortAmountDownIcon,
    SortAmountUpAltIcon,
    TableModule,
    TooltipModule,
  ],
  templateUrl: "./escritorio.html",
  styleUrl: "./escritorio.scss",
})
export class Escritorio {
  @ViewChild("tabla") tabla?: Table;

  readonly breadcrumbs = [
    {
      label: "Módulo de Gestión de Trámites",
      route: "/home",
    },
    {
      label: "Escritorio",
    },
  ];

  readonly gestiones: GestionEscritorio[];
  readonly codigos: OpcionFiltro<string>[];
  readonly idsEstacion: OpcionFiltro<string>[];
  readonly comunas: OpcionFiltro<string>[];
  readonly razonesSociales: OpcionFiltro<string>[];
  readonly descripciones: OpcionFiltro<string>[];
  readonly estadosSemaforo: OpcionFiltro<string>[];

  filtrosTabla: FiltrosTabla = this.crearFiltrosTablaVacios();
  filtrosPendientes: FiltrosPendientes = this.crearFiltrosPendientes();
  busquedaGeneral = "";
  fechaFiltroIso = "";
  first = 0;
  rows = 10;
  ordenamientos: SortMeta[] = [{ field: "fechaIngresoOrden", order: -1 }];
  gestionBitacoraSeleccionada: GestionBitacora | null = null;
  bitacoraVisible = false;

  constructor(tramitesMock: TramitesMock) {
    const correlativosPorNivel = new Map<NivelGestion, number>();

    this.gestiones = tramitesMock.obtenerTodos().map((tramite) => {
      const nivel = this.obtenerNivel(tramite);
      const correlativo = (correlativosPorNivel.get(nivel) ?? 0) + 1;

      correlativosPorNivel.set(nivel, correlativo);

      return this.crearGestion(tramite, nivel, correlativo);
    });
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
    this.estadosSemaforo = this.crearOpciones(
      this.ordenarTexto(
        this.gestiones.map(({ semaforoEtiqueta }) => semaforoEtiqueta),
      ),
    );
  }

  get cantidadResultados(): number {
    return this.tabla?.filteredValue?.length ?? this.gestiones.length;
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

  abrirBitacora(gestion: GestionEscritorio): void {
    this.gestionBitacoraSeleccionada = gestion;
    this.bitacoraVisible = true;
  }

  pageChange(event: TablePageEvent): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  acumularOrdenamiento(event: EventoOrdenamientoMultiple): void {
    const ordenamientosGenerados = event.multisortmeta ?? [];

    if (
      !ordenamientosGenerados.length ||
      this.sonLosMismosOrdenamientos(ordenamientosGenerados, this.ordenamientos)
    ) {
      return;
    }

    if (ordenamientosGenerados.length > 1) {
      this.ordenamientos = ordenamientosGenerados.map((ordenamiento) => ({
        ...ordenamiento,
      }));
      return;
    }

    const ordenamientoSeleccionado = ordenamientosGenerados[0];
    const ordenamientosAcumulados = this.ordenamientos.map((ordenamiento) => ({
      ...ordenamiento,
    }));
    const indiceExistente = ordenamientosAcumulados.findIndex(
      ({ field }) => field === ordenamientoSeleccionado.field,
    );

    if (indiceExistente >= 0) {
      ordenamientosAcumulados[indiceExistente] = {
        ...ordenamientoSeleccionado,
      };
    } else {
      ordenamientosAcumulados.push({ ...ordenamientoSeleccionado });
    }

    this.ordenamientos = ordenamientosAcumulados;

    if (this.tabla) {
      this.tabla.multiSortMeta = this.ordenamientos;
      this.tabla.sortMultiple();
    }
  }

  private sonLosMismosOrdenamientos(
    primeros: SortMeta[],
    segundos: SortMeta[],
  ): boolean {
    return (
      primeros.length === segundos.length &&
      primeros.every(
        (ordenamiento, indice) =>
          ordenamiento.field === segundos[indice].field &&
          ordenamiento.order === segundos[indice].order,
      )
    );
  }

  private crearGestion(
    tramite: Tramite,
    nivel: NivelGestion,
    correlativo: number,
  ): GestionEscritorio {
    const datos = DATOS_ASOCIADOS[tramite.id] ?? {
      rutRazonSocial:
        tramite.datosAdicionales?.["rutRazonSocial"] ?? "Sin registrar",
      representanteLegal:
        tramite.datosAdicionales?.["representanteLegal"] ?? "Sin registrar",
      rutRepresentanteLegal:
        tramite.datosAdicionales?.["rutRepresentanteLegal"] ?? "Sin registrar",
      semaforo: "al-dia",
    };
    const ambito = this.obtenerAmbito(tramite);

    return {
      id: tramite.id,
      codigo: `${nivel}-${ambito.codigo}-${String(correlativo).padStart(3, "0")}`,
      nivel,
      ambito: ambito.nombre,
      codigoAmbito: ambito.codigo,
      correlativo,
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
      concesionario: this.obtenerNombreConcesionario(tramite.razonSocial),
      responsableInterno: tramite.responsableInterno,
      semaforo: datos.semaforo,
      semaforoEtiqueta: ETIQUETAS_SEMAFORO[datos.semaforo],
    };
  }

  private obtenerNombreConcesionario(razonSocial: string): string {
    return razonSocial.replace(/\s+(SpA|Ltda\.)$/i, "");
  }

  private obtenerNivel(tramite: Tramite): NivelGestion {
    return tramite.modalidadCreacion === "subtramite" ? "N2" : "N1";
  }

  private obtenerAmbito(tramite: Tramite): AmbitoGestion {
    const texto = this.normalizarTexto(
      `${tramite.tipoTramite} ${tramite.tramiteEspecifico}`,
    );

    return (
      AMBITOS_GESTION.find(({ terminos }) =>
        terminos.some((termino) =>
          texto.includes(this.normalizarTexto(termino)),
        ),
      ) ?? AMBITO_OTROS
    );
  }

  private normalizarTexto(valor: string): string {
    return valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es-CL");
  }

  private convertirFechaAOrden(fecha: string): string {
    const [dia, mes, anio] = fecha.split("-");
    return `${anio}-${mes}-${dia}`;
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
