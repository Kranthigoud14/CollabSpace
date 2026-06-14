# Project & Document Task Guidelines

## .http Request File Policy

- **All `.http` request files must be fully tested and verified to work.**
- **Exception:** `ai.http` is intentionally left unimplemented. It should **not** be executed or required to pass tests.
- Include a brief description or comment at the top of each `.http` file indicating its purpose and any required environment variables.
- Use a testing framework (e.g., [REST‑Client extensions for VS Code] or any CI step) to automatically run each request file and ensure a `200`‑range response.

## Task Structure

The workflow distinguishes two primary task types:

### 1. Project‑Based Tasks (Implementation Tasks)
- **When to use:** The task involves building actual functionality, such as creating APIs, services, databases, or UI components.
- **Requirements:**
  - Set up the appropriate backend (e.g., Node/Express, Python/Flask, etc.).
  - Implement the required endpoints and ensure they are reachable via `.http` request files.
  - Include unit/integration tests and verify all `.http` files pass.
  - Commit runnable code; avoid placeholder stubs unless explicitly noted.

### 2. Document‑Based Tasks (Theoretical/Instructional Tasks)
- **When to use:** The task is purely explanatory, conceptual, or instructional (e.g., design docs, algorithm explanations, walkthroughs).
- **Requirements:**
  - Provide clear written explanations, diagrams, or pseudo‑code.
  - **Do not** generate a full project scaffold or executable code unless the user explicitly requests a prototype.
  - Focus on delivering the knowledge component without unnecessary build steps.

## General Guidelines
- **Determine task type early** and label the work accordingly (e.g., add a comment `# Project Task` or `# Document Task` at the top of the issue/PR).
- **Avoid unnecessary project creation** for document‑only tasks to keep the repository tidy.
- When a task transitions from Document to Project (e.g., after a design discussion), create a new branch and add the implementation.
- Keep `ai.http` excluded from CI pipelines and test suites.

---
*These guidelines help maintain a clean codebase, ensure reliable API testing, and streamline the distinction between implementation work and conceptual documentation.*
