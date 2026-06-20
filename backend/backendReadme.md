# BACKEND README.md

# CollabSpace Backend

## Overview

The backend powers all collaboration, authentication, authorization, document management, notifications, task tracking, AI integration, and real-time communication.

Built using:

* Node.js
* Express.js
* MongoDB
* Socket.IO
* JWT Authentication

---

## Backend Architecture

```text
Routes
  │
  ▼
Controllers
  │
  ▼
Services
  │
  ▼
MongoDB
```

Middleware is applied across every layer for:

* Authentication
* Authorization
* RBAC
* Error Handling
* Rate Limiting

---

## Folder Structure

```text
backend/
├── src/
│
├── config/
│   ├── db.js
│   └── socketConfig.js
│
├── controllers/
│   ├── ai.controller.js
│   ├── auth.controller.js
│   ├── comment.controller.js
│   ├── dashboard.controller.js
│   ├── document.controller.js
│   ├── notification.controller.js
│   ├── project.controller.js
│   └── task.controller.js
│
├── middleware/
│   ├── aiRateLimit.middleware.js
│   ├── auth.middleware.js
│   ├── documentRole.middleware.js
│   ├── error.middleware.js
│   ├── projectRole.middleware.js
│   ├── role.middleware.js
│   └── socketAuth.middleware.js
│
├── models/
│   ├── activity.model.js
│   ├── comment.model.js
│   ├── document.model.js
│   ├── notification.model.js
│   ├── task.model.js
│   └── user.model.js
│
├── routes/
│   ├── ai.route.js
│   ├── auth.route.js
│   ├── comment.route.js
│   ├── dashboard.route.js
│   ├── document.route.js
│   ├── notification.route.js
│   ├── project.route.js
│   └── task.route.js
│
├── services/
│   ├── activity.service.js
│   ├── ai.service.js
│   ├── notification.service.js
│   ├── prompt.service.js
│   ├── rbac.service.js
│   ├── socket.service.js
│   └── version.service.js
│
├── sockets/
│   └── document.socket.js
│
├── utils/
│
├── app.js
└── server.js
```

---

## Core Backend Modules

### Authentication Module

* Register User
* Login User
* JWT Generation
* Protected Endpoints

### Document Module

* Create Documents
* Update Documents
* Delete Documents
* Project Documents
* Personal Documents
* Version History

### Project Module

* Create Projects
* Member Management
* Invite Workflow
* Ownership Controls

### Task Module

* Create Tasks
* Assign Users
* Update Status
* Project Tracking

### Comment Module

* Inline Discussions
* Document Feedback
* Collaboration Threads

### Notification Module

* Real-Time Alerts
* Read Tracking
* User Activity Updates

### AI Module

* Summarization
* Content Suggestions
* Writing Assistance

### Socket.IO Module

* Presence
* Typing Indicators
* Document Collaboration
* Notification Delivery

---

## Environment Variables

```env
PORT=5000

MONGO_URI

JWT_SECRET

CLIENT_URL=http://localhost:5173
```

---

## Installation

npm install
npm run dev

---

## Production Features

* JWT Security
* RBAC Authorization
* Centralized Error Handling
* Socket Authentication
* MongoDB Validation
* Modular Architecture
* Scalable Service Layer
* Real-Time Communication

---

## API Categories

| Module        | Purpose              |
| ------------- | -------------------- |
| Auth          | Authentication       |
| Documents     | Document CRUD        |
| Projects      | Collaboration        |
| Tasks         | Task Management      |
| Comments      | Discussions          |
| Notifications | Alerts               |
| Dashboard     | Analytics            |
| AI            | Intelligent Features |
