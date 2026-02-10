# Mapbox Offline Fallback Implementation Plan

## Overview
Implement graceful degradation when Mapbox tiles fail to load (no internet), with a user-friendly fallback UI and passive tile caching for offline use.

**Approach**: Hybrid - passive caching now, offline packs as future enhancement.

---

## Module 1: Map Tile Status Hook

**File to create:** `src/hooks/useMapTileStatus.ts`

### Requirements
Create a hook to track whether Mapbox tiles are loading successfully:

```typescript
import { useState, useCallback, useEffect } from 'react';
import { useOnlineStatus } from './useOnlineStatus';

interface MapTileStatus {
  isOnline: boolean;
  hasTileError: boolean;
  setTileError: (hasError: boolean) => void;
}

export function useMapTileStatus(): MapTileStatus {
  const isOnline = useOnlineStatus();
  const [hasTileError, setHasTileError] = useState(false);

  // Auto-clear error when coming back online
  useEffect(() => {
    if (isOnline && hasTileError) {
      const timeout = setTimeout(() => setHasTileError(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, hasTileError]);

  return {
    isOnline,
    hasTileError: hasTileError || !isOnline,
    setTileError: setHasTileError,
  };
}
```

### Behavior
- `hasTileError` is true when:
  - Device is offline (`!isOnline`)
  - OR tile loading failed (`hasTileError` state)
- Auto-clears error 2 seconds after coming back online
- Provides `setTileError` for Map's `onError` callback

### Acceptance Criteria
- No TypeScript errors: `npx tsc -b --noEmit`
- Hook correctly reflects online/offline state
- Error auto-clears when connectivity returns

---

## Module 2: Offline Overlay Component

**File to create:** `src/components/MapOfflineOverlay.tsx`

### Requirements
Create a visual overlay when map tiles fail to load. Follow `LocationPermissionBanner` patterns.

### Props Interface
```typescript
interface MapOfflineOverlayProps {
  isOnline: boolean;
  wellCount: number;
  onRetry: () => void;
}
```

### Visual Structure
```
┌─────────────────────────────────────┐
│  [Semi-transparent gray overlay]    │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 📶 You're offline             │  │  ← Info card (top)
│  │    3 well locations visible.  │  │
│  │    [↻ Try again]              │  │  ← Only when isOnline
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────┐                  │
│  │ 📍 Well markers visible │        │  ← Legend (bottom)
│  └───────────────┘                  │
└─────────────────────────────────────┘
```

### Styling Requirements
- Use `React.memo` for performance
- Semi-transparent overlay: `bg-gray-900/30`
- Info card: `bg-gray-800/95 border border-gray-700 rounded-lg backdrop-blur-sm`
- Use Heroicons: `WifiIcon`, `ArrowPathIcon`, `MapPinIcon` from `@heroicons/react/24/outline`
- Position: `absolute inset-0 z-10`
- Card uses `pointer-events-auto` so buttons work

### Message Logic
| State | Message |
|-------|---------|
| Offline | "You're offline" |
| Online + tile error | "Map tiles unavailable" |
| wellCount > 0 | "N well location(s) are still visible." |
| wellCount === 0 | "Connect to load the map." |

### Acceptance Criteria
- No TypeScript errors
- Matches existing dark theme styling
- Retry button only shows when online
- Well count displays correctly

---

## Module 3: MapView Integration

**File to modify:** `src/components/MapView.tsx`

### Requirements
Integrate error handling and overlay into the existing MapView component.

### Changes Required

1. **Add imports:**
```typescript
import MapOfflineOverlay from './MapOfflineOverlay';
import { useMapTileStatus } from '../hooks/useMapTileStatus';
```

2. **Add hook usage inside component:**
```typescript
const { isOnline, hasTileError, setTileError } = useMapTileStatus();
```

3. **Create error handler:**
```typescript
const handleMapError = useCallback((event: ErrorEvent) => {
  // Log for debugging
  console.warn('Map error:', event.error);

  // Check if it's a tile/network related error
  const message = event.error?.message?.toLowerCase() || '';
  if (message.includes('tile') ||
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('failed to fetch')) {
    setTileError(true);
  }
}, [setTileError]);
```

4. **Create retry handler:**
```typescript
const handleRetry = useCallback(() => {
  setTileError(false);
  // Trigger map to refetch tiles by forcing a resize
  mapRef.current?.resize();
}, [setTileError]);
```

