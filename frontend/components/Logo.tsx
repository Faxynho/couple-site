export default function Logo({ size = 44 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <circle cx="17" cy="20" r="12" fill="#F6D3DE" />
        <circle cx="27" cy="20" r="12" fill="#C9E0F2" fillOpacity="0.85" />
        <circle cx="22" cy="26" r="7" fill="#FDF6EE" fillOpacity="0.9" />
      </svg>
      <span className="font-display text-xl font-semibold text-ink">Nós Dois</span>
    </div>
  );
}
