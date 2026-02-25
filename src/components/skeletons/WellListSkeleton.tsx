import { SkeletonLine, SkeletonBlock } from './SkeletonPrimitives';

/**
 * Skeleton placeholder for WellListPage.
 * Shows a title placeholder, search bar placeholder, and 6 animated
 * well row placeholders matching the real WellListPage layout.
 */
export default function WellListSkeleton() {
  return (
    <div
      className="min-h-screen bg-surface-page pt-14"
      aria-busy="true"
      aria-label="Loading well list"
    >
      <div className="px-4 py-4">
        {/* Title placeholder */}
        <SkeletonLine width="w-32" height="h-7" className="mb-4 bg-surface-card-hover" />

        {/* Search bar placeholder */}
        <SkeletonBlock height="h-12" className="rounded-lg mb-4 bg-surface-card-hover" />

        {/* Well row placeholders */}
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="bg-surface-card rounded-lg px-4 py-3 flex items-center gap-3"
            >
              {/* Well name */}
              <SkeletonLine width="w-[70px]" height="h-4" className="bg-surface-card-hover" />
              {/* Status bar */}
              <SkeletonBlock width="flex-1" height="h-2" className="rounded-full bg-surface-card-hover" />
              {/* Reading date */}
              <SkeletonLine width="w-[80px]" height="h-3" className="bg-surface-card-hover" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-surface-page via-surface-page to-transparent">
        <div className="flex justify-between gap-4">
          <SkeletonBlock
            width="w-[120px]"
            height="h-12"
            className="rounded-full bg-surface-card-hover"
          />
          <SkeletonBlock
            width="w-[120px]"
            height="h-12"
            className="rounded-full bg-surface-card-hover"
          />
        </div>
      </div>
    </div>
  );
}
