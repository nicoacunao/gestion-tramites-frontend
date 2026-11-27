import { of, throwError } from "rxjs";
import { ApiClientError } from "../../shared/services/api-base";
import {
  BackendBackground,
  BackendStage,
  BackendUser,
  ManagementContract,
  StageCatalogItem,
} from "../../shared/services/api-models";
import { CatalogApiService } from "../../shared/services/catalog-api";
import { FilesApiService } from "../../shared/services/files-api";
import { IdentityApiService } from "../../shared/services/identity-api";
import { ManagementApiService } from "../../shared/services/management-api";
import { TramitesMock } from "../../shared/services/tramites-mock";
import { UserSessionService } from "../../shared/services/user-session";
import { TramiteDetalle } from "./tramite-detalle";

const gestion: ManagementContract = {
  id: "15",
  stationId: "60123",
  responsibleUserId: "3",
  openedOn: "2026-07-02",
  estimatedCompletionOn: "2026-08-15",
  lastReviewedOn: null,
  priority: "Alta",
  status: "En tramitación",
  requesterName: "Jefatura de zona",
  code: "N1-MUN-004",
  managementTypeName: "Patente comercial",
};

const usuarios: BackendUser[] = [
  { id: "3", rut: "3-3", names: "Ana", firstSurname: "Pérez", secondSurname: null, email: "a@x.cl", role: "gestiones" },
  { id: "4", rut: "4-4", names: "Luis", firstSurname: "Soto", secondSurname: null, email: "l@x.cl", role: "gestiones" },
];

function antecedente(id: string, extra: Partial<BackendBackground>): BackendBackground {
  return {
    id,
    managementId: "15",
    parentManagementBackgroundId: null,
    managementTypeId: `t${id}`,
    backgroundId: `t${id}`,
    managementTypeName: `Tipo ${id}`,
    level: "N2",
    required: true,
    responsibleUserId: "3",
    status: "Pendiente",
    fileReference: null,
    uploadedAt: "2026-07-02T10:00:00Z",
    ...extra,
  };
}

const antecedentes: BackendBackground[] = [
  antecedente("1", { level: "N1", managementTypeName: "Patente comercial" }),
  antecedente("2", { parentManagementBackgroundId: "1", managementTypeName: "Solicitud de patente" }),
  antecedente("3", { level: "N3", parentManagementBackgroundId: "2", managementTypeName: "Documento A", fileReference: "3/0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0-plano.pdf" }),
  antecedente("4", { required: false, managementTypeName: "Informe complementario" }),
];

const catalogo: StageCatalogItem[] = [
  { id: "e1", name: "Consulta", percentage: 10, order: 1 },
  { id: "e2", name: "Ingreso", percentage: 30, order: 2 },
];

const etapas: BackendStage[] = [
  {
    id: "s1", managementId: "15", stageId: "e1", stageName: "Consulta", percentage: 10, status: "En curso",
    estimatedOn: "2026-07-10", completedOn: null, responsible: "Ana Pérez", responsibleUserId: "3", notes: null,
  },
];

function crear(extra: { files?: Partial<FilesApiService>; management?: Partial<ManagementApiService> } = {}) {
  const management = {
    management: vi.fn(() => of(gestion)),
    backgrounds: vi.fn(() => of(antecedentes)),
    stages: vi.fn(() => of(etapas)),
    updateManagement: vi.fn(() => of(gestion)),
    updateBackground: vi.fn(() => of(antecedentes[2])),
    updateStage: vi.fn(() => of(etapas[0])),
    createStage: vi.fn(() => of(etapas[0])),
    managements: vi.fn(() => of([gestion])),
    ...extra.management,
  };
  const tramites = new TramitesMock(management as unknown as ManagementApiService);
  const detalle = new TramiteDetalle(
    tramites,
    new UserSessionService(),
    management as unknown as ManagementApiService,
    { cachedUsers: () => of(usuarios) } as unknown as IdentityApiService,
    null,
    { stageCatalog: () => of(catalogo) } as unknown as CatalogApiService,
    null,
    (extra.files ?? null) as FilesApiService | null,
  );
  detalle.tramiteId = "15";
  return { detalle, management };
}

