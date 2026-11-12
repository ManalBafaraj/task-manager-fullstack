// Load environment variables
// Environment is loaded by the local entry; Vercel injects it at runtime.

// Load required packages
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import swaggerSpec from "./swagger.js";
import { connectDatabase } from "./db.js";
import {
  DEFAULT_PREFERENCES,
  normalizePreferences,
  validatePreferencesPatch,
} from "../shared/preferences.js";

// Create the application
const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Cache-Control": "no-store",
  });
  next();
});

// Allow the frontend to communicate with the API
app.use(
  cors((req, callback) => {
    const sameOrigin = req.get("Origin") === `${req.protocol}://${req.get("host")}`;
    callback(null, {
      origin: sameOrigin ? true : process.env.FRONTEND_URL || "http://localhost:8080",
    });
  }),
);

// Read JSON data from incoming requests
app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
  if (
    req.body !== undefined &&
    (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
  )
    return res.status(400).json({ message: "A JSON object is required." });
  req.body ??= {};
  next();
});
// Bounded warm-instance protection. Platform-wide limits still depend on hosting.
const attempts = new Map();
app.use("/auth", (req, res, next) => {
  if (!["POST", "PATCH", "DELETE"].includes(req.method)) return next();
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
  const key = req.ip;
  const current = attempts.get(key) ?? { count: 0, until: now + 10 * 60 * 1000 };
  current.count++;
  if (attempts.size < 1000 || attempts.has(key)) attempts.set(key, current);
  if (current.count > 60) {
    res.set("Retry-After", String(Math.ceil((current.until - now) / 1000)));
    return res.status(429).json({ message: "Too many attempts. Please wait a few minutes." });
  }
  next();
});

// Display Swagger documentation
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/openapi.json", (req, res) => res.json(swaggerSpec));
app.get("/api-docs", (req, res) => {
  if (!req.path.endsWith("/")) return res.redirect("api-docs/");
  return res
    .type("html")
    .send(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TaskFlow API</title><link rel="stylesheet" href="swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="swagger-ui-bundle.js"></script><script src="swagger-ui-standalone-preset.js"></script><script>SwaggerUIBundle({url:"../openapi.json",dom_id:"#swagger-ui",presets:[SwaggerUIBundle.presets.apis,SwaggerUIStandalonePreset],layout:"StandaloneLayout"})</script></body></html>`,
    );
});

// Keep public docs and health available without a database; authenticate task
// requests before connecting so unauthenticated traffic never opens MongoDB.
app.use(async (req, res, next) => {
  const privatePath =
    req.path.startsWith("/tasks") ||
    ["/auth/me", "/auth/password", "/auth/account"].includes(req.path);
  if (privatePath && !req.headers.authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (privatePath) {
    try {
      jwt.verify(req.headers.authorization.split(" ")[1], process.env.JWT_SECRET, {
        algorithms: ["HS256"],
      });
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  }
  if (!req.path.startsWith("/auth/") && !req.path.startsWith("/tasks")) return next();
  try {
    if (!process.env.JWT_SECRET)
      return res.status(503).json({ message: "Service configuration is unavailable" });
    await connectDatabase();
    next();
  } catch {
    res.status(503).json({ message: "The service is temporarily unavailable. Please try again." });
  }
});

// -------------------- User Model --------------------

const preferencesSchema = new mongoose.Schema(
  {
    focusMinutes: { type: Number, enum: [15, 25, 45, 60], default: 25 },
    completionSound: { type: Boolean, default: true },
    completionSoundId: {
      type: String,
      enum: ["chime", "bright", "gentle", "pulse"],
      default: "chime",
    },
    browserNotifications: { type: Boolean, default: false },
    remindersEnabled: { type: Boolean, default: true },
    defaultReminderTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: "09:00" },
    appearance: { type: String, enum: ["light", "dark", "system"], default: "light" },
  },
  { _id: false },
);
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    maxlength: 60,
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
  tokenVersion: { type: Number, default: 0 },
  preferences: { type: preferencesSchema, default: () => ({ ...DEFAULT_PREFERENCES }) },
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

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

const Task = mongoose.models.Task || mongoose.model("Task", taskSchema);

// -------------------- Helper Functions --------------------

// Create a JWT token
const createToken = (user) => {
  return jwt.sign(
    { userId: String(user._id), version: user.tokenVersion ?? 0 },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
      algorithm: "HS256",
    },
  );
};

