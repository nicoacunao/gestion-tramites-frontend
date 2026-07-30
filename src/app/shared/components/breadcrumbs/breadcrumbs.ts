import { Component, Input } from "@angular/core";
import { MenuItem } from "primeng/api";
import { BreadcrumbModule } from "primeng/breadcrumb";

export interface BreadcrumbItem {
  label: string;
  routerLink?: MenuItem["routerLink"];
  route?: MenuItem["routerLink"];
}

@Component({
  selector: "app-breadcrumbs",
  standalone: true,
  imports: [BreadcrumbModule],
  templateUrl: "./breadcrumbs.html",
  styleUrl: "./breadcrumbs.scss",
})
export class Breadcrumbs {
  home: MenuItem | undefined;
  model: MenuItem[] = [];

  @Input()
  set items(items: BreadcrumbItem[]) {
    const [home, ...model] = items;

    this.home = home ? this.toMenuItem(home) : undefined;
    this.model = model.map((item) => this.toMenuItem(item));
  }

  private toMenuItem(item: BreadcrumbItem): MenuItem {
    return {
      label: item.label,
      routerLink: item.routerLink ?? item.route,
    };
  }
}
