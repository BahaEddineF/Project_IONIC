// professor-dashboard.page.ts
import { Component, OnInit } from '@angular/core';
import { SupabaseService, AppUser, Course } from '../../services/supabase.service';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-professor-dashboard',
  templateUrl: './professor-dashboard.page.html',
  styleUrls: ['./professor-dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule]
})
export class ProfessorDashboardPage implements OnInit {
  profile: AppUser | null = null;
  courses: Course[] = [];
  courseForm: FormGroup;
  editingCourseId: string | null = null;

  constructor(private supabase: SupabaseService, private router: Router, private fb: FormBuilder) {
    this.courseForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      category: ['']
    });
  }

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
    if (!data) return;
    this.courses = data.filter(c => c.professor_id === this.profile?.id);
  }

  async addOrUpdateCourse() {
    if (this.courseForm.invalid) return;

    const { title, description, category } = this.courseForm.value;
    const course: Course = {
      title,
      description,
      category,
      professor_id: this.profile?.id
    };

    if (this.editingCourseId) {
      await this.supabase.updateCourse(this.editingCourseId, course);
      this.editingCourseId = null;
    } else {
      await this.supabase.addCourse(course);
    }

    this.courseForm.reset();
    await this.loadCourses();
  }

  editCourse(course: Course) {
    this.editingCourseId = course.id ?? null;
    this.courseForm.patchValue(course);
  }

  async deleteCourse(id: string) {
    if (!confirm('Delete this course?')) return;
    await this.supabase.deleteCourse(id);
    await this.loadCourses();
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
