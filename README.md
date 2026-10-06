# TaskDesk - Full-Stack Task Management Application

A full-stack Task Management application built with **Angular (v22)** and **Node.js / Express** with **MongoDB** persistence.

---

## Features

### Angular Frontend
- **Task List Page & Dynamic Table**: Responsive task list with fields: ID, Title, Priority, Status, Reviewer, and Assignee.
- **Dynamic Filters & Search**: Real-time filtering by status (`todo`, `progress`, `done`), priority (`high`, `medium`, `low`), project, and instant search across titles and descriptions.
- **Pagination & Sorting**: Configurable entries per page (5, 10, 15, 20), dynamic sorting by ID, status, or priority with ascending/descending order toggle.
- **Task Creation & Editing Form**: Reactive form with validation for title, description, priority, status, reviewer, assignee, and project.
- **Full Row Actions**:
  - **View**: Modal showing comprehensive task details, badges, and project information.
  - **Edit**: Modal pre-populated with task data for updating fields.
  - **Delete**: Confirmation dialog with permanent delete action.
- **Angular Services**: `TaskService` communicates with the backend via `HttpClient`, providing optimistic UI updates and reactive state streams.
- **Template Control Flow**: Modern Angular `@if`, `@for`, and `@empty` control flows.
- **Export to CSV**: Instant client-side CSV export of filtered tasks.
- **In-App Toast Notifications (Top Right)**: Immediate visual feedback for create, update, delete, CSV export, sign-in, and error events.
- **User Scoping**: Authenticated users only see tasks where they are the Assignee or Reviewer.
- **Reviewer ≠ Assignee Constraint**: Dropdown restrictions and form validation guarantee that the reviewer and assignee for any task are never the same person.

### Node.js / Express Backend
- **Authentication & JWT Security**:
  - `POST /api/v1/auth/login` (with bcrypt password verification & JWT token issuing)
  - `GET /api/v1/auth/me` (retrieves current authenticated user)
  - `GET /api/v1/users` (list team users)
- **REST APIs**:
  - `GET /api/tasks` (scoped to authenticated user; supports `?status=...&priority=...&projectId=...&search=...`)
  - `GET /api/tasks/:id`
  - `POST /api/tasks` (with validation ensuring reviewerId !== assigneeId)
  - `PUT /api/tasks/:id` (with validation ensuring reviewerId !== assigneeId)
  - `DELETE /api/tasks/:id`
  - `GET /api/health`
- **Team Users Pre-seeded**:
  - Anchal (`u541023`)
  - Jyoti Singh (`u541024`)
  - Vivek Kumar (`u541025`)
  - Nikitha Amaresh (`u541026`)
  - Default password: `Password@123`
- **Separation of Concerns**: Clean layering across `routes`, `validators`, `controllers`, `services`, and `repositories`.
- **Request Validation**: Schema validation powered by `Joi`.
- **Centralized Error Handling**: Standardized JSON responses for validation errors, 404s, and unexpected exceptions.
- **MongoDB Database Integration**:
  - Mongoose schema for tasks and users with sequential IDs, unique usernames/emails, timestamps, and schema validations.
  - Automatic database seeding with initial sample tasks and team users on first connection.
  - Built-in graceful fallback to in-memory persistence when MongoDB is offline, allowing the server to start without crashing.
- **Swagger / OpenAPI 3.0 Documentation**: Interactive API documentation available at `http://localhost:3000/api/docs`.

---

## Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- npm

---

## MongoDB Setup (Step-by-Step)

You can choose either **Option A (Zero local install - Free MongoDB Atlas)** or **Option B (Local MongoDB Community Server)**.

### Option A: MongoDB Atlas (Recommended - No local software to install)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a free account.
2. Create a free **M0 (Shared)** cluster.
3. In **Database Access**, create a database user (e.g. username `taskadmin` and a secure password).
4. In **Network Access**, click **Add IP Address** and select **Allow Access from Anywhere** (`0.0.0.0/0`).
5. Click **Connect** > **Drivers** > copy the connection string.
6. Open [backend/.env](file:///backend/.env) and set:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/taskdesk?retryWrites=true&w=majority
   ```
7. Start the backend: the app will automatically connect and seed the tasks collection!

---

### Option B: Local MongoDB Community Server on Windows
1. Download the MongoDB Community Server MSI installer from the [MongoDB Download Center](https://www.mongodb.com/try/download/community).
2. Run the `.msi` installer:
   - Choose **Complete** setup.
   - Select **Run MongoDB as a Service**.
   - (Optional) Install MongoDB Compass GUI for visual database inspection.
3. Complete the installation. The Windows service `MongoDB` will start automatically on `127.0.0.1:27017`.
4. Ensure [backend/.env](file:///backend/.env) contains:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/taskdesk
   ```

*(Note: If MongoDB is not yet running, the backend server starts in in-memory fallback mode so you can test the frontend and API immediately).*

---

## Running the Application

### 1. Start the Backend API
```bash
cd backend
npm install
npm start
```
- API Server: `http://localhost:3000`
- Swagger Documentation: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs.json`

### 2. Start the Angular Frontend
```bash
# In the root project directory:
npm install
npm start
```
- Web Application: `http://localhost:4200`
- Default Login:
  - **Username**: `u123456` *(Format: lowercase 'u' followed by 6 digits)*
  - **Password**: `password123` *(Any non-empty password)*

---

## Running Tests

### Frontend Tests (Vitest / Angular)
```bash
npx ng test --watch=false
```

### Backend Tests (Node Test Runner)
```bash
cd backend
npm test
```

### Linting
```bash
npm run lint         # Angular frontend lint
cd backend && npm run lint  # Express backend lint
```
