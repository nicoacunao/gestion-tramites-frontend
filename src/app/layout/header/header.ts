import { Component, inject } from "@angular/core";
import { Router } from "@angular/router";
import { UserSessionService } from "../../shared/services/user-session";

@Component({
  selector: "app-header",
  templateUrl: "./header.html",
  styleUrl: "./header.scss",
})
export class HeaderComponent {
  private readonly router = inject(Router);
  private readonly userSession = inject(UserSessionService);

  readonly user = this.userSession.currentUser;

  signOut(): void {
    void this.router.navigate(["/login"]);
  }
}
