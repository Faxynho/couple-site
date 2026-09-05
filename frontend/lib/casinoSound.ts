"use client";

import { getSoundEnabled } from "@/lib/sound";

export type CasinoSound =
  | "chip"
  | "select"
  | "cash"
  | "mineSafe"
  | "mineBoom"
  | "slotSpin"
  | "slotWin"
  | "slotLose"
  | "rouletteSpin"
  | "rouletteLand"
  | "fortuneSpin"
  | "fortuneLand"
  | "raceStart"
  | "raceFinish"
  | "diceRoll"
  | "diceLand"
  | "hiloFlip"
  | "hiloWin"
  | "hiloLose"
  | "crash"
  | "betWin"
  | "betLose"
  | "coinFlip"
  | "coinLand"
  | "revive"
  | "bankrupt";

let context: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined" || !getSoundEnabled()) return null;
  const AudioCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  try {
    if (!context) context = new AudioCtor();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

function tone(c: AudioContext, freq: number, duration: number, delay = 0, volume = 0.04, type: OscillatorType = "sine", endFreq?: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  const start = c.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

function noise(c: AudioContext, duration: number, delay = 0, volume = 0.025) {
  const length = Math.max(1, Math.floor(c.sampleRate * duration));
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = c.createBufferSource();
  const gain = c.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain).connect(c.destination);
  source.start(c.currentTime + delay);
}

export function playCasinoSound(sound: CasinoSound) {
  const c = ctx();
  if (!c) return;
  try {
    switch (sound) {
      case "chip": tone(c, 820, .055, 0, .025, "triangle"); tone(c, 1120, .045, .045, .018, "triangle"); break;
      case "select": tone(c, 430, .06, 0, .025); tone(c, 650, .07, .05, .025); break;
      case "cash": tone(c, 660, .07, 0, .03); tone(c, 880, .08, .055, .035); tone(c, 1120, .1, .115, .03); break;
      case "mineSafe": tone(c, 520, .055, 0, .025, "triangle"); break;
      case "mineBoom": noise(c, .22, 0, .045); tone(c, 120, .24, 0, .045, "sawtooth", 58); break;
      case "slotSpin": for (let i = 0; i < 8; i += 1) tone(c, 310 + (i % 3) * 45, .035, i * .055, .018, "square"); break;
      case "slotWin": tone(c, 523, .075, 0, .035); tone(c, 659, .08, .06, .035); tone(c, 784, .11, .125, .04); break;
      case "slotLose": tone(c, 210, .09, 0, .03, "triangle"); tone(c, 165, .12, .07, .025, "triangle"); break;
      case "rouletteSpin": for (let i = 0; i < 10; i += 1) tone(c, 650 + (i % 2) * 120, .025, i * .06, .012, "triangle"); break;
      case "rouletteLand": tone(c, 260, .06, 0, .035, "square"); tone(c, 520, .11, .055, .03); break;
      case "fortuneSpin": for (let i = 0; i < 8; i += 1) tone(c, 480 + i * 18, .025, i * .07, .012, "triangle"); break;
      case "fortuneLand": tone(c, 440, .07, 0, .03); tone(c, 660, .09, .065, .035); break;
      case "raceStart": tone(c, 520, .07, 0, .03); tone(c, 720, .08, .09, .03); tone(c, 980, .1, .18, .035); break;
      case "raceFinish": tone(c, 660, .08, 0, .03); tone(c, 880, .09, .07, .035); tone(c, 1180, .13, .15, .035); break;
      case "diceRoll": noise(c, .12, 0, .018); tone(c, 260, .04, .06, .025, "square"); tone(c, 330, .04, .16, .025, "square"); break;
      case "diceLand": tone(c, 190, .055, 0, .03, "square"); tone(c, 240, .055, .055, .028, "square"); break;
      case "hiloFlip": tone(c, 360, .05, 0, .025, "triangle", 740); break;
      case "hiloWin": tone(c, 620, .07, 0, .03); tone(c, 840, .09, .065, .035); break;
      case "hiloLose": tone(c, 250, .1, 0, .03, "triangle"); tone(c, 175, .14, .08, .025); break;
      case "crash": noise(c, .2, 0, .035); tone(c, 180, .22, 0, .035, "sawtooth", 70); break;
      case "betWin": tone(c, 523, .075, 0, .035); tone(c, 659, .085, .06, .04); tone(c, 784, .1, .13, .045); tone(c, 1046, .13, .21, .035); break;
      case "betLose": tone(c, 247, .1, 0, .032, "triangle"); tone(c, 196, .14, .085, .03, "triangle"); tone(c, 131, .18, .18, .024, "sine"); break;
      case "coinFlip": for (let i = 0; i < 9; i += 1) tone(c, 520 + (i % 3) * 90, .025, i * .085, .014, "triangle"); break;
      case "coinLand": tone(c, 310, .055, 0, .035, "square"); tone(c, 620, .09, .055, .03, "triangle"); break;
      case "revive": tone(c, 523, .08, 0, .035); tone(c, 659, .08, .07, .04); tone(c, 784, .1, .14, .04); tone(c, 1046, .16, .22, .035); break;
      case "bankrupt": tone(c, 220, .12, 0, .035, "triangle"); tone(c, 165, .16, .1, .03); tone(c, 110, .2, .2, .025); break;
    }
  } catch {
    // Áudio é decorativo; qualquer falha não pode interromper a partida.
  }
}