describe("TramiteDetalle con API", () => {
  it("muestra los antecedentes sin el N1, con nombres, jerarquía y archivo del backend", () => {
    const { detalle } = crear();

    expect(detalle.cargandoDetalle).toBe(false);
    expect(detalle.antecedentesRequeridos.map(({ id, nivel, padreId, antecedente }) => ({ id, nivel, padreId, antecedente }))).toEqual([
      { id: "2", nivel: "N2", padreId: null, antecedente: "Solicitud de patente" },
      { id: "3", nivel: "N3", padreId: "2", antecedente: "Documento A" },
    ]);
    expect(detalle.antecedentesRequeridos[0]).toMatchObject({ responsable: "Ana Pérez", archivo: "", fechaCarga: "" });
    expect(detalle.antecedentesRequeridos[1]).toMatchObject({ archivo: "plano.pdf", fechaCarga: "02-07-2026" });
    expect(detalle.antecedentesComplementarios.map(({ tipoDocumento }) => tipoDocumento)).toEqual(["Informe complementario"]);
    expect(detalle.antecedentesRequeridosVisibles).toHaveLength(2);
  });

  it("combina las etapas de la gestión con el catálogo", () => {
    const { detalle } = crear();

    expect(detalle.etapasGestion).toEqual([
      expect.objectContaining({ id: "s1", stageId: "e1", estado: "En curso", fechaEstimada: "10-07-2026", responsableId: "3" }),
      expect.objectContaining({ stageId: "e2", etapa: "Ingreso", porcentaje: 30, estado: "Pendiente" }),
    ]);
    expect(detalle.etapasGestion[1].id).toBeUndefined();
    expect(detalle.opcionesResponsables).toEqual([
      { label: "Ana Pérez", value: "3" },
      { label: "Luis Soto", value: "4" },
    ]);
  });

  it("guarda solo lo modificado con los contratos vigentes", () => {
    const { detalle, management } = crear();
    detalle.antecedentesRequeridos[1].estado = "Recibido";
    detalle.etapasGestion[0].fechaReal = "12-07-2026";
    detalle.etapasGestion[1].responsableId = "4";

    detalle.guardarCambios();

    expect(detalle.errorGuardado).toBe("");
    expect(management.updateBackground).toHaveBeenCalledTimes(1);
    expect(management.updateBackground).toHaveBeenCalledWith("3", {
      responsibleUserId: "3",
      status: "Recibido",
      fileReference: "3/0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0-plano.pdf",
    });
    expect(management.updateStage).toHaveBeenCalledWith("s1", {
      status: "En curso",
      estimatedOn: "2026-07-10",
      completedOn: "2026-07-12",
      responsibleUserId: "3",
      notes: null,
    });
    expect(management.createStage).toHaveBeenCalledWith("15", expect.objectContaining({ stageId: "e2", status: "Pendiente", responsibleUserId: "4" }));
    const [, cuerpo] = vi.mocked(management.updateManagement).mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(Object.keys(cuerpo).sort()).toEqual([
      "estimatedCompletionOn", "lastReviewedOn", "openedOn", "priority", "requesterName", "responsibleUserId", "stationId", "status",
    ]);
  });

  it("no envía nada si un antecedente modificado no tiene archivo o las fechas son inválidas", () => {
    const { detalle, management } = crear();
    detalle.antecedentesRequeridos[0].estado = "Recibido";
    detalle.etapasGestion[0].fechaReal = "01-07-2026";

    detalle.guardarCambios();

    expect(detalle.errorGuardado).toContain("primero debes cargar su archivo");
    expect(detalle.errorGuardado).toContain("no puede ser anterior a la estimada");
    expect(management.updateManagement).not.toHaveBeenCalled();
    expect(management.updateBackground).not.toHaveBeenCalled();
  });

  it("permite cambiar el responsable de un antecedente sin archivo", () => {
    const { detalle, management } = crear();
    detalle.antecedentesRequeridos[0].responsableId = "4";

    detalle.guardarCambios();

    expect(detalle.errorGuardado).toBe("");
    expect(management.updateBackground).toHaveBeenCalledWith("2", {
      responsibleUserId: "4",
      status: "Pendiente",
      fileReference: null,
    });
  });

  it("muestra el error del servidor al guardar y mantiene el detalle abierto", () => {
    const { detalle } = crear({
      management: { updateManagement: vi.fn(() => throwError(() => new ApiClientError("La gestión no pudo ser guardada.", 500))) },
    });
    detalle.visible = true;

    detalle.guardarCambios();

    expect(detalle.guardando).toBe(false);
    expect(detalle.visible).toBe(true);
    expect(detalle.errorGuardado).toContain("La gestión no pudo ser guardada.");
  });

  it("sube el archivo de un antecedente y actualiza su referencia", () => {
    const upload = vi.fn(() => of({ id: "2", managementSpecificId: "2", storageReference: "2/0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0-solicitud.pdf", uploadedAt: "2026-07-20T12:00:00Z" }));
    const { detalle } = crear({ files: { upload } as unknown as FilesApiService });
    const archivo = new File(["x"], "solicitud.pdf");

    detalle.cargarArchivoAntecedente({ files: [archivo] }, detalle.antecedentesRequeridos[0]);

    expect(upload).toHaveBeenCalledWith(archivo, "2");
    expect(detalle.antecedentesRequeridos[0]).toMatchObject({ archivo: "solicitud.pdf", fechaCarga: "20-07-2026" });
    expect(detalle.archivoEnCursoId).toBeNull();
    expect(detalle.mensajeArchivoEsError).toBe(false);
  });

  it("informa que el almacenamiento no está disponible (503)", () => {
    const upload = vi.fn(() => throwError(() => new ApiClientError("El servidor de almacenamiento de archivos aún no está disponible.", 503, "FILE_STORAGE_UNAVAILABLE")));
    const { detalle } = crear({ files: { upload } as unknown as FilesApiService });

    detalle.cargarArchivoAntecedente({ files: [new File(["x"], "a.pdf")] }, detalle.antecedentesRequeridos[0]);

    expect(detalle.mensajeArchivo).toBe("El servidor de almacenamiento de archivos aún no está disponible.");
    expect(detalle.mensajeArchivoEsError).toBe(true);
    expect(detalle.antecedentesRequeridos[0].archivo).toBe("");
  });

  it("rechaza archivos de más de 10 MB sin enviarlos", () => {
    const upload = vi.fn();
    const { detalle } = crear({ files: { upload } as unknown as FilesApiService });
    const grande = new File(["x"], "grande.pdf");
    Object.defineProperty(grande, "size", { value: 10_000_001 });

    detalle.cargarArchivoAntecedente({ files: [grande] }, detalle.antecedentesRequeridos[0]);

    expect(upload).not.toHaveBeenCalled();
    expect(detalle.mensajeArchivo).toContain("10 MB");
  });

  it("descarga el archivo usando el id del antecedente", () => {
    const download = vi.fn(() => throwError(() => new ApiClientError("El archivo no existe.", 404)));
    const { detalle } = crear({ files: { download } as unknown as FilesApiService });

    detalle.descargarArchivo(detalle.antecedentesRequeridos[1]);

    expect(download).toHaveBeenCalledWith("3");
    expect(detalle.mensajeArchivo).toBe("El archivo no existe.");
  });

  describe("edición de datos generales", () => {
    it("precarga los valores actuales y deja vacías las fechas sin especificar", () => {
      const { detalle } = crear({ management: { management: vi.fn(() => of({ ...gestion, estimatedCompletionOn: null })) } });

      detalle.iniciarEdicionCabecera();

      expect(detalle.editandoCabecera).toBe(true);
      expect(detalle.cabecera).toEqual({
        estado: "En tramitación",
        prioridad: "Alta",
        responsableId: "3",
        solicitante: "Jefatura de zona",
        fechaApertura: "02-07-2026",
        fechaEstimada: "",
      });
    });

    it("valida las reglas de ManagementWrite sin enviar nada", () => {
      const { detalle, management } = crear();
      detalle.iniciarEdicionCabecera();
      detalle.cabecera.solicitante = "   ";
      detalle.cabecera.fechaEstimada = "01-07-2026";
      detalle.cabecera.responsableId = "";

      detalle.guardarCambios();

      expect(detalle.erroresCabecera).toMatchObject({
        solicitante: "Ingresa el solicitante.",
        fechaEstimada: "La fecha estimada de término no puede ser anterior a la de apertura.",
        responsableId: "Selecciona un responsable.",
      });
      expect(detalle.errorGuardado).toContain("datos generales");
      expect(management.updateManagement).not.toHaveBeenCalled();

      detalle.limpiarErrorCabecera("solicitante");
      expect(detalle.erroresCabecera.solicitante).toBeUndefined();
    });

    it("envía los datos editados, refresca con la respuesta y avisa al listado", () => {
      const guardada: ManagementContract = { ...gestion, status: "Observado", priority: "Baja", responsibleUserId: "4", responsibleName: "Luis Soto", requesterName: "Gerencia", estimatedCompletionOn: null };
      const { detalle, management } = crear({ management: { updateManagement: vi.fn(() => of(guardada)) } });
      let emitido: unknown;
      detalle.tramiteActualizado.subscribe((tramite) => { emitido = tramite; });
      detalle.iniciarEdicionCabecera();
      Object.assign(detalle.cabecera, {
        estado: "Observado",
        prioridad: "Baja",
        responsableId: "4",
        solicitante: "  Gerencia ",
        fechaEstimada: "",
      });

      detalle.guardarCambios();

      expect(vi.mocked(management.updateManagement)).toHaveBeenCalledWith("15", expect.objectContaining({
        stationId: "60123",
        status: "Observado",
        priority: "Baja",
        responsibleUserId: "4",
        requesterName: "Gerencia",
        openedOn: "2026-07-02",
        estimatedCompletionOn: null,
      }));
      expect(detalle.editandoCabecera).toBe(false);
      expect(detalle.tramite).toMatchObject({ estado: "Observado", responsableInterno: "Luis Soto", fechaEstimadaTermino: "Sin especificar" });
      expect(emitido).toMatchObject({ id: "15", estado: "Observado" });
    });

    it("descarta la edición sin modificar el trámite", () => {
      const { detalle } = crear();
      detalle.iniciarEdicionCabecera();
      detalle.cabecera.estado = "Rechazado";

      detalle.cancelarEdicionCabecera();

      expect(detalle.editandoCabecera).toBe(false);
      expect(detalle.tramite?.estado).toBe("En tramitación");
    });
  });
});
