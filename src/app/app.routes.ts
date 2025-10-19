import { Routes } from '@angular/router';

export const routes: Routes = [   // ✅ add 'export'
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage)
  },
  {
    path: 'student-dashboard',
    loadComponent: () => import('./pages/student-dashboard/student-dashboard.page').then(m => m.StudentDashboardPage)
  },
  {
    path: 'professor-dashboard',
    loadComponent: () => import('./pages/professor-dashboard/professor-dashboard.page').then(m => m.ProfessorDashboardPage)
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage)
  },
  {
    path: 'courses',
    loadComponent: () => import('./pages/courses/courses.page').then(m => m.CoursesPage)
  },
  {
    path: 'course-detail',
    loadComponent: () => import('./pages/course-detail/course-detail.page').then(m => m.CourseDetailPage)
  },
  {
    path: 'course-management',
    loadComponent: () => import('./pages/course-management/course-management.page').then(m => m.CourseManagementPage)
  },
];
