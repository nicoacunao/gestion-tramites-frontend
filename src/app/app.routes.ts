import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout';

export const routes: Routes = [
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            {
                path: '',
                redirectTo: 'tramites',
                pathMatch: 'full'
            },
            {
                path: 'tramites',
                loadComponent: () =>
                    import('./features/tramites/pages/tramites-listado/tramites-listado')
                        .then(m => m.TramitesListado)
            },
            {
                path: 'tramites/nuevo',
                loadComponent: () =>
                    import('./features/tramites/pages/tramite-nuevo/tramite-nuevo')
                        .then(m => m.TramiteNuevo)
            },
            {
                path: 'tramites/estado-estaciones',
                loadComponent: () =>
                    import('./features/tramites/pages/estado-estaciones/estado-estaciones')
                        .then(m => m.EstadoEstaciones)
            },
            //   {
            //     path: 'tramites/:id',
            //     loadComponent: () =>
            //       import('./features/tramites/pages/tramite-detalle/tramite-detalle.component')
            //         .then(m => m.TramiteDetalleComponent)
            //   },
            //   {
            //     path: 'tramites/:id/modificar',
            //     loadComponent: () =>
            //       import('./features/tramites/pages/tramite-modificacion/tramite-modificacion.component')
            //         .then(m => m.TramiteModificacionComponent)
            //   },
            //   {
            //     path: 'tramites/:id/seguimiento',
            //     loadComponent: () =>
            //       import('./features/tramites/pages/tramite-seguimiento/tramite-seguimiento.component')
            //         .then(m => m.TramiteSeguimientoComponent)
            //   }
        ]
    },
    {
        path: '**',
        redirectTo: 'tramites'
    }
];