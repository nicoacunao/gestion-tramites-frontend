# Gestión de Trámites — Frontend

Aplicación web para gestionar trámites internos: ingreso de proyectos,
seguimiento de antecedentes y etapas, bitácora y consulta de estaciones de
servicio. Es una SPA en Angular con PrimeNG que consume la API REST de
[`gestion-tramites-backend`](../gestion-tramites-backend) y se publica en
Cloudflare Pages.

## Stack

- Angular 21 (componentes standalone, sin zone.js) y TypeScript estricto.
- PrimeNG 21 con el tema Aura y Bootstrap 5 para la grilla y utilidades.
- `HttpClient` con interceptor de autenticación (token Bearer).
- Vitest mediante `@angular/build:unit-test` (jsdom).
- Cloudflare Pages para el despliegue (Wrangler disponible como dependencia de desarrollo).

## Cómo ejecutar localmente

Requisitos: Node.js 22.12+ (o 24) y npm 11+.

1. Levanta el backend en otra terminal. Por defecto usa la base de **prueba**
   (ver el [README del backend](../gestion-tramites-backend/README.md)):

   ```bash
   cd ../gestion-tramites-backend
   npm run dev
   ```

   La API queda en `http://localhost:8787`.

2. Instala las dependencias del frontend y levántalo:

   ```bash
   npm ci
   npm start
   ```

   Usa `npm install` solo si necesitas agregar o actualizar dependencias;
   `npm ci` instala exactamente lo que fija `package-lock.json`.

   npm 11 puede advertir que algunos paquetes (`esbuild`, `lmdb`, `workerd`…)
   tienen scripts de instalación no aprobados en `allowScripts`. Es solo una
   advertencia: el build y las pruebas funcionan con los binarios
   precompilados. Si tu entorno lo exige, revísalos con
   `npm install-scripts ls`.

3. Abre `http://localhost:4200` e inicia sesión con un usuario de la base de
   prueba (RUT y contraseña).

Detén el servidor con `Ctrl + C`.

El frontend no tiene archivos `.env` ni secretos: lo único que cambia entre
ambientes es la URL de la API, que es pública. Las credenciales de la base de
datos viven solo en el backend.

## Ambientes

Cada configuración de Angular apunta a uno de los ambientes del backend:

| Configuración | Archivo de ambiente                             | API                                                          | Ambiente del backend           |
| ------------- | ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------ |
| `development` | `src/environments/environment.development.ts`   | `http://localhost:8787/api/v1`                               | `test` local (`npm run dev`)   |
| `staging`     | `src/environments/environment.staging.ts`       | `https://gestion-tramites-api-staging.nicoacunao.workers.dev/api/v1` | `staging`              |
| `production`  | `src/environments/environment.ts`               | `https://gestion-tramites-api.nicoacunao.workers.dev/api/v1` | `production`                   |

- `npm start` usa `development`; `npm run build` usa `production`.
- La URL debe incluir el prefijo `/api/v1`.
- El backend restringe CORS por ambiente: `test` acepta `http://localhost:4200`,
  `staging` acepta `https://staging.gestion-tramites.pages.dev` y `production`
  acepta `https://gestion-tramites.pages.dev`. Por eso un frontend local no
  puede usar la API de staging o producción sin agregar `localhost` a
  `CORS_ORIGINS` del backend.
- Para cambiar la URL de un ambiente, edita solo su archivo en
  `src/environments/`.

## Comandos

| Comando                    | Descripción                                                        |
| -------------------------- | ------------------------------------------------------------------ |
| `npm start`                | Servidor de desarrollo en `http://localhost:4200` (API local).     |
| `npm run build`            | Build de producción en `dist/gestion-tramites/browser`.            |
| `npm run build:staging`    | Build optimizado contra la API de staging.                         |
| `npm run build:production` | Build de producción (equivalente a `npm run build`).               |
| `npm run watch`            | Build de desarrollo en modo observación.                           |
| `npm test`                 | Pruebas unitarias en modo observación.                             |
| `npm run test:ci`          | Pruebas unitarias una sola vez (para CI).                          |
| `npm run check`            | Compila en modo desarrollo y ejecuta todas las pruebas.            |

## Estructura

```text
src/
  app/
    app.routes.ts            rutas (todas protegidas salvo /login)
    app.config.ts            HttpClient, interceptor, router y tema PrimeNG
    features/
      login/                 inicio de sesión
      home/                  Mis datos, Estaciones (importación) y Mis tareas
      escritorio/            gestiones del usuario autenticado
      todas-gestiones/       todas las gestiones (?detalle=<id>, ?estacion=<id>)
      tramite-detalle/       detalle en diálogo: datos generales, antecedentes,
                             archivos, etapas y bitácora
      bitacora/              diálogo de bitácora del listado
      tramites/
        models/              modelo de vista Tramite y estados
        pages/tramite-nuevo/ ingreso de un proyecto
        pages/estado-estaciones/ resumen por estación (sin ruta por ahora)
    layout/                  encabezado, menú y layout principal
    shared/
      components/            tabla común de gestiones, panel de bitácora, etc.
      guards/                authGuard y loginGuard
      interceptors/          token Bearer y manejo de sesión vencida (401)
      services/              clientes de la API por módulo y modelos del contrato
    testing/                 fixtures para pruebas
  environments/              URL de la API por ambiente
```

