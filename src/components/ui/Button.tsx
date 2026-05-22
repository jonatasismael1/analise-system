import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-dark shadow-sm active:-translate-y-px active:shadow-primary-press",
  secondary:
    "bg-surface text-ink border border-border-strong hover:bg-surface-low active:-translate-y-px",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:-translate-y-px",
  ghost:
    "text-ink-secondary hover:bg-surface-low hover:text-ink active:-translate-y-px",
};

export function Button({
  children,
  className = "",
  icon,
  variant = "secondary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { readonly icon?: ReactNode; readonly variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-2xl px-4 font-sans text-[13px] font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
      type={type}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
