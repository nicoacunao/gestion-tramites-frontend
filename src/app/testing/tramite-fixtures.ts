import { Tramite } from "../features/tramites/models/tramite";
import { of, Observable } from "rxjs";
import { TramitesMock } from "../shared/services/tramites-mock";

export function crearTramiteFixture(indice = 1): Tramite {
  return {
    id: 1000 + indice,
    apiId: String(1000 + indice),
    codigo: `N1-MUN-${String(indice).padStart(3, "0")}`,
    nivel: "N1",
    ambito: "Municipal",
    codigoAmbito: "MUN",
    correlativo: indice,
    semaforo: "al-dia",
    semaforoEtiqueta: "Al día",
    idEstacion: String(60000 + indice),
    tipoTramite: "Patente comercial",
    estacionServicio: "Copec Concón",
    razonSocial: "Comercial Los Pinos SpA",
    comuna: "Concón",
    direccion: "Av. Borgoño 21.350",
    estado: "Pendiente",
    fechaApertura: "02-07-2026",
    fechaInicio: "02-07-2026",
    fechaIngreso: "02-07-2026",
    fechaIngresoOrden: "2026-07-02",
    fechaEstimadaTermino: "12-07-2026",
    fechaUltimaRevision: "08-07-2026",
    prioridad: "Media",
    responsableInterno: indice % 3 === 1 ? "Claudio Doñas" : indice % 3 === 2 ? "Claudio Henríquez" : "José Luis Rosa",
    tramiteEspecifico: "Solicitud de patente",
    descripcion: "Solicitud de patente EDS",
    rutRazonSocial: `76.000.${indice}-0`,
    representanteLegal: "María José Soto Pérez",
    rutRepresentanteLegal: "11.111.111-1",
    concesionario: "Comercial Los Pinos",
    solicitanteCopec: "Jefatura de zona",
    modalidadCreacion: "principal",
    detalleEditable: {
      antecedentesRequeridos: [
        { id: "bg-1", nivel: "N2", padreId: null, expandido: true, antecedente: "Documento A", obligatorio: true, responsable: "María González", responsableId: "2", estado: "Pendiente", fechaCarga: "—", archivo: "—", version: 1 },
        { id: "bg-2", nivel: "N3", padreId: "bg-1", expandido: true, antecedente: "Documento B", obligatorio: true, responsable: "María González", responsableId: "2", estado: "Pendiente", fechaCarga: "—", archivo: "—", version: 1 },
        { id: "bg-3", nivel: "N3", padreId: "bg-1", expandido: true, antecedente: "Documento C", obligatorio: true, responsable: "María González", responsableId: "2", estado: "Pendiente", fechaCarga: "—", archivo: "—", version: 1 },
      ],
      antecedentesComplementarios: [
        { id: "bg-4", nivel: "N2", padreId: null, expandido: true, tipoDocumento: "Complementario A", solicitadoPor: "Durante la gestión", responsable: "María González", responsableId: "2", estado: "Pendiente", fechaCarga: "—", archivo: "—", version: 1 },
        { id: "bg-5", nivel: "N3", padreId: "bg-4", expandido: true, tipoDocumento: "Complementario B", solicitadoPor: "Durante la gestión", responsable: "María González", responsableId: "2", estado: "Pendiente", fechaCarga: "—", archivo: "—", version: 1 },
      ],
      etapas: [
        "Consulta y definición de antecedentes",
        "Recolección de antecedentes y preparación del expediente",
        "Ingreso del expediente",
        "Revisión del expediente y emisión de observaciones",
        "Respuesta a las observaciones",
        "Aprobación del expediente",
        "Emisión o entrega del documento definitivo",
      ].map((etapa, index) => ({ id: `stage-${index + 1}`, version: 1, etapa, porcentaje: [10, 20, 30, 40, 50, 80, 100][index], estado: index < 3 ? "Completado" : index === 3 ? "En curso" : "Pendiente", fechaEstimada: index === 3 ? "15/07/2026" : "", fechaReal: "", responsable: "María González", observacion: index === 3 ? "Funcionario informó un plazo estimado de 15 días." : "" })),
    },
  };
}

export class TramitesFixture extends TramitesMock {
  constructor(readonly items: Tramite[]) { super(); items.forEach((item) => this.guardar(item)); }

  override cargarTodos(): Observable<Tramite[]> { return of(this.items); }
}
