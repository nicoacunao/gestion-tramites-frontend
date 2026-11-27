import { Subject, of, throwError } from "rxjs";
import { ApiClientError } from "../../services/api-base";
import { BackendLogEntry, BackendUser, LogEntryWrite } from "../../services/api-models";
import { BitacoraApiService } from "../../services/bitacora-api";
import { IdentityApiService } from "../../services/identity-api";
import { UserSessionService } from "../../services/user-session";
import { BitacoraPanel, EntradaBitacora } from "./bitacora-panel";

const usuarios: BackendUser[] = [
  { id: "5", rut: "5-5", names: "María", firstSurname: "González", secondSurname: null, email: "m@x.cl", role: "gestiones" },
];

function entrada(id: string, extra: Partial<BackendLogEntry> = {}): BackendLogEntry {
  return {
    id,
    managementId: "1001",
    userId: "5",
    registeredOn: "2026-09-19",
    registeredAt: "10:30:00",
    title: `Título ${id}`,
    comment: `Comentario ${id}`,
    type: "novedad",
    ...extra,
  };
}

describe("BitacoraPanel", () => {
  let componente: BitacoraPanel;
  let logs: ReturnType<typeof vi.fn>;
  let createLog: ReturnType<typeof vi.fn>;
  let respuestasLogs: Subject<BackendLogEntry[]>[];
  let guardado: Subject<BackendLogEntry>;
  let emitida: EntradaBitacora | undefined;

  beforeEach(() => {
    localStorage.clear();
    respuestasLogs = [];
    guardado = new Subject<BackendLogEntry>();
    logs = vi.fn((_id: string) => {
      const respuesta = new Subject<BackendLogEntry[]>();
      respuestasLogs.push(respuesta);
      return respuesta.asObservable();
    });
    createLog = vi.fn((_body: LogEntryWrite) => guardado.asObservable());
    const session = new UserSessionService();
    session.setSession("token", "2099-01-01T00:00:00.000Z", {
      id: "2", rut: "2-2", names: "Jose Luis", firstSurname: "Rozas", secondSurname: null,
      email: "jose@example.com", role: "Prueba",
    });
    componente = new BitacoraPanel(
      session,
      { logs, createLog } as unknown as BitacoraApiService,
      { cachedUsers: () => of(usuarios) } as unknown as IdentityApiService,
    );
    emitida = undefined;
    componente.entradaRegistrada.subscribe((value) => { emitida = value; });
  });

  afterEach(() => localStorage.clear());

  /** Simula una respuesta HTTP: emite y completa. */
  function responder(indice: number, items: BackendLogEntry[]): void {
    respuestasLogs[indice].next(items);
    respuestasLogs[indice].complete();
  }

  it("carga el historial con el id de la gestión y resuelve los autores", () => {
    componente.gestionId = "1001";
    expect(logs).toHaveBeenCalledWith("1001");
    expect(componente.cargando).toBe(true);

    responder(0, [
      entrada("2"),
      entrada("1", { userId: null, type: "inicio", registeredAt: "09:00:00" }),
      entrada("3", { userId: "2" }),
      entrada("4", { userId: "77" }),
    ]);

    expect(componente.cargando).toBe(false);
    expect(componente.entradas.map(({ usuario }) => usuario)).toEqual([
      "María González",
      "Usuario del sistema",
      "Jose Luis Rozas",
      "Usuario del sistema",
    ]);
    expect(componente.entradas[0]).toMatchObject({ fecha: "19-09-2026", hora: "10:30", iniciales: "MG", automatica: false });
    expect(componente.entradas[1]).toMatchObject({ tipo: "inicio", automatica: true });
  });

  it("muestra un historial vacío sin inventar registros", () => {
    componente.gestionId = "1001";
    responder(0, []);

    expect(componente.entradas).toEqual([]);
    expect(componente.errorCarga).toBe("");
  });

  it("informa el error de carga y permite reintentar", () => {
    componente.gestionId = "1001";
    respuestasLogs[0].error(new ApiClientError("El servicio no está disponible temporalmente.", 503));

    expect(componente.errorCarga).toBe("El servicio no está disponible temporalmente.");

    componente.cargar();
    expect(logs).toHaveBeenCalledTimes(2);
    expect(componente.errorCarga).toBe("");
  });

  it("registra la novedad en el backend y la muestra solo cuando el servidor confirma", () => {
    componente.gestionId = "1001";
    responder(0, [entrada("1")]);
    componente.tituloNuevo = "Retraso excepcional";
    componente.comentarioNuevo = "  Se informó un retraso excepcional.  ";

    componente.registrarEntrada();
    componente.registrarEntrada();

    expect(createLog).toHaveBeenCalledTimes(1);
    const body = createLog.mock.calls[0][0];
    expect(body).toMatchObject({
      managementId: "1001",
      title: "Retraso excepcional",
      comment: "Se informó un retraso excepcional.",
      type: "novedad",
    });
    expect(body.userId).toBeUndefined();
    expect(body.registeredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.registeredAt).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(componente.guardando).toBe(true);
    expect(componente.entradas).toHaveLength(1);
    expect(componente.mensajeConfirmacion).toBe("");

    guardado.next(entrada("9", { userId: "2", title: "Retraso excepcional", comment: "Se informó un retraso excepcional." }));

    expect(componente.guardando).toBe(false);
    expect(componente.entradas[0]).toMatchObject({ id: "9", usuario: "Jose Luis Rozas", titulo: "Retraso excepcional" });
    expect(componente.tituloNuevo).toBe("");
    expect(componente.comentarioNuevo).toBe("");
    expect(componente.mensajeConfirmacion).toBe("La novedad se agregó correctamente.");
    expect(emitida?.id).toBe("9");
  });

  it("conserva el texto y muestra el error si el servidor rechaza la novedad", () => {
    componente = new BitacoraPanel(
      new UserSessionService(),
      {
        logs: () => of([]),
        createLog: () => throwError(() => new ApiClientError("El título o comentario no es válido.", 422, "INVALID_LOG_CONTENT")),
      } as unknown as BitacoraApiService,
    );
    componente.gestionId = "1001";
    componente.tituloNuevo = "Título";
    componente.comentarioNuevo = "Comentario";

    componente.registrarEntrada();

    expect(componente.mensajeValidacion).toBe("El título o comentario no es válido.");
    expect(componente.tituloNuevo).toBe("Título");
    expect(componente.guardando).toBe(false);
    expect(componente.entradas).toEqual([]);
  });

  it("valida título y comentario antes de enviar", () => {
    componente.gestionId = "1001";
    componente.comentarioNuevo = "La institución informó una novedad.";
    componente.registrarEntrada();
    expect(createLog).not.toHaveBeenCalled();
    expect(componente.mensajeValidacion).toContain("Escribe un título");

    componente.tituloNuevo = "Seguimiento a la institución";
    componente.comentarioNuevo = "   ";
    componente.registrarEntrada();
    expect(createLog).not.toHaveBeenCalled();
    expect(componente.mensajeValidacion).toContain("Escribe un comentario");
  });

  it("recarga al cambiar de gestión e ignora respuestas de la gestión anterior", () => {
    componente.gestionId = "1001";
    componente.tituloNuevo = "Borrador";
    componente.gestionId = "1002";

    expect(componente.tituloNuevo).toBe("");
    expect(logs).toHaveBeenLastCalledWith("1002");
    responder(0, [entrada("viejo")]);
    responder(1, [entrada("nuevo", { managementId: "1002" })]);

    expect(componente.entradas.map(({ id }) => id)).toEqual(["nuevo"]);
  });
});
