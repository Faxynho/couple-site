"use client";

interface PersistentDuoLobbySceneProps {
  onWorldClick: () => void;
  onMinigamesClick: () => void;
}

const LOBBY_ASPECT = 941 / 1672;

export default function PersistentDuoLobbyScene({
  onWorldClick,
  onMinigamesClick,
}: PersistentDuoLobbySceneProps) {
  return (
    <section className="absolute inset-0 overflow-hidden" aria-label="Áreas interativas do lobby">
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: `max(100vw, calc(100dvh * ${LOBBY_ASPECT}))`,
          aspectRatio: "941 / 1672",
        }}
      >
        <button
          type="button"
          onClick={onWorldClick}
          aria-label="Entrar no Nosso Mundo"
          title="Entrar no Nosso Mundo"
          className="absolute z-10 rounded-[18%] bg-transparent outline-none [-webkit-tap-highlight-color:transparent] focus-visible:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          style={{
            left: "8.5%",
            top: "18%",
            width: "38.5%",
            height: "38.5%",
          }}
        >
          <span className="sr-only">Entrar no Nosso Mundo</span>
        </button>

        <button
          type="button"
          onClick={onMinigamesClick}
          aria-label="Abrir Minijogos"
          title="Abrir Minijogos"
          className="absolute z-10 rounded-[16%] bg-transparent outline-none [-webkit-tap-highlight-color:transparent] focus-visible:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          style={{
            left: "58%",
            top: "22.5%",
            width: "37.5%",
            height: "34%",
          }}
        >
          <span className="sr-only">Abrir Minijogos</span>
        </button>
      </div>
    </section>
  );
}
