/**
 * Skeleton primitive components for loading state placeholders.
 * Each renders an animated shimmer effect over a gray base.
 * All components are decorative (aria-hidden) and accept optional className.
 */

interface SkeletonLineProps {
  /** Tailwind width class (default: 'w-full') */
  width?: string;
  /** Tailwind height class (default: 'h-4') */
  height?: string;
  className?: string;
}

/** Text line placeholder with shimmer animation. */
export function SkeletonLine({
  width = 'w-full',
  height = 'h-4',
  className = '',
}: SkeletonLineProps) {
  return (
    <div
      className={`relative overflow-hidden bg-gray-200 rounded ${width} ${height} ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  );
}

interface SkeletonBlockProps {
  /** Tailwind width class (default: 'w-full') */
  width?: string;
  /** Tailwind height class (default: 'h-32') */
  height?: string;
  className?: string;
}

/** Rectangular area placeholder (map, card, image) with shimmer animation. */
export function SkeletonBlock({
  width = 'w-full',
  height = 'h-32',
  className = '',
}: SkeletonBlockProps) {
  return (
    <div
      className={`relative overflow-hidden bg-gray-200 rounded-lg ${width} ${height} ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  );
}

interface SkeletonCircleProps {
  /** Tailwind size class (default: 'w-10 h-10') */
  size?: string;
  className?: string;
}

/** Circular placeholder (avatar, FAB) with shimmer animation. */
export function SkeletonCircle({
  size = 'w-10 h-10',
  className = '',
}: SkeletonCircleProps) {
  return (
    <div
      className={`relative overflow-hidden bg-gray-200 rounded-full ${size} ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  );
}
