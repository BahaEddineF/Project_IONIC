// register.page.ts
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

  constructor(private fb: FormBuilder, private supabase: SupabaseService, private router: Router) {
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

    const { full_name, email, password, role, specialty, subject } = this.registerForm.value;

    const { data, error } = await this.supabase.signUp(email, password);
    if (error) {
      alert(error.message);
      return;
    }

    await this.supabase.addUser({
      full_name,
      email,
      role,
      specialty: role === 'student' ? specialty : null,
      subject: role === 'professor' ? subject : null
    });

    alert('✅ Account created! You can now log in.');
    this.router.navigate(['/login']);
  }
}
