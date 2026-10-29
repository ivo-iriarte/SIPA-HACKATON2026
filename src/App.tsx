/**
 * @file App.tsx
 * @description Shell principal de SIPA (Sistema Integral de Producción Agro-porcina — Uniporc Tandil).
 * Flujo normal de trabajo:
 * 1. Carga de los .xlsx exportados de SCADA, Nuvix y Agriness.
 * 2. Consulta de los 4 procesos de Uniporc con sus salidas específicas:
 *    - Costos -> Informe de costos
 *    - Consumos productivos -> Indicadores
 *    - Planta alimentos -> Costo de alimento
 *    - Farmacia -> Control de inventario
 * Paleta de diseño: #F4EFE3 (Trigo), #FBF8F0 (Crema), #D6C8AE (Arena),
 * #43533D (Oliva profundo), #566647 (Oliva suave), #6B543B (Nogal), #30291F (Tinta cálida).
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, Lock, Unlock } from "lucide-react";
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
  INITIAL_INGESTION_LOGS,
} from "./data/initialUniporcData";
import { ControlTowerView } from "./components/views/ControlTowerView";
import { IngestionMapperView } from "./components/views/IngestionMapperView";
import { FarmsProductionView } from "./components/views/FarmsProductionView";
import { FeedMillScadaView } from "./components/views/FeedMillScadaView";
import { PharmacyAuditView } from "./components/views/PharmacyAuditView";
import { FilterMenu } from "./components/ui/layout";

export type NavTabId =
  | "ingestion"
  | "costs"
  | "consumptions"
  | "feedmill"
  | "pharmacy";

export interface LoadedSystemsState {
  scada: boolean;
  nuvix: boolean;
  agriness: boolean;
}

const NAV_TABS: { id: NavTabId; label: string }[] = [
  { id: "ingestion", label: "Carga de archivos" },
  { id: "costs", label: "Costos" },
  { id: "consumptions", label: "Consumos productivos" },
  { id: "feedmill", label: "Planta alimentos" },
  { id: "pharmacy", label: "Farmacia" },
];

const SOURCE_STATUS: { key: keyof LoadedSystemsState; label: string }[] = [
  { key: "scada", label: "SCADA" },
  { key: "nuvix", label: "Nuvix ERP" },
  { key: "agriness", label: "Agriness" },
];

export function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>("ingestion");

  // Estado de carga de los 3 orígenes requeridos
  const [loadedSystems, setLoadedSystems] = useState<LoadedSystemsState>({
    scada: true,
    nuvix: true,
    agriness: true,
  });

  // Filtros globales
  const [selectedEstablishment, setSelectedEstablishment] = useState<
    EstablishmentId | "ALL"
  >("ALL");
  const [selectedStage, setSelectedStage] = useState<ProductionStage | "ALL">(
    "ALL"
  );
  const [activePeriod] = useState<PeriodId>("2026-09");
  const [includePorcap, setIncludePorcap] = useState<boolean>(false);

  // Datos en memoria
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
  const [ingestionLogs, setIngestionLogs] = useState<IngestionLogRecord[]>(
    INITIAL_INGESTION_LOGS
  );
  const [periodStatus, setPeriodStatus] = useState<PeriodStatus>("ABIERTO");

  // Handlers
  const handleLoadSystem = (system: keyof LoadedSystemsState) => {
    setLoadedSystems((prev) => ({ ...prev, [system]: true }));
  };

  const handleClearSystem = (system: keyof LoadedSystemsState) => {
    setLoadedSystems((prev) => ({ ...prev, [system]: false }));
  };

  const handleResetFilters = () => {
    setSelectedEstablishment("ALL");
    setSelectedStage("ALL");
    setIncludePorcap(false);
  };

  const handleIncludePorcap = (val: boolean) => {
    setIncludePorcap(val);
    if (!val && selectedEstablishment === "porcap") setSelectedEstablishment("ALL");
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
    _entry: AccountingEntry
  ) => {
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
        return { ...p, stockNuvix: theoretical, stockAgriness: theoretical };
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

  const goToUpload = () => setActiveTab("ingestion");

  const renderFilters = (showStage = true) => (
    <FilterMenu
      establishment={selectedEstablishment}
      stage={selectedStage}
      includePorcap={includePorcap}
      showStage={showStage}
      onEstablishmentChange={setSelectedEstablishment}
      onStageChange={setSelectedStage}
      onIncludePorcapChange={handleIncludePorcap}
      onReset={handleResetFilters}
    />
  );

  const motionProps = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.15 },
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4EFE3] text-[#30291F]">
      {/* =====================================================================
          HEADER INSTITUCIONAL
         ===================================================================== */}
      <header className="bg-[#43533D] text-[#FBF8F0] sticky top-0 z-40 shadow-md">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Identidad */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg bg-[#FBF8F0] p-1.5 flex items-center justify-center shadow-sm shrink-0 border border-[#D6C8AE]">
              <img
                src="/sipa-logo.png"
                alt="Logo SIPA"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#FBF8F0]">SIPA</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-[#566647] text-[#FBF8F0] border border-[#D6C8AE]/30 font-semibold tracking-wide">
              UNIPORC TANDIL
            </span>
          </div>

          {/* Estado de orígenes y período */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <div className="flex items-center gap-3 bg-black/15 px-3 py-1.5 rounded-md border border-[#D6C8AE]/25">
              {SOURCE_STATUS.map((s) => (
                <span
                  key={s.key}
                  className={`inline-flex items-center gap-1.5 font-medium ${
                    loadedSystems[s.key] ? "text-[#FBF8F0]" : "text-amber-300"
                  }`}
                  title={loadedSystems[s.key] ? "Cargado" : "Pendiente"}
                >
                  {loadedSystems[s.key] ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D6C8AE]" aria-hidden="true" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  {s.label}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={handleTogglePeriodClosing}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
                periodStatus === "CERRADO"
                  ? "bg-[#566647] text-[#FBF8F0] border border-[#D6C8AE]/30"
                  : "bg-[#FEF3C7] text-[#78350F]"
              }`}
              title="Abrir / cerrar el período contable"
            >
              {periodStatus === "CERRADO" ? (
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Unlock className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              Sep 2026 · {periodStatus === "CERRADO" ? "Cerrado" : "Abierto"}
            </button>
          </div>
        </div>

        {/* Navegación de procesos */}
        <nav aria-label="Procesos" className="bg-[#364431] border-t border-[#D6C8AE]/20">
          <div className="max-w-[1400px] mx-auto px-2 sm:px-6 flex">
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex-1 sm:flex-none px-2 sm:px-5 py-3 text-xs sm:text-sm font-semibold leading-tight text-center transition-colors ${
                    isActive
                      ? "text-[#FBF8F0] bg-[#43533D]"
                      : "text-[#D6C8AE] hover:text-[#FBF8F0] hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D6C8AE]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* =====================================================================
          CONTENIDO
         ===================================================================== */}
      <main
        id="main-content"
        className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6"
      >
        <AnimatePresence mode="wait">
          {activeTab === "ingestion" && (
            <motion.div key="tab-ingestion" {...motionProps}>
              <IngestionMapperView
                logs={ingestionLogs}
                activePeriod={activePeriod}
                onAddIngestionLog={handleAddIngestionLog}
                loadedSystems={loadedSystems}
                onLoadSystem={handleLoadSystem}
                onClearSystem={handleClearSystem}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            </motion.div>
          )}

          {activeTab === "costs" && (
            <motion.div key="tab-costs" {...motionProps}>
              <ControlTowerView
                records={stageRecords}
                evolution={evolution}
                selectedEstablishment={selectedEstablishment}
                selectedStage={selectedStage}
                includePorcap={includePorcap}
                onUpdateStageRecord={handleUpdateStageRecord}
                loadedSystems={loadedSystems}
                filterSlot={renderFilters()}
                onGoToUpload={goToUpload}
              />
            </motion.div>
          )}

          {activeTab === "consumptions" && (
            <motion.div key="tab-consumptions" {...motionProps}>
              <FarmsProductionView
                records={stageRecords}
                selectedEstablishment={selectedEstablishment}
                selectedStage={selectedStage}
                includePorcap={includePorcap}
                loadedSystems={loadedSystems}
                filterSlot={renderFilters()}
                onGoToUpload={goToUpload}
              />
            </motion.div>
          )}

          {activeTab === "feedmill" && (
            <motion.div key="tab-feedmill" {...motionProps}>
              <FeedMillScadaView
                silos={siloBalances}
                batches={feedBatches}
                selectedEstablishment={selectedEstablishment}
                onAddBatch={handleAddFeedBatch}
                onUpdateExchangeRate={handleUpdateExchangeRate}
                loadedSystems={loadedSystems}
                filterSlot={renderFilters(false)}
                onGoToUpload={goToUpload}
              />
            </motion.div>
          )}

          {activeTab === "pharmacy" && (
            <motion.div key="tab-pharmacy" {...motionProps}>
              <PharmacyAuditView
                inventory={pharmacyInventory}
                selectedEstablishment={selectedEstablishment}
                includePorcap={includePorcap}
                activePeriod={activePeriod}
                onGenerateAccountingEntry={handleGenerateAccountingEntry}
                onReconcileStock={handleReconcilePharmacyStock}
                loadedSystems={loadedSystems}
                filterSlot={renderFilters(false)}
                onGoToUpload={goToUpload}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* =====================================================================
          FOOTER
         ===================================================================== */}
      <footer className="bg-[#43533D] text-[#D6C8AE] py-3 text-xs mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <span className="font-semibold text-[#FBF8F0]">SIPA</span> · Uniporc Tandil
        </div>
      </footer>
    </div>
  );
}
export default App;
