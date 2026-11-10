// Load environment variables
require("dotenv").config();

// Load required packages
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

// Create the application
const app = express();

// Allow the frontend to communicate with the API
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:8080",
  }),
);

// Read JSON data from incoming requests
app.use(express.json());

// Display Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// -------------------- User Model --------------------

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },

  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
  },

  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);

// -------------------- Task Model --------------------

const checklistItemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, "Checklist item text is required"],
    trim: true,
    maxlength: [120, "Checklist item must be 120 characters or fewer"],
  },

  completed: {
    type: Boolean,
    default: false,
  },
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
  },

  description: {
    type: String,
    default: "",
    trim: true,
  },

  checklist: {
    type: [checklistItemSchema],
    default: [],
    validate: {
      validator: (items) => items.length <= 20,
      message: "A task can have up to 20 checklist items",
    },
  },

  status: {
    type: String,
    enum: ["pending", "in-progress", "completed"],
    default: "pending",
  },

  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },

  category: {
    type: String,
    default: "General",
    trim: true,
  },

  dueDate: {
    type: Date,
    default: null,
  },
  reminderEnabled: {
    type: Boolean,
    default: false,
  },

  reminderType: {
    type: String,
    enum: ["daily", "before-due"],
    default: "before-due",
  },

  reminderTime: {
    type: String,
    default: "09:00",
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Reminder time must use HH:mm format"],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const Task = mongoose.model("Task", taskSchema);

// -------------------- Helper Functions --------------------

// Create a JWT token
const createToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Protect private routes
const protect = (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authorizationHeader.split(" ")[1];

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decodedToken.userId;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

// -------------------- Public Routes --------------------

// Home route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Task API is running!",
    documentation: "/api-docs",
  });
});

// Register a new user
app.post("/auth/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = createToken(newUser._id);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Log in
app.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordIsCorrect = await bcrypt.compare(password, user.password);

    if (!passwordIsCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = createToken(user._id);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

// -------------------- Protected Task Routes --------------------

// Get all tasks
app.get("/tasks", protect, async (req, res, next) => {
  try {
    const tasks = await Task.find({
      user: req.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
});

// Get one task
app.get("/tasks/:id", protect, async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.userId,
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
});

// Create a new task
app.post("/tasks", protect, async (req, res, next) => {
  try {
    const {
      title,
      description = "",
      checklist = [],
      status = "pending",
      priority = "medium",
      category = "General",
      dueDate = null,
      reminderEnabled = false,
      reminderType = "before-due",
      reminderTime = "09:00",
    } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({
        message: "Title is required",
      });
    }

    if (reminderEnabled && reminderType === "before-due" && !dueDate) {
      return res.status(400).json({
        message: "A due date is required for a before-due reminder",
      });
    }

    const newTask = await Task.create({
      title: title.trim(),
      description,
      checklist,
      status,
      priority,
      category,
      dueDate: dueDate || null,
      reminderEnabled,
      reminderType,
      reminderTime,
      user: req.userId,
    });

    res.status(201).json(newTask);
  } catch (error) {
    next(error);
  }
});

// Update a task
app.patch("/tasks/:id", protect, async (req, res, next) => {
  try {
    const allowedFields = [
      "title",
      "description",
      "checklist",
      "status",
      "priority",
      "category",
      "dueDate",
      "reminderEnabled",
      "reminderType",
      "reminderTime",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields were provided",
      });
    }

    if (updates.title !== undefined && updates.title.trim() === "") {
      return res.status(400).json({
        message: "Title cannot be empty",
      });
    }

    if (updates.title !== undefined) {
      updates.title = updates.title.trim();
    }

    if (updates.dueDate === "") {
      updates.dueDate = null;
    }

    if (
      updates.reminderEnabled === true &&
      updates.reminderType === "before-due" &&
      !updates.dueDate
    ) {
      return res.status(400).json({
        message: "A due date is required for a before-due reminder",
      });
    }
    const updatedTask = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.userId,
      },
      updates,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedTask) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    next(error);
  }
});

// Delete a task
app.delete("/tasks/:id", protect, async (req, res, next) => {
  try {
    const deletedTask = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

    if (!deletedTask) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    res.status(200).json({
      message: "Task deleted successfully",
      task: deletedTask,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------- Error Handling --------------------

app.use((error, req, res, next) => {
  console.error(error.message);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: error.message,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      message: "Invalid ID",
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      message: "Email is already registered",
    });
  }

  res.status(500).json({
    message: "Internal server error",
  });
});

// -------------------- Start Server --------------------

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGODB_URI, {
    dbName: "task-api",
  })
  .then(() => {
    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
      console.log(`Swagger documentation: http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });
