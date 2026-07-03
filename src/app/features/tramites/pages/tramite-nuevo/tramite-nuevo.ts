import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Breadcrumbs } from '../../../../shared/components/breadcrumbs/breadcrumbs';

@Component({
  selector: 'app-tramite-nuevo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Breadcrumbs
  ],
  templateUrl: './tramite-nuevo.html',
  styleUrl: './tramite-nuevo.scss'
})
export class TramiteNuevo {
  breadcrumbs = [
    {
      label: 'Módulo de Gestión de Trámites',
      route: '/tramites'
    },
    {
      label: 'Nuevo Trámite'
    }
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
    estacionServicio: '',
    concesionario: '',
    prioridad: '',
    estado: '',
    responsableInterno: '',
    tipoTramite: '',
    tramiteEspecifico: '',
    solicitanteCopec: '',
    fechaApertura: '',
    fechaEstimadaTermino: ''
  };

  antecedenteRequerido = {
    antecedente: '',
    obligatorio: true,
    responsable: '',
    estado: '',
    archivo: '',
    observaciones: ''
  };

  antecedenteExtraordinario = {
    antecedente: '',
    obligatorio: true,
    responsable: '',
    estado: '',
    archivo: '',
    observaciones: ''
  };

  hitoGestion = {
    hito: '',
    estado: '',
    fechaEstimada: '',
    fechaReal: '',
    responsable: '',
    observacion: ''
  };

  onEstacionChange(): void {
    if (this.form.estacionServicio) {
      this.form.concesionario = 'Información del concesionario asociada a la estación seleccionada';
    } else {
      this.form.concesionario = '';
    }
  }

  crearTramite(): void {
    console.log('Crear trámite', this.form);
  }

  guardarBorrador(): void {
    console.log('Guardar borrador', this.form);
  }

  cancelar(): void {
    console.log('Cancelar');
  }
}