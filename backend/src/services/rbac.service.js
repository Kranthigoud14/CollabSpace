import Project from "../models/Project.model.js";

export const getProjectMember = async (projectId, userId) => {
  const project = await Project.findById(projectId);

  if (!project) return null;

  const member = project.members.find(
    (m) => m.user.toString() === userId
  );

  return member || null;
};