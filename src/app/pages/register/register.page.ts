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
  loading = false; // optional, show loading

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
  if (this.registerForm.invalid) return;
  this.loading = true;

  const { full_name, email, password, role, specialty, subject } = this.registerForm.value;

  try {
    const { data: authData, error: authError } = await this.supabase.signUp(email, password);
    if (authError) throw authError;

    // For testing, skip confirmation
    // if (!authData.user?.confirmed_at) {
    //   alert('✅ Please confirm your email before logging in.');
    //   this.router.navigate(['/login']);
    //   return;
    // }

    const user: AppUser = {
      full_name,
      email,
      role,
      specialty: role === 'student' ? specialty : null,
      subject: role === 'professor' ? subject : null
    };

    const { error: userError } = await this.supabase.addUser(user);
    if (userError) throw userError;

    alert('✅ Account created successfully!');
    this.router.navigate(['/login']);
  } catch (err: any) {
    console.error(err);
    alert(err.message || 'Something went wrong!');
  } finally {
    this.loading = false;
  }
}
}