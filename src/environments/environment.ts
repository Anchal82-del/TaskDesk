import { Environment } from './environment.model';

// Production build (default). Replace apiUrl with the deployed API address.
export const environment: Environment = {
  production: true,
  apiUrl: 'http://localhost:3000/api/v1'
};