// Protect private routes
const protect = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authorizationHeader.split(" ")[1];

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof decodedToken !== "object" || !mongoose.isValidObjectId(decodedToken.userId))
      return res.status(401).json({ message: "Invalid or expired token" });
    const user = await User.findById(decodedToken.userId);
    if (!user || (decodedToken.version ?? 0) !== (user.tokenVersion ?? 0))
      return res.status(401).json({ message: "Invalid or expired token" });
    req.userId = String(user._id);
    req.account = user;
    return next();
  } catch (error) {
    if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(error.name))
      return res.status(401).json({ message: "Invalid or expired token" });
    return next(error);
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

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    preferences: normalizePreferences(
      user.preferences?.toObject ? user.preferences.toObject() : user.preferences,
    ),
  };
}
function validPassword(password, minimum = 6) {
  return (
    typeof password === "string" &&
    password.length >= minimum &&
    Buffer.byteLength(password, "utf8") <= 72
  );
}

// Register a new user
app.post("/auth/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 60 ||
      typeof email !== "string" ||
      email.length > 254 ||
      !/^\S+@\S+\.\S+$/.test(email.trim()) ||
      !validPassword(password)
    ) {
      return res.status(400).json({
        message: "Use a name of 2–60 characters, a valid email, and a password of 6–72 characters.",
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
      return res.status(400).json({
        message: "Unable to create an account with those details.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = createToken(newUser);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: publicUser(newUser),
    });
  } catch (error) {
    next(error);
  }
});

