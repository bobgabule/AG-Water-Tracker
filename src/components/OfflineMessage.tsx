import { WifiIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../hooks/useTranslation';

export default function OfflineMessage() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center px-6">
        <WifiIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-white mb-2">
          {t('offline.title')}
        </h1>
        <p className="text-gray-400 max-w-sm">
          {t('offline.description')}
        </p>
      </div>
    </div>
  );
}
