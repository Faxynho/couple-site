import { AccountId } from "@/lib/accountSession";

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
}: AccountAvatarProps) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={name}
        className={`shrink-0 rounded-full object-cover ring-2 ring-surface ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const background = accountId ? ACCENT_GRADIENT[accountId] : fallbackColor ?? NEUTRAL_GRADIENT;

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white ring-2 ring-surface ${className}`}
      style={{ width: size, height: size, background, fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </span>
  );
}
