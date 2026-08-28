import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { RoomManager } from "./rooms/RoomManager";
import { registerSocketHandlers } from "./socket/socketHandlers";
import { accountsRouter } from "./accounts/accountsRoutes";
import { accountStore } from "./accounts/AccountStore";

const PORT = Number(process.env.PORT) || 4000;
// Remove uma barra "/" no final por engano (ex.: CLIENT_ORIGIN=http://localhost:3000/)
// — o header Origin que o navegador manda nunca tem barra no final, então
// deixar passar seria um CORS quebrado silenciosamente.
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN || "http://localhost:3000").replace(/\/+$/, "");

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
// Limite maior que o padrão (100kb) para caber a foto de perfil em base64
// (já redimensionada/comprimida no navegador antes de ser enviada).
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/accounts", accountsRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

const roomManager = new RoomManager();
registerSocketHandlers(io, roomManager);

// Limpa salas abandonadas a cada 10 minutos.
setInterval(() => roomManager.sweepEmptyRooms(), 1000 * 60 * 10);

// Garante que backend/data/accounts.json já esteja carregado em memória
// antes de aceitar qualquer request (rotas REST e o primeiro room:create).
accountStore.ready().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🎮 Servidor de jogos cooperativos rodando em http://localhost:${PORT}`);
  });
});
