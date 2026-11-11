import { HttpInterceptorFn } from "@angular/common/http";

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = typeof localStorage === "undefined" ? null : localStorage.getItem("gestion-tramites.access-token");
  const isMultipart = typeof FormData !== "undefined" && request.body instanceof FormData;
  let nextRequest = request;

  if (isMultipart) {
    // Never send application/json for FormData. The browser adds the boundary
    // required by the multipart parser when Content-Type is left unset.
    nextRequest = nextRequest.clone({ headers: nextRequest.headers.delete("Content-Type") });
  }

  return next(token ? nextRequest.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : nextRequest);
};
