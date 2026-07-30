import { CommonModule } from "@angular/common";
import { Component, DestroyRef, OnInit, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { FloatLabelModule } from "primeng/floatlabel";
import {
  AutoCompleteCompleteEvent,
  AutoCompleteModule,
} from "primeng/autocomplete";
import { DatePickerModule } from "primeng/datepicker";
import { ButtonDirective } from "primeng/button";
import { TableModule, TablePageEvent } from "primeng/table";
import { TagModule } from "primeng/tag";
import {
  resolverSeveridadEstado,
  TagSeverity,
} from "../../models/estado-tramite";
import { Tramite } from "../../models/tramite";
import { TramitesMock } from "../../services/tramites-mock";
import { TramitesNavegacion } from "../../services/tramites-navegacion";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";

interface EstadoTramite {
  title: string;
  severity: TagSeverity;
}

interface FiltrosTramites {
  idEstacion: string;
  fechaApertura: Date[] | null;
  fechaTermino: Date[] | null;
  estado: string;
}

@Component({
  selector: "app-tramites-listado",
  standalone: true,
  imports: [
    AutoCompleteModule,
    Breadcrumbs,
    CommonModule,
    DatePickerModule,
    FormsModule,
    RouterLink,
    FloatLabelModule,
    ButtonDirective,
    TableModule,
    TagModule,
  ],
  templateUrl: "./tramites-listado.html",
  styleUrl: "./tramites-listado.scss",
})
export class TramitesListado implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    tramitesMock: TramitesMock,
    private readonly tramitesNavegacion: TramitesNavegacion,
  ) {
    this.tramites = tramitesMock.obtenerTodos();
    this.tramitesFiltrados = [...this.tramites];
  }

  breadcrumbs = [
    {
      label: "Módulo de Gestión de Trámites",
      route: "/tramites",
    },
    {
      label: "Consulta de Trámites",
    },
  ];
  filtros: FiltrosTramites = {
    idEstacion: "",
    fechaApertura: null,
    fechaTermino: null,
    estado: "",
  };

  idsEstacion = ["60001", "60002", "60003", "60004", "60005"];

  estados: EstadoTramite[] = [
    "Ingresado",
    "En revisión",
    "Observado",
    "Aprobado",
    "Finalizado",
  ].map((title) => ({
    title,
    severity: resolverSeveridadEstado(title),
  }));

  idsEstacionSugeridos = [...this.idsEstacion];
  estadosSugeridos = this.estados.map((estado) => estado.title);

  tramites: Tramite[];
  tramitesFiltrados: Tramite[];
  first = 0;
  rows = 5;

  ngOnInit(): void {
    const idEstacion = this.tramitesNavegacion.consumirFiltroEstacion();

    if (idEstacion) {
      this.filtros.idEstacion = idEstacion;
      this.aplicarFiltros();
    }

    this.tramitesNavegacion.listadoCompleto$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.restablecerFiltros());
  }

  filtrarIdsEstacion(event: AutoCompleteCompleteEvent): void {
    this.idsEstacionSugeridos = this.filtrarOpciones(
      this.idsEstacion,
      event.query,
    );
  }

  filtrarEstados(event: AutoCompleteCompleteEvent): void {
    this.estadosSugeridos = this.filtrarOpciones(
      this.estados.map((estado) => estado.title),
      event.query,
    );
  }

  buscar(): void {
    this.aplicarFiltros();
  }

  private aplicarFiltros(): void {
    this.tramitesFiltrados = this.tramites.filter((tramite) => {
      const coincideIdEstacion =
        !this.filtros.idEstacion ||
        tramite.idEstacion === this.filtros.idEstacion;

      const coincideEstado =
        !this.filtros.estado || tramite.estado === this.filtros.estado;

      const fechaApertura = this.convertirFecha(tramite.fechaApertura);
      const fechaTermino = this.convertirFecha(tramite.fechaEstimadaTermino);

      const coincideApertura = this.estaDentroDelRango(
        fechaApertura,
        this.filtros.fechaApertura,
      );
      const coincideTermino = this.estaDentroDelRango(
        fechaTermino,
        this.filtros.fechaTermino,
      );

      return (
        coincideIdEstacion &&
        coincideEstado &&
        coincideApertura &&
        coincideTermino
      );
    });
    this.first = 0;
  }

  limpiarFiltros(): void {
    this.restablecerFiltros();
  }

  pageChange(event: TablePageEvent): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  next(): void {
    const lastPageFirst =
      Math.max(Math.ceil(this.tramitesFiltrados.length / this.rows) - 1, 0) *
      this.rows;

    this.first = Math.min(
      this.first + this.rows,
      lastPageFirst,
    );
  }

  prev(): void {
    this.first = Math.max(this.first - this.rows, 0);
  }

  reset(): void {
    this.first = 0;
  }

  isLastPage(): boolean {
    return this.first + this.rows >= this.tramitesFiltrados.length;
  }

  isFirstPage(): boolean {
    return this.first === 0;
  }

  obtenerClaseEstado(estadoActual: string): TagSeverity {
    return resolverSeveridadEstado(estadoActual);
  }

  private convertirFecha(fecha: string): Date {
    const [dia, mes, anio] = fecha.split("-");
    return new Date(Number(anio), Number(mes) - 1, Number(dia));
  }

  private estaDentroDelRango(fecha: Date, rango: Date[] | null): boolean {
    const [desde, hasta] = rango ?? [];

    if (!desde) {
      return true;
    }

    const fechaNormalizada = this.normalizarFecha(fecha);
    const desdeNormalizado = this.normalizarFecha(desde);
    const hastaNormalizado = hasta ? this.normalizarFecha(hasta) : null;

    return (
      fechaNormalizada >= desdeNormalizado &&
      (!hastaNormalizado || fechaNormalizada <= hastaNormalizado)
    );
  }

  private normalizarFecha(fecha: Date): number {
    return new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate(),
    ).getTime();
  }

  private filtrarOpciones(opciones: string[], consulta: string): string[] {
    const consultaNormalizada = this.normalizarTexto(consulta);

    return opciones.filter((opcion) =>
      this.normalizarTexto(opcion).includes(consultaNormalizada),
    );
  }

  private restablecerFiltros(): void {
    this.filtros = {
      idEstacion: "",
      fechaApertura: null,
      fechaTermino: null,
      estado: "",
    };
    this.tramitesFiltrados = [...this.tramites];
    this.first = 0;
  }

  private normalizarTexto(texto: string): string {
    return texto
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("es-CL");
  }
}
