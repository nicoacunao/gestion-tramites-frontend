import { Injectable } from "@angular/core";
import { ApiBaseService } from "./api-base";
import { BackendUser, LoginResponse } from "./api-models";

/** Ruta de login; el interceptor no la trata como sesión vencida cuando responde 401. */
export const LOGIN_PATH = "/identidad/login";

@Injectable({ providedIn: "root" })
export class IdentityApiService extends ApiBaseService {
  login(rut: string, password: string) {
    return this.post<LoginResponse>(LOGIN_PATH, { rut, password });
  }

  profile() {
    return this.get<BackendUser>("/identidad/profile");
  }

  updateProfile(body: object) {
    return this.put<BackendUser>("/identidad/profile", body);
  }

  users() {
    return this.get<BackendUser[]>("/identidad/users");
  }
}
