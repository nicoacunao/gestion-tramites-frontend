import { Injectable, Optional, signal } from "@angular/core";
import { ApiClient, BackendUser } from "./api-client";

export interface ConnectedUser {
  id?: string;
  firstName: string;
  fullName: string;
  initials: string;
  role: string;
  description: string;
  email: string;
  phone: string;
  rut: string;
  organization: string;
  version?: number;
}

export interface EditableUserProfile {
  fullName: string;
  email: string;
  phone: string;
  description: string;
}

@Injectable({ providedIn: "root" })
export class UserSessionService {
  private readonly userState = signal<ConnectedUser>({
    firstName: "Jose Luis",
    fullName: "Jose Luis Rozas",
    initials: "JL",
    role: "Gestor de trámites",
    description: "Administración y seguimiento de gestiones municipales",
    email: "jlrozas.a@gmail.com",
    phone: "+56 9 9999 9999",
    rut: "11.111.111-1",
    organization: "",
  });

  readonly currentUser = this.userState.asReadonly();

  constructor(@Optional() private readonly api: ApiClient | null = null) {
    const stored = typeof localStorage === "undefined" ? null : localStorage.getItem("gestion-tramites.user");
    if (stored) {
      try { this.userState.set(this.toConnectedUser(JSON.parse(stored) as BackendUser)); } catch { /* ignore invalid local cache */ }
    }
    if (typeof localStorage !== "undefined" && localStorage.getItem("gestion-tramites.access-token")) {
      this.api?.profile().subscribe({ next: (user) => this.setUser(user) });
    }
  }

  updateProfile(profile: EditableUserProfile): void {
    const fullName = profile.fullName.trim();

    const current = this.userState();
    this.api?.updateProfile({
      names: fullName.split(/\s+/)[0] ?? fullName,
      firstSurname: fullName.split(/\s+/).slice(1).join(" ") || fullName,
      secondSurname: null,
      email: profile.email.trim().toLowerCase(),
      phone: profile.phone.trim(),
      description: profile.description.trim(),
      version: current.version ?? 0,
    }).subscribe({ next: (user) => this.setUser(user), error: () => undefined });
    this.userState.update((user) => ({
      ...user,
      firstName: fullName.split(/\s+/)[0],
      fullName,
      initials: this.createInitials(fullName),
      email: profile.email.trim().toLowerCase(),
      phone: profile.phone.trim(),
      description: profile.description.trim(),
    }));
  }

  private setUser(user: BackendUser): void {
    const connected = this.toConnectedUser(user);
    this.userState.set(connected);
    localStorage.setItem("gestion-tramites.user", JSON.stringify(user));
  }

  private toConnectedUser(user: BackendUser): ConnectedUser {
    const fullName = [user.names, user.firstSurname, user.secondSurname].filter(Boolean).join(" ");
    return { id: user.id, firstName: user.names, fullName, initials: this.createInitials(fullName), role: user.role, description: user.description ?? "", email: user.email, phone: user.phone ?? "", rut: user.rut, organization: user.organization ?? "", version: user.version };
  }

  private createInitials(fullName: string): string {
    return fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }
}
