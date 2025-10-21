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

    try {
      // 1️⃣ Sign in with Supabase Auth
      const { data: authData, error: authError } = await this.supabase.signIn(email, password);
      if (authError) {
        console.error('Authentication error:', authError);
        
        // Specifically check for email confirmation error
        if (authError.message?.includes('Email not confirmed')) {
          return alert('Your email address has not been confirmed. Please check your inbox for a confirmation link, or try registering again.');
        }
        
        return alert('Invalid login credentials.');
      }
      
      if (!authData?.session) {
        console.error('No session returned');
        return alert('Login failed. No session created.');
      }
      
      console.log('Auth successful, user ID:', authData.user.id);
      console.log('Auth user email:', authData.user.email);
      
      // 2️⃣ Try to fetch user profile using both methods
      let userProfile;
      
      // First attempt: try finding by auth ID
      const { data: userByID, error: idError } = await this.supabase.supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
        
      if (userByID) {
        console.log('User found by ID');
        userProfile = userByID;
      } else {
        console.log('User not found by ID, trying email');
        
        // Second attempt: try finding by email
        const { data: userByEmail, error: emailError } = await this.supabase.supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();
          
        if (userByEmail) {
          console.log('User found by email');
          userProfile = userByEmail;
        } else {
          console.error('ID lookup error:', idError);
          console.error('Email lookup error:', emailError);
          return alert('User profile not found. Please contact support.');
        }
      }

      // 3️⃣ Redirect based on role
      if (userProfile.role === 'student') {
        this.router.navigate(['/student-dashboard']);
      } else {
        this.router.navigate(['/professor-dashboard']);
      }
      
    } catch (err) {
      console.error('Login error:', err);
      alert('An error occurred during login. Please try again.');
    }
  }

  // Programmatic navigation for Register button
  goToRegister() {
    this.router.navigate(['/register']);
  }
}
