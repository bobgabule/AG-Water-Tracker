import React from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate'

export const UpdateToast = React.memo(function UpdateToast() {
  const { needRefresh, updateServiceWorker } = useServiceWorkerUpdate()
  const [show] = needRefresh

  console.log('[UpdateToast] needRefresh:', show)

  if (!show) return null

  return (
    <div
      role="alert"
      className="fixed bottom-20 left-4 right-4 z-[110] flex items-center justify-between gap-3 rounded-lg bg-gray-800 px-4 py-3 shadow-lg"
    >
      <span className="text-sm font-medium text-white">
        Update available
      </span>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white active:bg-green-700"
      >
        <ArrowPathIcon className="h-4 w-4" />
        Reload
      </button>
    </div>
  )
})
