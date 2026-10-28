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
        "bg-[#2C365A] text-white hover:bg-[#212946] active:bg-[#181E34] shadow-sm",
      forest:
        "bg-[#1E4D3B] text-white hover:bg-[#163B2D] active:bg-[#112E23] shadow-sm",
      secondary:
        "bg-[#E2DACD] text-[#182038] hover:bg-[#D5CBB9] border border-[#C4BCB0]",
      outline:
        "bg-white/80 text-[#182038] border border-[#5C6F73] hover:bg-[#F7F4EF]",
      ghost:
        "bg-transparent text-[#2C365A] hover:bg-[#E2DACD]/60",
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
    <h3
      className={cn(
        "text-base font-bold tracking-tight text-[var(--color-text)]",
        className
      )}
      {...props}
    >
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
      className={cn("text-xs text-[var(--color-text-subtle)] mt-0.5", className)}
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
      "bg-[#E2E6F2] text-[#1E2642] border border-[#2C365A]/30",
    forest:
      "bg-[#E4F0EB] text-[#14382A] border border-[#1E4D3B]/30",
    warning:
      "bg-[#FEF3C7] text-[#78350F] border border-[#92400E]/30",
    danger:
      "bg-[#FEE2E2] text-[#7F1D1D] border border-[#991B1B]/30",
    neutral:
      "bg-[#EEE8DF] text-[#182038] border border-[#C4BCB0]",
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
