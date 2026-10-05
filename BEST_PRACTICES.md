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
