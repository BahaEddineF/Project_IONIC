import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  IonicModule,
  ToastController,
  LoadingController,
} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService, AppUser } from '../../services/supabase.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
})
export class ProfilePage implements OnInit {
  profileForm!: FormGroup;
  user: AppUser | null = null;
  avatarUrl: string | null = null;

  constructor(
    private supabase: SupabaseService,
    private fb: FormBuilder,
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    const session = await this.supabase.getSession();
    if (!session?.user?.email) {
      this.router.navigate(['/login']);
      return;
    }

    const email = session.user.email;
    const { data: userData, error } = await this.supabase.getUserByEmail(email);
    if (error || !userData) return;

    this.user = userData;
    this.avatarUrl = userData.avatar_url || 'assets/default-avatar.png';

    this.profileForm = this.fb.group({
      full_name: [this.user.full_name || '', Validators.required],
      subject: [this.user.subject || ''],
      specialty: [this.user.specialty || ''],
    });
  }

  async uploadAvatar(event: any) {
    // Validate file input
    if (!event.target.files || event.target.files.length === 0) {
      console.log('No file selected');
      return;
    }
    
    // Check user ID
    if (!this.user?.id) {
      console.error('User ID missing');
      const toast = await this.toastCtrl.create({
        message: '❌ User ID not found. Please try logging in again.',
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
      return;
    }

    const file: File = event.target.files[0];
    
    // Validate file size and type
    if (file.size > 2 * 1024 * 1024) { // Reduced to 2MB max for better reliability
      const toast = await this.toastCtrl.create({
        message: '❌ File too large. Maximum size is 2MB.',
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
      return;
    }
    
    // Check file type - more strictly
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      const toast = await this.toastCtrl.create({
        message: '❌ Invalid file type. Please use JPEG, PNG, GIF or WEBP.',
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
      return;
    }

    console.log('Uploading avatar for user:', this.user.id, 'File:', file.name, file.type, file.size);

    // Show loading indicator
    const loading = await this.loadingCtrl.create({
      message: 'Uploading avatar...',
      spinner: 'circular',
    });
    await loading.present();

    // Try to optimize the image before upload if possible
    let optimizedFile = file;
    try {
      // For images under 500KB, use as is
      if (file.size > 500 * 1024) {
        optimizedFile = await this.optimizeImage(file);
        console.log('Image optimized:', file.size, '->', optimizedFile.size);
      }
    } catch (err) {
      console.log('Image optimization failed, using original:', err);
      optimizedFile = file;
    }

    try {
      // Set timeout to handle hanging requests
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 20000); // 20 second timeout
      });

      // Attempt upload with timeout
      const uploadPromise = this.supabase.uploadAvatar(optimizedFile, this.user.id);
      const url = await Promise.race([uploadPromise, timeoutPromise]);
      
      if (url) {
        // Success case - URL returned
        console.log('Upload successful, URL:', url);
        this.avatarUrl = url;
        this.user = { ...this.user, avatar_url: url }; // Update local user
        
        loading.dismiss();
        
        const toast = await this.toastCtrl.create({
          message: '✅ Avatar updated successfully!',
          duration: 2000,
          color: 'success',
        });
        await toast.present();
      } else {
        // No URL returned - handle as timeout or failure
        console.error('Upload failed or timed out');
        loading.dismiss();
        
        // Try one more alternative approach - create a dataURL from the image
        try {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          
          reader.onload = async () => {
            const dataUrl = reader.result as string;
            
            if (dataUrl && this.user?.id) {
              // Save data URL to user profile
              await this.supabase.updateUser(this.user.id, { avatar_url: dataUrl });
              
              // Update UI
              this.avatarUrl = dataUrl;
              this.user = { ...this.user, avatar_url: dataUrl };
              
              const toast = await this.toastCtrl.create({
                message: '✅ Avatar updated in offline mode.',
                duration: 2000,
                color: 'success',
              });
              await toast.present();
            } else {
              const errorToast = await this.toastCtrl.create({
                message: '❌ Failed to upload avatar. Please try a smaller image.',
                duration: 3000,
                color: 'danger',
              });
              await errorToast.present();
            }
          };
          
          reader.onerror = async (error) => {
            console.error('FileReader error:', error);
            const errorToast = await this.toastCtrl.create({
              message: '❌ Failed to process image. Please try another file.',
              duration: 3000,
              color: 'danger',
            });
            await errorToast.present();
          };
        } catch (err) {
          console.error('Final fallback attempt failed:', err);
          const errorToast = await this.toastCtrl.create({
            message: '❌ Avatar upload failed. Please try again later.',
            duration: 3000,
            color: 'danger',
          });
          await errorToast.present();
        }
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      loading.dismiss();
      
      let errorMessage = 'Error uploading avatar. Please try again later.';
      if (error instanceof Error) {
        errorMessage = `❌ ${error.message}`;
      }
      
      const errorToast = await this.toastCtrl.create({
        message: errorMessage,
        duration: 3000,
        color: 'danger',
      });
      await errorToast.present();
    }
  }
  
  // Helper method to optimize images before upload
  private async optimizeImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          // Create a canvas to resize the image
          const canvas = document.createElement('canvas');
          
          // Target dimensions - reduce size if larger than 800x800
          let width = img.width;
          let height = img.height;
          const maxDimension = 800;
          
          if (width > height && width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw resized image on canvas
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to Blob with reduced quality
          canvas.toBlob((blob) => {
            if (blob) {
              // Create new File from Blob
              const optimizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(optimizedFile);
            } else {
              reject(new Error('Failed to create optimized image'));
            }
          }, 'image/jpeg', 0.75); // Reduced quality for smaller file size
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image for optimization'));
        };
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read image file'));
      };
    });
  }

  goBack() {
    // Navigate back to appropriate dashboard based on user role
    if (this.user?.role === 'professor') {
      this.router.navigate(['/professor-dashboard']);
    } else {
      this.router.navigate(['/student-dashboard']);
    }
  }

  async saveProfile() {
    if (!this.user?.id || this.profileForm.invalid) {
      console.log('Cannot save: user ID missing or form invalid');
      return;
    }

    const updates = this.profileForm.value;
    console.log('Saving profile updates:', updates);
    
    const loading = await this.loadingCtrl.create({
      message: 'Saving profile...',
    });
    await loading.present();

    try {
      const result = await this.supabase.updateUser(this.user.id, updates);
      
      if (result.error) {
        console.error('Update failed:', result.error);
        const errorToast = await this.toastCtrl.create({
          message: '❌ Failed to update profile: ' + result.error.message,
          duration: 3000,
          color: 'danger',
        });
        await errorToast.present();
        return;
      }

      this.user = { ...this.user, ...updates }; // Update local user

      const toast = await this.toastCtrl.create({
        message: '✅ Profile updated successfully!',
        duration: 2000,
        color: 'success',
      });
      await toast.present();

      // Navigate back to dashboard
      if (this.user?.role === 'professor') {
        this.router.navigate(['/professor-dashboard']);
      } else {
        this.router.navigate(['/student-dashboard']);
      }
    } catch (error) {
      console.error('Unexpected error saving profile:', error);
      const errorToast = await this.toastCtrl.create({
        message: '❌ Unexpected error occurred',
        duration: 3000,
        color: 'danger',
      });
      await errorToast.present();
    } finally {
      loading.dismiss();
    }
  }
}
