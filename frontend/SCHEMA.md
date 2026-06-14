CollabDoc Editor — Frontend Scaffold Plan

Overview

This document maps the folder structure, pages, components, stores, API layer and expected response shapes for the SaaS CollabDoc Editor frontend.

Folder structure (frontend/src)

- /api
  - axios.js             → axios instance with interceptors
  - auth.api.js
  - project.api.js
  - Document.api.js
  - comment.api.js
  - ...

- /app
  - /dashboard
    - Dashboard.jsx
  - /projects
    - Projects.jsx
    - ProjectDetails.jsx
  - /documents
    - Documents.jsx        → My Documents list (personal)
    - DocumentEditor.jsx   → editor + comments sidebar
  - /layout
    - AppLayout.jsx
    - Sidebar.jsx
    - Topbar.jsx

- /components
  - /ui
    - Button.jsx
    - Input.jsx
    - Card.jsx
    - Loading.jsx
    - EmptyState.jsx

- /pages
  - Home.jsx
  - Settings.jsx

- /routes
  - AppRoutes.jsx
  - ProtectedRoute.jsx
  - PublicRoute.jsx

- /store
  - auth.store.js
  - project.store.js
  - document.store.js
  - comment.store.js (optional)

- /services
  - socket.js             → Socket connection wrapper

Key components & responsibilities

- `AppLayout.jsx`: global layout, includes `Sidebar` and `Topbar`, route outlet.
- `Sidebar.jsx`: navigation (Dashboard, Projects, My Documents, Settings).
- `Dashboard.jsx`: pulls `projects` and `documents` from stores; shows stats, recent lists, loading/empty states.
- `Projects.jsx`: list + create + join project, uses `useProjectStore`.
- `ProjectDetails.jsx`: loads project by id, filters documents by project id, allows creating project documents.
- `Documents.jsx`: lists personal documents from `useDocumentStore`.
- `DocumentEditor.jsx`: loads document and comments, auto-save, editor area and comments sidebar.

Stores & data rules

- `project.store.js`:
  - `projects`: array
  - `fetchProjects()` → calls `GET /projects` and sets `projects = res.projects || []`

- `document.store.js`:
  - `documents`: array (user documents + project documents mixed)
  - `fetchMyDocs()` → calls `GET /documents/my` and MUST normalize:
    - Accept raw arrays, { projects: [] }, { documents: [] }, or { data: [...] }
  - Client-side separation:
    - Personal documents: where `!doc.project`
    - Project documents: where `doc.project` is truthy

API expectations (normalize on client)

- GET /projects -> { projects: [ { _id, name, description, role?, owner?, members? } ] }
- GET /projects/:id -> { project: { ... } }
- POST /projects -> { project: {...} }
- GET /documents/my -> returns either an array of documents or object with documents key. Document shape: { _id, title, content, project (string|object|null), createdBy, createdAt }
- GET /documents/:id -> either document object or { document }
- POST /documents -> created document or { document }

UI rules / conventions

- Dark theme (slate/black), indigo/violet accent.
- All lists show loading, empty, and error states.
- All API calls log raw response (console.debug) during development.
- Always handle doc.project being `null`, string id, or populated object.

Developer commands

```
cd frontend
npm install
npm run dev

cd backend
npm install
npm run dev
```

Next steps (optional automations I can run for you):
- Scaffold components and basic styles files from this map.
- Create small UI components (Card, Loading, EmptyState) and update Dashboard for consistent look.
- Add unit tests for store normalization functions.

If you want, I can now scaffold the component files and wire up basic UI. (Say: "Scaffold now")
