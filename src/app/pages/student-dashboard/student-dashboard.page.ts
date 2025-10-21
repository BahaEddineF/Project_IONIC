// student-dashboard.page.ts
import { Component, OnInit } from '@angular/core';
import { SupabaseService, AppUser, Course } from '../../services/supabase.service';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.page.html',
  styleUrls: ['./student-dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class StudentDashboardPage implements OnInit {
  profile: AppUser | null = null;
  courses: Course[] = [];
  avatarUrl: string | null = null;

  constructor(private supabase: SupabaseService, private router: Router) {}

  async ngOnInit() {
    await this.loadProfile();
    await this.loadCourses();
  }

  async loadProfile() {
    const session = await this.supabase.getSession();
    if (!session?.user?.email) return;

    const { data } = await this.supabase.getUserByEmail(session.user.email);
    this.profile = data ?? null;
    
    if (this.profile) {
      this.avatarUrl = this.profile.avatar_url || 'assets/default-avatar.png';
    }
  }

  async loadCourses() {
    const { data } = await this.supabase.getCourses();
    this.courses = data ?? [];
  }

  getFirstName(): string {
    if (!this.profile?.full_name) {
      return 'Student';
    }
    return this.profile.full_name.split(' ')[0] || 'Student';
  }

  viewCourse(courseId: string) {
    this.router.navigate(['/course-detail'], { queryParams: { id: courseId } });
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  viewAllCourses() {
    this.router.navigate(['/courses']);
  }

  goToSettings() {
    // For now, just navigate to profile - you can create a settings page later
    this.router.navigate(['/profile']);
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