### Rutas

| Ruta                     | Pantalla                                              |
| ------------------------ | ----------------------------------------------------- |
| `/login`                 | Inicio de sesión.                                     |
| `/home`                  | Inicio: Mis datos, Estaciones y Mis tareas.           |
| `/escritorio`            | Gestiones asignadas al usuario.                       |
| `/todas-las-gestiones`   | Todas las gestiones; el detalle se abre como diálogo. |
| `/tramites/nuevo`        | Ingreso de un proyecto.                               |
| `/tramites/:id`          | Redirige a `/todas-las-gestiones?detalle=:id`.        |

## Integración con la API

El contrato vigente es el OpenAPI del backend
(`../gestion-tramites-backend/openapi/openapi.json`). Los modelos del frontend
están en `src/app/shared/services/api-models.ts` y se mantienen a mano,
alineados con ese archivo.

- **Formato de respuesta.** Éxito: `{ exito: true, mensaje: <datos>, meta }`.
  Error: `{ exito: false, mensaje, error: { code, message, details }, meta }`.
  `ApiBaseService` (`shared/services/api-base.ts`) extrae `mensaje`, rechaza
  respuestas fuera de contrato y convierte los errores en `ApiClientError`
  con un mensaje seguro para mostrar, el código, el `requestId` y los detalles.
- **Tiempo máximo de espera.** Si el servidor no responde, la solicitud se
  cancela y se muestra "El servidor no respondió a tiempo" (código `TIMEOUT`):
  30 segundos para solicitudes JSON y 120 segundos para cargas y descargas de
  archivos (`API_TIMEOUT_MS` y `API_TRANSFER_TIMEOUT_MS` en `api-base.ts`).
- **Sesión.** El login guarda el token y su expiración en `localStorage`. El
  interceptor agrega `Authorization: Bearer` a cada solicitud y, ante un 401
  (salvo en el propio login), cierra la sesión y redirige a
  `/login?reason=session-expired`.
- **Identificadores.** Son strings numéricos (`^[1-9]\d*$`).
- **Fechas.** La API usa `YYYY-MM-DD` y la interfaz `DD-MM-AAAA`. La bitácora
  asigna fecha y hora en el servidor (America/Santiago).
- **Clientes por módulo** en `shared/services/`: `identity-api`,
  `management-api`, `catalog-api`, `station-api`, `bitacora-api` y `files-api`.
  `TramitesMock` adapta las gestiones del backend al modelo de vista `Tramite`
  (a pesar del nombre, no contiene datos simulados).

## Pruebas

```bash
npm run test:ci
```

Las pruebas usan stubs de los servicios o `HttpTestingController`; no
necesitan el backend levantado. Los archivos `*.api.spec.ts` cubren los flujos
contra el contrato (cuerpos enviados, errores y avisos parciales).

## Despliegue en Cloudflare Pages

El build genera archivos estáticos en `dist/gestion-tramites/browser`.
Configuración sugerida para el proyecto de Pages:

| Ajuste                   | Valor                                                       |
| ------------------------ | ----------------------------------------------------------- |
| Build command            | `npm run build:staging` (rama de staging) o `npm run build:production` (producción) |
| Build output directory   | `dist/gestion-tramites/browser`                             |
| Variable `NODE_VERSION`  | `22`                                                        |

Como el build no incluye un `404.html` en la raíz, Cloudflare Pages sirve
`index.html` para cualquier ruta, así que recargar `/home` u otra ruta interna
funciona sin configuración adicional.

Despliegue manual con Wrangler (requiere `npx wrangler login`; ajusta el nombre
del proyecto si es distinto):

```bash
npm run build:staging
npx wrangler pages deploy dist/gestion-tramites/browser --project-name gestion-tramites --branch staging
```

```bash
npm run build:production
npx wrangler pages deploy dist/gestion-tramites/browser --project-name gestion-tramites --branch main
```

## Limitaciones conocidas

- **Archivos.** El backend todavía no tiene un servidor de almacenamiento
  configurado: la carga y la descarga responden 503. La interfaz muestra ese
  mensaje y, en el ingreso, deja el antecedente como Pendiente y lo informa.
  No requiere cambios en el frontend cuando el backend configure el adaptador.
- **Estado de estaciones.** La pantalla `estado-estaciones` es compatible con
  `GET /consultas/stations/summary`, pero no tiene ruta.
