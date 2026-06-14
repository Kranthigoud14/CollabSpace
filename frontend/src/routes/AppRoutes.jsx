import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../auth/Login";
import Register from "../auth/Register";
import Home from "../pages/Home";

import Dashboard from "../app/dashboard/Dashboard";
import Projects from "../app/Projects/Projects";
import ProjectDetails from "../app/Projects/ProjectDetails";
import Documents from "../app/documents/Documents";
import DocumentEditor from "../app/documents/DocumentEditor";
import Tasks from "../app/tasks/Tasks";
import Notifications from "../app/notifications/Notifications";

import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

function AppRoutes() {
  return (
    <Routes>

      {/* PUBLIC HOME */}
      <Route
        path="/"
        element={
          localStorage.getItem("token")
            ? <Navigate to="/app/dashboard" />
            : <Home />
        }
      />

      {/* PUBLIC AUTH (ONLY THESE TWO) */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* PROTECTED APP */}
      <Route
        path="/app/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app/projects"
        element={
          <ProtectedRoute>
            <Projects />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app/projects/:id"
        element={
          <ProtectedRoute>
            <ProjectDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app/documents"
        element={
          <ProtectedRoute>
            <Documents />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app/documents/:id"
        element={
          <ProtectedRoute>
            <DocumentEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app/tasks"
        element={
          <ProtectedRoute>
            <Tasks />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" />} />

    </Routes>
  );
}

export default AppRoutes;
