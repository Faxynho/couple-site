const test = require("node:test");
const assert = require("node:assert/strict");

const { RoomManager } = require("../dist/rooms/RoomManager.js");
const {
  PERSISTENT_DUO_ROOM_CODE,
  PERSISTENT_DUO_DISPLAY_NAME_MAX_LENGTH,
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
