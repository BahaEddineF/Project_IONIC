import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  IonicModule,
  ToastController,
  LoadingController,
  ActionSheetController,
} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService, AppUser } from '../../services/supabase.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
})
export class ProfilePage implements OnInit {
  profileForm!: FormGroup;
  user: AppUser | null = null;
  avatarUrl: string | null = null;

  constructor(
    private supabase: SupabaseService,
    private fb: FormBuilder,
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private actionSheetCtrl: ActionSheetController
  ) {}

  async ngOnInit() {
    const session = await this.supabase.getSession();
    if (!session?.user?.email) {
      this.router.navigate(['/login']);
      return;
    }

    const email = session.user.email;
    const { data: userData, error } = await this.supabase.getUserByEmail(email);
    if (error || !userData) return;

    this.user = userData;
    this.avatarUrl = userData.avatar_url || 'assets/default-avatar.png';

    this.profileForm = this.fb.group({
      full_name: [this.user.full_name || '', Validators.required],
      subject: [this.user.subject || ''],
      specialty: [this.user.specialty || ''],
    });

    // Check camera availability
    await this.checkCameraAvailability();
    
    // Test storage connection
    await this.supabase.testStorageConnection();
  }

  async checkCameraAvailability() {
    try {
      const platform = Capacitor.getPlatform();
      console.log('Platform:', platform);
      
      if (platform === 'web') {
        // Check web camera availability
        const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        console.log('Web camera available:', hasMediaDevices);
      } else {
        // Check native camera permissions
        const permissions = await Camera.checkPermissions();
        console.log('Native camera permissions:', permissions);
      }
    } catch (error) {
      console.log('Error checking camera availability:', error);
    }
  }

