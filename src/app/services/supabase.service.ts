import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

// ----------------------------
// Supabase project info
// ----------------------------
const SUPABASE_URL = 'https://myecrwhothecmovckyuj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15ZWNyd2hvdGhlY21vdmNreXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3Mzg1MDQsImV4cCI6MjA3NjMxNDUwNH0.AhHFzgYPEAQhGuxdaKiome3nKjvFUmSHNMGttHAFRkk';

// ----------------------------
// Interfaces
// ----------------------------
export interface AppUser {
  id?: string;
  full_name: string;
  email: string;
  role: 'student' | 'professor';
  specialty?: string;
  subject?: string;
}

export interface Course {
  id?: string;
  title: string;
  description: string;
  category?: string;
  professor_id?: string;
}

// ----------------------------
// Supabase Service
// ----------------------------
@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }

  // ----------------------------
  // 🔑 Authentication
  // ----------------------------
  signUp(email: string, password: string) {
    return this.supabase.auth.signUp({ email, password });
  }

  signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  signOut() {
    return this.supabase.auth.signOut();
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session ?? null;
  }

  // ----------------------------
  // 👤 Users table
  // ----------------------------
  addUser(user: AppUser) {
    return this.supabase.from('users').insert([user]) as unknown as Promise<any>;
  }

  getUserByEmail(email: string) {
    return this.supabase.from('users').select('*').eq('email', email).single() as unknown as Promise<{ data: AppUser | null, error: any }>;
  }

  updateUser(id: string, data: Partial<AppUser>) {
    return this.supabase.from('users').update(data).eq('id', id) as unknown as Promise<any>;
  }

  // ----------------------------
  // 📚 Courses table
  // ----------------------------
  getCourses() {
    return this.supabase.from('courses').select('*') as unknown as Promise<{ data: Course[] | null, error: any }>;
  }

  getCourseById(id: string) {
    return this.supabase.from('courses').select('*').eq('id', id).single() as unknown as Promise<{ data: Course | null, error: any }>;
  }

  addCourse(course: Course) {
    return this.supabase.from('courses').insert([course]) as unknown as Promise<any>;
  }

  updateCourse(id: string, course: Partial<Course>) {
    return this.supabase.from('courses').update(course).eq('id', id) as unknown as Promise<any>;
  }

  deleteCourse(id: string) {
    return this.supabase.from('courses').delete().eq('id', id) as unknown as Promise<any>;
  }
}
