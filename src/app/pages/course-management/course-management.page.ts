import { Component, OnInit } from '@angular/core';
import { SupabaseService, Course } from '../../services/supabase.service';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

interface CourseWithDetails extends Course {
  enrolled?: number;
}

@Component({
  selector: 'app-course-management',
  templateUrl: './course-management.page.html',
  styleUrls: ['./course-management.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule]
})
export class CourseManagementPage implements OnInit {
  courses: CourseWithDetails[] = [];
  courseForm: FormGroup;
  editingCourseId: string | null = null;

  constructor(
    private supabase: SupabaseService, 
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    this.courseForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      category: [''] // Made optional since it might not exist in database
    });
  }

  async ngOnInit() {
    // Test database connection first
    await this.supabase.testDatabaseConnection();
    
    await this.loadCourses();
    
    // Check if we're editing a specific course
    this.checkForEditMode();
  }

  checkForEditMode() {
    const action = this.route.snapshot.queryParams['action'];
    const courseId = this.route.snapshot.queryParams['courseId'];
    
    if (action === 'edit' && courseId) {
      this.loadCourseForEdit(courseId);
    }
  }

  async loadCourseForEdit(courseId: string) {
    try {
      const { data: courseData } = await this.supabase.getCourseById(courseId);
      if (courseData) {
        this.editingCourseId = courseData.id || null;
        this.courseForm.patchValue({
          title: courseData.title,
          description: courseData.description,
          category: courseData.category
        });
        
        // Scroll to form
        setTimeout(() => {
          const formElement = document.querySelector('.course-form');
          formElement?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        
        this.presentToast('Course loaded for editing', 'primary');
      }
    } catch (error) {
      console.error('Error loading course for edit:', error);
      this.presentToast('Error loading course', 'danger');
    }
  }

  async loadCourses() {
    try {
      // Get current user to filter courses by professor
      const session = await this.supabase.getSession();
      if (!session?.user?.email) {
        this.presentToast('You must be logged in', 'warning');
        return;
      }

      const { data: userData } = await this.supabase.getUserByEmail(session.user.email);
      if (!userData) {
        this.presentToast('User not found', 'danger');
        return;
      }

      // Load only courses created by this professor
      const { data } = await this.supabase.getCourses(userData.email);
      this.courses = (data ?? []).map(course => ({
        ...course,
        enrolled: Math.floor(Math.random() * 50) // Mock enrollment data
      }));
      
      console.log('Loaded courses for professor:', userData.full_name, this.courses);
    } catch (error) {
      console.error('Error loading courses:', error);
      this.presentToast('Error loading courses', 'danger');
    }
  }

  async addCourse() {
    console.log('🚀 Add course button clicked');
    console.log('📋 Form valid:', this.courseForm.valid);
    console.log('📝 Form data:', this.courseForm.value);
    
    if (this.courseForm.invalid) {
      console.log('❌ Form is invalid');
      this.presentToast('Please fill all required fields correctly', 'warning');
      return;
    }

    try {
      const formData = this.courseForm.value;
      console.log('📊 Form data:', formData);
      
      // Get current user session to add professor_id
      const session = await this.supabase.getSession();
      console.log('🔐 Session:', session?.user?.email);
      
      if (!session?.user?.email) {
        console.log('❌ No session found');
        this.presentToast('You must be logged in to add courses', 'warning');
        return;
      }

      const { data: userData } = await this.supabase.getUserByEmail(session.user.email);
      console.log('👤 User data:', userData);
      
      if (!userData) {
        console.log('❌ No user data found');
        this.presentToast('User not found', 'danger');
        return;
      }
      
      if (userData.role !== 'professor') {
        console.log('❌ User is not a professor:', userData.role);
        this.presentToast('Only professors can add courses', 'warning');
        return;
      }

      // Start with only the fields that definitely exist in your database
      const course: any = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        professor_id: userData.email // Use the professor's EMAIL for consistency
      };

      console.log('Course object with professor:', course);

      console.log('Adding course:', course);

      const { error } = await this.supabase.addCourse(course);
      
      if (error) {
        throw error;
      }

      this.courseForm.reset();
      await this.loadCourses();
      this.presentToast('Course added successfully!', 'success');
    } catch (error) {
      console.error('Error adding course:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? (error as any).message 
        : 'Unknown error occurred';
      this.presentToast(`Error adding course: ${errorMessage}`, 'danger');
    }
  }

  async editCourse(course: CourseWithDetails) {
    this.courseForm.patchValue({
      title: course.title,
      description: course.description,
      category: course.category
    });

    // Scroll to form
    const formElement = document.querySelector('.course-form');
    formElement?.scrollIntoView({ behavior: 'smooth' });
    
    this.editingCourseId = course.id ?? null;
    this.presentToast('Course loaded for editing', 'primary');
  }

  async updateCourse() {
    if (!this.editingCourseId || this.courseForm.invalid) return;

    try {
      const formData = this.courseForm.value;
      const course: Course = {
        title: formData.title,
        description: formData.description,
        category: formData.category
      };

      const { error } = await this.supabase.updateCourse(this.editingCourseId, course);
      
      if (error) {
        throw error;
      }

      this.courseForm.reset();
      this.editingCourseId = null;
      await this.loadCourses();
      this.presentToast('Course updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating course:', error);
      this.presentToast('Error updating course', 'danger');
    }
  }

  async deleteCourse(id: string) {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: 'Are you sure you want to delete this course? This action cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          handler: async () => {
            try {
              const { error } = await this.supabase.deleteCourse(id);
              
              if (error) {
                throw error;
              }

              await this.loadCourses();
              this.presentToast('Course deleted successfully', 'success');
            } catch (error) {
              console.error('Error deleting course:', error);
              this.presentToast('Error deleting course', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
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

  cancelEdit() {
    this.editingCourseId = null;
    this.courseForm.reset();
    
    // Clear query parameters
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
    
    this.presentToast('Edit cancelled', 'medium');
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }
}
