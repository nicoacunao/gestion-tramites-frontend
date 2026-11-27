import { of } from "rxjs";
import { ManagementContract } from "./api-models";
import { ManagementApiService } from "./management-api";
import { fechaIsoAVista, gestionATramite } from "./management-presentation";
import { TramitesMock } from "./tramites-mock";

const completa: ManagementContract = {
  id: "15",
  stationId: "60123",
  responsibleUserId: "3",
  openedOn: "2026-07-02",
  estimatedCompletionOn: "2026-08-15",
  lastReviewedOn: "2026-07-20",
  priority: "Alta",
  status: "En tramitación",
  requesterName: "Jefatura de zona",
  stationName: "Comercial Los Pinos SpA",
  legalName: "Comercial Los Pinos SpA",
  responsibleName: "Claudio Doñas",
  commune: "Concón",
  address: "Av. Borgoño 21.350",
  legalRut: "76.000.001-0",
  legalRepresentative: "María José Soto",
  legalRepresentativeRut: "11.111.111-1",
  managementTypeName: "Patente comercial",
  level: "N1",
  scopeCode: "MUN",
  scopeName: "Municipal",
  sequence: 4,
  code: "N1-MUN-004",
  trafficLight: "proximo-vencer",
  trafficLightLabel: "Próximo a vencer",
};

const minima: ManagementContract = {
  id: "16",
  stationId: "60124",
  responsibleUserId: "8",
  openedOn: "2026-07-03",
  estimatedCompletionOn: null,
  lastReviewedOn: null,
  priority: "Baja",
  status: "Borrador",
  requesterName: "Solicitante",
  code: null,
  level: null,
  sequence: null,
};

describe("gestionATramite", () => {
  it("usa los datos de presentación del backend y formatea fechas", () => {
    expect(gestionATramite(completa)).toMatchObject({
      id: "15",
      apiId: "15",
      codigo: "N1-MUN-004",
      nivel: "N1",
      ambito: "Municipal",
      codigoAmbito: "MUN",
      correlativo: 4,
      semaforo: "proximo-vencer",
      semaforoEtiqueta: "Próximo a vencer",
      idEstacion: "60123",
      tipoTramite: "Patente comercial",
      razonSocial: "Comercial Los Pinos SpA",
      concesionario: "Comercial Los Pinos",
      responsableInterno: "Claudio Doñas",
      responsableUserId: "3",
      estado: "En tramitación",
      prioridad: "Alta",
      solicitanteCopec: "Jefatura de zona",
      fechaApertura: "02-07-2026",
      fechaIngreso: "02-07-2026",
      fechaIngresoOrden: "2026-07-02",
      fechaEstimadaTermino: "15-08-2026",
      fechaUltimaRevision: "20-07-2026",
    });
  });

  it("completa con textos de respaldo cuando faltan datos opcionales o nulos", () => {
    expect(gestionATramite(minima)).toMatchObject({
      codigo: "Gestión 16",
      nivel: "",
      correlativo: null,
      semaforo: "al-dia",
      semaforoEtiqueta: "Al día",
      tipoTramite: "Sin tipo asignado",
      estacionServicio: "60124",
      razonSocial: "Sin registrar",
      comuna: "Sin registrar",
      direccion: "Sin registrar",
      rutRazonSocial: "Sin registrar",
      responsableInterno: "Usuario 8",
      fechaEstimadaTermino: "Sin especificar",
      fechaUltimaRevision: null,
    });
  });

  it("acepta los alias en español cuando faltan los campos en inglés", () => {
    const tramite = gestionATramite({ ...minima, codigo: "N2-SAN-001", nivel: "N2", semaforo: "atrasado", semaforoEtiqueta: "Atrasado" });

    expect(tramite).toMatchObject({ codigo: "N2-SAN-001", nivel: "N2", semaforo: "atrasado", semaforoEtiqueta: "Atrasado" });
  });

  it("formatea fechas ISO y descarta valores inválidos", () => {
    expect(fechaIsoAVista("2026-11-26T10:00:00Z")).toBe("26-11-2026");
    expect(fechaIsoAVista(null)).toBeNull();
    expect(fechaIsoAVista("26/11/2026")).toBeNull();
  });
});

describe("TramitesMock", () => {
  it("adapta el listado y conserva cada gestión para consultarla por id", () => {
    const api = { managements: vi.fn(() => of([completa, minima])) } as unknown as ManagementApiService;
    const servicio = new TramitesMock(api);
    let codigos: string[] = [];

    servicio.cargarTodos(true).subscribe((items) => { codigos = items.map(({ codigo }) => codigo); });

    expect(api.managements).toHaveBeenCalledWith(true);
    expect(codigos).toEqual(["N1-MUN-004", "Gestión 16"]);
    expect(servicio.obtenerPorId(16)?.codigo).toBe("Gestión 16");
  });
});
