import { Component } from '@angular/core';
import { SupabaseService, AppUser } from '../../services/supabase.service';
import { Router } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-professor-dashboard',
  templateUrl: './professor-dashboard.page.html',
  styleUrls: ['./professor-dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class ProfessorDashboardPage {
  professor: AppUser | null = null;
  avatarUrl: string | null = 'assets/default-avatar-prof.png';

  constructor(private supabase: SupabaseService, private router: Router, private location: Location) {}

  async ionViewWillEnter() {
    const session = await this.supabase.getSession();
    if (!session?.user?.email) {
      this.router.navigate(['/login']);
      return;
    }

    const email = session.user.email;
    const { data: userData, error } = await this.supabase.getUserByEmail(email);
    if (error || !userData) return;

    this.professor = userData;
    this.avatarUrl = userData.avatar_url || 'assets/default-avatar-prof.png';
  }

  goBack() { this.location.back(); }
  goToProfile() { this.router.navigate(['/profile']); }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
