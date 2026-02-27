import { useRef, useEffect, useCallback } from 'react';
import type { KeyboardEvent, ClipboardEvent } from 'react';

interface OtpInputProps {
  /** Array of digit values */
  value: string[];
  /** Callback when a digit changes */
  onChange: (index: number, value: string) => void;
  /** Callback for keyboard events (backspace handling) */
  onKeyDown: (index: number, e: KeyboardEvent<HTMLInputElement>) => void;
  /** Number of OTP digits (default: 6) */
  length?: number;
  /** Disable all inputs */
  disabled?: boolean;
  /** Show error styling */
  error?: boolean;
  /** Auto-focus first input on mount */
  autoFocus?: boolean;
}

/**
 * A configurable-length OTP input component with individual input boxes.
 * Features:
 * - Auto-advance on digit entry
 * - Backspace navigation to previous input
 * - Paste support for full OTP code
 * - Error state styling
 * - Auto-focus first input
 */
export default function OtpInput({
  value,
  onChange,
  onKeyDown,
  length = 6,
  disabled = false,
  error = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Handle paste event to fill all digits at once
  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);

      if (pastedData.length > 0) {
        // Fill in each digit
        pastedData.split('').forEach((digit, idx) => {
          if (idx < length) {
            onChange(idx, digit);
          }
        });

        // Focus the next empty input or last input
        const nextEmptyIndex = pastedData.length < length ? pastedData.length : length - 1;
        inputRefs.current[nextEmptyIndex]?.focus();
      }
    },
    [onChange, length]
  );

  // Focus a specific input programmatically
  const focusInput = useCallback((index: number) => {
    if (index >= 0 && index < length) {
      inputRefs.current[index]?.focus();
    }
  }, [length]);

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {value.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          onChange={(e) => {
            const val = e.target.value;
            // Only allow single digit
            if (/^\d?$/.test(val)) {
              onChange(index, val);
              // Auto-advance to next input
              if (val && index < length - 1) {
                focusInput(index + 1);
              }
            }
          }}
          onKeyDown={(e) => onKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          className={`
            w-11 h-14 sm:w-12 sm:h-14 text-center text-2xl font-semibold
            bg-white/10 backdrop-blur-sm border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400
            transition-colors
            ${error ? 'border-red-800/70' : 'border-white/20'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'text-white'}
            placeholder-white/30
          `}
        />
      ))}
    </div>
  );
}

// Export a hook for managing OTP state
export function useOtpState(length: number = 6) {
  const initialState = Array(length).fill('');

  return {
    initialState,
    isComplete: (code: string[]) => code.every((d) => d !== '') && code.join('').length === length,
    getFullCode: (code: string[]) => code.join(''),
    reset: () => Array(length).fill(''),
  };
}
