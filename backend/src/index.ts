import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { RoomManager } from "./rooms/RoomManager";
import { registerSocketHandlers } from "./socket/socketHandlers";
import { accountsRouter } from "./accounts/accountsRoutes";
import { accountStore } from "./accounts/AccountStore";
import { persistentDuoStore } from "./rooms/persistentDuo";
import { worldStore } from "./world/WorldStore";
import { idleRouter } from "./idle/idleRoutes";
import { idleDevStore, idleStore } from "./idle/IdleStore";
import { petRouter } from "./pets/petRoutes";

const PORT = Number(process.env.PORT) || 4000;

// CLIENT_ORIGIN aceita uma URL única OU uma lista separada por vírgula
// (ex.: "https://meusite.vercel.app,https://meusite-git-main-usuario.vercel.app")
// — útil porque a Vercel gera uma URL de produção E URLs de preview
// diferentes, e um mismatch aqui quebra o CORS silenciosamente (o navegador
// bloqueia a resposta antes mesmo dela chegar no front, e o front só vê um
// "failed to fetch" genérico).
// Remove uma barra "/" no final por engano (ex.: CLIENT_ORIGIN=https://site.vercel.app/)
// — o header Origin que o navegador manda nunca tem barra no final, então
// deixar passar seria um CORS quebrado silenciosamente.
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

// Log na subida do servidor — assim dá pra conferir nos logs de deploy do
// Railway se a variável CLIENT_ORIGIN chegou com o valor certo, sem precisar
// adivinhar a partir do sintoma no navegador.
console.log("🌐 Origens permitidas (CLIENT_ORIGIN):", ALLOWED_ORIGINS);

const corsOriginCheck: cors.CorsOptions["origin"] = (origin, callback) => {
  // Requests sem header Origin (ex.: health check, curl) sempre passam.
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    callback(null, true);
    return;
  }
  console.warn(`🚫 CORS bloqueou origem não permitida: "${origin}". Configuradas: ${ALLOWED_ORIGINS.join(", ")}`);
  callback(new Error("Origem não permitida por CORS"));
};

const app = express();
app.use(cors({ origin: corsOriginCheck }));
// Limite maior que o padrão (100kb) para caber a foto de perfil em base64
// (já redimensionada/comprimida no navegador antes de ser enviada).
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/accounts", accountsRouter);
app.use("/api/idle", idleRouter);
app.use("/api/pets", petRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: corsOriginCheck, methods: ["GET", "POST"] },
});

const roomManager = new RoomManager();
registerSocketHandlers(io, roomManager);
idleStore.subscribe((snapshot) => io.emit("idle:state", snapshot));
idleDevStore.subscribe((snapshot) => io.emit("idle:state", snapshot));
persistentDuoStore.subscribePetCare((snapshot) => io.emit("petCare:changed", snapshot));

// Limpa salas abandonadas a cada 10 minutos.
setInterval(() => roomManager.sweepEmptyRooms(), 1000 * 60 * 10);

// Garante que backend/data/accounts.json já esteja carregado em memória
// antes de aceitar qualquer request (rotas REST e o primeiro room:create).
Promise.all([accountStore.ready(), persistentDuoStore.ready(), worldStore.ready(), idleStore.ready(), idleDevStore.ready()]).then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🎮 Servidor de jogos cooperativos rodando em http://localhost:${PORT}`);
  });
});
