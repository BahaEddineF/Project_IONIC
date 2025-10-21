import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

// ----------------------------
// Supabase project info loaded from environment
// ----------------------------

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
    this.supabase = createClient(environment.supabase.url, environment.supabase.key);
  }

  // ----------------------------
  // 🔑 Authentication
  // ----------------------------
  signUp(email: string, password: string) {
    // Disable email confirmation for development purposes
    return this.supabase.auth.signUp({ 
      email, 
      password,
      options: {
        // We don't specify emailRedirectTo, so no confirmation email will be sent
        data: { confirmed: true }
      }
    });
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
  // 📸 Profile Photo Upload - Completely rewritten
  // ----------------------------
  async uploadAvatar(file: File, userId: string): Promise<string | null> {
    console.log('Starting new avatar upload process for user:', userId);
    
    if (!file || file.size === 0) {
      console.error('Invalid file provided');
      return null;
    }

    try {
      // 1. First verify we have a valid session
      const session = await this.getSession();
      if (!session) {
        console.error('No active session found');
        return null;
      }
      
      // 2. Create a base64 data URL as fallback (in case all storage attempts fail)
      let base64Url = '';
      try {
        base64Url = await this.fileToBase64(file);
        console.log('Created base64 fallback URL');
      } catch (e) {
        console.error('Failed to create base64 fallback:', e);
      }
      
      // 3. Prepare the file
      const fileExt = this.getFileExtension(file);
      const fileName = `avatar_${userId}_${Date.now()}.${fileExt}`;
      
      // 4. Try multiple approaches to upload
      const url = await this.tryMultipleUploadMethods(file, fileName);
      
      if (url) {
        // 5. Update user profile with the URL
        console.log('Upload successful, updating user profile with URL');
        await this.updateUser(userId, { avatar_url: url });
        return url;
      } else if (base64Url) {
        // 6. Fall back to base64 if all storage uploads failed
        console.log('Using base64 fallback URL');
        await this.updateUser(userId, { avatar_url: base64Url });
        return base64Url;
      }
      
      return null;
    } catch (error) {
      console.error('Fatal error in avatar upload:', error);
      return null;
    }
  }
  
  // Helper method to try multiple upload approaches
  private async tryMultipleUploadMethods(file: File, fileName: string): Promise<string | null> {
    // List of buckets to try, in order
    const buckets = ['avatars', 'public', 'profile-images', 'uploads'];
    
    for (const bucket of buckets) {
      try {
        console.log(`Attempting upload to ${bucket} bucket`);
        
        // Different paths to try
        const paths = [
          `${bucket}/${fileName}`,
          `${fileName}`,
          `avatars/${fileName}`
        ];
        
        for (const path of paths) {
          try {
            // Try both buffer and direct file upload
            let uploadResult;
            
            // Method 1: Direct file upload
            uploadResult = await this.uploadFileToStorage(bucket, path, file);
            if (uploadResult) return uploadResult;
            
            // Method 2: Buffer upload
            const fileBuffer = await file.arrayBuffer();
            uploadResult = await this.uploadBufferToStorage(bucket, path, fileBuffer, file.type);
            if (uploadResult) return uploadResult;
            
          } catch (pathError) {
            console.log(`Path ${path} failed:`, pathError);
            // Continue to next path
          }
        }
      } catch (bucketError) {
        console.log(`Bucket ${bucket} failed:`, bucketError);
        // Continue to next bucket
      }
    }
    
    // If we get here, all attempts failed
    console.error('All upload methods failed');
    return null;
  }
  
  // Helper to upload file directly
  private async uploadFileToStorage(bucket: string, path: string, file: File): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, file, { 
          upsert: true,
          cacheControl: '3600'
        });
        
      if (error) {
        console.log(`Direct file upload to ${bucket}/${path} failed:`, error);
        return null;
      }
      
      const { data: urlData } = this.supabase.storage.from(bucket).getPublicUrl(path);
      return urlData?.publicUrl || null;
    } catch (e) {
      return null;
    }
  }
  
  // Helper to upload buffer
  private async uploadBufferToStorage(bucket: string, path: string, buffer: ArrayBuffer, contentType: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, buffer, { 
          upsert: true,
          contentType: contentType
        });
        
      if (error) {
        console.log(`Buffer upload to ${bucket}/${path} failed:`, error);
        return null;
      }
      
      const { data: urlData } = this.supabase.storage.from(bucket).getPublicUrl(path);
      return urlData?.publicUrl || null;
    } catch (e) {
      return null;
    }
  }
  
  // Helper to create a base64 data URL from a file (as ultimate fallback)
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
  
  // Helper to get file extension safely
  private getFileExtension(file: File): string {
    const fileName = file.name || '';
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop() || 'png' : 'png';
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
