import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { UserSessionService } from "../services/user-session";

export const authGuard: CanActivateFn = () => {
  const session = inject(UserSessionService);
  const router = inject(Router);
  return session.hasValidSession() ? true : router.createUrlTree(["/login"]);
};

export const loginGuard: CanActivateFn = () => {
  const session = inject(UserSessionService);
  const router = inject(Router);
  return session.hasValidSession() ? router.createUrlTree(["/home"]) : true;
};
