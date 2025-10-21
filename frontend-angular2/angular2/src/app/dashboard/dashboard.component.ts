import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AdminApp, ApiService, Me } from '../api.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
private api = inject(ApiService);

  me: Me | null = null;
  apps: AdminApp[] = [];
  error: string | null = null;

  ngOnInit(): void {
    // Ensure we are authenticated (and likely admin)
    this.api.me().subscribe({
      next: (data) => this.me = data,
      error: () => this.error = 'Failed to load session.'
    });

    // Load list for dashboard
    this.api.listApplications().subscribe({
      next: (data) => this.apps = data,
      error: (e) => this.error = e.status === 403 ? 'Forbidden (admin only).' : 'Failed to load applications.'
    });
  }

  linkToAngular1(i: number) {
    // Deep link into Angular1 and preserve context
    return `/angular1/?from=admin&idx=${i}`;
  }

  doLogout() {
    this.api.logout().subscribe({
      next: () => (window.location.href = '/'),
      error: () => (this.error = 'Logout failed')
    });
  }
}
