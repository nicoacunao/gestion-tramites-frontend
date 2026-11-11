import { Routes } from "@angular/router";
import { MainLayoutComponent } from "./layout/main-layout/main-layout";
import { authGuard, loginGuard } from "./shared/guards/auth.guard";

export const routes: Routes = [
  {
    path: "login",
    canActivate: [loginGuard],
    title: "Acceso | Gestión de Trámites",
    loadComponent: () => import("./features/login/login").then((m) => m.Login),
  },
  {
    path: "",
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: "",
        redirectTo: "home",
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
        redirectTo: "todas-las-gestiones",
        pathMatch: "full",
      },
      {
        path: "tramites/nuevo",
        loadComponent: () =>
          import("./features/tramites/pages/tramite-nuevo/tramite-nuevo").then(
            (m) => m.TramiteNuevo,
          ),
      },
      {
        path: "tramites/:id",
        redirectTo: ({ params }) =>
          `/todas-las-gestiones?detalle=${params["id"]}`,
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
