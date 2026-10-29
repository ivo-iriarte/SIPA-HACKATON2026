/**
 * @file App.tsx
 * @description Shell principal de SIPA (Sistema Integral de Producción Agro-porcina — Uniporc Tandil).
 * Implementa el flujo normal de trabajo definido en '00 - Guía y mapa de procesos':
 * 1. Carga de los .xlsx de SCADA, Nuvix y Agriness.
 * 2. Consulta de los 4 procesos de Uniporc con sus salidas específicas:
 *    - Proceso 1: Costos -> Salida: Informe de costos (01 y 02)
 *    - Proceso 2: Consumos productivos -> Salida: Indicadores (03 y 09)
 *    - Proceso 3: Farmacia -> Salida: Control de inventario (04 y 05)
 *    - Proceso 4: Planta alimentos -> Salida: Costo de alimento (06, 07 y 08)
 * Paleta de diseño institucional: #EEE8DF (Cream), #2C365A (Deep Ocean), #C4BCB0 (Beige).
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSpreadsheet,
  LayoutDashboard,
  HeartPulse,
  Pill,
  Factory,
  BookOpen,
  Filter,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  RotateCcw,
  Sparkles,
  ArrowRight,
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
import { DocumentationCenterView } from "./components/views/DocumentationCenterView";
import { Badge, Button } from "./components/ui/primitives";

export type NavTabId =
  | "ingestion"
  | "costs"
  | "consumptions"
  | "pharmacy"
  | "feedmill"
  | "process_map";

export interface LoadedSystemsState {
  scada: boolean;
  nuvix: boolean;
  agriness: boolean;
}

const NAV_TABS: {
  id: NavTabId;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
  badge?: string;
  description: string;
}[] = [
  {
    id: "ingestion",
    label: "Carga de Archivos (.xlsx)",
    shortLabel: "1. Carga .xlsx",
    icon: FileSpreadsheet,
    badge: "Paso 1",
    description: "Carga de exportaciones de SCADA, Nuvix y Agriness",
  },
  {
    id: "costs",
    label: "Proceso 1: Costos (Informe de costos)",
    shortLabel: "1. Costos",
    icon: LayoutDashboard,
    badge: "Salida: Informe",
    description: "Informe de costos por centro, $/kg y $/lechón",
  },
  {
    id: "consumptions",
    label: "Proceso 2: Consumos productivos (Indicadores)",
    shortLabel: "2. Consumos",
    icon: HeartPulse,
    badge: "Salida: Indicadores",
    description: "FCR conversión, balance de cabezas e indicadores S4Farm",
  },
  {
    id: "pharmacy",
    label: "Proceso 3: Farmacia (Control de inventario)",
    shortLabel: "3. Farmacia",
    icon: Pill,
    badge: "Salida: Inventario",
    description: "Conciliación stock, auditoría signos y asiento Nuvix",
  },
  {
    id: "feedmill",
    label: "Proceso 4: Planta alimentos (Costo de alimento)",
    shortLabel: "4. Planta SCADA",
    icon: Factory,
    badge: "Salida: Costo",
    description: "Cuadratura tolva Control kg = 0, balance silos y valorización",
  },
  {
    id: "process_map",
    label: "Mapa de Procesos (Guía 00)",
    shortLabel: "Mapa Guía 00",
    icon: BookOpen,
    description: "Matriz oficial de los 4 procesos de Uniporc",
  },
];

export function App() {
  // Navegación principal enfocada en el flujo normal
  const [activeTab, setActiveTab] = useState<NavTabId>("ingestion");

  // Estado del flujo de carga de los 3 orígenes requeridos
  const [loadedSystems, setLoadedSystems] = useState<LoadedSystemsState>({
    scada: true,
    nuvix: true,
    agriness: true,
  });

  // Filtros globales (Establecimiento y Etapa)
  const [selectedEstablishment, setSelectedEstablishment] = useState<
    EstablishmentId | "ALL"
  >("ALL");
  const [selectedStage, setSelectedStage] = useState<ProductionStage | "ALL">(
    "ALL"
  );
  const [activePeriod, setActivePeriod] = useState<PeriodId>("2026-09");
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
  const [accountingEntries, setAccountingEntries] = useState<AccountingEntry[]>(
    INITIAL_ACCOUNTING_ENTRIES
  );
  const [ingestionLogs, setIngestionLogs] = useState<IngestionLogRecord[]>(
    INITIAL_INGESTION_LOGS
  );
  const [periodStatus, setPeriodStatus] = useState<PeriodStatus>("ABIERTO");

  // Handlers de carga de sistemas
  const handleLoadAllSystems = () => {
    setLoadedSystems({ scada: true, nuvix: true, agriness: true });
    setStageRecords(INITIAL_STAGE_RECORDS);
    setPharmacyInventory(INITIAL_PHARMACY_INVENTORY);
    setSiloBalances(INITIAL_SILO_BALANCES);
    setFeedBatches(INITIAL_FEED_BATCHES);
    setEvolution(INITIAL_MONTHLY_EVOLUTION);
  };

  const handleLoadSystem = (system: "scada" | "nuvix" | "agriness") => {
    setLoadedSystems((prev) => ({ ...prev, [system]: true }));
  };

  const handleResetSystems = () => {
    setLoadedSystems({ scada: false, nuvix: false, agriness: false });
  };

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

  const allSystemsLoaded =
    loadedSystems.scada && loadedSystems.nuvix && loadedSystems.agriness;
  const loadedCount =
    (loadedSystems.scada ? 1 : 0) +
    (loadedSystems.nuvix ? 1 : 0) +
    (loadedSystems.agriness ? 1 : 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#EEE8DF] text-[#182038]">
      {/* =====================================================================
          HEADER INSTITUCIONAL SIPA — UNIPORC TANDIL (#2C365A + #EEE8DF)
         ===================================================================== */}
      <header className="bg-[#2C365A] text-[#EEE8DF] border-b border-[#182038] sticky top-0 z-40 shadow-md">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Identidad SIPA */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-[#EEE8DF] p-1.5 flex items-center justify-center shadow-sm shrink-0">
              <img
                src="/sipa-logo.png"
                alt="Logo SIPA"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  SIPA
                </h1>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#1E4D3B] text-white font-semibold">
                  UNIPORC TANDIL
                </span>
              </div>
              <p className="text-xs text-[#C4BCB0]">
                Sistema Integral de Producción Agro-porcina · Flujo Unificado .xlsx
              </p>
            </div>
          </div>

          {/* Monitoreo en vivo de los 3 orígenes de datos */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Estado de los 3 orígenes */}
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-md border border-white/15">
              <span className="font-semibold text-white/70 mr-1 hidden sm:inline">
                Estado Orígenes:
              </span>
              <span
                className={`inline-flex items-center gap-1 font-medium ${
                  loadedSystems.scada ? "text-[#86EFAC]" : "text-amber-300"
                }`}
                title="SCADA Planta: Pesaje en tolva y balance de silos"
              >
                {loadedSystems.scada ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                SCADA
              </span>
              <span className="opacity-30">|</span>
              <span
                className={`inline-flex items-center gap-1 font-medium ${
                  loadedSystems.nuvix ? "text-[#86EFAC]" : "text-amber-300"
                }`}
                title="Nuvix ERP: Facturación y gastos por centro"
              >
                {loadedSystems.nuvix ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                Nuvix ERP
              </span>
              <span className="opacity-30">|</span>
              <span
                className={`inline-flex items-center gap-1 font-medium ${
                  loadedSystems.agriness ? "text-[#86EFAC]" : "text-amber-300"
                }`}
                title="Agriness: Producción hacienda y sanidad"
              >
                {loadedSystems.agriness ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                Agriness
              </span>
            </div>

            {/* Cierre mensual */}
            <button
              type="button"
              onClick={handleTogglePeriodClosing}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-colors ${
                periodStatus === "CERRADO"
                  ? "bg-[#1E4D3B] text-white"
                  : "bg-[#FEF3C7] text-[#78350F]"
              }`}
              title="Período contable Septiembre 2026"
            >
              {periodStatus === "CERRADO" ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> Sep 2026: CERRADO
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Sep 2026: ABIERTO
                </>
              )}
            </button>
          </div>
        </div>

        {/* =====================================================================
            BARRA DE NAVEGACIÓN: CARGA + LOS 4 PROCESOS DE UNIPORC + MAPA
           ===================================================================== */}
        <nav
          aria-label="Navegación de procesos SIPA"
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
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        tab.id === "ingestion"
                          ? "bg-[#2C365A] border border-[#C4BCB0]/40 text-[#86EFAC]"
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
          BARRA DE CONTEXTO Y FILTROS MULTIDIMENSIONALES (Establecimiento y Etapa)
         ===================================================================== */}
      <section
        aria-label="Filtros de establecimiento y etapa"
        className="bg-[#F7F4EF] border-b border-[#C4BCB0] shadow-xs"
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2C365A]">
              <Filter className="w-4 h-4 text-[#1E4D3B]" />
              <span>Filtros:</span>
            </div>

            {/* Selector de Establecimiento */}
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="filter-establishment"
                className="text-xs font-semibold text-[#2C365A]"
              >
                Granja / Centro:
              </label>
              <select
                id="filter-establishment"
                value={selectedEstablishment}
                onChange={(e) =>
                  setSelectedEstablishment(
                    e.target.value as EstablishmentId | "ALL"
                  )
                }
                className="text-xs font-bold rounded-md border border-[#5C6F73] bg-white px-3 py-1.5 text-[#182038] min-h-[34px]"
              >
                <option value="ALL">Consolidado Uniporc (Tandil + San Lorenzo)</option>
                <option value="tandil">Granja A — Tandil (CC-TAN-01)</option>
                <option value="san_lorenzo">Granja B — San Lorenzo (CC-SLO-02)</option>
                {includePorcap && (
                  <option value="porcap">Granja C — Porcap (CC-POR-03)</option>
                )}
              </select>
            </div>

            {/* Selector de Etapa Productiva */}
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="filter-stage"
                className="text-xs font-semibold text-[#2C365A]"
              >
                Etapa:
              </label>
              <select
                id="filter-stage"
                value={selectedStage}
                onChange={(e) =>
                  setSelectedStage(e.target.value as ProductionStage | "ALL")
                }
                className="text-xs font-bold rounded-md border border-[#5C6F73] bg-white px-3 py-1.5 text-[#182038] min-h-[34px]"
              >
                <option value="ALL">Todas las Etapas (Sitios 1, 2 y 3)</option>
                <option value="Maternidad">Sitio 1: Maternidad</option>
                <option value="Recría">Sitio 2: Recría</option>
                <option value="Engorde">Sitio 3: Engorde</option>
              </select>
            </div>

            {(selectedEstablishment !== "ALL" || selectedStage !== "ALL") && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-[#2C365A] hover:underline font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Accesos rápidos de carga */}
          <div className="flex items-center gap-2">
            {!allSystemsLoaded && (
              <Button
                variant="forest"
                size="sm"
                onClick={handleLoadAllSystems}
                className="text-xs font-bold gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Cargar Datos de Prueba
              </Button>
            )}
            <span className="text-xs text-[#5C6F73] font-medium hidden md:inline">
              Orígenes cargados: <strong>{loadedCount}/3</strong>
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================================
          CONTENIDO DINÁMICO SEGÚN PESTAÑA ACTIVA
         ===================================================================== */}
      <main id="main-content" className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          {/* TAB 1: CARGA DE ARCHIVOS (.xlsx) */}
          {activeTab === "ingestion" && (
            <motion.div
              key="tab-ingestion"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <IngestionMapperView
                logs={ingestionLogs}
                activePeriod={activePeriod}
                onAddIngestionLog={handleAddIngestionLog}
                loadedSystems={loadedSystems}
                onLoadAllSystems={handleLoadAllSystems}
                onLoadSystem={handleLoadSystem}
                onResetSystems={handleResetSystems}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            </motion.div>
          )}

          {/* TAB 2: PROCESO 1: COSTOS -> INFORME DE COSTOS */}
          {activeTab === "costs" && (
            <motion.div
              key="tab-costs"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ControlTowerView
                records={stageRecords}
                evolution={evolution}
                selectedEstablishment={selectedEstablishment}
                selectedStage={selectedStage}
                includePorcap={includePorcap}
                onTogglePorcap={setIncludePorcap}
                onUpdateStageRecord={handleUpdateStageRecord}
                loadedSystems={loadedSystems}
                onLoadAllSystems={handleLoadAllSystems}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            </motion.div>
          )}

          {/* TAB 3: PROCESO 2: CONSUMOS PRODUCTIVOS -> INDICADORES */}
          {activeTab === "consumptions" && (
            <motion.div
              key="tab-consumptions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <FarmsProductionView
                records={stageRecords}
                selectedEstablishment={selectedEstablishment}
                selectedStage={selectedStage}
                includePorcap={includePorcap}
                loadedSystems={loadedSystems}
                onLoadAllSystems={handleLoadAllSystems}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            </motion.div>
          )}

          {/* TAB 4: PROCESO 3: FARMACIA -> CONTROL DE INVENTARIO */}
          {activeTab === "pharmacy" && (
            <motion.div
              key="tab-pharmacy"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <PharmacyAuditView
                inventory={pharmacyInventory}
                selectedEstablishment={selectedEstablishment}
                includePorcap={includePorcap}
                activePeriod={activePeriod}
                onGenerateAccountingEntry={handleGenerateAccountingEntry}
                onReconcileStock={handleReconcilePharmacyStock}
                loadedSystems={loadedSystems}
                onLoadAllSystems={handleLoadAllSystems}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            </motion.div>
          )}

          {/* TAB 5: PROCESO 4: PLANTA DE ALIMENTOS -> COSTO DE ALIMENTO */}
          {activeTab === "feedmill" && (
            <motion.div
              key="tab-feedmill"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <FeedMillScadaView
                silos={siloBalances}
                batches={feedBatches}
                selectedEstablishment={selectedEstablishment}
                onAddBatch={handleAddFeedBatch}
                onUpdateExchangeRate={handleUpdateExchangeRate}
                loadedSystems={loadedSystems}
                onLoadAllSystems={handleLoadAllSystems}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            </motion.div>
          )}

          {/* TAB 6: MAPA DE PROCESOS (GUÍA 00) */}
          {activeTab === "process_map" && (
            <motion.div
              key="tab-process-map"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <DocumentationCenterView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* =====================================================================
          FOOTER LIMPIO INSTITUCIONAL (#2C365A + #EEE8DF)
         ===================================================================== */}
      <footer className="bg-[#2C365A] text-[#EEE8DF] border-t border-[#182038] py-3.5 text-xs mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold">SIPA · Uniporc Tandil</span>
            <span className="text-[#C4BCB0]">· Sistema Integral de Producción Agro-porcina</span>
          </div>
          <div className="flex items-center gap-4 text-[#C4BCB0]">
            <span>Período: {activePeriod}</span>
            <span>Establecimientos: Tandil & San Lorenzo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default App;
