/**
 * @file domain.ts
 * @description Modelo de Dominio Canónico de SIPA (Sistema Integral de Producción Agro-porcina).
 * Diseñado bajo patrón Repository/DataStore desacoplado, listo para conectarse a una API REST
 * y base de datos relacional (PostgreSQL) en la siguiente iteración sin modificar componentes UI.
 */

export type EstablishmentId = "tandil" | "san_lorenzo" | "porcap";

export type ProductionStage = "Maternidad" | "Recría" | "Engorde";

export type SourceSystem = "Agriness" | "SCADA" | "Nuvix";

export type PeriodId = "2026-09" | "2026-08" | "2026-07";

export type PeriodStatus = "ABIERTO" | "CERRADO";

/**
 * Representa un Establecimiento productivo de Uniporc.
 * Incluye los alias utilizados en los reportes ficticios del desafío ("Granja A", "Granja B")
 * y los nombres reales indicados por Sofía Gonzalez Grenat ("Tandil", "San Lorenzo", "Porcap").
 */
export interface Establishment {
  id: EstablishmentId;
  name: string;
  code: string;
  aliases: string[];
  location: string;
  activeSows: number;
}

/**
 * Registro de Costos y Producción por Establecimiento y Etapa (Archivos 01, 02, 03 y 09)
 */
export interface StageCostProductionRecord {
  id: string;
  period: PeriodId;
  establishmentId: EstablishmentId;
  establishmentName: string;
  stage: ProductionStage;
  // Datos Biológicos (Origen: Agriness / S4Farm)
  initialAnimals: number;
  entries: number;
  exits: number;
  finalAnimals: number; // Fórmula: initialAnimals + entries - exits
  producedKg: number;
  weanedPiglets: number; // Exclusivo Maternidad
  farrowings: number;    // Partos
  bornAlive: number;     // Nacidos vivos
  mortalityPct: number;
  avgWeaningWeightKg: number;
  // Datos de Alimento (Origen: SCADA + Agriness)
  feedType: "Lactancia" | "Iniciador" | "Crecimiento" | "Terminador";
  consumedFeedKg: number;
  // Datos Económicos en ARS (Origen: Nuvix + SCADA valorizado)
  feedCostArs: number;
  healthCostArs: number;
  laborCostArs: number;
  otherCostArs: number;
}

/**
 * Evolución Mensual Histórica (Archivo 02 - Informe de costos anual)
 */
export interface MonthlyEvolutionRecord {
  period: PeriodId;
  monthLabel: string;
  status: PeriodStatus;
  tandilCostArs: number;
  sanLorenzoCostArs: number;
  porcapCostArs: number;
  totalCostArs: number;
  totalProducedKg: number;
  totalWeanedPiglets: number;
  costPerKgArs: number;
  costPerWeanedPigletArs: number;
  globalFcr: number;
}

/**
 * Registro de Inventario y Conciliación de Farmacia (Archivos 04 y 05)
 */
export interface PharmacyInventoryRecord {
  id: string;
  period: PeriodId;
  establishmentId: EstablishmentId;
  establishmentName: string;
  productCode: string;
  productName: string;
  initialStock: number;
  purchasesNuvix: number;
  consumedAgriness: number;
  // Stock Teórico = initialStock + purchasesNuvix - consumedAgriness
  stockNuvix: number;
  stockAgriness: number;
  unitCostArs: number;
  accountingPosted: boolean;
}

/**
 * Balance de Materias Primas en Silos SCADA (Archivo 06)
 */
export interface ScadaSiloBalanceRecord {
  id: string;
  code: string;
  rawMaterial: string;
  initialStockKg: number;
  entriesKg: number;
  consumedKg: number;
  adjustmentKg: number;
  adjustmentDate?: string;
  adjustmentReason?: string;
  unitPriceArsPerKg: number;
  exchangeRateArsUsd: number;
}

/**
 * Lote de Fabricación de Planta de Alimento Balanceado (Archivos 07 y 08)
 */
export interface FeedBatchRecord {
  id: string;
  date: string;
  plantName: string;
  establishmentId: EstablishmentId;
  formulaName: string;
  feedCategory: "Lactancia" | "Iniciador" | "Crecimiento" | "Terminador";
  producedKg: number;
  cornKg: number;
  soyKg: number;
  otherKg: number;
  // Control de pesaje: producedKg - (cornKg + soyKg + otherKg) === 0
  freightAllocatedArs: number;
}

/**
 * Asiento Contable Generado para Nuvix ERP (Archivo 04 - Asiento modelo)
 */
export interface AccountingEntry {
  id: string;
  date: string;
  period: PeriodId;
  originModule: "Farmacia" | "Alimento" | "Sueldos y Gastos";
  costCenter: string;
  debitAccount: string;
  debitAmountArs: number;
  creditAccount: string;
  creditAmountArs: number;
  status: "BORRADOR" | "EXPORTADO_NUVIX";
  referenceNote: string;
}

/**
 * Historial de Ingesta de Archivos Excel (Control de Duplicados y Auditoría)
 */
export interface IngestionLogRecord {
  id: string;
  fileName: string;
  uploadedAt: string;
  sourceSystem: SourceSystem;
  period: PeriodId;
  rowsProcessed: number;
  mappedColumns: { sourceHeader: string; canonicalField: string }[];
  status: "SINCRONIZADO" | "CON_ADVERTENCIAS" | "DUPLICADO_PREVENIDO";
  summaryMessage: string;
}
