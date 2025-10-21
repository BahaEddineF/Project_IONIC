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
  avatarUrl: string | null = null;

  constructor(private supabase: SupabaseService, private router: Router, private location: Location) {}

  async ionViewWillEnter() {
    await this.loadProfessorData();
  }

  private async loadProfessorData() {
    const session = await this.supabase.getSession();
    if (!session?.user?.email) {
      this.router.navigate(['/login']);
      return;
    }

    const email = session.user.email;
    const { data: userData, error } = await this.supabase.getUserByEmail(email);
    if (error || !userData) return;

    this.professor = userData;
    
    // Set avatar URL with fallback to default
    if (userData.avatar_url) {
      this.avatarUrl = userData.avatar_url;
    } else {
      this.avatarUrl = userData.role === 'professor' ? 
        'assets/default-avatar-prof.png' : 
        'assets/default-avatar.png';
    }
  }

  getProfessorFirstName(): string {
    if (!this.professor?.full_name) {
      return 'Professor';
    }
    return this.professor.full_name.split(' ')[0] || 'Professor';
  }

  // Course Management Actions
  manageCourses() {
    console.log('Navigate to manage courses page');
    this.router.navigate(['/course-management']);
  }

  viewStudents() {
    console.log('Navigate to students view');
    // For now, navigate to course management - you can create a separate students page later
    this.router.navigate(['/course-management'], { queryParams: { view: 'students' } });
  }

  // Quick Actions
  goToProfile() { 
    this.router.navigate(['/profile']); 
  }

  viewAllCourses() {
    this.router.navigate(['/courses']);
  }



  goBack() { 
    this.location.back(); 
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
