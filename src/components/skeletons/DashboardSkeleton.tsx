import { SkeletonBlock } from './SkeletonPrimitives';

/**
 * Skeleton placeholder for DashboardPage.
 * Shows a full-viewport map placeholder with centered crosshair lines
 * and floating action button outlines at the bottom.
 */
export default function DashboardSkeleton() {
  return (
    <div
      className="relative w-full h-dvh overflow-hidden bg-gray-200"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      {/* Map placeholder - full viewport */}
      <SkeletonBlock width="w-full" height="h-full" className="rounded-none" />

      {/* Crosshair overlay suggesting "map loading here" */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Horizontal line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-300" />
        {/* Vertical line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300" />
      </div>

      {/* Floating action button outlines */}
      <div className="absolute bottom-6 left-4 right-4 z-20 flex justify-between pb-[env(safe-area-inset-bottom)]">
        <SkeletonBlock
          width="w-[120px]"
          height="h-12"
          className="rounded-full"
        />
        <SkeletonBlock
          width="w-[120px]"
          height="h-12"
          className="rounded-full"
        />
      </div>
    </div>
  );
}
