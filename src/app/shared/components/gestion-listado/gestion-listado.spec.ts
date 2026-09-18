import { GestionListado, GestionListadoItem } from "./gestion-listado";

const GESTION_BASE: GestionListadoItem = {
  id: 1,
  codigo: "N1-MUN-001",
  nivel: "N1",
  idEstacion: "50001",
  estacionServicio: "Copec Centro",
  direccion: "Av. Principal 123",
  comuna: "Santiago",
  rutRazonSocial: "76.543.210-3",
  razonSocial: "Servicios Centro SpA",
  representanteLegal: "Representante",
  descripcion: "Patente comercial",
  fechaInicio: "01-09-2026",
  fechaIngreso: "01-09-2026",
  fechaIngresoOrden: "2026-09-01",
  fechaEstimadaTermino: "30-09-2026",
  concesionario: "Servicios Centro",
  responsableInterno: "José Luis Rosa",
  semaforo: "al-dia",
  semaforoEtiqueta: "Al día",
};

describe("GestionListado", () => {
  let componente: GestionListado;

  beforeEach(() => {
    componente = new GestionListado();
    componente.gestiones = [GESTION_BASE];
  });

  it("configura tamaños de página adecuados para listados extensos", () => {
    expect(componente.opcionesFilasPorPagina).toEqual([10, 25, 50, 100]);

    componente.pageChange({ first: 100, rows: 25 });

    expect(componente.first).toBe(100);
    expect(componente.rows).toBe(25);
  });

  it("combina los filtros acumulativos", () => {
    componente.filtrosPendientes.responsableInterno = ["José Luis Rosa"];
    componente.filtrosPendientes.semaforoEtiqueta = ["Al día"];

    componente.buscarGestiones();

    expect(componente.filtrosTabla["responsableInterno"]).toEqual([
      { value: ["José Luis Rosa"], matchMode: "in", operator: "and" },
    ]);
    expect(componente.filtrosTabla["semaforoEtiqueta"]).toEqual([
      { value: ["Al día"], matchMode: "in", operator: "and" },
    ]);
  });

  it("limpia todos los filtros aplicados", () => {
    componente.busquedaGeneral = "Santiago";
    componente.filtrosPendientes.responsableInterno = ["José Luis Rosa"];
    componente.filtrosPendientes.semaforoEtiqueta = ["Al día"];

    componente.limpiarFiltros();

    expect(componente.busquedaGeneral).toBe("");
    expect(componente.filtrosPendientes.responsableInterno).toEqual([]);
    expect(componente.filtrosPendientes.semaforoEtiqueta).toEqual([]);
  });

  it("inicia el ordenamiento simple por la fecha más reciente", () => {
    expect(componente.campoOrdenInicial).toBe("fechaIngresoOrden");
    expect(componente.direccionOrdenInicial).toBe(-1);
  });

  it("abre la bitácora con la gestión seleccionada", () => {
    componente.abrirBitacora(GESTION_BASE);

    expect(componente.bitacoraVisible).toBe(true);
    expect(componente.gestionBitacoraSeleccionada?.codigo).toBe(
      GESTION_BASE.codigo,
    );
  });
});
