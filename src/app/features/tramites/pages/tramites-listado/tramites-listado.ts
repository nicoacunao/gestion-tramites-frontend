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

interface OpcionFiltro<T> {
  label: string;
  value: T;
}

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

  readonly tramites: Tramite[];
  readonly idsTramite: OpcionFiltro<number>[];
  readonly idsEstacion: OpcionFiltro<string>[];
  readonly tiposTramite: OpcionFiltro<string>[];
  readonly comunas: OpcionFiltro<string>[];
  readonly razonesSociales: OpcionFiltro<string>[];
  readonly estados: OpcionFiltro<string>[];

  filtrosTabla: FiltrosTabla = {};
  busquedaGeneral = "";
  fechaFiltroIso = "";
  first = 0;
  rows = 10;

  constructor(
    tramitesMock: TramitesMock,
    private readonly tramitesNavegacion: TramitesNavegacion,
  ) {
    this.tramites = tramitesMock.obtenerTodos();
    this.idsTramite = this.crearOpciones(
      this.valoresUnicos(this.tramites.map(({ id }) => id)).sort(
        (a, b) => a - b,
      ),
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
    this.estados = this.crearOpciones(
      this.ordenarTexto(this.tramites.map(({ estado }) => estado)),
    );
  }

  ngOnInit(): void {
    const idEstacion = this.tramitesNavegacion.consumirFiltroEstacion();

    if (idEstacion) {
      this.filtrosTabla = {
        idEstacion: [{ value: [idEstacion], matchMode: "in", operator: "and" }],
      };
    }

    this.tramitesNavegacion.listadoCompleto$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.limpiarFiltros());
  }

  aplicarBusquedaGlobal(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.busquedaGeneral = valor;
    this.tabla?.filterGlobal(valor, "contains");
    this.first = 0;
  }

  limpiarFiltros(): void {
    this.busquedaGeneral = "";
    this.fechaFiltroIso = "";
    this.tabla?.clear();
    this.first = 0;
  }

  pageChange(event: TablePageEvent): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  obtenerClaseEstado(estadoActual: string): TagSeverity {
    return resolverSeveridadEstado(estadoActual);
  }

  aplicarFiltroFecha(
    fechaIso: string,
    filterCallback: (valor: string | null) => void,
  ): void {
    this.fechaFiltroIso = fechaIso;
    filterCallback(fechaIso ? this.convertirFechaIso(fechaIso) : null);
    this.first = 0;
  }

  limpiarFiltroFecha(filterCallback: (valor: string | null) => void): void {
    this.fechaFiltroIso = "";
    filterCallback(null);
    this.first = 0;
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
    return valores.map((valor) => ({
      label: String(valor),
      value: valor,
    }));
  }

  private convertirFechaIso(fechaIso: string): string {
    const [anio, mes, dia] = fechaIso.split("-");
    return `${dia}-${mes}-${anio}`;
  }
}
