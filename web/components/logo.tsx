import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 px-2">
      <svg viewBox="0 0 512 512" className="size-7" aria-hidden>
        <rect width="512" height="512" rx="116" fill="#1f6f5c" />
        <rect x="140" y="312" width="232" height="56" rx="28" fill="#fff" />
        <rect x="164" y="228" width="232" height="56" rx="28" fill="#fff" />
        <rect x="116" y="144" width="232" height="56" rx="28" fill="#9fd8c4" />
      </svg>
      <span className="font-heading text-[19px] leading-none font-semibold tracking-tight">
        Dineros
      </span>
    </Link>
  );
}