// Log in
app.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || email.length > 254 || !validPassword(password, 1)) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    const passwordIsCorrect = await bcrypt.compare(
      password,
      user?.password ?? "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
    );
    if (!user || !passwordIsCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = createToken(user);

    res.status(200).json({
      message: "Login successful",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

// -------------------- Protected Task Routes --------------------
app.get("/auth/me", protect, (req, res) => res.json(publicUser(req.account)));
app.patch("/auth/me", protect, async (req, res, next) => {
  try {
    const keys = Object.keys(req.body);
    if (!keys.length || keys.some((key) => !["name", "preferences"].includes(key)))
      return res
        .status(400)
        .json({ message: "Only your name and preferences can be changed here." });
    const changes = {};
    if (Object.hasOwn(req.body, "name")) {
      if (
        typeof req.body.name !== "string" ||
        req.body.name.trim().length < 2 ||
        req.body.name.trim().length > 60
      )
        return res.status(400).json({ message: "Name must be 2–60 characters." });
      changes.name = req.body.name.trim();
    }
    if (Object.hasOwn(req.body, "preferences")) {
      const parsed = validatePreferencesPatch(req.body.preferences);
      if (!parsed.ok) return res.status(400).json({ message: parsed.message });
      for (const [key, value] of Object.entries(parsed.value))
        changes[`preferences.${key}`] = value;
    }
    if (!Object.keys(changes).length)
      return res.status(400).json({ message: "No changes were supplied." });
    const saved = await User.findOneAndUpdate(
      { _id: req.userId },
      { $set: changes },
      { new: true, runValidators: true },
    );
    if (!saved) return res.status(401).json({ message: "Invalid or expired token" });
    return res.json(publicUser(saved));
  } catch (error) {
    return next(error);
  }
});
app.patch("/auth/password", protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (
      !validPassword(currentPassword, 1) ||
      !validPassword(newPassword, 8) ||
      newPassword !== confirmPassword ||
      newPassword === currentPassword
    )
      return res.status(400).json({
        message:
          "Use your current password and a different new password of at least 8 characters (maximum 72 UTF-8 bytes), with matching confirmation.",
      });
    const current = await User.findOne({ _id: req.userId }).select("+password");
    if (!current || !(await bcrypt.compare(currentPassword, current.password)))
      return res.status(400).json({ message: "Current password could not be verified." });
    const hash = await bcrypt.hash(newPassword, 10);
    const saved = await User.findOneAndUpdate(
      { _id: req.userId, password: current.password },
      { $set: { password: hash }, $inc: { tokenVersion: 1 } },
      { new: true, runValidators: true },
    );
    if (!saved)
      return res.status(409).json({ message: "Your account changed. Please sign in again." });
    return res.json({ token: createToken(saved), user: publicUser(saved) });
  } catch (error) {
    return next(error);
  }
});
app.delete("/auth/account", protect, async (req, res, next) => {
  let transaction;
  try {
    const { currentPassword, confirmation } = req.body;
    if (confirmation !== "DELETE" || !validPassword(currentPassword, 1))
      return res
        .status(400)
        .json({ message: "Enter your current password and type DELETE to confirm." });
    const current = await User.findOne({ _id: req.userId }).select("+password");
    if (!current || !(await bcrypt.compare(currentPassword, current.password)))
      return res.status(400).json({ message: "Current password could not be verified." });
    transaction = await mongoose.startSession();
    await transaction.withTransaction(async () => {
      const account = await User.findOne({ _id: req.userId, password: current.password }).session(
        transaction,
      );
      if (!account) throw Object.assign(new Error("Account changed"), { status: 409 });
      await Task.deleteMany({ user: req.userId }, { session: transaction });
      await User.deleteOne({ _id: req.userId }, { session: transaction });
    });
    return res.json({ message: "Account and tasks deleted." });
  } catch (error) {
    return next(error);
  } finally {
    if (transaction) await transaction.endSession();
  }
});

function validateTaskFields(input) {
  if (
    Object.hasOwn(input, "title") &&
    (typeof input.title !== "string" || !input.title.trim() || input.title.trim().length > 100)
  )
    return "Title must be 1–100 characters.";
  if (
    Object.hasOwn(input, "description") &&
    (typeof input.description !== "string" || input.description.length > 500)
  )
    return "Description must be 500 characters or fewer.";
  if (
    Object.hasOwn(input, "category") &&
    (typeof input.category !== "string" || !input.category.trim() || input.category.length > 60)
  )
    return "Choose a valid category.";
  if (
    Object.hasOwn(input, "status") &&
    !["pending", "in-progress", "completed"].includes(input.status)
  )
    return "Choose a valid status.";
  if (Object.hasOwn(input, "priority") && !["low", "medium", "high"].includes(input.priority))
    return "Choose a valid priority.";
  if (Object.hasOwn(input, "reminderEnabled") && typeof input.reminderEnabled !== "boolean")
    return "Reminder enabled must be a boolean.";
  if (Object.hasOwn(input, "reminderType") && !["daily", "before-due"].includes(input.reminderType))
    return "Choose a valid reminder type.";
  if (
    Object.hasOwn(input, "reminderTime") &&
    (typeof input.reminderTime !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.reminderTime))
  )
    return "Reminder time must use HH:mm.";
  if (
    Object.hasOwn(input, "dueDate") &&
    input.dueDate !== null &&
    input.dueDate !== "" &&
    (typeof input.dueDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(input.dueDate) ||
      Number.isNaN(Date.parse(input.dueDate)))
  )
    return "Choose a valid due date.";
  if (
    Object.hasOwn(input, "checklist") &&
    (!Array.isArray(input.checklist) ||
      input.checklist.length > 20 ||
      input.checklist.some(
        (item) =>
          !item ||
          typeof item !== "object" ||
          typeof item.text !== "string" ||
          !item.text.trim() ||
          item.text.length > 120 ||
          typeof item.completed !== "boolean" ||
          (item._id !== undefined && !mongoose.isValidObjectId(item._id)),
      ))
  )
    return "Use up to 20 checklist items with text and completion state.";
  return null;
}

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
    const validation = validateTaskFields(req.body);
    if (validation) return res.status(400).json({ message: validation });
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
    const validation = validateTaskFields(req.body);
    if (validation) return res.status(400).json({ message: validation });
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

    const previous = await Task.findOne({ _id: req.params.id, user: req.userId });
    if (!previous) return res.status(404).json({ message: "Task not found" });
    if (
      (updates.reminderEnabled ?? previous.reminderEnabled) &&
      (updates.reminderType ?? previous.reminderType) === "before-due" &&
      !(Object.hasOwn(updates, "dueDate") ? updates.dueDate : previous.dueDate)
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
      { $set: updates },
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
  // Return concise errors without logging credentials or connection strings.
  if (error.type === "entity.too.large")
    return res.status(413).json({ message: "This request is too large." });
  if (error instanceof SyntaxError && error.status === 400)
    return res.status(400).json({ message: "Invalid JSON." });
  if (error.status === 409)
    return res.status(409).json({ message: "Your account changed. Please sign in again." });

  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: "Please check the supplied details.",
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      message: "Invalid ID",
    });
  }

  if (error.code === 11000) {
    return res.status(400).json({
      message: "Unable to create an account with those details.",
    });
  }

  res.status(500).json({
    message: "Internal server error",
  });
});

app.use((req, res) => res.status(404).json({ message: "API route not found" }));
export default app;
export { User, Task };
