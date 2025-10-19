import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfessorDashboardPage } from './professor-dashboard.page';

describe('ProfessorDashboardPage', () => {
  let component: ProfessorDashboardPage;
  let fixture: ComponentFixture<ProfessorDashboardPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfessorDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
