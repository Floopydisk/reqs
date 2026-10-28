import app, { initializeApp } from "./app";
import http from "http";
import { initWebsocket } from "./utils/websocket";
import { initQueue } from "./utils/queue";

const PORT = process.env.PORT;
const server = http.createServer(app);

// Function to start the server
const startServer = async (port: number) => {
  try {
    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server is running on port ${port} (0.0.0.0)`);
      console.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
      console.log(`🏠 Root endpoint: http://localhost:${port}/`);
      console.log(`💚 Health check: http://localhost:${port}/health`);
    });

    server.on("error", (e: NodeJS.ErrnoException) => {
      console.error("Server error:", e);
    });

    // Initialize database and scheduler in background
    initializeApp().catch((err) => {
      console.warn("App initialization warning:", err);
    });

    // Optional websocket initialization (no-op if disabled or dependency missing)
    initWebsocket(server);
    initQueue(); // optional queue, no-op unless ENABLE_QUEUES=true and bullmq installed

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err: any) => {
      console.log("UNHANDLED REJECTION! 💥 Shutting down...");
      console.log(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer(Number(PORT));
