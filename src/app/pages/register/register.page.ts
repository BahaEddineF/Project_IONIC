import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService, AppUser } from '../../services/supabase.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule]
})
export class RegisterPage {
  registerForm: FormGroup;
  isStudent = true;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      full_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      role: ['student', Validators.required],
      specialty: [''],
      subject: ['']
    });
  }

  onRoleChange(event: any) {
    this.isStudent = event.detail.value === 'student';
  }

  async onRegister() {
    if (this.registerForm.invalid) {
      alert('Please fill all required fields.');
      return;
    }

    this.loading = true;
    const { full_name, email, password, role, specialty, subject } = this.registerForm.value;

    try {
      // 1️⃣ Sign up user in Supabase Auth
      const { data: authData, error: authError } = await this.supabase.signUp(email, password);
      
      if (authError) {
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error('Signup failed: No user was created');
      }
      
      console.log('Auth signup successful:', authData);
      
      // Check if email confirmation is needed
      if (authData.session === null && authData.user.email_confirmed_at === null) {
        // In development, we're bypassing confirmation, so this shouldn't happen
        // But keeping this check for when deployed to production
        alert('✅ Account created! Please check your email for a confirmation link before logging in.');
        this.router.navigate(['/login']);
        this.loading = false;
        return;
      }

      // 2️⃣ Add user info in 'users' table
      const newUser: AppUser = {
        id: authData.user.id,
        full_name,
        email,
        role,
        specialty: role === 'student' ? specialty : null,
        subject: role === 'professor' ? subject : null
      };

      const { error: userError } = await this.supabase.addUser(newUser);
      if (userError) throw userError;

      alert('✅ Account created successfully! You can now log in.');
      this.router.navigate(['/login']);

    } catch (err: any) {
      console.error('Registration error:', err);
      alert(err.message || 'Error while creating your account.');
    } finally {
      this.loading = false;
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
