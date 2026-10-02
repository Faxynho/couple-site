/**
 * Sprite da moeda global do site (a mesma do badge do lobby, das decorações dos
 * pets e do Cantinho). Usar este componente em vez de um ícone genérico sempre
 * que um valor estiver em moedas globais.
 */
export default function GlobalCoinIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/idle/icons/global-coin.webp"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
      className={`inline-block shrink-0 select-none object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
