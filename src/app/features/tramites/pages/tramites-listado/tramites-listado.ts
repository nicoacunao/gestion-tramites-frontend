import { CommonModule } from "@angular/common";
import {
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
  inject,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { FilterMetadata } from "primeng/api";
import { ButtonDirective } from "primeng/button";
import { PrimeNG } from "primeng/config";
import { InfoCircleIcon } from "primeng/icons/infocircle";
import { InputTextModule } from "primeng/inputtext";
import { ListboxModule } from "primeng/listbox";
import { PopoverModule } from "primeng/popover";
import { Table, TableModule, TablePageEvent } from "primeng/table";
import { TagModule } from "primeng/tag";
import { TooltipModule } from "primeng/tooltip";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";
import {
  resolverSeveridadEstado,
  TagSeverity,
} from "../../models/estado-tramite";
import { Tramite } from "../../models/tramite";
import { TramitesMock } from "../../services/tramites-mock";
import { TramitesNavegacion } from "../../services/tramites-navegacion";

type FiltrosTabla = Record<string, FilterMetadata | FilterMetadata[]>;

interface FiltrosPendientes {
  categoria: string[];
  idEstacion: string[];
  comuna: string[];
  razonSocial: string[];
  concesionario: string[];
  tipoTramite: string[];
  estado: string[];
}

const VALOR_TODOS = "__todos__";

interface FamiliaTramite {
  nombre: string;
  sigla: string;
  terminos: string[];
}

interface TramiteListado extends Tramite {
  categoria: string;
  codigo: string;
  concesionario: string;
}

interface OpcionFiltro<T> {
  label: string;
  value: T | typeof VALOR_TODOS;
}

const FAMILIAS_TRAMITE: FamiliaTramite[] = [
  {
    nombre: "Rentas municipales",
    sigla: "RM",
    terminos: ["patente", "renta municipal", "permiso municipal"],
  },
  {
    nombre: "Dirección de Obras",
    sigla: "DOM",
    terminos: ["obra", "edificacion", "recepcion final", "urbanismo"],
  },
  {
    nombre: "Sanitarios",
    sigla: "SAN",
    terminos: [
      "resolucion sanitaria",
      "informe sanitario",
      "seremi de salud",
      "alimento",
    ],
  },
  {
    nombre: "Infraestructura sanitaria / empresas sanitarias",
    sigla: "IS",
    terminos: [
      "infraestructura sanitaria",
      "empresa sanitaria",
      "agua potable",
      "alcantarillado",
    ],
  },
  {
    nombre: "Servicio de Impuestos Internos",
    sigla: "SII",
    terminos: ["impuesto", "tributari", "sii"],
  },
  {
    nombre: "SERVIU / MOP",
    sigla: "SM",
    terminos: ["serviu", "mop", "vialidad", "camino"],
  },
  {
    nombre: "Legales",
    sigla: "LEG",
    terminos: ["legal", "contrato", "notari", "societario"],
  },
  {
    nombre: "SEC",
    sigla: "SEC",
    terminos: ["sec", "electric", "combustible", "gas"],
  },
];

const FAMILIA_SIN_CLASIFICAR: FamiliaTramite = {
  nombre: "Por clasificar",
  sigla: "OTR",
  terminos: [],
};

@Component({
  selector: "app-tramites-listado",
  standalone: true,
  imports: [
    Breadcrumbs,
    ButtonDirective,
    CommonModule,
    FormsModule,
    InfoCircleIcon,
    InputTextModule,
    ListboxModule,
    PopoverModule,
    RouterLink,
    TableModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: "./tramites-listado.html",
  styleUrl: "./tramites-listado.scss",
})
export class TramitesListado implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly primeNg = inject(PrimeNG);

  @ViewChild("tabla") tabla?: Table;

  readonly breadcrumbs = [
    {
      label: "Módulo de Gestión de Trámites",
      route: "/tramites",
    },
    {
      label: "Consulta de Trámites",
    },
  ];

  readonly tramites: TramiteListado[];
  readonly familiasTramite: OpcionFiltro<string>[];
  readonly idsEstacion: OpcionFiltro<string>[];
  readonly tiposTramite: OpcionFiltro<string>[];
  readonly comunas: OpcionFiltro<string>[];
  readonly razonesSociales: OpcionFiltro<string>[];
  readonly concesionarios: OpcionFiltro<string>[];
  readonly estados: OpcionFiltro<string>[];

  filtrosTabla: FiltrosTabla = this.crearFiltrosTablaVacios();
  filtrosPendientes: FiltrosPendientes = this.crearFiltrosPendientes();
  busquedaGeneral = "";
  fechaFiltroIso = "";
  first = 0;
  rows = 10;

  constructor(
    tramitesMock: TramitesMock,
    private readonly tramitesNavegacion: TramitesNavegacion,
  ) {
    const textoLimpiarOriginal = this.primeNg.translation.clear;
    this.primeNg.setTranslation({ clear: "Limpiar" });
    this.destroyRef.onDestroy(() =>
      this.primeNg.setTranslation({ clear: textoLimpiarOriginal }),
    );

    this.tramites = tramitesMock
      .obtenerTodos()
      .map((tramite) => this.crearTramiteListado(tramite));
    this.familiasTramite = this.crearOpciones(
      FAMILIAS_TRAMITE.map(({ nombre }) => nombre),
    );
    this.idsEstacion = this.crearOpciones(
      this.valoresUnicos(
        this.tramites.map(({ idEstacion }) => idEstacion),
      ).sort((a, b) => a.localeCompare(b, "es-CL", { numeric: true })),
    );
    this.tiposTramite = this.crearOpciones(
      this.ordenarTexto(this.tramites.map(({ tipoTramite }) => tipoTramite)),
    );
    this.comunas = this.crearOpciones(
      this.ordenarTexto(this.tramites.map(({ comuna }) => comuna)),
    );
    this.razonesSociales = this.crearOpciones(
      this.ordenarTexto(this.tramites.map(({ razonSocial }) => razonSocial)),
    );
    this.concesionarios = this.crearOpciones(
      this.ordenarTexto(
        this.tramites.map(({ concesionario }) => concesionario),
      ),
    );
    this.estados = this.crearOpciones(
      this.ordenarTexto(this.tramites.map(({ estado }) => estado)),
    );
  }

  ngOnInit(): void {
    const idEstacion = this.tramitesNavegacion.consumirFiltroEstacion();

    if (idEstacion) {
      this.filtrosPendientes.idEstacion = [idEstacion];
      this.filtrosTabla = this.construirFiltrosTabla();
    }

    this.tramitesNavegacion.listadoCompleto$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.limpiarFiltros());
  }

  buscarTramites(): void {
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

  pageChange(event: TablePageEvent): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  obtenerClaseEstado(estadoActual: string): TagSeverity {
    return resolverSeveridadEstado(estadoActual);
  }

  actualizarFiltroFecha(fechaIso: string): void {
    this.fechaFiltroIso = fechaIso;
  }

  limpiarFiltroFecha(): void {
    this.fechaFiltroIso = "";
  }

  private construirFiltrosTabla(): FiltrosTabla {
    const filtros = this.crearFiltrosTablaVacios();

    this.agregarFiltroOpciones(
      filtros,
      "categoria",
      this.filtrosPendientes.categoria,
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
      "concesionario",
      this.filtrosPendientes.concesionario,
    );
    this.agregarFiltroOpciones(
      filtros,
      "tipoTramite",
      this.filtrosPendientes.tipoTramite,
    );
    this.agregarFiltroOpciones(
      filtros,
      "estado",
      this.filtrosPendientes.estado,
    );

    const busqueda = this.busquedaGeneral.trim().toLocaleLowerCase("es-CL");

    if (busqueda) {
      filtros["global"] = { value: busqueda, matchMode: "contains" };
    }

    if (this.fechaFiltroIso) {
      filtros["fechaApertura"] = [
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
      categoria: [{ value: null, matchMode: "in", operator: "and" }],
      idEstacion: [{ value: null, matchMode: "in", operator: "and" }],
      comuna: [{ value: null, matchMode: "in", operator: "and" }],
      razonSocial: [{ value: null, matchMode: "in", operator: "and" }],
      concesionario: [{ value: null, matchMode: "in", operator: "and" }],
      tipoTramite: [{ value: null, matchMode: "in", operator: "and" }],
      estado: [{ value: null, matchMode: "in", operator: "and" }],
      fechaApertura: [{ value: null, matchMode: "equals", operator: "and" }],
    };
  }

  private crearFiltrosPendientes(): FiltrosPendientes {
    return {
      categoria: [],
      idEstacion: [],
      comuna: [],
      razonSocial: [],
      concesionario: [],
      tipoTramite: [],
      estado: [],
    };
  }

  private valoresUnicos<T>(valores: T[]): T[] {
    return [...new Set(valores)];
  }

  private ordenarTexto(valores: string[]): string[] {
    return this.valoresUnicos(valores).sort((a, b) =>
      a.localeCompare(b, "es-CL", { sensitivity: "base" }),
    );
  }

  private crearOpciones<T>(valores: T[]): OpcionFiltro<T>[] {
    return [
      { label: "Todos", value: VALOR_TODOS },
      ...valores.map((valor) => ({
        label: String(valor),
        value: valor,
      })),
    ];
  }

  private crearTramiteListado(tramite: Tramite): TramiteListado {
    const familia = this.obtenerFamilia(tramite.tipoTramite);

    return {
      ...tramite,
      categoria: familia.nombre,
      codigo: `${familia.sigla}-${tramite.id}`,
      concesionario: this.obtenerNombreConcesionario(tramite.razonSocial),
    };
  }

  private obtenerFamilia(tipoTramite: string): FamiliaTramite {
    const tipoNormalizado = tipoTramite
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es-CL");

    return (
      FAMILIAS_TRAMITE.find(({ terminos }) =>
        terminos.some((termino) => tipoNormalizado.includes(termino)),
      ) ?? FAMILIA_SIN_CLASIFICAR
    );
  }

  private obtenerNombreConcesionario(razonSocial: string): string {
    return razonSocial.replace(/\s+(SpA|Ltda\.)$/i, "");
  }

  private convertirFechaIso(fechaIso: string): string {
    const [anio, mes, dia] = fechaIso.split("-");
    return `${dia}-${mes}-${anio}`;
  }
}
