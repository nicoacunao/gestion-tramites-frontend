import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";

@Component({
  selector: "app-tramite-nuevo",
  standalone: true,
  imports: [CommonModule, FormsModule, Breadcrumbs],
  templateUrl: "./tramite-nuevo.html",
  styleUrl: "./tramite-nuevo.scss",
})
export class TramiteNuevo {
  breadcrumbs = [
    {
      label: "Módulo de Gestión de Trámites",
      route: "/tramites",
    },
    {
      label: "Nuevo Trámite",
    },
  ];

  estacionesServicio = [];

  prioridades = [];

  estados = [];

  responsables = [];

  tiposTramite = [];

  tramitesEspecificos = [];

  solicitantesCopec = [];

  antecedentes = [];

  archivos = [];

  form = {
    estacionServicio: "",
    concesionario: "",
    prioridad: "",
    estado: "",
    responsableInterno: "",
    tipoTramite: "",
    tramiteEspecifico: "",
    solicitanteCopec: "",
    fechaApertura: "",
    fechaEstimadaTermino: "",
  };

  antecedentesRequeridos = [this.crearAntecedenteVacio()];

  antecedentesExtraordinarios = [this.crearAntecedenteVacio()];

  hitosGestion = [this.crearHitoVacio()];

  onEstacionChange(): void {
    if (this.form.estacionServicio) {
      this.form.concesionario =
        "Información del concesionario asociada a la estación seleccionada";
    } else {
      this.form.concesionario = "";
    }
  }

  agregarAntecedenteRequerido(): void {
    this.antecedentesRequeridos.push(this.crearAntecedenteVacio());
  }

  agregarAntecedenteExtraordinario(): void {
    this.antecedentesExtraordinarios.push(this.crearAntecedenteVacio());
  }

  agregarHitoGestion(): void {
    this.hitosGestion.push(this.crearHitoVacio());
  }

  private crearAntecedenteVacio() {
    return {
      antecedente: "",
      obligatorio: true,
      responsable: "",
      estado: "",
      observaciones: "",
    };
  }

  private crearHitoVacio() {
    return {
      hito: "",
      estado: "",
      fechaEstimada: "",
      fechaReal: "",
      responsable: "",
      observacion: "",
    };
  }

  crearTramite(): void {
    console.log("Crear trámite", this.form);
  }

  guardarBorrador(): void {
    console.log("Guardar borrador", this.form);
  }

  cancelar(): void {
    console.log("Cancelar");
  }
}
