import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Tramite } from '../../models/tramite';
import { Breadcrumbs } from '../../../../shared/components/breadcrumbs/breadcrumbs';

@Component({
  selector: 'app-tramites-listado',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    Breadcrumbs
  ],
  templateUrl: './tramites-listado.html',
  styleUrl: './tramites-listado.scss'
})
export class TramitesListado {
  breadcrumbs = [
    {
      label: 'Módulo de Gestión de Trámites',
      route: '/tramites'
    },
    {
      label: 'Consulta de Trámites'
    }
  ];
  filtros = {
    estacionServicio: '',
    fechaApertura: '',
    fechaTermino: '',
    estado: ''
  };

  estacionesServicio = [
    'Copec Concón',
    'Copec Reñaca',
    'Copec Viña Centro',
    'Copec Valparaíso',
    'Copec Quilpué'
  ];

  estados = [
    'Ingresado',
    'En revisión',
    'Observado',
    'Aprobado',
    'Finalizado'
  ];

  tramites: Tramite[] = [
    {
      id: 1001,
      tipoTramite: 'Nuevo trámite',
      estacionServicio: 'Copec Concón',
      estado: 'Ingresado',
      concesionario: 'Comercial Los Pinos SpA',
      fechaApertura: '02-07-2026',
      fechaEstimadaTermino: '12-07-2026'
    },
    {
      id: 1002,
      tipoTramite: 'Modificación',
      estacionServicio: 'Copec Reñaca',
      estado: 'En revisión',
      concesionario: 'Servicios Reñaca Ltda.',
      fechaApertura: '01-07-2026',
      fechaEstimadaTermino: '10-07-2026'
    },
    {
      id: 1003,
      tipoTramite: 'Nuevo trámite',
      estacionServicio: 'Copec Viña Centro',
      estado: 'Observado',
      concesionario: 'Inversiones Costa Azul',
      fechaApertura: '28-06-2026',
      fechaEstimadaTermino: '08-07-2026'
    },
    {
      id: 1004,
      tipoTramite: 'Modificación',
      estacionServicio: 'Copec Valparaíso',
      estado: 'Aprobado',
      concesionario: 'Transportes Puerto Ltda.',
      fechaApertura: '25-06-2026',
      fechaEstimadaTermino: '05-07-2026'
    },
    {
      id: 1005,
      tipoTramite: 'Nuevo trámite',
      estacionServicio: 'Copec Quilpué',
      estado: 'Finalizado',
      concesionario: 'Sociedad El Belloto',
      fechaApertura: '20-06-2026',
      fechaEstimadaTermino: '30-06-2026'
    }
  ];

  tramitesFiltrados: Tramite[] = [...this.tramites];

  buscar(): void {
    this.tramitesFiltrados = this.tramites.filter((tramite) => {
      const coincideEstacion =
        !this.filtros.estacionServicio ||
        tramite.estacionServicio === this.filtros.estacionServicio;

      const coincideEstado =
        !this.filtros.estado ||
        tramite.estado === this.filtros.estado;

      return coincideEstacion && coincideEstado;
    });
  }

  limpiarFiltros(): void {
    this.filtros = {
      estacionServicio: '',
      fechaApertura: '',
      fechaTermino: '',
      estado: ''
    };

    this.tramitesFiltrados = [...this.tramites];
  }

  obtenerClaseEstado(estado: string): string {
    return estado.toLowerCase().replace(' ', '-');
  }
}