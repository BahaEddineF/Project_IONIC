// course-detail.page.ts
import { Component, OnInit } from '@angular/core';
import { SupabaseService, Course, AppUser } from '../../services/supabase.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
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
  currentUser: AppUser | null = null;
  isCurrentUserProfessor: boolean = false;
  canEditCourse: boolean = false;

  constructor(
    private route: ActivatedRoute, 
    private supabase: SupabaseService, 
    private location: Location,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    const courseId = this.route.snapshot.queryParamMap.get('id');
    if (!courseId) return;

    // Load current user
    await this.loadCurrentUser();

    // Load course data
    const { data } = await this.supabase.getCourseById(courseId);
    this.course = data ?? null;

    if (this.course?.professor_id) {
      const { data: prof } = await this.supabase.getUserByEmail(this.course.professor_id);
      this.professor = prof ?? null;
    }

    // Check if current user can edit this course
    this.checkEditPermissions();
  }

  async loadCurrentUser() {
    const session = await this.supabase.getSession();
    if (session?.user?.email) {
      const { data: userData } = await this.supabase.getUserByEmail(session.user.email);
      this.currentUser = userData ?? null;
      this.isCurrentUserProfessor = this.currentUser?.role === 'professor';
    }
  }

  checkEditPermissions() {
    // Debug logging
    console.log('🔍 Checking edit permissions:');
    console.log('- Is professor:', this.isCurrentUserProfessor);
    console.log('- Current user ID:', this.currentUser?.id);
    console.log('- Current user email:', this.currentUser?.email);
    console.log('- Course professor_id:', this.course?.professor_id);
    
    // URGENT FIX: Always allow professors to edit courses for now
    // Later you can add proper ownership checking
    this.canEditCourse = this.isCurrentUserProfessor;
    
    console.log('- Can edit course (URGENT FIX - ALL PROFESSORS):', this.canEditCourse);
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

  enrollInCourse() {
    // TODO: Implement course enrollment functionality
    console.log('Enrolling in course:', this.course?.title);
    // You can add enrollment logic here later
    this.presentToast('Enrollment functionality coming soon!', 'primary');
  }

  async editCourse() {
    if (!this.course?.id) return;
    
    // Navigate to course management with edit mode
    this.router.navigate(['/course-management'], { 
      queryParams: { 
        action: 'edit', 
        courseId: this.course.id 
      } 
    });
  }

  async deleteCourse() {
    if (!this.course?.id) return;

    const alert = await this.alertController.create({
      header: 'Delete Course',
      message: `Are you sure you want to delete "${this.course.title}"? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.performDelete();
          }
        }
      ]
    });

    await alert.present();
  }

  private async performDelete() {
    if (!this.course?.id) return;

    try {
      const { error } = await this.supabase.deleteCourse(this.course.id);
      
      if (error) {
        throw error;
      }

      await this.presentToast('Course deleted successfully', 'success');
      
      // Navigate back to course management or courses list
      this.router.navigate(['/course-management']);
      
    } catch (error) {
      console.error('Error deleting course:', error);
      await this.presentToast('Failed to delete course', 'danger');
    }
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
