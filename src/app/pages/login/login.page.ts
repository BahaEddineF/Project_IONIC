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
    const { data, error } = await this.supabase.signIn(email, password);
    if (error) return alert(error.message);

    const { data: userData, error: userError } = await this.supabase.getUserByEmail(email);
    if (userError || !userData) return alert('User not found.');

    if (userData.role === 'student') this.router.navigate(['/student-dashboard']);
    else this.router.navigate(['/professor-dashboard']);
  }

  // Use programmatic navigation instead of routerLink
  goToRegister() {
    this.router.navigate(['/register']);
  }
}
