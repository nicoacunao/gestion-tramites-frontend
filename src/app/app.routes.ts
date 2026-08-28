import { Routes } from "@angular/router";
import { MainLayoutComponent } from "./layout/main-layout/main-layout";

export const routes: Routes = [
  {
    path: "login",
    title: "Acceso | Gestión de Trámites",
    loadComponent: () => import("./features/login/login").then((m) => m.Login),
  },
  {
    path: "",
    component: MainLayoutComponent,
    children: [
      {
        path: "",
        redirectTo: "escritorio",
        pathMatch: "full",
      },
      {
        path: "escritorio",
        title: "Escritorio | Gestión de Trámites",
        loadComponent: () =>
          import("./features/escritorio/escritorio").then((m) => m.Escritorio),
      },
      {
        path: "todas-las-gestiones",
        title: "Todas las gestiones | Gestión de Trámites",
        loadComponent: () =>
          import("./features/todas-gestiones/todas-gestiones").then(
            (m) => m.TodasGestiones,
          ),
      },
      {
        path: "home",
        title: "Inicio | Gestión de Trámites",
        loadComponent: () => import("./features/home/home").then((m) => m.Home),
      },
      {
        path: "tramites",
        loadComponent: () =>
          import("./features/tramites/pages/tramites-listado/tramites-listado").then(
            (m) => m.TramitesListado,
          ),
      },
      {
        path: "tramites/nuevo",
        loadComponent: () =>
          import("./features/tramites/pages/tramite-nuevo/tramite-nuevo").then(
            (m) => m.TramiteNuevo,
          ),
      },
      {
        path: "tramites/estado-estaciones",
        loadComponent: () =>
          import("./features/tramites/pages/estado-estaciones/estado-estaciones").then(
            (m) => m.EstadoEstaciones,
          ),
      },
      {
        path: "tramites/:id/modificar",
        loadComponent: () =>
          import("./features/tramites/pages/tramite-modificacion/tramite-modificacion").then(
            (m) => m.TramiteModificacion,
          ),
      },
      {
        path: "tramites/:id",
        loadComponent: () =>
          import("./features/tramites/pages/tramite-detalle/tramite-detalle").then(
            (m) => m.TramiteDetalle,
          ),
      },
      //   {
      //     path: 'tramites/:id/seguimiento',
      //     loadComponent: () =>
      //       import('./features/tramites/pages/tramite-seguimiento/tramite-seguimiento.component')
      //         .then(m => m.TramiteSeguimientoComponent)
      //   }
    ],
  },
  {
    path: "**",
    redirectTo: "home",
  },
];
