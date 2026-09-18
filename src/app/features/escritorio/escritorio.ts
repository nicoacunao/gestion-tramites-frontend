import { Component } from "@angular/core";
import { Breadcrumbs } from "../../shared/components/breadcrumbs/breadcrumbs";
import {
  GestionListado,
  GestionListadoItem,
} from "../../shared/components/gestion-listado/gestion-listado";
import { EstadoSemaforoBitacora } from "../bitacora/bitacora";
import { Tramite } from "../tramites/models/tramite";
import { TramitesMock } from "../tramites/services/tramites-mock";

type EstadoSemaforo = EstadoSemaforoBitacora;
type NivelGestion = `N${number}`;

interface AmbitoGestion {
  codigo: string;
  nombre: string;
  terminos: string[];
}

interface DatosAsociados {
  rutRazonSocial: string;
  representanteLegal: string;
  rutRepresentanteLegal: string;
  semaforo: EstadoSemaforo;
}

interface GestionEscritorio extends GestionListadoItem {
  ambito: string;
  codigoAmbito: string;
  correlativo: number;
  rutRepresentanteLegal: string;
}

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
  imports: [Breadcrumbs, GestionListado],
  templateUrl: "./escritorio.html",
  styleUrl: "./escritorio.scss",
})
export class Escritorio {
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

  constructor(tramitesMock: TramitesMock) {
    const correlativosPorNivel = new Map<NivelGestion, number>();

    this.gestiones = tramitesMock.obtenerTodos().map((tramite) => {
      const nivel = this.obtenerNivel(tramite);
      const correlativo = (correlativosPorNivel.get(nivel) ?? 0) + 1;

      correlativosPorNivel.set(nivel, correlativo);

      return this.crearGestion(tramite, nivel, correlativo);
    });
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
}
