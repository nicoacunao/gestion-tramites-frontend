import { Injectable } from "@angular/core";
import { map } from "rxjs";
import { ApiBaseService } from "./api-base";
import { BackendUser, LoginResponse } from "./api-models";

@Injectable({ providedIn: "root" })
export class IdentityApiService extends ApiBaseService {
  login(rut: string, password: string) {
    return this.request<{ data: LoginResponse }>("/identidad/login", {
      method: "post",
      body: { rut, password },
    }).pipe(map(({ data }) => data));
  }

  profile() {
    return this.get<BackendUser>("/identidad/profile");
  }

  updateProfile(body: object) {
    return this.request<{ data: BackendUser }>("/identidad/profile", {
      method: "put",
      body,
    }).pipe(map(({ data }) => data));
  }

  users() {
    return this.get<BackendUser[]>("/identidad/users");
  }
}
