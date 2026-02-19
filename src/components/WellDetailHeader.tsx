import React from 'react';
import type { WellWithReading } from '../hooks/useWells';

interface WellDetailHeaderProps {
  well: WellWithReading | null;
  farmName: string;
  onClose: () => void;
  onEdit: () => void;
}

/** Placeholder - will be fully implemented in Task 2 */
const WellDetailHeader = React.memo(function WellDetailHeader({
  well,
  farmName,
  onClose,
  onEdit,
}: WellDetailHeaderProps) {
  return (
    <div className="px-4 pt-4 pb-3">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-white text-sm">Back</button>
        <span className="text-white text-sm">{farmName}</span>
        <button onClick={onEdit} className="text-white text-sm">Edit</button>
      </div>
      {well && <p className="text-white font-bold mt-2">{well.name}</p>}
      {!well && <p className="text-white/60 mt-2">Well not found</p>}
    </div>
  );
});

export default WellDetailHeader;
