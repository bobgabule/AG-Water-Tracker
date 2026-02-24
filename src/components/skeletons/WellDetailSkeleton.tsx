import { SkeletonLine, SkeletonBlock } from './SkeletonPrimitives';

/**
 * Skeleton placeholder for WellDetailPage / WellDetailSheet.
 * Shows a back button area, well name, metrics grid, action buttons,
 * and recent readings rows matching the real detail layout.
 */
export default function WellDetailSkeleton() {
  return (
    <div
      className="min-h-screen bg-white pt-14"
      aria-busy="true"
      aria-label="Loading well details"
    >
      <div className="px-4 py-4">
        {/* Back button placeholder */}
        <SkeletonLine width="w-16" height="h-5" className="mb-4" />

        {/* Well name */}
        <SkeletonLine width="w-48" height="h-7" className="mb-2" />

        {/* Farm name */}
        <SkeletonLine width="w-32" height="h-4" className="mb-6" />

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <SkeletonBlock height="h-24" className="rounded-xl" />
          <SkeletonBlock height="h-24" className="rounded-xl" />
          <SkeletonBlock height="h-24" className="rounded-xl" />
        </div>

        {/* Action buttons row */}
        <div className="flex gap-3 mb-8">
          <SkeletonBlock width="w-28" height="h-10" className="rounded-full" />
          <SkeletonBlock width="w-28" height="h-10" className="rounded-full" />
          <SkeletonBlock width="w-28" height="h-10" className="rounded-full" />
        </div>

        {/* Recent Readings header */}
        <SkeletonLine width="w-40" height="h-5" className="mb-3" />

        {/* Reading rows */}
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <SkeletonLine width="w-24" height="h-4" />
              <SkeletonLine width="w-20" height="h-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
