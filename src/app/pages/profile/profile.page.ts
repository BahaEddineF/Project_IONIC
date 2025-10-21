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
    if (!file || !this.user?.id) return;

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
          message: '✅ Avatar updated!',
          duration: 2000,
          color: 'success',
        });
        await toast.present();
      }
    } finally {
      loading.dismiss();
    }
  }

  async saveProfile() {
    if (!this.user?.id || this.profileForm.invalid) return;

    const updates = this.profileForm.value;
    const loading = await this.loadingCtrl.create({
      message: 'Saving profile...',
    });
    await loading.present();

    try {
      await this.supabase.updateUser(this.user.id, updates);
      this.user = { ...this.user, ...updates }; // Update local user

      const toast = await this.toastCtrl.create({
        message: '✅ Profile updated!',
        duration: 2000,
        color: 'success',
      });
      await toast.present();

      // ✅ Non-null assertion
      const role = this.user!.role;
      if (role === 'professor') this.router.navigate(['/professor-dashboard']);
      else this.router.navigate(['/student-dashboard']);
    } finally {
      loading.dismiss();
    }
  }
}
