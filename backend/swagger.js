import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Task Management API",
      version: "1.0.0",
      description: "REST API for managing tasks with JWT authentication",
    },

    servers: [
      { url: "/api", description: "Same-origin frontend API" },
      { url: "/", description: "Standalone Express server" },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },

      schemas: {
        RegisterInput: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: {
              type: "string",
              example: "Manal Bafaraj",
            },
            email: {
              type: "string",
              example: "manal@example.com",
            },
            password: {
              type: "string",
              example: "Manal123",
            },
          },
        },

        LoginInput: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              example: "manal@example.com",
            },
            password: {
              type: "string",
              example: "Manal123",
            },
          },
        },

        ChecklistItem: {
          type: "object",
          required: ["text"],
          properties: {
            text: {
              type: "string",
              maxLength: 120,
              example: "Create the database model",
            },
            completed: {
              type: "boolean",
              default: false,
              example: false,
            },
          },
        },

        TaskInput: {
          type: "object",
          required: ["title"],
          properties: {
            title: {
              type: "string",
              example: "Complete TaskFlow project",
            },
            description: {
              type: "string",
              example: "Finish and test the full-stack task manager",
            },
            status: {
              type: "string",
              enum: ["pending", "in-progress", "completed"],
              default: "pending",
              example: "in-progress",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              default: "medium",
              example: "high",
            },
            category: {
              type: "string",
              default: "General",
              example: "Development",
            },
            dueDate: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2027-01-18T00:00:00.000Z",
            },
            reminderEnabled: {
              type: "boolean",
              default: false,
              example: true,
            },
            reminderType: {
              type: "string",
              enum: ["daily", "before-due"],
              default: "before-due",
              example: "before-due",
            },
            reminderTime: {
              type: "string",
              pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$",
              default: "09:00",
              example: "09:00",
            },
            checklist: {
              type: "array",
              maxItems: 20,
              items: {
                $ref: "#/components/schemas/ChecklistItem",
              },
            },
          },
        },

        Task: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "672f1234567890abcdef1234",
            },
            title: {
              type: "string",
              example: "Complete TaskFlow project",
            },
            description: {
              type: "string",
              example: "Finish and test the full-stack task manager",
            },
            status: {
              type: "string",
              enum: ["pending", "in-progress", "completed"],
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
            },
            category: {
              type: "string",
            },
            dueDate: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            reminderEnabled: {
              type: "boolean",
            },
            reminderType: {
              type: "string",
              enum: ["daily", "before-due"],
            },
            reminderTime: {
              type: "string",
              example: "09:00",
            },
            checklist: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ChecklistItem",
              },
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            user: {
              type: "string",
            },
          },
        },
      },
    },

    paths: {
      "/auth/register": {
        post: {
          tags: ["Authentication"],
          summary: "Register a new user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/RegisterInput",
                },
              },
            },
          },
          responses: {
            201: {
              description: "User registered successfully",
            },
            400: {
              description: "Invalid input",
            },
            409: {
              description: "Email already registered",
            },
          },
        },
      },

      "/auth/login": {
        post: {
          tags: ["Authentication"],
          summary: "Log in",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LoginInput",
                },
              },
            },
          },
          responses: {
            200: {
              description: "Login successful",
            },
            401: {
              description: "Invalid email or password",
            },
          },
        },
      },

      "/tasks": {
        get: {
          tags: ["Tasks"],
          summary: "Get all tasks",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Tasks returned successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/Task",
                    },
                  },
                },
              },
            },
            401: {
              description: "Authentication required",
            },
          },
        },

        post: {
          tags: ["Tasks"],
          summary: "Create a new task",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TaskInput",
                },
              },
            },
          },
          responses: {
            201: {
              description: "Task created successfully",
            },
            400: {
              description: "Invalid input",
            },
            401: {
              description: "Authentication required",
            },
          },
        },
      },

      "/tasks/{id}": {
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],

        get: {
          tags: ["Tasks"],
          summary: "Get one task",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Task returned successfully",
            },
            404: {
              description: "Task not found",
            },
          },
        },

        patch: {
          tags: ["Tasks"],
          summary: "Update a task",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TaskInput",
                },
              },
            },
          },
          responses: {
            200: {
              description: "Task updated successfully",
            },
            404: {
              description: "Task not found",
            },
          },
        },

        delete: {
          tags: ["Tasks"],
          summary: "Delete a task",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Task deleted successfully",
            },
            404: {
              description: "Task not found",
            },
          },
        },
      },
    },
  },

  apis: [],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const protectedOperation = (summary, method) => ({
  summary,
  security: [{ bearerAuth: [] }],
  ...(method === "get"
    ? {}
    : {
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
      }),
  responses: {
    200: { description: "Success" },
    400: { description: "Invalid details" },
    401: { description: "Authentication required" },
  },
});
swaggerSpec.paths["/auth/me"] = {
  get: protectedOperation("Read your profile and preferences", "get"),
  patch: protectedOperation(
    "Update your name or preferences (focusMinutes, completionSound, browserNotifications, remindersEnabled, defaultReminderTime, appearance)",
    "patch",
  ),
};
swaggerSpec.paths["/auth/password"] = {
  patch: protectedOperation(
    "Change password: currentPassword, newPassword, confirmPassword; returns replacement token and invalidates other sessions",
    "patch",
  ),
};
swaggerSpec.paths["/auth/account"] = {
  delete: protectedOperation(
    "Permanently delete your account and tasks transactionally: currentPassword and confirmation DELETE",
    "delete",
  ),
};

export default swaggerSpec;
