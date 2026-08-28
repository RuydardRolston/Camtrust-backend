import { Server } from "socket.io";

let socketInstance = null;

export const initSocket = (server) => {
  socketInstance = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
      credentials: true,
    },
  });

  socketInstance.on("connection", (socket) => {
    socket.on("join:project", (projectId) => {
      socket.join(`project:${projectId}`);
    });

    socket.on("leave:project", (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on("disconnect", () => {
      // cleanup if needed
    });
  });

  return socketInstance;
};

export const getIO = () => {
  if (!socketInstance) {
    throw new Error("Socket.IO not initialized. Call initSocket first.");
  }
  return socketInstance;
};

export const emitToProject = (projectId, event, data) => {
  try {
    const io = getIO();
    io.to(`project:${projectId}`).emit(event, data);
  } catch (error) {
    console.error(`Failed to emit ${event}:`, error.message);
  }
};
