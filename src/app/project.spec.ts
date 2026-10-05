import { TestBed } from '@angular/core/testing';
import { ProjectService } from '@app/project';

describe('ProjectService', () => {
  let service: ProjectService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectService);
  });

  it('finds a project by id', () => {
    expect(service.getProjectById(1)?.name).toBe('Website Redesign');
    expect(service.getProjectById(999)).toBeUndefined();
  });
});
