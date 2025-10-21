// courses.page.ts
import { Component, OnInit } from '@angular/core';
import { SupabaseService, Course } from '../../services/supabase.service';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
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

  constructor(private supabase: SupabaseService, private router: Router, private location: Location) {}

  async ngOnInit() {
    const { data } = await this.supabase.getCourses();
    this.courses = data ?? [];
  }

  viewCourse(courseId: string) {
    this.router.navigate(['/course-detail'], { queryParams: { id: courseId } });
  }

  getCourseIcon(category: string): string {
    const iconMap: { [key: string]: string } = {
      'mathematics': 'calculator-outline',
      'physics': 'atom-outline',
      'chemistry': 'flask-outline',
      'biology': 'leaf-outline',
      'computer-science': 'laptop-outline',
      'literature': 'book-outline',
      'history': 'library-outline',
      'geography': 'earth-outline',
      'languages': 'language-outline',
      'arts': 'brush-outline'
    };
    return iconMap[category] || 'school-outline';
  }

  goBack() {
    this.location.back();
  }
}
