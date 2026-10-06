'use strict';

// Default initial password for all seeded users is: Password@123
// Pre-computed bcrypt hash (10 rounds):
const DEFAULT_PASSWORD_HASH = '$2b$10$QhrXZp0.g/g2rqhWjmURbOeks3zzWDUxAjQdKOsqgirNpR7qM6Iwi';

module.exports = [
  {
    id: 1,
    name: 'Anchal',
    username: 'u541023',
    email: 'anchal@taskdesk.dev',
    password: DEFAULT_PASSWORD_HASH
  },
  {
    id: 2,
    name: 'Jyoti Singh',
    username: 'u541024',
    email: 'jyoti.singh@taskdesk.dev',
    password: DEFAULT_PASSWORD_HASH
  },
  {
    id: 3,
    name: 'Vivek Kumar',
    username: 'u541025',
    email: 'vivek.kumar@taskdesk.dev',
    password: DEFAULT_PASSWORD_HASH
  },
  {
    id: 4,
    name: 'Nikitha Amaresh',
    username: 'u541026',
    email: 'nikitha.amaresh@taskdesk.dev',
    password: DEFAULT_PASSWORD_HASH
  }
];
