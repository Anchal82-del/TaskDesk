import { Injectable } from '@angular/core';
import { Project } from '@app/project.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly projects: Project[] = [
    { id: 1, name: 'Website Redesign' },
    { id: 2, name: 'Mobile App' },
    { id: 3, name: 'Internal Tools' }
  ];

  getProjects(): Project[] {
    return this.projects;
  }

  getProjectById(id: number): Project | undefined {
    return this.projects.find((p) => p.id === id);
  }
}
