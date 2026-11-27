import { Injectable, Optional, signal } from "@angular/core";
import { BackendUser } from "./api-models";
import { IdentityApiService } from "./identity-api";

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
}

export interface EditableUserProfile {
  fullName: string;
  email: string;
  phone: string;
  description: string;
}

export const ACCESS_TOKEN_KEY = "gestion-tramites.access-token";
export const USER_KEY = "gestion-tramites.user";
export const EXPIRES_AT_KEY = "gestion-tramites.expires-at";

@Injectable({ providedIn: "root" })
export class UserSessionService {
  private readonly userState = signal<ConnectedUser>({
    firstName: "",
    fullName: "",
    initials: "",
    role: "",
    description: "",
    email: "",
    phone: "",
    rut: "",
    organization: "",
  });

  readonly currentUser = this.userState.asReadonly();

  constructor(@Optional() private readonly api: IdentityApiService | null = null) {
    if (!this.hasValidSession()) {
      this.clearSession();
      return;
    }

    const stored = typeof localStorage === "undefined" ? null : localStorage.getItem(USER_KEY);
    if (stored) {
      try { this.userState.set(this.toConnectedUser(JSON.parse(stored) as BackendUser)); } catch { /* ignore invalid local cache */ }
    }
    this.refreshProfile();
  }

  hasValidSession(): boolean {
    if (typeof localStorage === "undefined") return false;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const expiresAt = Date.parse(localStorage.getItem(EXPIRES_AT_KEY) ?? "");
    return Boolean(token && Number.isFinite(expiresAt) && expiresAt > Date.now());
  }

  setSession(accessToken: string, expiresAt: string, user: BackendUser): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(EXPIRES_AT_KEY, expiresAt);
    this.setUser(user);
    // El login solo entrega datos básicos; teléfono, descripción y organización
    // vienen del perfil completo.
    this.refreshProfile();
  }

  /** Completa los datos del usuario con `GET /identidad/profile`. */
  refreshProfile(): void {
    if (!this.hasValidSession()) return;
    this.api?.profile().subscribe({
      next: (user) => {
        // La respuesta puede llegar después de cerrar sesión: no restaurar datos.
        if (this.hasValidSession()) this.setUser(user);
      },
      // Se conservan los datos del login; un 401 lo resuelve el interceptor.
      error: () => undefined,
    });
  }

  clearSession(): void {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    this.userState.set({ firstName: "", fullName: "", initials: "", role: "", description: "", email: "", phone: "", rut: "", organization: "" });
  }

  updateProfile(profile: EditableUserProfile): void {
    const fullName = profile.fullName.trim();

    this.api?.updateProfile({
      names: fullName.split(/\s+/)[0] ?? fullName,
      firstSurname: fullName.split(/\s+/).slice(1).join(" ") || fullName,
      secondSurname: null,
      email: profile.email.trim().toLowerCase(),
      phone: profile.phone.trim(),
      description: profile.description.trim(),
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
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private toConnectedUser(user: BackendUser): ConnectedUser {
    const fullName = [user.names, user.firstSurname, user.secondSurname].filter(Boolean).join(" ");
    return { id: user.id, firstName: user.names, fullName, initials: this.createInitials(fullName), role: user.role, description: user.description ?? "", email: user.email, phone: user.phone ?? "", rut: user.rut, organization: user.organization ?? "" };
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
