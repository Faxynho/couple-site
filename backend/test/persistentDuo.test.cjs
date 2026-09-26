const test = require("node:test");
const assert = require("node:assert/strict");

const { RoomManager } = require("../dist/rooms/RoomManager.js");
const {
  PERSISTENT_DUO_ROOM_CODE,
  PERSISTENT_DUO_DISPLAY_NAME_MAX_LENGTH,
  PersistentDuoStore,
  SHARED_DRAWING_MAX_POINTS_PER_STROKE,
  normalizeSharedDrawingStroke,
  normalizePersistentDuoDisplayName,
} = require("../dist/rooms/persistentDuo.js");

test("nome visual do lobby é normalizado e limitado sem alterar o identificador", () => {
  const longName = `  Nosso   ${"Cantinho ".repeat(12)}  `;
  const displayName = normalizePersistentDuoDisplayName(longName);

  assert.equal(displayName.length, PERSISTENT_DUO_DISPLAY_NAME_MAX_LENGTH);
  assert.equal(displayName.startsWith("Nosso Cantinho"), true);
  assert.equal(normalizePersistentDuoDisplayName("   "), null);
  assert.equal(PERSISTENT_DUO_ROOM_CODE, "PERSISTENT_DUO");
});

test("a sala Duo fixa é recriada sob demanda com o mesmo identificador e sem host", () => {
  const manager = new RoomManager();
  const first = manager.getOrCreatePersistentDuoRoom();
  const second = manager.getOrCreatePersistentDuoRoom();

  assert.equal(first, second);
  assert.equal(first.code, PERSISTENT_DUO_ROOM_CODE);
  assert.equal(first.roomKind, "persistent-duo");
  assert.equal(first.hostId, null);

  first.createdAt = 0;
  manager.sweepEmptyRooms();
  const recreated = manager.getOrCreatePersistentDuoRoom();
  assert.notEqual(recreated, first);
  assert.equal(recreated.code, PERSISTENT_DUO_ROOM_CODE);
});

test("apenas andre e flavia ocupam os dois slots lógicos e ambos podem gerenciar", () => {
  const room = new RoomManager().getOrCreatePersistentDuoRoom();

  assert.equal(room.addPlayer("visitor", "Visitante"), null);
  assert.ok(room.addPlayer("andre", "André", "andre"));
  assert.ok(room.addPlayer("flavia", "Flávia", "flavia"));
  assert.equal(room.players.size, 2);
  assert.equal(room.hostId, null);
  assert.equal(room.canManage("andre"), true);
  assert.equal(room.canManage("flavia"), true);
});

test("nova composição inicia montada e cada decoração preserva seu slot", () => {
  const store = new PersistentDuoStore(false);
  const initial = store.getPetRoom("nix");
  assert.equal(initial.slots["floor-lamp"], "lamp");
  assert.equal(initial.slots["floor-bed"], "bed");
  const first = store.togglePetDecoration("nix", "heart-frame");
  assert.equal(first.slots["wall-heart"], undefined);
  assert.equal(first.revision, 1);
  assert.equal(store.getPetRoom("max").slots["wall-heart"], "heart-frame");

  store.togglePetDecoration("nix", "paw-poster");
  assert.equal(store.getPetRoom("nix").slots["wall-paw"], undefined);
  store.togglePetDecoration("nix", "paw-poster");
  assert.equal(store.getPetRoom("nix").slots["wall-paw"], "paw-poster");
  assert.equal(store.getPetRoom("nix").slots["floor-lamp"], "lamp");
  assert.equal(store.getPetRoom("nix").revision, 3);
  assert.equal(store.togglePetDecoration("max", "unknown"), null);
  assert.equal(store.getPetRoom("max").revision, 0);
});

test("presença agrega múltiplas abas sem duplicar a conta nem criar slot fantasma", () => {
  const room = new RoomManager().getOrCreatePersistentDuoRoom();
  room.addPlayer("andre", "André", "andre");
  room.addPlayer("flavia", "Flávia", "flavia");
  room.setSocketId("andre", "andre-tab-1", "lobby");
  room.setSocketId("andre", "andre-tab-2", "world");
  room.setSocketId("flavia", "flavia-tab-1", "lobby");

  assert.deepEqual(room.getPersistentDuoPresence(), { andre: "world", flavia: "lobby" });
  assert.equal(room.arePersistentDuoPlayersInLobby(), false);

  room.markDisconnected("andre", "andre-tab-2");
  assert.equal(room.players.get("andre").connected, true);
  assert.deepEqual(room.getPersistentDuoPresence(), { andre: "lobby", flavia: "lobby" });
  assert.equal(room.arePersistentDuoPlayersInLobby(), true);

  room.markDisconnected("andre", "andre-tab-1");
  assert.equal(room.players.get("andre").connected, false);
  assert.deepEqual(room.getPersistentDuoPresence(), { andre: "offline", flavia: "lobby" });
});

