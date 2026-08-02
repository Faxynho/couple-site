import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { RoomManager } from "./rooms/RoomManager";
import { registerSocketHandlers } from "./socket/socketHandlers";

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

const roomManager = new RoomManager();
registerSocketHandlers(io, roomManager);

// Limpa salas abandonadas a cada 10 minutos.
setInterval(() => roomManager.sweepEmptyRooms(), 1000 * 60 * 10);

httpServer.listen(PORT, () => {
  console.log(`🎮 Servidor de jogos cooperativos rodando em http://localhost:${PORT}`);
});
