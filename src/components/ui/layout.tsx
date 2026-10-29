/**
 * @file layout.tsx
 * @description Componentes de estructura compartidos por las vistas de proceso de SIPA:
 * - ViewHeader: título de vista + acciones (filtros, exportar).
 * - ExportButton: acción principal de exportación del informe del proceso.
 * - FormulaHint: ícono con tooltip que contiene la fórmula de cálculo.
 * - MissingSourcesAlert: aviso cuando faltan exportaciones requeridas.
 * - ProcessNotes / ProcessNote: notas informativas ubicadas al final de cada vista.
 * - FilterMenu: botón desplegable de filtros globales.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Download,
  Filter,
  Info,
  RotateCcw,
  Sigma,
} from "lucide-react";
import { Button } from "./primitives";
import { cn } from "../../lib/utils";
import type { EstablishmentId, ProductionStage } from "../../types/domain";

// ============================================================================
// VIEW HEADER
// ============================================================================
export function ViewHeader({
  title,
  status,
  actions,
}: {
  title: string;
  status?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="type-page-title">{title}</h2>
        {status}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORT BUTTON (acción principal)
// ============================================================================
export function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="primary" size="md" onClick={onClick} className="font-semibold">
      <Download className="w-4 h-4" aria-hidden="true" />
      Exportar informe
    </Button>
  );
}

// ============================================================================
// FORMULA HINT (ícono + tooltip)
// ============================================================================
export function FormulaHint({
  formula,
  align = "right",
}: {
  formula: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <span className="relative inline-flex group">
      <button
        type="button"
        aria-label="Ver fórmula de cálculo"
        className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[#6B543B] bg-[#F4EFE3] hover:bg-[#43533D] hover:text-[#FBF8F0] focus-visible:bg-[#43533D] focus-visible:text-[#FBF8F0] transition-colors"
      >
        <Sigma className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute top-full mt-2 z-30 w-72 rounded-md bg-[#30291F] text-[#FBF8F0] p-3 shadow-lg opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 normal-case tracking-normal font-normal text-left",
          align === "right" ? "right-0" : "left-0"
        )}
      >
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#D6C8AE] mb-1">
          Fórmula
        </span>
        <span className="block type-formula text-[#FBF8F0]">{formula}</span>
      </span>
    </span>
  );
}

// ============================================================================
// MISSING SOURCES ALERT
// ============================================================================
export function MissingSourcesAlert({
  missing,
  onGoToUpload,
}: {
  missing: string[];
  onGoToUpload?: () => void;
}) {
  if (missing.length === 0) return null;
  return (
    <div
      role="alert"
      className="p-3.5 rounded-lg bg-[#FEF3C7] border border-[#92400E]/30 text-[#78350F] text-sm flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>
          Faltan exportaciones para completar este proceso:{" "}
          <strong>{missing.join(" · ")}</strong>
        </span>
      </div>
      {onGoToUpload && (
        <Button variant="outline" size="sm" onClick={onGoToUpload}>
          Ir a carga de archivos <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// PROCESS NOTES (sección informativa al final de cada vista)
// ============================================================================
export function ProcessNotes({ children }: { children: React.ReactNode }) {
  return (
    <section aria-labelledby="process-notes-title" className="pt-2">
      <h3
        id="process-notes-title"
        className="type-label flex items-center gap-1.5 mb-3"
      >
        <Info className="w-3.5 h-3.5" aria-hidden="true" />
        Información del proceso
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

export function ProcessNote({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-lg bg-[#FBF8F0] border border-[#D6C8AE]">
      <div className="text-sm font-semibold text-[#30291F] mb-1">{title}</div>
      <p className="text-sm text-[#6B543B] leading-relaxed">{children}</p>
    </div>
  );
}

// ============================================================================
// FILTER MENU (botón desplegable)
// ============================================================================
export interface FilterMenuProps {
  establishment: EstablishmentId | "ALL";
  stage: ProductionStage | "ALL";
  includePorcap: boolean;
  showStage?: boolean;
  onEstablishmentChange: (v: EstablishmentId | "ALL") => void;
  onStageChange: (v: ProductionStage | "ALL") => void;
  onIncludePorcapChange: (v: boolean) => void;
  onReset: () => void;
}

export function FilterMenu({
  establishment,
  stage,
  includePorcap,
  showStage = true,
  onEstablishmentChange,
  onStageChange,
  onIncludePorcapChange,
  onReset,
}: FilterMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const activeCount =
    (establishment !== "ALL" ? 1 : 0) +
    (showStage && stage !== "ALL" ? 1 : 0) +
    (includePorcap ? 1 : 0);
  const isActive = activeCount > 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectClass =
    "w-full text-sm rounded-md border border-[#6B543B] bg-[#FBF8F0] px-3 py-2 text-[#30291F] min-h-[38px]";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-md text-sm font-medium border transition-colors",
          isActive
            ? "bg-[#566647] text-[#FBF8F0] border-[#566647] hover:bg-[#43533D]"
            : "bg-[#E7E5E4] text-[#44403C] border-[#D6D3D1] hover:bg-[#D6D3D1]"
        )}
      >
        <Filter className="w-4 h-4" aria-hidden="true" />
        Filtros
        {isActive && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#FBF8F0] text-[#43533D] text-xs font-bold inline-flex items-center justify-center tabular-nums">
            {activeCount}
          </span>
        )}
        <ChevronDown
          className={cn("w-4 h-4 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Filtros"
          className="absolute right-0 top-full mt-2 z-40 w-80 rounded-lg bg-[#FBF8F0] border border-[#D6C8AE] shadow-lg p-4 space-y-4"
        >
          <div>
            <label htmlFor="filter-establishment" className="type-label block mb-1.5">
              Granja / Centro
            </label>
            <select
              id="filter-establishment"
              value={establishment}
              onChange={(e) =>
                onEstablishmentChange(e.target.value as EstablishmentId | "ALL")
              }
              className={selectClass}
            >
              <option value="ALL">Todas las granjas</option>
              <option value="tandil">Tandil</option>
              <option value="san_lorenzo">San Lorenzo</option>
              {includePorcap && <option value="porcap">Porcap</option>}
            </select>
          </div>

          {showStage && (
            <div>
              <label htmlFor="filter-stage" className="type-label block mb-1.5">
                Etapa
              </label>
              <select
                id="filter-stage"
                value={stage}
                onChange={(e) =>
                  onStageChange(e.target.value as ProductionStage | "ALL")
                }
                className={selectClass}
              >
                <option value="ALL">Todas las etapas</option>
                <option value="Maternidad">Maternidad</option>
                <option value="Recría">Recría</option>
                <option value="Engorde">Engorde</option>
              </select>
            </div>
          )}

          <label className="flex items-center gap-2.5 text-sm text-[#30291F] cursor-pointer">
            <input
              type="checkbox"
              checked={includePorcap}
              onChange={(e) => onIncludePorcapChange(e.target.checked)}
              className="w-4 h-4 accent-[#566647]"
            />
            Incluir granja Porcap
          </label>

          <div className="flex items-center justify-between pt-3 border-t border-[#D6C8AE]/60">
            <button
              type="button"
              onClick={onReset}
              disabled={!isActive}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#43533D] hover:underline disabled:opacity-40 disabled:no-underline"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Limpiar
            </button>
            <Button size="sm" variant="primary" onClick={() => setOpen(false)}>
              Listo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

