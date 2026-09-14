import { WORLD_CONFIG } from "@/world/config/worldConfig";

export type WorldMobileControlMode = "dpad" | "joystick" | "tap";

export interface WorldInputSettings {
  cameraZoom: number;
  mobileControlMode: WorldMobileControlMode;
}

const STORAGE_KEY = "couple-world-input-settings-v1";

export const DEFAULT_WORLD_INPUT_SETTINGS: WorldInputSettings = {
  cameraZoom: WORLD_CONFIG.camera.zoom,
  mobileControlMode: "dpad",
};

function isControlMode(value: unknown): value is WorldMobileControlMode {
  return value === "dpad" || value === "joystick" || value === "tap";
}

export function getWorldInputSettings(): WorldInputSettings {
  if (typeof window === "undefined") return DEFAULT_WORLD_INPUT_SETTINGS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WORLD_INPUT_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<WorldInputSettings>;
    return {
      cameraZoom: Number.isFinite(parsed.cameraZoom)
        ? Number(parsed.cameraZoom)
        : DEFAULT_WORLD_INPUT_SETTINGS.cameraZoom,
      mobileControlMode: isControlMode(parsed.mobileControlMode)
        ? parsed.mobileControlMode
        : DEFAULT_WORLD_INPUT_SETTINGS.mobileControlMode,
    };
  } catch {
    return DEFAULT_WORLD_INPUT_SETTINGS;
  }
}

export function setWorldInputSettings(settings: WorldInputSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Preferências locais não devem impedir o jogo de funcionar.
  }
}
