# Smart University Course Registration System

Full-stack university course registration with Node.js, Express, MongoDB, and session-based authentication.

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running locally, MongoDB Atlas, **or** allow the dev in-memory fallback (auto-downloads MongoDB binary on first run)

Install MongoDB locally (recommended):

```bash
winget install MongoDB.Server
# Start the MongoDB service from Windows Services, then:
npm start
```

If MongoDB is not installed locally, the server automatically uses an in-memory database in development (first start may download ~600MB).

### Installation

```bash
cd smart-university-system
npm install
cp .env.example .env   # edit MONGODB_URI and SESSION_SECRET if needed
npm run seed:admin     # creates admin@smartuniversity.com / Admin123!
npm start
```

Open **http://localhost:3000** in your browser.

### Default Admin

| Field    | Value                      |
|----------|----------------------------|
| Email    | admin@smartuniversity.com  |
| Password | Admin123!                  |

---

## Project Structure

```
smart-university-system/
├── config/db.js              # MongoDB connection
├── controllers/              # MVC controllers
├── middleware/               # auth, upload, errorHandler
├── models/                   # Mongoose schemas
├── routes/                   # Express routes
├── uploads/                  # Profile images
├── js/                       # Frontend (fetch API integration)
├── pages/                    # HTML pages
├── postman/                  # Postman collection
├── app.js                    # Express app configuration
├── server.js                 # Entry point
└── package.json
```

---

## API Endpoints

### Authentication

| Method | Endpoint                      | Description        |
|--------|-------------------------------|--------------------|
| POST   | /api/auth/student/register    | Register student   |
| POST   | /api/auth/student/login       | Student login      |
| POST   | /api/auth/admin/register      | Register admin     |
| POST   | /api/auth/admin/login         | Admin login        |
| POST   | /api/auth/login               | Unified login      |
| POST   | /api/auth/logout              | Destroy session    |
| GET    | /api/auth/me                  | Current user       |

### Courses

| Method | Endpoint           | Auth     | Description              |
|--------|--------------------|----------|--------------------------|
| GET    | /api/courses       | Public   | List with pagination     |
| GET    | /api/admin/courses | Admin    | Admin course list        |
| POST   | /api/admin/courses | Admin    | Create course            |
| PUT    | /api/admin/courses/:id | Admin | Update course         |
| DELETE | /api/admin/courses/:id | Admin | Delete course         |

### Enrollments

| Method | Endpoint                    | Auth    | Description     |
|--------|-----------------------------|---------|-----------------|
| GET    | /api/enrollments            | Student | My enrollments  |
| POST   | /api/enrollments            | Student | Enroll          |
| DELETE | /api/enrollments/:courseId  | Student | Drop course     |
| GET    | /api/admin/enrollments      | Admin   | All enrollments |

### Profile

| Method | Endpoint              | Auth    | Description        |
|--------|-----------------------|---------|--------------------|
| GET    | /api/profile          | Student | Get profile        |
| PUT    | /api/profile          | Student | Update name/password |
| POST   | /api/profile/upload   | Student | Upload JPEG/PNG    |

### Dashboard

| Method | Endpoint                  | Auth  | Description              |
|--------|---------------------------|-------|--------------------------|
| GET    | /api/dashboard/external   | User  | Quotes & facts (cached)  |

---

## Manual Testing Checklist

- [ ] Student registration works
- [ ] Student login works (email or student ID)
- [ ] Admin login works (admin@smartuniversity.com)
- [ ] Sessions persist across page reloads
- [ ] Duplicate emails blocked on registration
- [ ] Duplicate enrollment blocked
- [ ] Seat limits enforced when course is full
- [ ] 5-course enrollment limit enforced
- [ ] Profile image upload validates type/size
- [ ] Admin CRUD for courses works
- [ ] Course pagination and search work
- [ ] External API dashboard widget loads
- [ ] Logout destroys session
- [ ] Session expired redirect on 401

---

## Postman

Import `postman/Smart-University-API.postman_collection.json`. Enable cookies in Postman settings so sessions persist between requests.

---

## HTTPS Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for reverse proxy, SSL, and production environment setup.
