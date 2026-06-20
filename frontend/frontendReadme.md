#  FRONTEND README.md

# CollabSpace Frontend

## Overview

The frontend of CollabSpace is built using React, Zustand, TailwindCSS, and Socket.IO Client.

It provides a responsive and modern SaaS-style interface for:

* Document Editing
* Project Management
* Task Tracking
* Team Collaboration
* Real-Time Updates
* AI Assistance

---

## Frontend Architecture

```text
React
 │
 ├── Pages
 ├── Components
 ├── Zustand Stores
 ├── API Layer
 ├── Socket Services
 └── Layout System
```

---

## Folder Structure

```text
frontend/
├── src/
│
├── api/
│   ├── ai.api.js
│   ├── auth.api.js
│   ├── axios.js
│   ├── comment.api.js
│   ├── dashboard.api.js
│   ├── document.api.js
│   ├── notification.api.js
│   ├── project.api.js
│   └── task.api.js
│
├── dashboard/
│   └── dashboard.jsx
│
├── document/
│   ├── document.editor.jsx
│   └── documents.jsx
│
├── layout/
│   ├── app.layout.jsx
│   ├── sidebar.jsx
│   └── topbar.jsx
│
├── notification/
│   └── notification.jsx
│
├── project/
│   ├── project.details.jsx
│   └── projects.jsx
│
├── task/
│   └── task.jsx
│
├── auth/
│   ├── auth.layout.jsx
│   ├── login.jsx
│   └── register.jsx
│
├── components/
│   ├── ai/
│   └── ui/
│
├── routes/
│
├── services/
│   └── socket.jsx
│
├── store/
│   ├── auth.store.js
│   ├── dashboard.store.js
│   ├── document.store.js
│   ├── notifications.store.js
│   ├── projects.store.js
│   └── tasks.store.js
│
├── App.jsx
├── main.jsx
└── index.css
```

---

## State Management

Zustand is used for:

* Authentication State
* Documents State
* Projects State
* Dashboard State
* Tasks State
* Notifications State

---

## Real-Time Features

Implemented through Socket.IO:

* Live Editing
* Typing Indicators
* Presence Tracking
* Instant Updates

---

## UI Principles

* SaaS-inspired design
* Dark mode interface
* Responsive layouts
* Minimal navigation friction
* Consistent spacing system
* Accessible component structure

---

## Environment Variables

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Installation

```bash
npm install
npm run dev
```

---

## Build

```bash
npm run build
```

---
