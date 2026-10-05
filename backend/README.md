# TaskDesk Backend API

Express.js REST API with MongoDB persistence and Swagger/OpenAPI documentation.

## Architecture

- **`src/config/`**: Configuration environment loader (`env.js`) and MongoDB connection manager (`db.js`).
- **`src/models/`**: Mongoose model (`task.model.js`) defining schema, validations, indexes, and sequential numeric ID.
- **`src/repositories/`**: Data access layer (`task.repository.js`) abstracting database operations with graceful in-memory fallback.
- **`src/services/`**: Business logic layer (`task.service.js`).
- **`src/controllers/`**: HTTP request translation and response dispatch (`task.controller.js`).
- **`src/validators/`**: Joi request validation schemas (`task.validator.js`).
- **`src/routes/`**: Express route definitions (`task.routes.js`, `index.js`).
- **`src/docs/`**: OpenAPI 3.0 specification (`swagger.json`).

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tasks` | List all tasks (supports `?status=...&priority=...&projectId=...&search=...`) |
| `GET` | `/api/tasks/:id` | Get task by numeric ID |
| `POST` | `/api/tasks` | Create new task |
| `PUT` | `/api/tasks/:id` | Update task by ID (replace) |
| `DELETE` | `/api/tasks/:id` | Delete task by ID |
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/docs` | Interactive Swagger UI |
| `GET` | `/api/docs.json` | OpenAPI JSON schema |

## MongoDB Setup

Set `MONGODB_URI` in `.env`:
- Local: `mongodb://127.0.0.1:27017/taskdesk`
- Atlas Cloud: `mongodb+srv://<user>:<password>@cluster.mongodb.net/taskdesk?retryWrites=true&w=majority`
