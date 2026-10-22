const express = require("express");
const mongoose = require("mongoose");
const Task = require("../models/Task");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect); // every task route needs a logged-in user

// Only these fields can be set by the client. Previously the update route passed
// req.body straight to the database, so a user could change a task's `user`
// field and move it into someone else's account.
const EDITABLE = ["title", "description", "completed", "dueDate"];

function pickEditable(body = {}) {
  const out = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  if (out.dueDate === "") out.dueDate = null; // cleared date input
  return out;
}

function sendValidationError(res, error) {
  return res.status(400).json({ message: error.message });
}

// Finds a task owned by the current user. Invalid ids and other users' tasks
// both return 404, so the API doesn't reveal which task ids exist.
async function findOwnTask(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ message: "Task not found" });
    return null;
  }
  const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
  if (!task) {
    res.status(404).json({ message: "Task not found" });
    return null;
  }
  return task;
}

// POST /api/tasks
router.post("/", async (req, res) => {
  try {
    const fields = pickEditable(req.body);
    if (!fields.title || !String(fields.title).trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    const task = await Task.create({ ...fields, user: req.user.id });
    return res.status(201).json(task);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") return sendValidationError(res, error);
    return res.status(500).json({ message: "Could not create task" });
  }
});

// GET /api/tasks  (newest first)
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
    return res.json(tasks);
  } catch (error) {
    return res.status(500).json({ message: "Could not load tasks" });
  }
});

// GET /api/tasks/:id
router.get("/:id", async (req, res) => {
  try {
    const task = await findOwnTask(req, res);
    if (task) return res.json(task);
    return undefined;
  } catch (error) {
    return res.status(500).json({ message: "Could not load task" });
  }
});

// PUT /api/tasks/:id
router.put("/:id", async (req, res) => {
  try {
    const task = await findOwnTask(req, res);
    if (!task) return undefined;
    const fields = pickEditable(req.body);
    if ("title" in fields && !String(fields.title).trim()) {
      return res.status(400).json({ message: "Title cannot be empty" });
    }
    Object.assign(task, fields);
    await task.save(); // runs schema validation, unlike findByIdAndUpdate
    return res.json(task);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") return sendValidationError(res, error);
    return res.status(500).json({ message: "Could not update task" });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  try {
    const task = await findOwnTask(req, res);
    if (!task) return undefined;
    await task.deleteOne();
    return res.json({ message: "Task deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete task" });
  }
});

module.exports = router;
