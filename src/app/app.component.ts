import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './services/supabase.service';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonicModule],  // <- Required for ion-app, ion-router-outlet
})
export class AppComponent implements OnInit {

  constructor(private supabase: SupabaseService, private router: Router) {}

  ngOnInit() {
    this.handleAuthRedirect();
  }

  async handleAuthRedirect() {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        await this.supabase.supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        // Remove tokens from URL
        window.history.replaceState({}, document.title, window.location.pathname);

        // Navigate to your dashboard or home page
        this.router.navigate(['/dashboard']);
      }
    } else {
      const session = await this.supabase.getSession();
      if (session) this.router.navigate(['/dashboard']);
      else this.router.navigate(['/login']);
    }
  }
}
