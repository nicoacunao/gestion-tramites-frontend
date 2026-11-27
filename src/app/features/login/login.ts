import { CommonModule } from "@angular/common";
import { Component, DestroyRef, EventEmitter, inject, Output } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ButtonDirective, ButtonLabel } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { PasswordModule } from "primeng/password";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { ApiClientError } from "../../shared/services/api-base";
import { IdentityApiService } from "../../shared/services/identity-api";
import { UserSessionService } from "../../shared/services/user-session";

export interface LoginCredentials {
  rut: string;
  password: string;
}

const MENSAJE_SESION_EXPIRADA = "Tu sesión expiró. Ingresa nuevamente para continuar.";
const MENSAJE_ERROR_LOGIN = "No fue posible iniciar sesión. Inténtalo nuevamente.";

function limpiarRut(value: string): string {
  return value.replace(/[^0-9kK]/g, "").toUpperCase();
}

function validarRut(control: AbstractControl<string>): ValidationErrors | null {
  const rut = limpiarRut(control.value);

  if (!rut) {
    return null;
  }

  if (!/^\d{7,8}[0-9K]$/.test(rut)) {
    return { rutInvalido: true };
  }

  const cuerpo = rut.slice(0, -1);
  const digitoVerificador = rut.slice(-1);
  let suma = 0;
  let multiplicador = 2;

  for (let indice = cuerpo.length - 1; indice >= 0; indice -= 1) {
    suma += Number(cuerpo[indice]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resultado = 11 - (suma % 11);
  const digitoEsperado =
    resultado === 11 ? "0" : resultado === 10 ? "K" : String(resultado);

  return digitoVerificador === digitoEsperado ? null : { rutInvalido: true };
}

@Component({
  selector: "app-login",
  standalone: true,
  imports: [
    ButtonDirective,
    ButtonLabel,
    CommonModule,
    InputTextModule,
    PasswordModule,
    ProgressSpinnerModule,
    ReactiveFormsModule,
  ],
  templateUrl: "./login.html",
  styleUrl: "./login.scss",
})
export class Login {
  @Output() readonly submitted = new EventEmitter<LoginCredentials>();

  readonly form = new FormGroup({
    rut: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, validarRut],
    }),
    password: new FormControl("", {
      nonNullable: true,
      // El backend acepta contraseñas de hasta 200 caracteres.
      validators: [Validators.required, Validators.maxLength(200)],
    }),
  });

  loading = false;
  errorMessage = "";
  sessionNotice = "";

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly router: Router,
    private readonly api: IdentityApiService,
    private readonly userSession: UserSessionService,
    route: ActivatedRoute,
  ) {
    if (route.snapshot.queryParamMap.get("reason") === "session-expired") {
      this.sessionNotice = MENSAJE_SESION_EXPIRADA;
    }

    // Un error anterior deja de ser relevante en cuanto se corrigen las credenciales.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.errorMessage = "";
    });
  }

  formatRut(event: Event): void {
    const input = event.target as HTMLInputElement;
    const rut = limpiarRut(input.value).slice(0, 9);

    if (rut.length < 2) {
      this.form.controls.rut.setValue(rut, { emitEvent: false });
      input.value = rut;
      return;
    }

    const cuerpo = rut.slice(0, -1);
    const digitoVerificador = rut.slice(-1);
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const rutFormateado = `${cuerpoFormateado}-${digitoVerificador}`;

    this.form.controls.rut.setValue(rutFormateado, { emitEvent: false });
    input.value = rutFormateado;
  }

  submit(): void {
    if (this.loading) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const credentials = this.form.getRawValue();
    this.loading = true;
    this.errorMessage = "";
    this.sessionNotice = "";
    this.api.login(limpiarRut(credentials.rut), credentials.password).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: ({ accessToken, expiresAt, user }) => {
        this.userSession.setSession(accessToken, expiresAt, user);
        this.submitted.emit({ rut: limpiarRut(credentials.rut), password: credentials.password });
        this.loading = false;
        void this.router.navigate(["/home"]);
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = error instanceof ApiClientError ? error.message : MENSAJE_ERROR_LOGIN;
      },
    });
  }
}