5. **Add onError to Map component:**
```typescript
<Map
  ref={mapRef}
  onError={handleMapError}  // ADD THIS
  initialViewState={initialViewState}
  // ... rest of existing props
>
```

6. **Add overlay after Map, before closing div:**
```typescript
      </Map>

      {/* Offline/error overlay */}
      {hasTileError && (
        <MapOfflineOverlay
          isOnline={isOnline}
          wellCount={wells.filter(w => w.location).length}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
```

### Acceptance Criteria
- No TypeScript errors
- Overlay appears when device goes offline
- Well markers remain visible under the overlay
- Retry button triggers tile reload
- Overlay disappears when back online

---

## Module 4: Service Worker Tile Caching

**File to modify:** `vite.config.ts`

### Requirements
Add Workbox `runtimeCaching` rules for Mapbox tile URLs.

### Changes Required

Update the `workbox` section inside `VitePWA` config:

```typescript
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wasm}'],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  // ADD runtimeCaching for Mapbox tiles
  runtimeCaching: [
    // Mapbox API (raster/satellite tiles, styles)
    {
      urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'mapbox-api-v1',
        expiration: {
          maxEntries: 800,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        },
        cacheableResponse: {
          statuses: [200], // Only cache successful responses
        },
      },
    },
    // Mapbox vector tiles (separate subdomain)
    {
      urlPattern: /^https:\/\/.*\.tiles\.mapbox\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'mapbox-tiles-v1',
        expiration: {
          maxEntries: 1000,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        },
        cacheableResponse: {
          statuses: [200], // Only cache successful responses
        },
      },
    },
    // Mapbox static assets (sprites, glyphs, fonts)
    {
      urlPattern: /^https:\/\/.*\.mapbox\.com\/(fonts|sprites)\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'mapbox-assets-v1',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
        cacheableResponse: {
          statuses: [200], // Only cache successful responses
        },
      },
    },
  ],
},
```

### Cache Strategy Explanation
| Cache | Handler | Reason |
|-------|---------|--------|
| mapbox-api | CacheFirst | Satellite tiles rarely change |
| mapbox-tiles | CacheFirst | Vector tiles rarely change |
| mapbox-assets | CacheFirst | Fonts/sprites never change |

### Cache Size Estimate
| Cache | Max Entries | Est. Size |
|-------|-------------|-----------|
| mapbox-api-v1 | 800 | ~80-160 MB |
| mapbox-tiles-v1 | 1000 | ~100-200 MB |
| mapbox-assets-v1 | 50 | ~5 MB |
| **Total** | **1850** | **~185-365 MB** |

Note: Cache names include `-v1` suffix for versioning to enable cache busting if needed.

### Acceptance Criteria
- No build errors: `npm run build`
- Service worker registers successfully
- Tiles cache in DevTools > Application > Cache Storage
- Cached tiles load when offline

---

## Verification Checklist

After all modules complete:

1. [ ] Run `npx tsc -b --noEmit` - no type errors
2. [ ] Run `npm run build` - build succeeds
3. [ ] Run `npm run preview` - PWA mode with service worker
4. [ ] Open DevTools > Network > Check "Offline"
5. [ ] Verify overlay appears with correct message
6. [ ] Verify well markers remain visible under overlay
7. [ ] Uncheck "Offline", click "Try again"
8. [ ] Verify map tiles reload
9. [ ] Check DevTools > Application > Cache Storage
10. [ ] Verify `mapbox-tiles` and `mapbox-api` caches exist
11. [ ] Go offline again - cached tiles should display
12. [ ] Test on mobile PWA in airplane mode

---

## Future Enhancement: Offline Packs (Phase 2)

For a more robust offline experience, a future iteration could add:

- **Download farm for offline** button in settings or map view
- Pre-fetch tiles at z10-16 for farm bounding box + 3 mile buffer
- Progress indicator during download
- Storage management UI (view/clear cached farms)

This would provide predictable offline coverage vs. passive caching.

### Considerations for Phase 2
- Compute bounding box from farm's well locations
- Generate tile URLs for zoom levels 10-16
- Use Background Sync API for large downloads
- Show estimated download size before starting
- Allow cancellation of in-progress downloads
