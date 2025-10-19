import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use your project URL & public API key
const SUPABASE_URL = 'https://myecrwhothecmovckyuj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15ZWNyd2hvdGhlY21vdmNreXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3Mzg1MDQsImV4cCI6MjA3NjMxNDUwNH0.AhHFzgYPEAQhGuxdaKiome3nKjvFUmSHNMGttHAFRkk';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }

  // 🔑 Auth
  signUp(email: string, password: string) {
    return this.supabase.auth.signUp({ email, password });
  }

  signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  signOut() {
    return this.supabase.auth.signOut();
  }

  // 👤 Users table
  insertUser(user: any) {
    return this.supabase.from('users').insert([user]);
  }

  getUserByEmail(email: string) {
    return this.supabase.from('users').select('*').eq('email', email).single();
  }

  updateUser(id: string, data: any) {
    return this.supabase.from('users').update(data).eq('id', id);
  }

  // 📚 Courses table
  getCourses() {
    return this.supabase.from('courses').select('*');
  }

  getCourseById(id: string) {
    return this.supabase.from('courses').select('*').eq('id', id).single();
  }

  addCourse(course: any) {
    return this.supabase.from('courses').insert([course]);
  }

  updateCourse(id: string, course: any) {
    return this.supabase.from('courses').update(course).eq('id', id);
  }

  deleteCourse(id: string) {
    return this.supabase.from('courses').delete().eq('id', id);
  }
}
