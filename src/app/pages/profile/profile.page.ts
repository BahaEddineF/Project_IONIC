// profile.page.ts
import { Component, OnInit } from '@angular/core';
import { SupabaseService, AppUser } from '../../services/supabase.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class ProfilePage implements OnInit {
  profile: AppUser | null = null;

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    const session = await this.supabase.getSession();
    if (!session?.user?.email) return;

    const { data } = await this.supabase.getUserByEmail(session.user.email);
    this.profile = data ?? null;
  }
}
