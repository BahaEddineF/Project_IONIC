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
      console.log('🔄 Starting avatar upload for user:', userId);
      console.log('📁 File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Create unique filename
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;
      const filePath = fileName; // Remove avatars/ prefix to upload directly to bucket root

      console.log('📤 Uploading to path:', filePath);

      // Check if the avatars bucket exists and is accessible
      const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();
      console.log('📂 Available buckets:', buckets);
      if (listError) {
        console.error('❌ Error listing buckets:', listError);
      }

      // First, try to upload to Supabase Storage
      let { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Supabase storage upload failed:', uploadError);
        console.log('🔄 Trying to create avatars bucket...');
        
        // Try to create the bucket if it doesn't exist
        const { data: createBucket, error: createError } = await this.supabase.storage
          .createBucket('avatars', {
            public: true,
            allowedMimeTypes: ['image/*'],
            fileSizeLimit: 5242880 // 5MB
          });
          
        if (createError) {
          console.error('❌ Failed to create bucket:', createError);
        } else {
          console.log('✅ Bucket created:', createBucket);
          
          // Retry upload after creating bucket
          const { data: retryData, error: retryError } = await this.supabase.storage
            .from('avatars')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            });
            
            if (retryError) {
              console.error('❌ Retry upload failed:', retryError);
              return this.convertToBase64AndSave(file, userId);
            }
          uploadData = retryData;
          uploadError = retryError;
        }
        
        if (uploadError || !uploadData) {
          return this.convertToBase64AndSave(file, userId);
        }
      }

      console.log('✅ Upload successful:', uploadData);

      // Get the public URL
      const { data: urlData } = this.supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;
      console.log('🔗 Public URL:', avatarUrl);

      // Update user record with new avatar URL
      const updateResult = await this.updateUser(userId, { avatar_url: avatarUrl });
      console.log('👤 User update result:', updateResult);

      return avatarUrl;

    } catch (error) {
      console.error('💥 Storage upload failed, using base64 fallback:', error);
      return this.convertToBase64AndSave(file, userId);
    }
  }

  // Fallback method: Convert image to base64 and save locally
  private async convertToBase64AndSave(file: File, userId: string): Promise<string | null> {
    try {
      console.log('🔄 Converting to base64 fallback for user:', userId);
      
      const base64 = await this.fileToBase64(file);
      const avatarUrl = `data:${file.type};base64,${base64}`;
      
      console.log('📝 Base64 length:', base64.length);
      console.log('🖼️ Avatar URL preview:', avatarUrl.substring(0, 100) + '...');
      
      // Update user record with base64 avatar
      const updateResult = await this.updateUser(userId, { avatar_url: avatarUrl });
      console.log('👤 User update result (base64):', updateResult);
      
      console.log('✅ Avatar saved as base64');
      return avatarUrl;
    } catch (error) {
      console.error('❌ Error converting to base64:', error);
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

  // ----------------------------
  // 🧪 Testing and Debugging
  // ----------------------------
  async testStorageConnection(): Promise<void> {
    try {
      console.log('🧪 Testing Supabase storage connection...');
      
      // Test 1: List buckets
      const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();
      if (listError) {
        console.error('❌ Failed to list buckets:', listError);
      } else {
        console.log('✅ Available buckets:', buckets?.map(b => b.name));
      }
      
      // Test 2: Check if avatars bucket exists
      const avatarsBucket = buckets?.find(b => b.name === 'avatars');
      if (!avatarsBucket) {
        console.log('⚠️ Avatars bucket not found, attempting to create...');
        
        const { data: createResult, error: createError } = await this.supabase.storage
          .createBucket('avatars', {
            public: true,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
            fileSizeLimit: 5242880 // 5MB
          });
          
        if (createError) {
          console.error('❌ Failed to create avatars bucket:', createError);
        } else {
          console.log('✅ Avatars bucket created successfully:', createResult);
        }
      } else {
        console.log('✅ Avatars bucket exists:', avatarsBucket);
      }
      
      // Test 3: Try to list files in avatars bucket
      const { data: files, error: filesError } = await this.supabase.storage
        .from('avatars')
        .list('', { limit: 5 });
        
      if (filesError) {
        console.error('❌ Failed to list files in avatars bucket:', filesError);
      } else {
        console.log('✅ Files in avatars bucket:', files?.length || 0);
      }
      
    } catch (error) {
      console.error('💥 Storage connection test failed:', error);
    }
  }
}
