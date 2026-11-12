import mongoose from "mongoose";
let connectionPromise;
export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!process.env.MONGODB_URI) throw new Error("Database configuration is unavailable");
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI, {
        dbName: "task-api",
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 8000,
        bufferCommands: false,
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }
  return connectionPromise;
}
