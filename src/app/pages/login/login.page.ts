import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule]
})
export class LoginPage {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async onLogin() {
    if (this.loginForm.invalid) return;

    const { email, password } = this.loginForm.value;

    // 1️⃣ Sign in with Supabase Auth
    const { data: authData, error: authError } = await this.supabase.signIn(email, password);
    if (authError || !authData.session) {
      return alert('Invalid login credentials.');
    }

    // 2️⃣ Fetch user profile from 'users' table using Auth ID
    const { data: userProfile, error: profileError } = await this.supabase.supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !userProfile) {
      return alert('User profile not found.');
    }

    // 3️⃣ Redirect based on role
    if (userProfile.role === 'student') {
      this.router.navigate(['/student-dashboard']);
    } else {
      this.router.navigate(['/professor-dashboard']);
    }
  }

  // Programmatic navigation for Register button
  goToRegister() {
    this.router.navigate(['/register']);
  }
}
