import type { ButtonHTMLAttributes, ReactNode } from "react";

const variantClasses = {
  primary:
    "border-transparent bg-[#1968ad] text-white shadow-[0_1px_2px_rgba(15,23,42,0.14)] hover:bg-[#155b99] active:bg-[#124d82] disabled:bg-[#abc9df] disabled:text-white disabled:shadow-none disabled:data-[loading=true]:bg-[#1968ad]",
  secondary:
    "border-neutral-300 bg-white text-neutral-800 shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:border-neutral-400 hover:bg-neutral-50 active:bg-neutral-100 disabled:border-neutral-200 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:shadow-none",
  ghost:
    "border-transparent bg-transparent text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 active:bg-neutral-200/70 disabled:bg-transparent disabled:text-neutral-400",
  danger:
    "border-red-300 bg-white text-red-700 shadow-[0_1px_2px_rgba(127,29,29,0.08)] hover:border-red-400 hover:bg-red-50 active:bg-red-100 disabled:border-neutral-200 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:shadow-none",
} as const;

// Sizes live here rather than in className: Tailwind orders utilities itself,
// so a caller's h-8 cannot reliably override the base h-9.
const sizeClasses = {
  md: "h-9 gap-2 px-3 text-sm",
  sm: "h-7 gap-1.5 px-2.5 text-xs",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  loadingLabel?: ReactNode;
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
};

export function Button({
  children,
  className = "",
  disabled = false,
  isLoading = false,
  loadingLabel,
  type = "button",
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  // Loading buttons stay disabled so actions cannot be submitted twice.
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md border font-medium outline-none transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-[#1968ad]/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed motion-reduce:transition-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      data-loading={isLoading || undefined}
    >
      {isLoading ? (
        <svg className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle className="opacity-30" cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 2.25a5.75 5.75 0 0 1 5.75 5.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : null}
      <span className="inline-flex items-center gap-[inherit]">{isLoading ? (loadingLabel ?? children) : children}</span>
    </button>
  );
}
