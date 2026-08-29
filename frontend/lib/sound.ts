export type SoundEffect =
  | "puzzleSnap"
  | "memoryFlip"
  | "memoryMatch"
  | "memoryWrong"
  | "memoryCombo"
  | "victory"
  | "sudokuPlace"
  | "quizSelect"
  | "crosswordCorrect"
  | "wordsearchFound"
  | "colorsResult"
  | "rpgSelect"
  | "rpgResolve"
  | "rpgDamage"
  | "rpgHeal"
  | "rpgEvade"
  | "termoSubmit"
  | "termoInvalid"
  | "termoReveal"
  | "termoWord"
  | "termoDefeat"
  | "termoDraw";

const SOUND_EVENT = "couple-site:sound-change";
const SOUND_STORAGE_KEY = "couple-site:sound-enabled";
let audioContext: AudioContext | null = null;

export function getSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SOUND_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
    window.dispatchEvent(new Event(SOUND_EVENT));
  } catch {
    // O controle de áudio é opcional e não pode interromper uma partida.
  }
}

export function subscribeSoundEnabled(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SOUND_EVENT, listener);
  return () => window.removeEventListener(SOUND_EVENT, listener);
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Constructor = (window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined;
  if (!Constructor) return null;
  if (!audioContext) {
    try {
      audioContext = new Constructor();
    } catch {
      return null;
    }
  }
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function tone(context: AudioContext, frequency: number, duration: number, delay = 0, volume = 0.055, type: OscillatorType = "sine") {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function sweepTone(context: AudioContext, startFrequency: number, endFrequency: number, duration: number, volume: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime;
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(startFrequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + 0.09);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

export function playSoundEffect(effect: SoundEffect) {
  try {
    if (!getSoundEnabled()) return;
    const context = getContext();
    if (!context) return;

    switch (effect) {
      case "puzzleSnap": sweepTone(context, 660, 880, 0.22, 0.18); break;
      case "memoryFlip": tone(context, 390, 0.045, 0, 0.045, "triangle"); break;
      case "memoryMatch": tone(context, 523, 0.075, 0, 0.055); tone(context, 659, 0.095, 0.06, 0.05); break;
      case "memoryWrong": tone(context, 185, 0.1, 0, 0.045); tone(context, 145, 0.115, 0.065, 0.035, "triangle"); break;
      case "memoryCombo": tone(context, 659, 0.065, 0, 0.05); tone(context, 784, 0.075, 0.048, 0.055); tone(context, 988, 0.09, 0.1, 0.05); break;
      case "victory": tone(context, 523, 0.095, 0, 0.05); tone(context, 659, 0.095, 0.085, 0.05); tone(context, 784, 0.115, 0.17, 0.055); tone(context, 1046, 0.165, 0.265, 0.05); break;
      case "sudokuPlace": tone(context, 520, 0.055, 0, 0.04, "triangle"); break;
      case "quizSelect": tone(context, 470, 0.06, 0, 0.04); break;
      case "crosswordCorrect": tone(context, 570, 0.07, 0, 0.045); tone(context, 760, 0.08, 0.06, 0.04); break;
      case "wordsearchFound": tone(context, 480, 0.065, 0, 0.045); tone(context, 720, 0.09, 0.06, 0.045); break;
      case "colorsResult": tone(context, 440, 0.07, 0, 0.04); tone(context, 620, 0.08, 0.06, 0.04); break;
      case "rpgSelect": tone(context, 330, 0.06, 0, 0.035, "triangle"); tone(context, 495, 0.08, 0.045, 0.045); break;
      case "rpgResolve": tone(context, 280, 0.09, 0, 0.035, "triangle"); tone(context, 420, 0.1, 0.065, 0.045); tone(context, 560, 0.12, 0.14, 0.05); break;
      case "rpgDamage":
        tone(context, 210, 0.065, 0, 0.055, "square");
        tone(context, 135, 0.16, 0.035, 0.045, "sine");
        tone(context, 92, 0.19, 0.09, 0.025, "triangle");
        break;
      case "rpgHeal": tone(context, 523, 0.08, 0, 0.04); tone(context, 659, 0.1, 0.07, 0.045); tone(context, 784, 0.12, 0.15, 0.05); break;
      case "rpgEvade": tone(context, 740, 0.06, 0, 0.045, "triangle"); tone(context, 990, 0.09, 0.06, 0.05, "triangle"); break;
      case "termoSubmit": tone(context, 360, 0.055, 0, 0.04, "triangle"); tone(context, 480, 0.065, 0.04, 0.04); break;
      case "termoInvalid": tone(context, 190, 0.09, 0, 0.04, "triangle"); tone(context, 150, 0.11, 0.06, 0.035); break;
      case "termoReveal": tone(context, 510, 0.055, 0, 0.035); break;
      case "termoWord": tone(context, 523, 0.075, 0, 0.045); tone(context, 659, 0.09, 0.06, 0.045); tone(context, 784, 0.11, 0.13, 0.05); break;
      case "termoDefeat": tone(context, 294, 0.11, 0, 0.04, "triangle"); tone(context, 220, 0.15, 0.1, 0.035); break;
      case "termoDraw": tone(context, 392, 0.09, 0, 0.04); tone(context, 440, 0.1, 0.08, 0.04); break;
    }
  } catch {
    // Áudio é apenas um extra decorativo; falhas silenciosas não afetam o jogo.
  }
}
