import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  secondary: "border border-outline-variant bg-white text-secondary hover:border-primary hover:text-primary",
  danger: "border border-red-100 bg-red-50 text-error hover:bg-red-100",
  ghost: "text-secondary hover:bg-surface-container-low hover:text-on-surface"
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
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 ${variants[variant]} ${className}`}
      type={type}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
