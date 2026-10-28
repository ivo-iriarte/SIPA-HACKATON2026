/**
 * @file App.tsx
 * @description Shell principal de SIPA (Sistema Integral de Producción Agro-porcina — Uniporc Tandil).
 * Implementa la arquitectura de información, barra global de filtros multidimensionales
 * (Establecimiento, Etapa Productiva, Período) y navegación por sectores siguiendo
 * estrictamente las directrices de la skill `frontend-ux-ui`.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FileSpreadsheet,
  HeartPulse,
  Factory,
  Pill,
  Briefcase,
  BookOpen,
  Filter,
  RotateCcw,
  CheckCircle2,
  Lock,
  Unlock,
} from "lucide-react";
import {
  EstablishmentId,
  ProductionStage,
  PeriodId,
  PeriodStatus,
  StageCostProductionRecord,
  PharmacyInventoryRecord,
  ScadaSiloBalanceRecord,
  FeedBatchRecord,
  AccountingEntry,
  IngestionLogRecord,
} from "./types/domain";
import {
  INITIAL_STAGE_RECORDS,
  INITIAL_MONTHLY_EVOLUTION,
  INITIAL_PHARMACY_INVENTORY,
  INITIAL_SILO_BALANCES,
  INITIAL_FEED_BATCHES,
  INITIAL_ACCOUNTING_ENTRIES,
  INITIAL_INGESTION_LOGS,
} from "./data/initialUniporcData";
import { ControlTowerView } from "./components/views/ControlTowerView";
import { IngestionMapperView } from "./components/views/IngestionMapperView";
import { FarmsProductionView } from "./components/views/FarmsProductionView";
import { FeedMillScadaView } from "./components/views/FeedMillScadaView";
import { PharmacyAuditView } from "./components/views/PharmacyAuditView";
import { AccountingClosingView } from "./components/views/AccountingClosingView";
import { DocumentationCenterView } from "./components/views/DocumentationCenterView";
import { Badge, Button } from "./components/ui/primitives";

type NavTabId =
  | "control_tower"
  | "ingestion"
  | "farms"
  | "scada"
  | "pharmacy"
  | "accounting"
  | "docs";

const NAV_TABS: {
  id: NavTabId;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
  badge?: string;
}[] = [
  {
    id: "control_tower",
    label: "1. Torre de Control ($/kg & $/lechón)",
    shortLabel: "Torre Control",
    icon: LayoutDashboard,
  },
  {
    id: "ingestion",
    label: "2. Ingesta & Mapeo (.xlsx)",
    shortLabel: "Ingesta Excel",
    icon: FileSpreadsheet,
    badge: "9 Excels",
  },
  {
    id: "farms",
    label: "3. Granjas & Cría (Agriness)",
    shortLabel: "Granjas",
    icon: HeartPulse,
  },
  {
    id: "scada",
    label: "4. Planta Alimento (SCADA)",
    shortLabel: "Planta SCADA",
    icon: Factory,
  },
  {
    id: "pharmacy",
    label: "5. Farmacia & Stock",
    shortLabel: "Farmacia",
    icon: Pill,
    badge: "2 alertas",
  },
  {
    id: "accounting",
    label: "6. Contabilidad & Cierre (Nuvix)",
    shortLabel: "Cierre Nuvix",
    icon: Briefcase,
  },
  {
    id: "docs",
    label: "7. Documentación & Fórmulas",
    shortLabel: "Documentación",
    icon: BookOpen,
  },
];

export function App() {
  // Navegación principal (máximo 7 destinos de primer nivel según frontend-ux-ui)
  const [activeTab, setActiveTab] = useState<NavTabId>("control_tower");

  // Filtros globales multidimensionales (Requerimiento Sofía: filtrar por granja y etapa o consolidar)
  const [selectedEstablishment, setSelectedEstablishment] = useState<
    EstablishmentId | "ALL"
  >("ALL");
  const [selectedStage, setSelectedStage] = useState<ProductionStage | "ALL">(
    "ALL"
  );
  const [activePeriod, setActivePeriod] = useState<PeriodId>("2026-09");
  const [includePorcap, setIncludePorcap] = useState<boolean>(false);

  // Estado en memoria desacoplado (preparado para conectar con Backend/BD en Iteración 2)
  const [stageRecords, setStageRecords] = useState<StageCostProductionRecord[]>(
    INITIAL_STAGE_RECORDS
  );
  const [evolution, setEvolution] = useState(INITIAL_MONTHLY_EVOLUTION);
  const [pharmacyInventory, setPharmacyInventory] = useState<
    PharmacyInventoryRecord[]
  >(INITIAL_PHARMACY_INVENTORY);
  const [siloBalances, setSiloBalances] = useState<ScadaSiloBalanceRecord[]>(
    INITIAL_SILO_BALANCES
  );
  const [feedBatches, setFeedBatches] = useState<FeedBatchRecord[]>(
    INITIAL_FEED_BATCHES
  );
  const [accountingEntries, setAccountingEntries] = useState<AccountingEntry[]>(
    INITIAL_ACCOUNTING_ENTRIES
  );
  const [ingestionLogs, setIngestionLogs] = useState<IngestionLogRecord[]>(
    INITIAL_INGESTION_LOGS
  );
  const [periodStatus, setPeriodStatus] = useState<PeriodStatus>("ABIERTO");

  // Handlers de negocio
  const handleResetFilters = () => {
    setSelectedEstablishment("ALL");
    setSelectedStage("ALL");
  };

  const handleUpdateStageRecord = (updated: StageCostProductionRecord) => {
    setStageRecords((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );
  };

  const handleAddIngestionLog = (newLog: IngestionLogRecord) => {
    setIngestionLogs((prev) => [newLog, ...prev]);
  };

  const handleAddFeedBatch = (newBatch: FeedBatchRecord) => {
    setFeedBatches((prev) => [newBatch, ...prev]);
  };

  const handleUpdateExchangeRate = (newTc: number) => {
    setSiloBalances((prev) =>
      prev.map((s) => ({ ...s, exchangeRateArsUsd: newTc }))
    );
  };

  const handleGenerateAccountingEntry = (
    item: PharmacyInventoryRecord,
    entry: AccountingEntry
  ) => {
    setAccountingEntries((prev) => [entry, ...prev]);
    setPharmacyInventory((prev) =>
      prev.map((p) =>
        p.id === item.id ? { ...p, accountingPosted: true } : p
      )
    );
  };

  const handleReconcilePharmacyStock = (itemId: string) => {
    setPharmacyInventory((prev) =>
      prev.map((p) => {
        if (p.id !== itemId) return p;
        const theoretical =
          p.initialStock + p.purchasesNuvix - p.consumedAgriness;
        return {
          ...p,
          stockNuvix: theoretical,
          stockAgriness: theoretical,
        };
      })
    );
  };

  const handleTogglePeriodClosing = () => {
    const nextStatus: PeriodStatus =
      periodStatus === "ABIERTO" ? "CERRADO" : "ABIERTO";
    setPeriodStatus(nextStatus);
    setEvolution((prev) =>
      prev.map((m) =>
        m.period === activePeriod ? { ...m, status: nextStatus } : m
      )
    );
  };

  const handleExportAllEntriesToNuvix = () => {
    setAccountingEntries((prev) =>
      prev.map((e) => ({ ...e, status: "EXPORTADO_NUVIX" }))
    );
  };

  const hasActiveFilters =
    selectedEstablishment !== "ALL" || selectedStage !== "ALL";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* =====================================================================
          HEADER INSTITUCIONAL SIPA — UNIPORC TANDIL (Deep Ocean + Cream)
         ===================================================================== */}
      <header className="bg-[#2C365A] text-[#EEE8DF] border-b border-[#182038] sticky top-0 z-40 shadow-md">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Identidad Visual + Logo SIPA */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-lg bg-[#EEE8DF] p-1.5 flex items-center justify-center shadow-sm shrink-0">
              <img
                src="/sipa-logo.png"
                alt="Logo SIPA — Sistema Integral de Producción Agro-porcina"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  SIPA
                </h1>
                <span className="text-xs px-2 py-0.5 rounded bg-[#1E4D3B] text-white font-semibold">
                  UNIPORC TANDIL
                </span>
              </div>
              <p className="text-xs text-[#C4BCB0]">
                Sistema Integral de Producción Agro-porcina · Conector Agriness
                + SCADA + Nuvix ERP
              </p>
            </div>
          </div>

          {/* Estado de Conectores y Período Activo */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-md border border-white/15">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#86EFAC]" />
              <span>Agriness: Activo</span>
              <span className="opacity-40">|</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#86EFAC]" />
              <span>SCADA: Activo</span>
              <span className="opacity-40">|</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#86EFAC]" />
              <span>Nuvix ERP: Activo</span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("accounting")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-colors ${
                periodStatus === "CERRADO"
                  ? "bg-[#1E4D3B] text-white"
                  : "bg-[#FEF3C7] text-[#78350F]"
              }`}
              title="Hacé clic para gestionar el Cierre Mensual"
            >
              {periodStatus === "CERRADO" ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> Sep 2026: CERRADO
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Sep 2026: EN CONTROL
                </>
              )}
            </button>
          </div>
        </div>

        {/* BARRA DE NAVEGACIÓN PRINCIPAL POR SECTORES */}
        <nav
          aria-label="Módulos del sistema SIPA"
          className="bg-[#212946] border-t border-white/10 overflow-x-auto"
        >
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex items-center gap-1">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative px-3.5 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap inline-flex items-center gap-2 transition-colors ${
                    isActive
                      ? "text-white bg-[#2C365A]"
                      : "text-[#C4BCB0] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-[#86EFAC]" : "text-[#C4BCB0]"
                    }`}
                  />
                  <span className="hidden xl:inline">{tab.label}</span>
                  <span className="xl:hidden">{tab.shortLabel}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        tab.id === "pharmacy"
                          ? "bg-[#991B1B] text-white"
                          : "bg-[#1E4D3B] text-white"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-[#86EFAC]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* =====================================================================
          BARRA GLOBAL DE FILTROS MULTIDIMENSIONALES (Establecimiento & Etapa)
         ===================================================================== */}
      <section
        aria-label="Filtros globales de establecimiento, etapa y período"
        className="bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-xs"
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2C365A]">
              <Filter className="w-4 h-4 text-[#1E4D3B]" />
              <span>Filtros Globales:</span>
            </div>

            {/* Selector de Establecimiento */}
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="filter-establishment"
                className="text-xs font-semibold text-[var(--color-text-muted)]"
              >
                Establecimiento:
              </label>
              <select
                id="filter-establishment"
                value={selectedEstablishment}
                onChange={(e) =>
                  setSelectedEstablishment(
                    e.target.value as EstablishmentId | "ALL"
                  )
                }
                className="text-xs font-bold rounded-md border border-[var(--color-border-input)] bg-white px-3 py-1.5 text-[var(--color-text)] min-h-[36px]"
              >
                <option value="ALL">Consolidado Uniporc (Todos)</option>
                <option value="tandil">Tandil (Granja A)</option>
                <option value="san_lorenzo">San Lorenzo (Granja B)</option>
                {includePorcap && (
                  <option value="porcap">Porcap (Granja C)</option>
                )}
              </select>
            </div>

            {/* Selector de Etapa Productiva */}
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="filter-stage"
                className="text-xs font-semibold text-[var(--color-text-muted)]"
              >
                Etapa Productiva:
              </label>
              <select
                id="filter-stage"
                value={selectedStage}
                onChange={(e) =>
                  setSelectedStage(e.target.value as ProductionStage | "ALL")
                }
                className="text-xs font-bold rounded-md border border-[var(--color-border-input)] bg-white px-3 py-1.5 text-[var(--color-text)] min-h-[36px]"
              >
                <option value="ALL">Todas las Etapas (Ciclo Completo)</option>
                <option value="Maternidad">
                  Sitio 1: Maternidad (Cría / Destete)
                </option>
                <option value="Recría">Sitio 2: Recría (Iniciador)</option>
                <option value="Engorde">
                  Sitio 3: Engorde / Terminación
                </option>
              </select>
            </div>

            {/* Selector de Período */}
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="filter-period"
                className="text-xs font-semibold text-[var(--color-text-muted)]"
              >
                Período:
              </label>
              <select
                id="filter-period"
                value={activePeriod}
                onChange={(e) => setActivePeriod(e.target.value as PeriodId)}
                className="text-xs font-bold rounded-md border border-[var(--color-border-input)] bg-white px-3 py-1.5 text-[var(--color-text)] min-h-[36px]"
              >
                <option value="2026-09">
                  Septiembre 2026 ({periodStatus})
                </option>
                <option value="2026-08">Agosto 2026 (CERRADO)</option>
                <option value="2026-07">Julio 2026 (CERRADO)</option>
              </select>
            </div>
          </div>

          {/* Chips de filtros activos y botón limpiar */}
          <div className="flex items-center gap-2" aria-live="polite">
            {hasActiveFilters ? (
              <>
                {selectedEstablishment !== "ALL" && (
                  <Badge variant="ocean">
                    Granja: {selectedEstablishment}
                  </Badge>
                )}
                {selectedStage !== "ALL" && (
                  <Badge variant="forest">Etapa: {selectedStage}</Badge>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleResetFilters}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpiar filtros
                </Button>
              </>
            ) : (
              <span className="text-xs text-[var(--color-text-subtle)]">
                Vista activa: <strong>Consolidado General Uniporc</strong>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          CONTENIDO PRINCIPAL DINÁMICO SEGÚN PESTAÑA ACTIVA
         ===================================================================== */}
      <main
        id="main-content"
        className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            {activeTab === "control_tower" && (
              <ControlTowerView
                records={stageRecords}
                evolution={evolution}
                selectedEstablishment={selectedEstablishment}
                selectedStage={selectedStage}
                includePorcap={includePorcap}
                onTogglePorcap={setIncludePorcap}
                onUpdateStageRecord={handleUpdateStageRecord}
              />
            )}

            {activeTab === "ingestion" && (
              <IngestionMapperView
                logs={ingestionLogs}
                activePeriod={activePeriod}
                onAddIngestionLog={handleAddIngestionLog}
              />
            )}

            {activeTab === "farms" && (
              <FarmsProductionView
                records={stageRecords}
                selectedEstablishment={selectedEstablishment}
                selectedStage={selectedStage}
                includePorcap={includePorcap}
              />
            )}

            {activeTab === "scada" && (
              <FeedMillScadaView
                silos={siloBalances}
                batches={feedBatches}
                selectedEstablishment={selectedEstablishment}
                onAddBatch={handleAddFeedBatch}
                onUpdateExchangeRate={handleUpdateExchangeRate}
              />
            )}

            {activeTab === "pharmacy" && (
              <PharmacyAuditView
                inventory={pharmacyInventory}
                selectedEstablishment={selectedEstablishment}
                includePorcap={includePorcap}
                activePeriod={activePeriod}
                onGenerateAccountingEntry={handleGenerateAccountingEntry}
                onReconcileStock={handleReconcilePharmacyStock}
              />
            )}

            {activeTab === "accounting" && (
              <AccountingClosingView
                entries={accountingEntries}
                periodStatus={periodStatus}
                activePeriod={activePeriod}
                pharmacyInventory={pharmacyInventory}
                feedBatches={feedBatches}
                onTogglePeriodClosing={handleTogglePeriodClosing}
                onExportAllEntriesToNuvix={handleExportAllEntriesToNuvix}
              />
            )}

            {activeTab === "docs" && <DocumentationCenterView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* =====================================================================
          FOOTER INSTITUCIONAL
         ===================================================================== */}
      <footer className="bg-[var(--color-surface)] border-t border-[var(--color-border)] py-4 px-4 sm:px-6 text-xs text-[var(--color-text-subtle)] mt-12">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <strong className="text-[#2C365A]">SIPA Project v1.0</strong> ·
            Sistema Integral de Producción Agro-porcina · Desafío 07 Uniporc
            Tandil
          </div>
          <div>
            Hackaton Agro 2026 · UNICEN · Integración Agriness + SCADA + Nuvix
            ERP
          </div>
        </div>
      </footer>
    </div>
  );
}
export default App;
