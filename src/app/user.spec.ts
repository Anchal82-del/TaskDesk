import { TestBed } from '@angular/core/testing';
import { UserService } from '@app/user';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserService);
  });

  it('finds a user by id', () => {
    expect(service.getUserById(1)?.name).toBe('Ananya Rao');
    expect(service.getUserById(999)).toBeUndefined();
  });
});
