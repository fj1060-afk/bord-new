/** The product mark: a brass seal, as stamped on approved minutes. */
export function BrandSeal({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      className="shrink-0 text-brass"
    >
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle
        cx="20"
        cy="20"
        r="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeDasharray="1.5 2"
      />
      <text
        x="20"
        y="26.5"
        textAnchor="middle"
        fontSize="19"
        fontWeight="700"
        fill="currentColor"
        style={{ fontFamily: "var(--font-naskh)" }}
      >
        م
      </text>
    </svg>
  );
}
