import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
 private api = inject(ApiService);
  private router = inject(Router);

  email = 'admin@example.com';
  password = 'admin123';
  error: string | null = null;

  async onSubmit(event: Event) {
    event.preventDefault();
    this.error = null;
    this.api.loginAdmin(this.email, this.password).subscribe({
      next: () => this.router.navigateByUrl('/angular2/dashboard'),
      error: () => this.error = 'Login failed. Check HTTPS/proxy and backend path.'
    });
  }
}
