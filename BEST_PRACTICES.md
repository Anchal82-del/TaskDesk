# Best-practices checklist status (frontend)

Covers the Angular, TypeScript and JavaScript sections of `Best_Practices_Checklist.xlsx`.
Node.js, API Dev and Database items apply once the backend exists.

## Angular
| # | Item | Status |
|---|------|--------|
| 1 | Angular CLI structure | Done |
| 2 | Lazy loading | Done – every route uses `loadComponent` |
| 3 | Logic in services | Done – `task-query.ts`, `TaskExportService`, `TaskNotifierService` |
| 4 | Environment files | Done – dev, staging, prod (`ng serve -c staging`) |
| 5 | Naming conventions | Done |
| 6 | Reactive Forms | Done – task form, login and dashboard filters |
| 7 | Track expressions | Done – `@for ... track` everywhere |
| 8, 19 | No `any` | Done |
| 9 | RxJS operators | Done – `debounceTime`, `distinctUntilChanged`, `merge`, `timer` |
| 10 | Small components | Done – stats, pagination and notification bell extracted |
| 11 | Interceptors | Done – `authInterceptor`, `errorInterceptor` (ready for the API) |
| 12 | Route guards | Done – `authGuard` |
| 13 | Dependency injection | Done – `inject()` throughout |
| 14 | OnPush | Done – all components |
| 15 | `ng-container` | N/A – no wrapper elements needed |
| 16 | SCSS | Done – `.scss` files, shared `styles/_variables.scss` |
| 17 | No logic in templates | Done – labels/ternaries moved to getters or computed signals |
| 18 | Standalone components | Done |
| 20 | Linting | ESLint configured, budgets set; run `npm run lint` |
| 21 | Angular DevTools | Manual – use the browser extension |
| 22 | `@Input` / `@Output` | Done |
| 23 | Lazy-load libraries | N/A – no third-party libraries |
| 24 | Max 500 lines / 100 chars | Done (only the Google Fonts URL in `index.html` is longer) |
| 25 | Prettier | Config present; run `npx prettier --write src` before committing |

## TypeScript / JavaScript
`strict: true`, `@app/*` and `@env/*` path aliases, shared model/constant files,
literal unions instead of magic strings, explicit return types, no `var`/`==`/`any`.

## Node.js & Express Backend
| # | Item | Status |
|---|------|--------|
| 1 | Layered Architecture | Done – clear separation: `routes`, `controllers`, `services`, `repositories`, `models` |
| 2 | Environment Configuration | Done – centralized in `config/env.js`, validated and typed |
| 3 | Security Headers | Done – `helmet` configured with safe CSP defaults |
| 4 | CORS Configuration | Done – configurable allowed origins via `cors` |
| 5 | Rate Limiting | Done – `express-rate-limit` prevents brute force and DDoS |
| 6 | Request Validation | Done – `joi` schemas on route params and body payloads |
| 7 | Authentication | Done – `bcryptjs` password hashing & signed JWT Bearer tokens |
| 8 | Centralized Error Handling | Done – custom `AppError` class and global error middleware |
| 9 | Structured Logging | Done – `winston` and `morgan` HTTP access logging |
| 10 | Automated Testing | Done – native `node:test` suite covering services, validators, and auth |
| 11 | API Documentation | Done – interactive Swagger / OpenAPI UI at `/api/docs` |

## MongoDB Database
| # | Item | Status |
|---|------|--------|
| 1 | Schema Modeling | Done – typed Mongoose schemas for `Task` and `User` with timestamps |
| 2 | Schema Validation | Done – required constraints, string lengths, enums, and pre-validate hooks |
| 3 | Indexes & Uniqueness | Done – unique indexes on sequential `id`, `username`, and `email` |
| 4 | Automated Seeding | Done – auto-seeds initial tasks and team users on first connection |
| 5 | Resilience & Fallback | Done – graceful fallback to in-memory store when offline |
| 6 | Data Sanitization | Done – removes `_id`, `__v`, and sensitive fields (e.g. `password`) on JSON output |

