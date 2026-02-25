import { useState, useCallback } from 'react';

type Language = 'en' | 'es';

const languages: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

export default function LanguagePage() {
  // TODO: Get initial language from user preferences/storage
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');

  const handleLanguageSelect = useCallback((code: Language) => {
    setSelectedLanguage(code);
    // TODO: Save language preference and apply translations
  }, []);

  return (
    <div className="min-h-screen bg-surface-page pt-14">
      <div className="px-4 py-4">
        {/* Title */}
        <h1 className="text-2xl font-bold text-text-heading tracking-wide mb-8">LANGUAGE</h1>

        {/* Subtitle */}
        <p className="text-center text-text-heading/70 mb-6">Set your preferred language</p>

        {/* Language Options */}
        <div className="space-y-3 max-w-xs mx-auto">
          {languages.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => handleLanguageSelect(code)}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                selectedLanguage === code
                  ? 'bg-surface-header text-white'
                  : 'bg-white text-text-heading border border-text-heading/30 hover:bg-[#f5f5f0]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
