// course-management.page.ts
import { Component, OnInit } from '@angular/core';
import { SupabaseService, Course } from '../../services/supabase.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-course-management',
  templateUrl: './course-management.page.html',
  styleUrls: ['./course-management.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule]
})
export class CourseManagementPage implements OnInit {
  courses: Course[] = [];
  courseForm: FormGroup;
  editingCourseId: string | null = null;

  constructor(private supabase: SupabaseService, private fb: FormBuilder) {
    this.courseForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      category: ['']
    });
  }

  async ngOnInit() {
    await this.loadCourses();
  }

  async loadCourses() {
    const { data } = await this.supabase.getCourses();
    this.courses = data ?? [];
  }

  async addOrUpdateCourse() {
    if (this.courseForm.invalid) return;
    const { title, description, category } = this.courseForm.value;
    const course: Course = { title, description, category };

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
    await this.supabase.deleteCourse(id);
    await this.loadCourses();
  }
}
