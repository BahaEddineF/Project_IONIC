import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CourseManagementPage } from './course-management.page';

describe('CourseManagementPage', () => {
  let component: CourseManagementPage;
  let fixture: ComponentFixture<CourseManagementPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CourseManagementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
