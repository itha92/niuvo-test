import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type Me = { authenticated: boolean; name?: string , role?: string, sub?: string};

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  
  getMe() {
    return this.http.get<Me>('/api/auth/me', {withCredentials: true});
  }

  logout() {
    return this.http.post<{ ok: boolean }>('/api/auth/logout', null, {withCredentials: true});
  }
  constructor() { }
}
