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
  getCourses(professorId?: string) {
    let query = this.supabase.from('courses').select('*');
    if (professorId) query = query.eq('professor_id', professorId);
    return query as unknown as Promise<{ data: Course[] | null, error: any }>;
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

  // ----------------------------
  // 📸 Profile Photo Upload
  // ----------------------------
  async uploadAvatar(file: File, userId: string): Promise<string | null> {
    try {
      // Create a unique filename to avoid conflicts
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to 'public' bucket instead of 'avatars' to avoid RLS issues
      const { data, error } = await this.supabase.storage
        .from('public')
        .upload(filePath, file, { 
          upsert: true,
          cacheControl: '3600'
        });

      if (error) {
        console.error('Error uploading avatar:', error);
        // Try alternative approach - create the bucket if it doesn't exist
        const { data: uploadData, error: uploadError } = await this.supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });
        
        if (uploadError) {
          console.error('Alternative upload failed:', uploadError);
          return null;
        }
        
        // Get public URL from avatars bucket
        const { data: urlData } = this.supabase.storage.from('avatars').getPublicUrl(filePath);
        const publicUrl = urlData?.publicUrl || null;
        
        if (publicUrl) {
          await this.updateUser(userId, { avatar_url: publicUrl });
        }
        
        return publicUrl;
      }

      // Get public URL from public bucket
      const { data: urlData } = this.supabase.storage.from('public').getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl || null;

      // Save avatar URL to user
      if (publicUrl) {
        const updateResult = await this.updateUser(userId, { avatar_url: publicUrl });
        if (updateResult.error) {
          console.error('Error updating user avatar URL:', updateResult.error);
        }
      }

      return publicUrl;
    } catch (error) {
      console.error('Unexpected error uploading avatar:', error);
      return null;
    }
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
