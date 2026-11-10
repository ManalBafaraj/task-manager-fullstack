# TaskFlow – Full-Stack Task Manager

TaskFlow is a responsive full-stack task management application that helps users organize tasks, deadlines, reminders, and checklists.

## Features

- User registration and login using JWT authentication
- Create, view, edit, and delete tasks
- Task status, priority, category, and due date
- Search and advanced task filters
- Daily and before-deadline reminders
- Notification center with read/unread status
- Expandable task checklists with progress tracking
- Monthly calendar with scheduled and unscheduled tasks
- Responsive design for desktop, tablet, and mobile
- REST API documentation using Swagger

## Technology Stack

### Frontend

- React
- TypeScript
- TanStack Router
- TanStack Query
- Tailwind CSS
- Radix UI
- Vite

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- Swagger

## Local Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd task-manager-fullstack
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Configure the frontend environment

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:3000
```

### 4. Install backend dependencies

```bash
cd backend
npm install
```

### 5. Configure the backend environment

Copy `backend/.env.example` to `backend/.env` and add your values:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
FRONTEND_URL=http://localhost:8080
PORT=3000
```

### 6. Run the backend

```bash
cd backend
npm start
```

The API runs at:

```text
http://localhost:3000
```

Swagger documentation:

```text
http://localhost:3000/api-docs
```

### 7. Run the frontend

Open another terminal in the project root:

```bash
npm run dev
```

The frontend runs at:

```text
http://localhost:8080
```

## Quality Checks

```bash
npm run lint
npm run test
npm run build
```

Backend checks:

```bash
cd backend
node --check index.js
node --check swagger.js
npm audit
```

## Security

- Passwords are hashed before storage.
- Protected API routes require a valid JWT.
- Users can only access their own tasks.
- Environment variables and secrets are excluded from Git.

## Author

**Manal Bafaraj**

- Portfolio: https://manalbafaraj.github.io/portfolio/
- GitHub: https://github.com/ManalBafaraj