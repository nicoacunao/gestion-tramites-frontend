import { Component, Input } from "@angular/core";
import { ButtonDirective } from "primeng/button";
import { InfoCircleIcon } from "primeng/icons/infocircle";
import { PopoverModule } from "primeng/popover";

@Component({
  selector: "app-gestion-alcance-info",
  standalone: true,
  imports: [ButtonDirective, InfoCircleIcon, PopoverModule],
  templateUrl: "./gestion-alcance-info.html",
  styleUrl: "./gestion-alcance-info.scss",
})
export class GestionAlcanceInfo {
  @Input({ required: true }) titulo = "";
  @Input({ required: true }) texto = "";
  @Input({ required: true }) ariaLabel = "";
}
