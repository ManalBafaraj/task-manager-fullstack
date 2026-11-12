import "dotenv/config";
import express from "express";
import swaggerUiDist from "swagger-ui-dist";
import api from "./app.js";
import { connectDatabase } from "./db.js";
const app = express();
app.use("/api-docs", express.static(swaggerUiDist.getAbsoluteFSPath(), { index: false }));
app.use(api);
const port = process.env.PORT || 3000;
connectDatabase()
  .then(() => {
    app.listen(port, () => console.log(`TaskFlow API: http://localhost:${port}`));
  })
  .catch(() => {
    console.error("MongoDB connection failed. Check the backend environment configuration.");
    process.exitCode = 1;
  });
