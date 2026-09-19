"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getRoomPlayerId } from "@/lib/playerId";
import { getActiveAccountId } from "@/lib/accountSession";
import { DrawGuessCanvasAction, DrawGuessPreview, DrawGuessState } from "@/lib/drawGuessTypes";

interface SyncResult { ok: boolean; gameState?: DrawGuessState }
interface AckResult { ok: boolean; error?: string }

function actionId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}:${crypto.randomUUID()}`;
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

export function useDrawGuessGame(roomCode: string) {
  const [state, setState] = useState<DrawGuessState | null>(null);
  const [preview, setPreview] = useState<DrawGuessPreview | null>(null);
  const [typingText, setTypingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const lastTypingSentAt = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTyping = useRef("");

  const sync = useCallback(() => {
    getSocket().emit("room:sync", {
      code: roomCode,
      playerId: getRoomPlayerId(roomCode),
      accountId: getActiveAccountId(),
      presence: "minigame",
    }, (response: SyncResult) => {
      if (response.ok && response.gameState) setState(response.gameState);
    });
  }, [roomCode]);

  useEffect(() => {
    const socket = getSocket();
    const onState = (next: DrawGuessState | null) => {
      setState(next);
      if (!next || next.phase !== "playing") setTypingText("");
    };
    const onPreview = (next: DrawGuessPreview) => setPreview({ ...next, points: [...next.points] });
    const onTyping = (payload: { text?: unknown }) => setTypingText(typeof payload?.text === "string" ? payload.text : "");
    socket.on("game:state", onState);
    socket.on("drawguess:preview", onPreview);
    socket.on("drawguess:typing", onTyping);
    socket.on("connect", sync);
    sync();
    return () => {
      socket.off("game:state", onState);
      socket.off("drawguess:preview", onPreview);
      socket.off("drawguess:typing", onTyping);
      socket.off("connect", sync);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [sync]);

  const submitGuess = useCallback((guess: string) => {
    getSocket().emit("drawguess:guess", { id: actionId("guess"), guess }, (response: AckResult) => {
      if (!response.ok) setError(response.error ?? "Não foi possível enviar a tentativa.");
    });
  }, []);

  const emitTyping = useCallback((text: string) => {
    pendingTyping.current = text.slice(0, 80);
    const send = () => {
      typingTimer.current = null;
      lastTypingSentAt.current = Date.now();
      getSocket().emit("drawguess:typing", { text: pendingTyping.current });
    };
    const wait = Math.max(0, 70 - (Date.now() - lastTypingSentAt.current));
    if (wait === 0) send();
    else if (!typingTimer.current) typingTimer.current = setTimeout(send, wait);
  }, []);

  const sendPreview = useCallback((payload: DrawGuessPreview) => {
    getSocket().emit("drawguess:preview", payload);
  }, []);

  const sendCanvasAction = useCallback((action: DrawGuessCanvasAction) => {
    getSocket().emit("drawguess:canvasAction", { action }, (response: AckResult) => {
      if (!response.ok) {
        setError(response.error ?? "O traço não foi salvo.");
        sync();
      }
    });
  }, [sync]);

  const changeHistory = useCallback((action: "undo" | "redo" | "clear") => {
    getSocket().emit("drawguess:history", { action, id: action === "clear" ? actionId("clear") : undefined }, (response: AckResult) => {
      if (!response.ok) setError(response.error ?? "Não foi possível alterar o desenho.");
    });
  }, []);

  const newGame = useCallback(() => {
    getSocket().emit("drawguess:newGame", (response: AckResult) => {
      if (!response.ok) setError(response.error ?? "Não foi possível iniciar outra partida.");
    });
  }, []);

  return { state, preview, typingText, error, submitGuess, emitTyping, sendPreview, sendCanvasAction, changeHistory, newGame, sync };
}
