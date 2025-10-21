import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService, Me } from './api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {

  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  me: Me | null = null;
  error: string | null = null;
  showAdminHeader: boolean = false;

  ngOnInit() {
    console.log('HomeComponent initialized');
    // load the session info
    this.api.getMe().subscribe({
      next: (data: Me) => {
        this.me = data;
        const fromAdmin = this.route.snapshot.queryParamMap.get('from') === 'admin';
        this.showAdminHeader = fromAdmin && data.authenticated && data.role === 'admin';
      },
      error: (err) => {
        this.error = err.message + ' Failed to load session info.';
      }
    });
  }

  doLogout() {
    this.api.logout().subscribe({
      next: () => { window.location.href = '/'; },
      error: (err) => { this.error = err.message + ' Logout failed.'; }
    });
  }
}
