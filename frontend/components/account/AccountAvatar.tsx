"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AccountId } from "@/lib/accountSession";
import {
  ensureAccountProfilesLoaded,
  getAccountProfilesSnapshot,
  getServerAccountProfilesSnapshot,
  subscribeAccountProfiles,
} from "@/lib/accountProfilesStore";
import { getBorderFrameGeometry, getProfileBorder } from "@/lib/profileBorders";

interface AccountAvatarProps {
  name: string;
  photo?: string | null;
  /** Dá um degradê de cor consistente por conta — omitido para o Visitante,
   *  que cai no degradê neutro (a menos que `fallbackColor` seja informado). */
  accountId?: AccountId;
  /** Cor sólida usada no lugar do degradê neutro quando não há conta nem foto
   *  — ex.: a cor de identificação já atribuída ao jogador na sala, pra dois
   *  visitantes continuarem visualmente distinguíveis um do outro. */
  fallbackColor?: string;
  size?: number;
  className?: string;
  /** Borda (moldura) do avatar. Normalmente NÃO se passa nada: com `accountId`,
   *  o avatar descobre sozinho a borda equipada pela conta — é assim que ela
   *  aparece em todo o site. Passe um id para forçar uma borda (pré-visualização
   *  na loja de bordas) ou `null` para forçar "sem borda". */
  border?: string | null;
}

const ACCENT_GRADIENT: Record<AccountId, string> = {
  andre: "linear-gradient(135deg, #C9E0F2, #8FB0DE)",
  flavia: "linear-gradient(135deg, #F6D3DE, #E893AA)",
};

const NEUTRAL_GRADIENT = "linear-gradient(135deg, #DFCBF0, #FDF6EE)";

export default function AccountAvatar({
  name,
  photo,
  accountId,
  fallbackColor,
  size = 48,
  className = "",
  border,
}: AccountAvatarProps) {
  const profiles = useSyncExternalStore(
    subscribeAccountProfiles,
    getAccountProfilesSnapshot,
    getServerAccountProfilesSnapshot,
  );
  const resolvesAutomatically = border === undefined && accountId !== undefined;
  useEffect(() => {
    if (resolvesAutomatically) ensureAccountProfilesLoaded();
  }, [resolvesAutomatically]);

  const borderId = border !== undefined ? border : accountId ? profiles[accountId]?.border ?? null : null;
  const definition = getProfileBorder(borderId);
  // Se a imagem da moldura não carregar (caminho errado num PNG novo, por
  // exemplo), some só a moldura — o avatar continua normal.
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const frameVisible = definition !== null && failedImage !== definition.image;

  // Com moldura, o anel padrão sai (a moldura faz esse papel) e as classes de
  // fora vão para o conjunto (foto + moldura), para posição, escala no hover,
  // z-index etc. acompanharem a moldura inteira.
  const framed = definition !== null && frameVisible;
  const avatarClasses = framed
    ? "relative z-[1] block h-full w-full shrink-0 rounded-full object-cover"
    : `shrink-0 rounded-full object-cover ring-2 ring-surface ${className}`;

  let avatar: JSX.Element;
  if (photo) {
    avatar = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={name}
        className={avatarClasses}
        style={framed ? undefined : { width: size, height: size }}
      />
    );
  } else {
    const initial = name.trim().charAt(0).toUpperCase() || "?";
    const background = accountId ? ACCENT_GRADIENT[accountId] : fallbackColor ?? NEUTRAL_GRADIENT;
    avatar = (
      <span
        aria-hidden="true"
        className={`flex items-center justify-center font-display font-semibold text-white ${
          framed ? "relative z-[1] h-full w-full shrink-0 rounded-full" : `shrink-0 rounded-full ring-2 ring-surface ${className}`
        }`}
        style={{ ...(framed ? {} : { width: size, height: size }), background, fontSize: Math.round(size * 0.42) }}
      >
        {initial}
      </span>
    );
  }

  if (!framed || !definition) return avatar;

  const geometry = getBorderFrameGeometry(definition);
  const pct = (fraction: number) => `${fraction * 100}%`;
  return (
    <span
      className={`relative isolate inline-block shrink-0 rounded-full align-middle ${className}`}
      style={{ width: size, height: size }}
      data-avatar-border={definition.id}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={definition.image}
        alt=""
        aria-hidden="true"
        draggable={false}
        onError={() => setFailedImage(definition.image)}
        // max-w-none: o reset do Tailwind dá `max-width: 100%` a toda <img>, o que
        // espremeria a moldura (maior que o avatar) até a largura do avatar.
        className="pointer-events-none absolute max-h-none max-w-none select-none"
        style={{
          width: pct(geometry.scale),
          height: pct(geometry.scale),
          left: pct(geometry.left),
          top: pct(geometry.top),
          zIndex: definition.layer === "back" ? 0 : 2,
        }}
      />
      {avatar}
    </span>
  );
}
