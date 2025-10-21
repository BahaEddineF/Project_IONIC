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
  avatar_url?: string;
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

  async getCurrentUser(): Promise<AppUser | null> {
    const session = await this.getSession();
    if (!session?.user) return null;

    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data as AppUser;
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

  async updateUser(id: string, data: Partial<AppUser>) {
    console.log('Updating user with ID:', id, 'Data:', data);
    
    const { data: result, error } = await this.supabase
      .from('users')
      .update(data)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return { data: null, error };
    }

    console.log('User updated successfully:', result);
    return { data: result as AppUser, error: null };
  }

  // ----------------------------
  // 📚 Courses table
  // ----------------------------
  async getCourses(professorId?: string) {
    console.log('Getting courses, professorId:', professorId);
    
    try {
      let query = this.supabase.from('courses').select('*');
      if (professorId) query = query.eq('professor_id', professorId);
      
      const result = await query;
      console.log('getCourses result:', result);
      return result as { data: Course[] | null, error: any };
    } catch (error) {
      console.error('Error in getCourses:', error);
      return { data: null, error };
    }
  }

  async getCourseById(courseId: string) {
    return await this.supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();
  }

  async addCourse(course: Course) {
    console.log('Supabase addCourse called with:', course);
    
    try {
      const result = await this.supabase.from('courses').insert([course]);
      console.log('Insert result:', result);
      return result;
    } catch (error) {
      console.error('Supabase addCourse error:', error);
      throw error;
    }
  }

  updateCourse(id: string, course: Partial<Course>) {
    return this.supabase.from('courses').update(course).eq('id', id) as unknown as Promise<any>;
  }

  deleteCourse(id: string) {
    return this.supabase.from('courses').delete().eq('id', id) as unknown as Promise<any>;
  }

  // ----------------------------
  // 📸 Profile Photo Upload
  // ----------------------------
  async uploadAvatar(file: File, userId: string): Promise<string | null> {
    try {
      console.log('Starting avatar upload for user:', userId);
      
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      console.log('Uploading file:', filePath);

      // First, try to upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.warn('Supabase storage upload failed:', uploadError);
        // Fall back to base64 encoding for local storage
        return this.convertToBase64AndSave(file, userId);
      }

      console.log('Upload successful:', uploadData);

      // Get the public URL
      const { data: urlData } = this.supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;
      console.log('Public URL:', avatarUrl);

      // Update user record with new avatar URL
      await this.updateUser(userId, { avatar_url: avatarUrl });

      return avatarUrl;

    } catch (error) {
      console.warn('Storage upload failed, using base64 fallback:', error);
      return this.convertToBase64AndSave(file, userId);
    }
  }

  // Fallback method: Convert image to base64 and save locally
  private async convertToBase64AndSave(file: File, userId: string): Promise<string | null> {
    try {
      const base64 = await this.fileToBase64(file);
      const avatarUrl = `data:${file.type};base64,${base64}`;
      
      // Update user record with base64 avatar
      await this.updateUser(userId, { avatar_url: avatarUrl });
      
      console.log('Avatar saved as base64');
      return avatarUrl;
    } catch (error) {
      console.error('Error converting to base64:', error);
      return null;
    }
  }

  // Helper method to convert file to base64
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1]; // Remove data:image/...;base64, prefix
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  // ----------------------------
  // 👤 Update profile info
  // ----------------------------
  async updateProfile(userId: string, updates: Partial<AppUser>) {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('*');

    if (error) console.error('Error updating profile:', error);
    return data;
  }
}
