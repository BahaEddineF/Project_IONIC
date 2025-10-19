// courses.page.ts
import { Component, OnInit } from '@angular/core';
import { SupabaseService, Course } from '../../services/supabase.service';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-courses',
  templateUrl: './courses.page.html',
  styleUrls: ['./courses.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class CoursesPage implements OnInit {
  courses: Course[] = [];

  constructor(private supabase: SupabaseService, private router: Router) {}

  async ngOnInit() {
    const { data } = await this.supabase.getCourses();
    this.courses = data ?? [];
  }

  viewCourse(courseId: string) {
    this.router.navigate(['/course-detail'], { queryParams: { id: courseId } });
  }
}
