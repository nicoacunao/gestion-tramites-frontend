import { Injectable } from "@angular/core";
import { Tramite } from "../models/tramite";

@Injectable({
  providedIn: "root",
})
export class TramitesMock {
  private readonly tramites: Tramite[] = [
    {
      id: 1001,
      idEstacion: "60001",
      tipoTramite: "Patente comercial",
      tramiteEspecifico: "Solicitud de patente EDS",
      estacionServicio: "Copec Concón",
      razonSocial: "Comercial Los Pinos SpA",
      comuna: "Concón",
      direccion: "Av. Borgoño 21.350",
      estado: "Ingresado",
      prioridad: "Alta",
      responsableInterno: "José L. Rosas",
      solicitanteCopec: "Claudio Doñas",
      fechaApertura: "02-07-2026",
      fechaEstimadaTermino: "12-07-2026",
    },
    {
      id: 1002,
      idEstacion: "60002",
      tipoTramite: "Resolución sanitaria de alimentos",
      tramiteEspecifico: "Local de elaboración de alimentos con consumo al paso",
      estacionServicio: "Copec Reñaca",
      razonSocial: "Servicios Reñaca Ltda.",
      comuna: "Viña del Mar",
      direccion: "Av. Borgoño 14.600",
      estado: "En revisión",
      prioridad: "Alta",
      responsableInterno: "Claudio Doñas",
      solicitanteCopec: "José L. Rosas",
      fechaApertura: "01-07-2026",
      fechaEstimadaTermino: "10-07-2026",
    },
    {
      id: 1003,
      idEstacion: "60003",
      tipoTramite: "Informe sanitario de establecimiento",
      tramiteEspecifico: "Informe sanitario de establecimiento",
      estacionServicio: "Copec Viña Centro",
      razonSocial: "Inversiones Costa Azul",
      comuna: "Viña del Mar",
      direccion: "Av. Libertad 1.050",
      estado: "Observado",
      prioridad: "Media",
      responsableInterno: "Claudio Henríquez",
      solicitanteCopec: "Claudio Doñas",
      fechaApertura: "28-06-2026",
      fechaEstimadaTermino: "08-07-2026",
    },
    {
      id: 1004,
      idEstacion: "60004",
      tipoTramite: "Regularización de obras",
      tramiteEspecifico: "Permiso de obra menor DOM",
      estacionServicio: "Copec Valparaíso",
      razonSocial: "Transportes Puerto Ltda.",
      comuna: "Valparaíso",
      direccion: "Av. Argentina 650",
      estado: "Aprobado",
      prioridad: "Media",
      responsableInterno: "José L. Rosas",
      solicitanteCopec: "Claudio Henríquez",
      fechaApertura: "25-06-2026",
      fechaEstimadaTermino: "05-07-2026",
    },
    {
      id: 1005,
      idEstacion: "60005",
      tipoTramite: "Patente comercial",
      tramiteEspecifico: "Traspaso de patente provisoria a definitiva",
      estacionServicio: "Copec Quilpué",
      razonSocial: "Sociedad El Belloto",
      comuna: "Quilpué",
      direccion: "Freire 1.350",
      estado: "Finalizado",
      prioridad: "Baja",
      responsableInterno: "Claudio Henríquez",
      solicitanteCopec: "José L. Rosas",
      fechaApertura: "20-06-2026",
      fechaEstimadaTermino: "30-06-2026",
    },
  ];

  obtenerTodos(): Tramite[] {
    return this.tramites.map((tramite) => ({ ...tramite }));
  }

  obtenerPorId(id: number): Tramite | undefined {
    const tramite = this.tramites.find((item) => item.id === id);

    return tramite ? { ...tramite } : undefined;
  }

  guardar(tramite: Tramite): void {
    const indice = this.tramites.findIndex((item) => item.id === tramite.id);

    if (indice >= 0) {
      this.tramites[indice] = { ...tramite };
      return;
    }

    this.tramites.push({ ...tramite });
  }
}