  async selectImageSource() {
    const isWeb = Capacitor.getPlatform() === 'web';
    
    const buttons = [];
    
    if (!isWeb) {
      // Native platform - show camera and gallery options
      buttons.push(
        {
          text: '📷 Take Photo',
          icon: 'camera-outline',
          handler: () => {
            this.takePicture(CameraSource.Camera);
          }
        }
      );
    } else {
      // Web platform - show web camera and file upload options
      buttons.push(
        {
          text: '📷 Use Web Camera',
          icon: 'camera-outline',
          handler: () => {
            this.useWebCamera();
          }
        }
      );
    }
    
    // File upload option for all platforms
    buttons.push(
      {
        text: '📁 Upload from Files',
        icon: 'folder-outline',
        handler: () => {
          this.selectFromFiles();
        }
      },
      {
        text: 'Cancel',
        icon: 'close-outline',
        role: 'cancel',
        cssClass: 'cancel-button'
      }
    );

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Image Source',
      subHeader: 'Choose how to upload your profile picture',
      cssClass: 'custom-action-sheet',
      buttons: buttons
    });

    await actionSheet.present();
  }

  async takePicture(source: CameraSource) {
    if (!this.user?.id) {
      console.log('User ID missing');
      return;
    }

    // Only run on native platforms
    if (Capacitor.getPlatform() === 'web') {
      console.log('Camera plugin not available on web, using web camera instead');
      this.useWebCamera();
      return;
    }

    try {
      // Request permissions first
      const permissions = await Camera.requestPermissions({
        permissions: ['camera', 'photos']
      });

      if (permissions.camera === 'denied' || permissions.photos === 'denied') {
        const errorToast = await this.toastCtrl.create({
          message: '❌ Camera permissions are required. Please enable them in your device settings.',
          duration: 4000,
          color: 'warning',
        });
        await errorToast.present();
        return;
      }

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: source,
        width: 400,
        height: 400,
        promptLabelHeader: 'Select Image',
        promptLabelCancel: 'Cancel',
        promptLabelPhoto: 'From Gallery',
        promptLabelPicture: 'Take Picture'
      });

      if (image.dataUrl) {
        await this.uploadImageData(image.dataUrl);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      
      let errorMessage = '❌ Failed to capture image. Please try again.';
      
      if (error.message && error.message.includes('User cancelled')) {
        return; // User cancelled, don't show error
      } else if (error.message && error.message.includes('permission')) {
        errorMessage = '❌ Camera permission denied. Please enable camera access in your device settings.';
      }
      
      const errorToast = await this.toastCtrl.create({
        message: errorMessage,
        duration: 3000,
        color: 'danger',
      });
      await errorToast.present();
    }
  }

  selectFromFiles() {
    // Create a file input element programmatically
    const input = document.createElement('input') as HTMLInputElement & { capture: string };
    input.type = 'file';
    // On mobile web, this will allow camera access too
    input.accept = 'image/*';
    input.capture = 'environment'; // This enables camera on mobile web
    input.onchange = (event: any) => this.uploadAvatar(event);
    input.click();
  }

  async uploadAvatar(event: any) {
    const file: File = event.target.files[0];
    if (!file || !this.user?.id) {
      console.log('No file selected or user ID missing');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      const errorToast = await this.toastCtrl.create({
        message: '❌ Please select a valid image file',
        duration: 3000,
        color: 'danger',
      });
      await errorToast.present();
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      const errorToast = await this.toastCtrl.create({
        message: '❌ Image size must be less than 5MB',
        duration: 3000,
        color: 'danger',
      });
      await errorToast.present();
      return;
    }

    // Convert file to data URL
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      await this.uploadImageData(e.target.result);
    };
    reader.readAsDataURL(file);

    // Reset the file input
    event.target.value = '';
  }

  async uploadImageData(dataUrl: string) {
    if (!this.user?.id) {
      return;
    }

    // Show loading toast
    const loadingToast = await this.toastCtrl.create({
      message: '📤 Uploading avatar...',
      duration: 10000,
      color: 'primary',
    });
    await loadingToast.present();

    try {
      console.log('🔄 Processing uploaded image data...');
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      console.log('📁 Blob details:', {
        size: blob.size,
        type: blob.type
      });
      
      // Create a file from the blob
      const file = new File([blob], `avatar_${this.user.id}.jpg`, { type: 'image/jpeg' });
      
      console.log('📤 Calling uploadAvatar with file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        userId: this.user.id
      });
      
      const avatarUrl = await this.supabase.uploadAvatar(file, this.user.id);
      
      console.log('📷 Upload result:', avatarUrl);
      
      if (avatarUrl) {
        this.avatarUrl = avatarUrl;
        this.user.avatar_url = avatarUrl;
        
        await loadingToast.dismiss();
        
        const successToast = await this.toastCtrl.create({
          message: '✅ Avatar uploaded successfully!',
          duration: 3000,
          color: 'success',
        });
        await successToast.present();

        // Refresh the user data to update avatar across app
        const session = await this.supabase.getSession();
        if (session?.user?.email) {
          const { data: userData } = await this.supabase.getUserByEmail(session.user.email);
          if (userData) {
            this.user = userData;
            this.avatarUrl = userData.avatar_url || (userData.role === 'professor' ? 
              'assets/default-avatar-prof.png' : 'assets/default-avatar.png');
            console.log('✅ User data refreshed, new avatar:', this.avatarUrl);
          }
        }
      } else {
        throw new Error('Failed to upload avatar - returned null');
      }
    } catch (error) {
      console.error('💥 Avatar upload error:', error);
      
      await loadingToast.dismiss();
      
      const errorToast = await this.toastCtrl.create({
        message: '❌ Failed to upload avatar. Please check console for details.',
        duration: 4000,
        color: 'danger',
      });
      await errorToast.present();
    }
  }

  goBack() {
    // Navigate back to appropriate dashboard based on user role
    if (this.user?.role === 'professor') {
      this.router.navigate(['/professor-dashboard']);
    } else {
      this.router.navigate(['/student-dashboard']);
    }
  }

  async saveProfile() {
    if (!this.user?.id || this.profileForm.invalid) {
      console.log('Cannot save: user ID missing or form invalid');
      return;
    }

    const updates = this.profileForm.value;
    console.log('Saving profile updates:', updates);
    
    const loading = await this.loadingCtrl.create({
      message: 'Saving profile...',
    });
    await loading.present();

    try {
      const result = await this.supabase.updateUser(this.user.id, updates);
      
      if (result.error) {
        console.error('Update failed:', result.error);
        const errorToast = await this.toastCtrl.create({
          message: '❌ Failed to update profile: ' + result.error.message,
          duration: 3000,
          color: 'danger',
        });
        await errorToast.present();
        return;
      }

      this.user = { ...this.user, ...updates }; // Update local user

      const toast = await this.toastCtrl.create({
        message: '✅ Profile updated successfully!',
        duration: 2000,
        color: 'success',
      });
      await toast.present();

      // Navigate back to dashboard
      if (this.user?.role === 'professor') {
        this.router.navigate(['/professor-dashboard']);
      } else {
        this.router.navigate(['/student-dashboard']);
      }
    } catch (error) {
      console.error('Unexpected error saving profile:', error);
      const errorToast = await this.toastCtrl.create({
        message: '❌ Unexpected error occurred',
        duration: 3000,
        color: 'danger',
      });
      await errorToast.present();
    } finally {
      loading.dismiss();
    }
  }

  async useWebCamera() {
    if (!this.user?.id) {
      console.log('User ID missing');
      return;
    }

    try {
      // Request camera permission and get video stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 400 }, 
          height: { ideal: 400 },
          facingMode: 'user' 
        } 
      });

      // Create a modal with video element
      await this.showCameraModal(stream);
    } catch (error: any) {
      console.error('Web camera error:', error);
      
      let errorMessage = '❌ Failed to access camera.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = '❌ Camera access denied. Please allow camera permissions in your browser.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = '❌ No camera found on this device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = '❌ Camera not supported in this browser.';
      }
      
      const errorToast = await this.toastCtrl.create({
        message: errorMessage,
        duration: 4000,
        color: 'danger',
      });
      await errorToast.present();
    }
  }

  async showCameraModal(stream: MediaStream) {
    // Create modal HTML
    const modalHtml = `
      <div class="camera-modal">
        <div class="camera-container">
          <video id="cameraVideo" autoplay playsinline></video>
          <canvas id="cameraCanvas" style="display: none;"></canvas>
          <div class="camera-controls">
            <button id="captureBtn" class="capture-btn">📷 Capture</button>
            <button id="cancelBtn" class="cancel-btn">❌ Cancel</button>
          </div>
        </div>
      </div>
    `;

    // Create modal element
    const modal = document.createElement('div');
    modal.innerHTML = modalHtml;
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    // Add styles for modal content
    const style = document.createElement('style');
    style.textContent = `
      .camera-container {
        text-align: center;
        background: white;
        border-radius: 20px;
        padding: 20px;
        max-width: 500px;
        width: 90%;
      }
      #cameraVideo {
        width: 100%;
        max-width: 400px;
        height: auto;
        border-radius: 10px;
        margin-bottom: 20px;
      }
      .camera-controls {
        display: flex;
        gap: 15px;
        justify-content: center;
      }
      .capture-btn, .cancel-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 25px;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      .capture-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .capture-btn:hover {
        transform: scale(1.05);
      }
      .cancel-btn {
        background: #f0f0f0;
        color: #666;
      }
      .cancel-btn:hover {
        background: #e0e0e0;
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(modal);

    const video = document.getElementById('cameraVideo') as HTMLVideoElement;
    const canvas = document.getElementById('cameraCanvas') as HTMLCanvasElement;
    const captureBtn = document.getElementById('captureBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    // Set video stream
    video.srcObject = stream;

    // Handle capture
    captureBtn?.addEventListener('click', () => {
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      // Get image data
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      // Stop stream and cleanup
      stream.getTracks().forEach(track => track.stop());
      document.body.removeChild(modal);
      document.head.removeChild(style);

      // Upload the captured image
      this.uploadImageData(dataUrl);
    });

    // Handle cancel
    cancelBtn?.addEventListener('click', () => {
      stream.getTracks().forEach(track => track.stop());
      document.body.removeChild(modal);
      document.head.removeChild(style);
    });
  }
}
