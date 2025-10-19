import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
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
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    specialty?: string;
  } | null = null;

  courses: {
    id: string;
    title: string;
    description: string;
    professor_id?: string;
  }[] = [];

  constructor(private supabase: SupabaseService, private router: Router) {}

  async ngOnInit() {
    try {
      // Get current session
      const { data: sessionData } = await this.supabase.supabase.auth.getSession();
      const email = sessionData?.session?.user?.email;

      if (!email) {
        this.router.navigate(['/login']);
        return;
      }

      // Get user info
      const { data: userData, error: userError } = await this.supabase.getUserByEmail(email);
      if (userError || !userData) {
        console.error(userError);
        this.router.navigate(['/login']);
        return;
      }
      this.user = userData;

      // Get courses
      const { data: coursesData, error: coursesError } = await this.supabase.getCourses();
      if (coursesError) {
        console.error(coursesError);
        return;
      }
      this.courses = coursesData || [];
    } catch (err) {
      console.error(err);
    }
  }

  viewCourse(courseId: string) {
    this.router.navigate(['/course-detail', courseId]);
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
