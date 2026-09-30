import { Injectable } from '@angular/core';
import { User } from './user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly users: User[] = [
    { id: 1, name: 'Ananya Rao', username: 'u100234', email: 'ananya.rao@taskdesk.dev' },
    { id: 2, name: 'Rohan Mehta', username: 'u100567', email: 'rohan.mehta@taskdesk.dev' },
    { id: 3, name: 'Priya Nair', username: 'u100812', email: 'priya.nair@taskdesk.dev' },
    { id: 4, name: 'Karan Verma', username: 'u101045', email: 'karan.verma@taskdesk.dev' }
  ];

  getUsers(): User[] {
    return this.users;
  }

  getUserById(id: number): User | undefined {
    return this.users.find((u) => u.id === id);
  }
}
