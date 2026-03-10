import type { SVGProps } from 'react';

/** Pointy triangle pennant flag icon — drop-in replacement for Heroicons FlagIcon */
export default function PennantFlagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      {/* Pole */}
      <rect x="4" y="3" width="2" height="18" rx="1" />
      {/* Triangular pennant */}
      <path d="M6 4 L20 9 L6 14Z" />
    </svg>
  );
}
