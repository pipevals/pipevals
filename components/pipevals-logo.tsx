export function PipevalsLogo({
  size = 24,
  className,
  nodeFill = "var(--background)",
}: {
  size?: number;
  className?: string;
  nodeFill?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 4V20" />
      <circle cx={6} cy={4} r={1.5} fill={nodeFill} />
      <circle cx={6} cy={12} r={1.5} fill={nodeFill} />
      <circle cx={6} cy={20} r={1.5} fill={nodeFill} />
      <path d="M6 4H14C17 4 18 6 18 8C18 10 17 12 14 12H6" />
    </svg>
  );
}
