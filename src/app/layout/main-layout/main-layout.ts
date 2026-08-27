import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { HeaderComponent } from "../header/header";
import { MenuComponent } from "../menu/menu";

@Component({
  selector: "app-main-layout",
  imports: [RouterOutlet, HeaderComponent, MenuComponent],
  templateUrl: "./main-layout.html",
  styleUrl: "./main-layout.scss",
})
export class MainLayoutComponent {}
