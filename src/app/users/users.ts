import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UserService } from '../user';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [],
  templateUrl: './users.html',
  styleUrl: './users.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersComponent {
  private readonly userService = inject(UserService);
  users = this.userService.getUsers();
}
