import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/collabspace";

import Project from "./src/models/Project.model.js";
import User from "./src/models/User.model.js";
import Task from "./src/models/Task.model.js";

async function main() {
  console.log("Connecting to", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!");

  const users = await User.find({}, "name email");
  console.log("\n=== USERS ===");
  users.forEach(u => console.log(`- ID: ${u._id}, Name: ${u.name}, Email: ${u.email}`));

  const projects = await Project.find({});
  console.log("\n=== PROJECTS ===");
  projects.forEach(p => {
    console.log(`- Project: ${p.name} (ID: ${p._id})`);
    console.log(`  Owner ID: ${p.owner}`);
    console.log(`  Members:`);
    p.members.forEach(m => {
      console.log(`    * User ID: ${m.user}, Role: ${m.role}`);
    });
  });

  const tasks = await Task.find({});
  console.log("\n=== TASKS ===");
  console.log(`Total tasks in DB: ${tasks.length}`);
  tasks.forEach(t => {
    console.log(`- Task: "${t.title}" (ID: ${t._id})`);
    console.log(`  Project: ${t.project}, Status: ${t.status}, AssignedTo: ${t.assignedTo}`);
  });

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
