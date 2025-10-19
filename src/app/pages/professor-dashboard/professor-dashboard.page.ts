import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-professor-dashboard',
  templateUrl: './professor-dashboard.page.html',
  styleUrls: ['./professor-dashboard.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class ProfessorDashboardPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
