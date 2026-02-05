import { WifiIcon } from '@heroicons/react/24/outline';

export default function OfflineMessage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center px-6">
        <WifiIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-white mb-2">
          You're Offline
        </h1>
        <p className="text-gray-400 max-w-sm">
          Connect to the internet to sign in. You need a network connection to
          receive the verification code.
        </p>
      </div>
    </div>
  );
}
