import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";
import { environment } from "../../../environments/environment";
import { LOGIN_PATH } from "../services/identity-api";
import { ACCESS_TOKEN_KEY, EXPIRES_AT_KEY, USER_KEY } from "../services/user-session";

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const token = typeof localStorage === "undefined" ? null : localStorage.getItem(ACCESS_TOKEN_KEY);
  const isMultipart = typeof FormData !== "undefined" && request.body instanceof FormData;
  const isLoginRequest = request.url.startsWith(`${environment.apiUrl}${LOGIN_PATH}`);
  let nextRequest = request;

  if (isMultipart) {
    // Never send application/json for FormData. The browser adds the boundary
    // required by the multipart parser when Content-Type is left unset.
    nextRequest = nextRequest.clone({ headers: nextRequest.headers.delete("Content-Type") });
  }

  if (token && !isLoginRequest) {
    nextRequest = nextRequest.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(nextRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      // Un 401 del login significa credenciales inválidas, no una sesión vencida:
      // lo resuelve la pantalla de acceso con el mensaje del servidor.
      if (error.status === 401 && !isLoginRequest) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(EXPIRES_AT_KEY);
        localStorage.removeItem(USER_KEY);
        if (!router.url.startsWith("/login")) {
          void router.navigate(["/login"], { queryParams: { reason: "session-expired" } });
        }
      }
      return throwError(() => error);
    }),
  );
};
