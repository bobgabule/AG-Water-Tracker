import { memo } from 'react';
import { useStatus } from '@powersync/react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default memo(function SyncStatusBanner() {
  const status = useStatus();
  const isOnline = useOnlineStatus();
  const { uploading, uploadError } = status.dataFlowStatus;

  if (!isOnline) {
    return (
      <div className="px-3 py-1.5 rounded-full bg-gray-500/80 backdrop-blur-sm text-white text-xs font-medium">
        Offline — changes saved locally
      </div>
    );
  }

  if (uploadError) {
    return (
      <div className="px-3 py-1.5 rounded-full bg-red-500/80 backdrop-blur-sm text-white text-xs font-medium">
        Sync error — retrying…
      </div>
    );
  }

  if (uploading) {
    return (
      <div className="px-3 py-1.5 rounded-full bg-blue-500/80 backdrop-blur-sm text-white text-xs font-medium animate-pulse">
        Syncing…
      </div>
    );
  }

  return null;
});
