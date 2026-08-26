import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: "primary" | "icon" | "accent";
};

export function ActionButton({ children, icon, variant = "primary", className, ...props }: Props) {
  const variantClass = variant === "icon" ? "icon-button" : variant === "accent" ? "accent-button" : "primary-button";
  return (
    <button className={[variantClass, className].filter(Boolean).join(" ")} {...props}>
      {icon}
      {children}
    </button>
  );
}
