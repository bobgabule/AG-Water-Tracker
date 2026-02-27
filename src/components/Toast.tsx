import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useToastStore } from '../stores/toastStore';

const Toast = React.memo(function Toast() {
  const message = useToastStore((s) => s.message);
  const type = useToastStore((s) => s.type);
  const hide = useToastStore((s) => s.hide);

  if (!message) return null;

  return (
    <div
      role="status"
      onClick={hide}
      className={`fixed bottom-6 left-4 right-4 z-[100] flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-white transition-opacity duration-300 cursor-pointer ${
        type === 'success' ? 'bg-green-600' : 'bg-red-800'
      }`}
    >
      {type === 'success' ? (
        <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
      ) : (
        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
      )}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
});

export default Toast;
