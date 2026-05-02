# TaskFlow — Team Task Manager

A full-stack collaborative task management web application where users can create projects, assign tasks, and track progress with **role-based access control** (Admin/Member).

## Features

- **User Authentication** — Signup/Login with JWT tokens
- **Project Management** — Create projects, add/remove team members
- **Task Management** — Create tasks with title, description, due date, priority; assign to users; update status (To Do → In Progress → Done)
- **Dashboard** — Total tasks, tasks by status, tasks per user, overdue tasks
- **Role-Based Access** — Admin: manage everything | Member: view/update assigned tasks only
- **Kanban Board** — Visual task tracking with drag-free status updates

## Tech Stack

| Layer     | Technology                     |
|-----------|--------------------------------|
| Frontend  | HTML, CSS, Vanilla JavaScript (SPA) |
| Backend   | Node.js, Express.js            |
| Database  | SQLite (via Sequelize ORM)     |
| Auth      | JWT (jsonwebtoken + bcryptjs)  |

## Setup & Run Locally

### Prerequisites
- Node.js >= 18

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd myfullstackproject

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Edit .env and set your JWT_SECRET

# 4. Start the server
npm run dev
# Server runs at http://localhost:3000
```

## Deployment on Railway

1. Push code to GitHub
2. Go to [Railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set environment variables:
   - `JWT_SECRET` = your secret key
   - `NODE_ENV` = production
   - `PORT` = 3000
4. Railway auto-detects Node.js and runs `npm start`
5. Your app is live!

## API Endpoints

### Auth
| Method | Endpoint           | Description        |
|--------|--------------------|--------------------|
| POST   | /api/auth/register | Create account     |
| POST   | /api/auth/login    | Login              |
| GET    | /api/auth/me       | Get current user   |
| GET    | /api/auth/users    | List all users     |

### Projects
| Method | Endpoint                        | Description       |
|--------|---------------------------------|-------------------|
| GET    | /api/projects                   | List my projects  |
| POST   | /api/projects                   | Create project    |
| GET    | /api/projects/:id               | Get project       |
| PUT    | /api/projects/:id               | Update project    |
| DELETE | /api/projects/:id               | Delete project    |
| POST   | /api/projects/:id/members       | Add member        |
| DELETE | /api/projects/:id/members/:uid  | Remove member     |

### Tasks
| Method | Endpoint         | Description       |
|--------|------------------|--------------------|
| GET    | /api/tasks?projectId=X | List tasks   |
| POST   | /api/tasks       | Create task        |
| PUT    | /api/tasks/:id   | Update task        |
| DELETE | /api/tasks/:id   | Delete task        |

### Dashboard
| Method | Endpoint        | Description         |
|--------|-----------------|---------------------|
| GET    | /api/dashboard  | Get stats & data    |

## Database Schema

```
Users: id, name, email, password
Projects: id, name, description, created_by
ProjectMembers: id, project_id, user_id, role (admin/member)
Tasks: id, title, description, status, priority, due_date, project_id, assigned_to, created_by
```

## License
MIT
