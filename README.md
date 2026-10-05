# TaskDesk

A task management application currently being developed using Angular.

## Project Status

Frontend complete; Express REST API (in-memory data) added. MongoDB and Angular–API
integration are the next stages.

## Current Implementation

- Angular frontend: login, dashboard, search, filters, sorting, pagination, task
  create/edit/delete/view, CSV download, in-app notifications, settings (light/dark theme)
- Express API in `backend/`: GET/POST/PUT/DELETE tasks, validation, error handling
  (see `backend/README.md`)

## Run

Backend: `cd backend`, `npm install`, copy `.env.example` to `.env`, `npm run dev`
Frontend: `npm install`, `ng serve`

## Planned Development

The next stages will include:

- Node.js and Express REST API
- Task CRUD endpoints
- Request validation and error handling
- MongoDB integration
- Connecting the Angular frontend to the backend APIs
- API documentation using Swagger/OpenAPI
- Final testing and documentation

## Technology Stack

### Current

- Angular
- TypeScript
- HTML
- CSS

### Planned

- Node.js
- Express.js
- MongoDB
- REST API
- Swagger/OpenAPI

## Note

This repository is currently being used as a development and mentor-review repository. The application is not yet complete and the implementation may continue to change as development progresses.
