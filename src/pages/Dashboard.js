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

  const fetchTasks = async () => {
    const res = await API.get("/tasks");
    setTasks(res.data);
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

  const createTask = async () => {
    if (!title) return;

    if (editingTask && tasks.find((t) => t._id === editingTask._id)) {
      await API.put(`/tasks/${editingTask._id}`, {
        title,
        description,
        dueDate,
      });
      setEditingTask(null);
    } else {
      await API.post("/tasks", { title, description, dueDate });
    }

    setTitle("");
    setDescription("");
    setDueDate("");
    fetchTasks();

    // 🔔 Notification
    alert("Task saved successfully!");
  };

  const deleteTask = async (id) => {
    await API.delete(`/tasks/${id}`);

    if (editingTask && editingTask._id === id) {
      setEditingTask(null);
      setTitle("");
      setDescription("");
      setDueDate("");
    }

    fetchTasks();
  };

  const toggleComplete = async (id, completed) => {
    await API.put(`/tasks/${id}`, { completed: !completed });
    fetchTasks();
  };

  const editTask = (task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setDueDate(task.dueDate || "");
  };

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

      {/* SIDEBAR */}
      <div className="w-60 bg-gray-950 p-6 hidden md:block">
        <h2 className="text-xl font-bold mb-6">NexTask</h2>

        <button onClick={() => setFilter("all")} className="block mb-2">All</button>
        <button onClick={() => setFilter("completed")} className="block mb-2">Completed</button>
        <button onClick={() => setFilter("pending")} className="block mb-2">Pending</button>

        <button
          onClick={logout}
          className="mt-10 bg-red-500 px-4 py-2 rounded w-full"
        >
          Logout
        </button>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-6 max-w-5xl mx-auto">

        <h1 className="text-3xl mb-6">Dashboard</h1>

        {/* 🔍 SEARCH */}
        <input
          placeholder="Search tasks..."
          className="w-full p-3 mb-4 rounded bg-gray-700"
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* CREATE */}
        <div className="bg-gray-800 p-6 rounded mb-6">
          <h2 className="mb-3">
            {editingTask ? "Edit Task" : "Create Task"}
          </h2>

          <input
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

          <button
            onClick={createTask}
            className="bg-blue-500 px-4 py-2 rounded"
          >
            {editingTask ? "Update" : "Add Task"}
          </button>
        </div>

        {/* TASK LIST */}
        <div className="space-y-4">
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
                    Due: {task.dueDate}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    toggleComplete(task._id, task.completed)
                  }
                  className="bg-green-500 px-2 rounded"
                >
                  ✓
                </button>

                <button
                  onClick={() => editTask(task)}
                  className="bg-yellow-500 px-2 rounded"
                >
                  ✎
                </button>

                <button
                  onClick={() => deleteTask(task._id)}
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