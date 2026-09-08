import app, { initializeApp } from "./app";
import http from "http";
import { initWebsocket } from "./src/utils/websocket";
import { initQueue } from "./src/utils/queue";

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Function to start the server with automatic port increment if needed
const startServer = async (port: number) => {
  try {
    // Initialize database and scheduler first
    await initializeApp();

    // Optional websocket initialization (no-op if disabled or dependency missing)
    initWebsocket(server);
    initQueue(); // optional queue, no-op unless ENABLE_QUEUES=true and bullmq installed

    server.listen(port);

    server.on("error", (e: NodeJS.ErrnoException) => {
      if (e.code === "EADDRINUSE") {
        console.warn(
          `Port ${port} is already in use, trying ${port + 1} instead`
        );
        server.close();
        startServer(port + 1);
      } else {
        console.error("Server error:", e);
      }
    });

    server.on("listening", () => {
      const addr = server.address();
      const actualPort = typeof addr === "object" && addr ? addr.port : port;
      console.log(`✅ Server is running on port ${actualPort}`);
      console.log(
        `📚 API Documentation: http://localhost:${actualPort}/api-docs`
      );
      console.log(`🏠 Root endpoint: http://localhost:${actualPort}/`);
      console.log(`💚 Health check: http://localhost:${actualPort}/health`);
    });

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
