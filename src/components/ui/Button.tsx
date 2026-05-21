import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-dark active:-translate-y-px active:shadow-primary-press",
  secondary:
    "border border-border-strong bg-surface text-primary-dark hover:bg-primary-wash hover:border-primary active:-translate-y-px",
  danger:
    "border border-danger-border bg-danger-wash text-danger hover:bg-red-100 hover:border-red-300 active:-translate-y-px",
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
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5 font-sans text-[13px] font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
      type={type}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
