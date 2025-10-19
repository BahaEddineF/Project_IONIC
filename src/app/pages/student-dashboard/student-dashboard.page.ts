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
  }

  async loadCourses() {
    const { data } = await this.supabase.getCourses();
    this.courses = data ?? [];
  }

  viewCourse(courseId: string) {
    this.router.navigate(['/course-detail'], { queryParams: { id: courseId } });
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
