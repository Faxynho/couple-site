export default function Logo({ size = 44 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/favicon.ico" alt="" width={size} height={size} aria-hidden="true" draggable={false} className="object-contain" />
      <span className="font-display text-xl font-semibold text-ink">Nós Dois</span>
    </div>
  );
}
