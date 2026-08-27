import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Output } from "@angular/core";
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { Router } from "@angular/router";
import { ButtonDirective, ButtonLabel } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { PasswordModule } from "primeng/password";

export interface LoginCredentials {
  rut: string;
  password: string;
}

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
      validators: [Validators.required],
    }),
  });

  constructor(private readonly router: Router) {}

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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const credentials = this.form.getRawValue();

    this.submitted.emit({
      rut: limpiarRut(credentials.rut),
      password: credentials.password,
    });

    void this.router.navigate(["/home"]);
  }
}
