import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { User } from '@app/user.model';
import { UserService } from '@app/user';

interface UserRow extends User {
  initial: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  templateUrl: './users.html',
  styleUrl: './users.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersComponent {
  private readonly userService = inject(UserService);

  readonly users: UserRow[] = this.userService
    .getUsers()
    .map((user) => ({ ...user, initial: user.name.charAt(0) }));
}
