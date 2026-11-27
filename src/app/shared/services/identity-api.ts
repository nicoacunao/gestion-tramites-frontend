import { Injectable } from "@angular/core";
import { Observable, shareReplay } from "rxjs";
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

  private usersCache?: Observable<BackendUser[]>;

  /**
   * Usuarios compartidos entre vistas (por ejemplo, para mostrar autores).
   * Se consulta una vez; si falla, el siguiente llamado vuelve a intentarlo.
   */
  cachedUsers(): Observable<BackendUser[]> {
    this.usersCache ??= this.users().pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.usersCache;
  }
}
