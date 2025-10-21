import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type Me = { authenticated: boolean; name?: string; role?: string; sub?: string };
export type AdminApp = { id: string; applicant: string; status: string };

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  loginAdmin(email: string, password: string) {
    const body = new URLSearchParams({ email, password }).toString();
    return this.http.post<{ ok: boolean }>(
      '/api/auth/login/admin',
      body,
      {
        withCredentials: true,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
  }

  me() {
    return this.http.get<Me>('/api/auth/me', { withCredentials: true });
  }

  listApplications() {
    return this.http.get<AdminApp[]>('/api/admin/applications', { withCredentials: true });
  }

  logout() {
    return this.http.post<{ ok: boolean }>('/api/auth/logout', null, { withCredentials: true });
  }
}
