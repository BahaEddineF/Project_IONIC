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
    const file: File = event.target.files[0];
    if (!file || !this.user?.id) {
      console.log('No file selected or user ID missing');
      return;
    }

    console.log('Uploading avatar for user:', this.user.id);

    const loading = await this.loadingCtrl.create({
      message: 'Uploading avatar...',
    });
    await loading.present();

    try {
      const url = await this.supabase.uploadAvatar(file, this.user.id);
      if (url) {
        this.avatarUrl = url;
        this.user = { ...this.user, avatar_url: url }; // Update local user
        const toast = await this.toastCtrl.create({
          message: '✅ Avatar updated successfully!',
          duration: 2000,
          color: 'success',
        });
        await toast.present();
      } else {
        const errorToast = await this.toastCtrl.create({
          message: '❌ Failed to upload avatar. Please try again.',
          duration: 3000,
          color: 'danger',
        });
        await errorToast.present();
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      const errorToast = await this.toastCtrl.create({
        message: '❌ Error uploading avatar',
        duration: 3000,
        color: 'danger',
      });
      await errorToast.present();
    } finally {
      loading.dismiss();
    }
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
