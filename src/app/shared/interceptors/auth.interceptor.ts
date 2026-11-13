import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const token = typeof localStorage === "undefined" ? null : localStorage.getItem("gestion-tramites.access-token");
  const isMultipart = typeof FormData !== "undefined" && request.body instanceof FormData;
  let nextRequest = request;

  if (isMultipart) {
    // Never send application/json for FormData. The browser adds the boundary
    // required by the multipart parser when Content-Type is left unset.
    nextRequest = nextRequest.clone({ headers: nextRequest.headers.delete("Content-Type") });
  }

  return next(token ? nextRequest.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : nextRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.removeItem("gestion-tramites.access-token");
        localStorage.removeItem("gestion-tramites.expires-at");
        localStorage.removeItem("gestion-tramites.user");
        void router.navigate(["/login"], { queryParams: { reason: "session-expired" } });
      }
      return throwError(() => error);
    }),
  );
};
