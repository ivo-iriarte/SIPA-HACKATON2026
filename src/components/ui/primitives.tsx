/**
 * @file primitives.tsx
 * @description Componentes reutilizables basados en shadcn/ui y auditados bajo las
 * directrices de la skill frontend-ux-ui (WCAG 2.2 AA, focus-visible, targets >= 40px,
 * estados semánticos con ícono + texto, tabular-nums).
 */

import * as React from "react";
import { cn } from "../../lib/utils";

// ============================================================================
// BUTTON (shadcn/ui pattern)
// ============================================================================
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "forest" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary:
        "bg-[#43533D] text-[#FBF8F0] hover:bg-[#364431] active:bg-[#2B3727] shadow-sm",
      forest:
        "bg-[#566647] text-[#FBF8F0] hover:bg-[#43533D] active:bg-[#364431] shadow-sm",
      secondary:
        "bg-[#F4EFE3] text-[#30291F] hover:bg-[#D6C8AE]/60 border border-[#D6C8AE]",
      outline:
        "bg-[#FBF8F0] text-[#30291F] border border-[#6B543B] hover:bg-[#F4EFE3]",
      ghost:
        "bg-transparent text-[#43533D] hover:bg-[#F4EFE3]",
      danger:
        "bg-[#991B1B] text-white hover:bg-[#7F1D1D] shadow-sm",
    };

    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-md",
      md: "min-h-[40px] px-4 py-2 text-sm font-medium rounded-md",
      lg: "min-h-[44px] px-5 py-2.5 text-base font-semibold rounded-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none select-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// ============================================================================
// CARD (shadcn/ui pattern)
// ============================================================================
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-5 py-4 border-b border-[var(--color-border)]/60 flex flex-wrap items-center justify-between gap-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("type-card-title", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-[var(--color-text-subtle)] mt-0.5", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5", className)} {...props}>
      {children}
    </div>
  );
}

// ============================================================================
// BADGE (Semantic status badge: always pairs color with text/symbol)
// ============================================================================
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "ocean" | "forest" | "warning" | "danger" | "neutral";
}

export function Badge({
  className,
  variant = "neutral",
  children,
  ...props
}: BadgeProps) {
  const styles: Record<NonNullable<BadgeProps["variant"]>, string> = {
    ocean:
      "bg-[#F4EFE3] text-[#43533D] border border-[#43533D]/35",
    forest:
      "bg-[#EAEEE6] text-[#43533D] border border-[#566647]/40",
    warning:
      "bg-[#FEF3C7] text-[#78350F] border border-[#92400E]/30",
    danger:
      "bg-[#FEE2E2] text-[#7F1D1D] border border-[#991B1B]/30",
    neutral:
      "bg-[#F4EFE3] text-[#30291F] border border-[#D6C8AE]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold leading-5",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