test("iniciar e voltar de um minijogo atualiza a presença dos dois", () => {
  const room = new RoomManager().getOrCreatePersistentDuoRoom();
  room.addPlayer("andre", "André", "andre");
  room.addPlayer("flavia", "Flávia", "flavia");
  room.setSocketId("andre", "a", "lobby");
  room.setSocketId("flavia", "f", "lobby");
  room.selectGame("sudoku");
  room.startGame();

  assert.deepEqual(room.getPersistentDuoPresence(), { andre: "minigame", flavia: "minigame" });
  room.backToConfig();
  assert.deepEqual(room.getPersistentDuoPresence(), { andre: "lobby", flavia: "lobby" });
});

test("traços do quadro aceitam apenas formato, paleta, tamanho e coordenadas seguros", () => {
  const valid = normalizeSharedDrawingStroke({
    id: "stroke_valid_123",
    tool: "brush",
    color: "#EF4444",
    size: 0.014,
    points: [{ x: 0 }, { x: 0.25, y: 0.75 }],
  });
  assert.equal(valid, null, "ponto sem y deve ser rejeitado");

  const normalized = normalizeSharedDrawingStroke({
    id: "stroke_valid_456",
    tool: "eraser",
    color: "#FFFFFF",
    size: 0.026,
    points: [{ x: 0.1234567, y: 0.7654321 }],
  });
  assert.deepEqual(normalized, {
    id: "stroke_valid_456",
    tool: "eraser",
    color: "#ffffff",
    size: 0.026,
    points: [{ x: 0.12346, y: 0.76543 }],
  });
  assert.equal(normalizeSharedDrawingStroke({ ...normalized, color: "javascript:red" }), null);
  assert.equal(normalizeSharedDrawingStroke({ ...normalized, size: 999 }), null);
  assert.equal(normalizeSharedDrawingStroke({ ...normalized, points: [{ x: -0.1, y: 0.5 }] }), null);
});

test("traços do quadro aceitam cores hexadecimais personalizadas seguras", () => {
  const normalized = normalizeSharedDrawingStroke({
    id: "stroke_custom_color",
    tool: "brush",
    color: "#12AbEf",
    size: 0.014,
    points: [{ x: 0.25, y: 0.75 }],
  });

  assert.equal(normalized.color, "#12abef");
  assert.equal(normalizeSharedDrawingStroke({ ...normalized, color: "red" }), null);
  assert.equal(normalizeSharedDrawingStroke({ ...normalized, color: "#12345g" }), null);
});

test("desfazer e refazer atualizam o estado compartilhado do quadro", () => {
  const store = new PersistentDuoStore(false);
  const first = {
    id: "stroke_history_1",
    tool: "brush",
    color: "#123456",
    size: 0.014,
    points: [{ x: 0.1, y: 0.2 }],
  };
  const second = { ...first, id: "stroke_history_2", color: "#abcdef" };

  assert.ok(store.addDrawingStroke(first).stroke);
  assert.ok(store.addDrawingStroke(second).stroke);
  const undone = store.undoDrawingStroke().board;
  assert.deepEqual(undone.strokes.map((stroke) => stroke.id), ["stroke_history_1"]);
  assert.equal(undone.canUndo, true);
  assert.equal(undone.canRedo, true);

  const redone = store.redoDrawingStroke().board;
  assert.deepEqual(redone.strokes.map((stroke) => stroke.id), ["stroke_history_1", "stroke_history_2"]);
  assert.equal(redone.canRedo, false);

  store.undoDrawingStroke();
  store.addDrawingStroke({ ...second, id: "stroke_history_3" });
  assert.equal(store.getDrawingBoard().canRedo, false, "um traço novo limpa o histórico de refazer");
});

test("payloads gigantes do quadro são rejeitados", () => {
  const points = Array.from({ length: SHARED_DRAWING_MAX_POINTS_PER_STROKE + 1 }, () => ({ x: 0.5, y: 0.5 }));
  assert.equal(normalizeSharedDrawingStroke({
    id: "stroke_too_large",
    tool: "brush",
    color: "#111827",
    size: 0.006,
    points,
  }), null);
});
