import { Injectable, signal } from "@angular/core";

export interface ConnectedUser {
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

  updateProfile(profile: EditableUserProfile): void {
    const fullName = profile.fullName.trim();

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

  private createInitials(fullName: string): string {
    return fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }
}
