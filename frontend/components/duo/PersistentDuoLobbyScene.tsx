"use client";

import Image from "next/image";

interface PersistentDuoLobbySceneProps {
  onWorldClick: () => void;
  onMinigamesClick: () => void;
}

const LOBBY_ASPECT = 941 / 1672;
/** Em celulares altos e estreitos o vídeo é cortado nas laterais; os botões podem passar da largura da tela em no máximo 18%
 *  (as posições abaixo garantem que nenhum botão sai da tela até esse limite). */
const MAX_WIDTH_OVER_SCREEN = 1.18;
/** Em telas largas (PC / tablet deitado) a largura do quadro não passa de 75% da altura da tela. */
const MAX_WIDTH_OVER_HEIGHT = 0.75;

/**
 * Os botões ilustrados ficam em porcentagem sobre a mesma caixa do vídeo de fundo
 * (cobertura por altura, como `object-cover object-top`), então acompanham o fundo em
 * qualquer aparelho. A área clicável é só a parte visível da arte (sem as margens
 * transparentes da imagem), para um botão nunca roubar o toque do outro.
 *
 * Medidas calculadas sobre a print de referência do Galaxy S20 (360 × ~730 px CSS).
 * `art` = recorte visível dentro da imagem original (1024 × 1536); `box` = posição desse recorte no lobby (%).
 */
const ART_SIZE = { width: 1024, height: 1536 } as const;

interface LobbyButtonSpec {
  src: string;
  label: string;
  art: { left: number; top: number; width: number; height: number };
  box: { left: number; top: number; width: number };
}

const WORLD_BUTTON: LobbyButtonSpec = {
  src: "/images/botao-lobby-nosso-mundo.webp",
  label: "Entrar no Nosso Mundo",
  art: { left: 92, top: 38, width: 833, height: 1464 },
  box: { left: 13, top: 22.45, width: 35 },
};

const MINIGAMES_BUTTON: LobbyButtonSpec = {
  src: "/images/botao-lobby-minijogos.webp",
  label: "Abrir Minijogos",
  art: { left: 53, top: 112, width: 921, height: 1335 },
  box: { left: 51.2, top: 24.3, width: 39.3 },
};

function LobbyArtButton({ spec, onClick }: { spec: LobbyButtonSpec; onClick: () => void }) {
  const { art, box } = spec;
  // A altura do recorte segue a proporção da arte (e a da caixa do lobby), então nada fica distorcido.
  const heightPercent = (box.width * LOBBY_ASPECT * art.height) / art.width;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={spec.label}
      title={spec.label}
      className="group pointer-events-auto absolute z-10 block rounded-[22%] bg-transparent p-0 outline-none transition-transform duration-150 [-webkit-tap-highlight-color:transparent] active:scale-[.96] focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      style={{ left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${heightPercent}%` }}
    >
      <Image
        src={spec.src}
        alt=""
        width={ART_SIZE.width}
        height={ART_SIZE.height}
        sizes="(max-width: 768px) 46vw, 340px"
        priority
        draggable={false}
        className="pointer-events-none absolute max-w-none select-none drop-shadow-[0_10px_16px_rgba(20,0,40,0.45)] transition-transform duration-150 group-hover:scale-[1.02]"
        style={{
          width: `${(ART_SIZE.width / art.width) * 100}%`,
          height: `${(ART_SIZE.height / art.height) * 100}%`,
          left: `${(-art.left / art.width) * 100}%`,
          top: `${(-art.top / art.height) * 100}%`,
        }}
      />
      <span className="sr-only">{spec.label}</span>
    </button>
  );
}

export default function PersistentDuoLobbyScene({
  onWorldClick,
  onMinigamesClick,
}: PersistentDuoLobbySceneProps) {
  // Mesmo referencial do vídeo de fundo (`fixed inset-0 object-cover object-top`): a camada ocupa a
  // tela inteira e o "quadro" do lobby tem a largura que o vídeo teria com `cover`
  // (max(largura, altura × proporção)), alinhado ao topo e centralizado, mas com os dois limites acima
  // para que os botões se adaptem a qualquer tela (celular alto, tablet, PC) sem cortar nem ficar gigantes.
  return (
    <section
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
      style={{ containerType: "size" }}
      aria-label="Áreas interativas do lobby"
    >
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: `min(max(100cqw, calc(100cqh * ${LOBBY_ASPECT})), calc(100cqw * ${MAX_WIDTH_OVER_SCREEN}), calc(100cqh * ${MAX_WIDTH_OVER_HEIGHT}))`,
          aspectRatio: "941 / 1672",
        }}
      >
        <LobbyArtButton spec={WORLD_BUTTON} onClick={onWorldClick} />
        <LobbyArtButton spec={MINIGAMES_BUTTON} onClick={onMinigamesClick} />
      </div>
    </section>
  );
}
