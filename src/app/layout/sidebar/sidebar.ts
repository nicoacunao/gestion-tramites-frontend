import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar',
  imports: [
    MatButtonModule,
    MatIconModule,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent {
  isCollapsed = false;

  readonly menuItems = [
    {
      label: 'Listado de trámites',
      icon: 'assignment',
      route: '/tramites',
      exact: true
    },
    {
      label: 'Nuevo trámite',
      icon: 'add_circle',
      route: '/tramites/nuevo',
      exact: false
    },
    {
      label: 'Estado estaciones',
      icon: 'monitor_heart',
      route: '/tramites/estado-estaciones',
      exact: false
    }
  ];

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}
