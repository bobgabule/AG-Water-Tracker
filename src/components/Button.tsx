import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'confirm' | 'danger' | 'ghost' | 'dark' | 'teal';
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonProps['variant'], string> = {
  confirm: 'bg-btn-confirm text-btn-confirm-text',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  ghost: 'bg-gray-700 hover:bg-gray-600 text-gray-300',
  dark: 'bg-btn-dark active:bg-btn-dark-active text-white',
  teal: 'bg-teal text-white hover:bg-teal-hover',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, loading, loadingText, fullWidth, className, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={loading || disabled}
        className={[
          'py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2',
          variantStyles[variant],
          fullWidth ? 'w-full' : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {loadingText ?? children}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
