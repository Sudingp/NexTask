import React, { useEffect, useState } from "react";
import API from "../services/api";

function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [editingTask, setEditingTask] = useState(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchTasks = async () => {
    try {
      const res = await API.get("/tasks");
      setTasks(res.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load tasks. Is the server running?");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // 🧠 AI suggestion (simple)
  const getSuggestion = () => {
    if (title.toLowerCase().includes("study"))
      return "📚 Focus mode recommended";
    if (title.toLowerCase().includes("gym"))
      return "💪 Stay consistent!";
    return "✨ Keep going!";
  };

  const resetForm = () => {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setDueDate("");
  };

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 2500);
  };

  const saveTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      if (editingTask && tasks.find((t) => t._id === editingTask._id)) {
        await API.put(`/tasks/${editingTask._id}`, { title, description, dueDate });
        flash("Task updated");
      } else {
        await API.post("/tasks", { title, description, dueDate });
        flash("Task added");
      }
      resetForm();
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save task");
    }
  };

  const deleteTask = async (id) => {
    try {
      await API.delete(`/tasks/${id}`);
      if (editingTask && editingTask._id === id) resetForm();
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete task");
    }
  };

  const toggleComplete = async (id, completed) => {
    try {
      await API.put(`/tasks/${id}`, { completed: !completed });
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update task");
    }
  };

  const editTask = (task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    // The API returns an ISO timestamp; the date input needs YYYY-MM-DD.
    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
  };

  const formatDue = (iso) =>
    new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  // 🔍 FILTER + SEARCH
  const filteredTasks = tasks
    .filter((task) =>
      task.title.toLowerCase().includes(search.toLowerCase())
    )
    .filter((task) => {
      if (filter === "completed") return task.completed;
      if (filter === "pending") return !task.completed;
      return true;
    });

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">

      {/* SIDEBAR (desktop) */}
      <div className="w-60 bg-gray-950 p-6 hidden md:block">
        <h2 className="text-xl font-bold mb-6">NexTask</h2>

        {["all", "completed", "pending"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`block mb-2 capitalize ${filter === f ? "text-blue-400 font-semibold" : ""}`}
          >
            {f}
          </button>
        ))}

        <button
          onClick={logout}
          className="mt-10 bg-red-500 px-4 py-2 rounded w-full"
        >
          Logout
        </button>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">

        {/* Top bar (phones): the sidebar is hidden below md, so filters and logout live here */}
        <div className="flex items-center justify-between mb-4 md:hidden">
          <h2 className="text-xl font-bold">NexTask</h2>
          <button onClick={logout} className="bg-red-500 px-3 py-1 rounded text-sm">Logout</button>
        </div>
        <div className="flex gap-2 mb-4 md:hidden">
          {["all", "completed", "pending"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded capitalize text-sm ${filter === f ? "bg-blue-500" : "bg-gray-700"}`}
            >
              {f}
            </button>
          ))}
        </div>

        <h1 className="text-3xl mb-6">Dashboard</h1>

        {error && (
          <p role="alert" className="bg-red-900/60 text-red-200 p-3 rounded mb-4">{error}</p>
        )}
        {notice && (
          <p role="status" className="bg-green-900/60 text-green-200 p-3 rounded mb-4">{notice}</p>
        )}

        {/* 🔍 SEARCH */}
        <input
          placeholder="Search tasks..."
          className="w-full p-3 mb-4 rounded bg-gray-700"
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* CREATE */}
        <form onSubmit={saveTask} className="bg-gray-800 p-6 rounded mb-6">
          <h2 className="mb-3">
            {editingTask ? "Edit Task" : "Create Task"}
          </h2>

          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full p-2 mb-3 rounded bg-gray-700"
          />

          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="w-full p-2 mb-3 rounded bg-gray-700"
          />

          {/* 📅 Due date */}
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full p-2 mb-3 rounded bg-gray-700"
          />

          {/* 🧠 AI Suggestion */}
          {title && (
            <p className="text-sm text-green-400 mb-3">
              {getSuggestion()}
            </p>
          )}

          <div className="flex gap-2">
            <button type="submit" className="bg-blue-500 px-4 py-2 rounded">
              {editingTask ? "Update" : "Add Task"}
            </button>
            {editingTask && (
              <button type="button" onClick={resetForm} className="bg-gray-600 px-4 py-2 rounded">
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* TASK LIST */}
        <div className="space-y-4">
          {filteredTasks.length === 0 && (
            <p className="text-gray-400">
              {tasks.length === 0 ? "No tasks yet. Add your first one above." : "No tasks match this filter."}
            </p>
          )}
          {filteredTasks.map((task) => (
            <div
              key={task._id}
              className="bg-gray-800 p-5 rounded flex justify-between"
            >
              <div>
                <h3 className={task.completed ? "line-through" : ""}>
                  {task.title}
                </h3>

                <p className="text-gray-400">{task.description}</p>

                {/* 📅 Due */}
                {task.dueDate && (
                  <p className="text-xs text-yellow-400">
                    Due: {formatDue(task.dueDate)}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    toggleComplete(task._id, task.completed)
                  }
                  aria-label={task.completed ? "Mark as pending" : "Mark as completed"}
                  className="bg-green-500 px-2 rounded"
                >
                  ✓
                </button>

                <button
                  onClick={() => editTask(task)}
                  aria-label="Edit task"
                  className="bg-yellow-500 px-2 rounded"
                >
                  ✎
                </button>

                <button
                  onClick={() => deleteTask(task._id)}
                  aria-label="Delete task"
                  className="bg-red-500 px-2 rounded"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default Dashboard;