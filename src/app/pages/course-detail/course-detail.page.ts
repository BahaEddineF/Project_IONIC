// course-detail.page.ts
import { Component, OnInit } from '@angular/core';
import { SupabaseService, Course, AppUser } from '../../services/supabase.service';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-course-detail',
  templateUrl: './course-detail.page.html',
  styleUrls: ['./course-detail.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class CourseDetailPage implements OnInit {
  course: Course | null = null;
  professor: AppUser | null = null;

  constructor(private route: ActivatedRoute, private supabase: SupabaseService) {}

  async ngOnInit() {
    const courseId = this.route.snapshot.queryParamMap.get('id');
    if (!courseId) return;

    const { data } = await this.supabase.getCourseById(courseId);
    this.course = data ?? null;

    if (this.course?.professor_id) {
      const { data: prof } = await this.supabase.getUserByEmail(this.course.professor_id);
      this.professor = prof ?? null;
    }
  }
}
