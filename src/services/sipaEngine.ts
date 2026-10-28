/**
 * @file sipaEngine.ts
 * @description Motor de Cálculo Zootécnico-Contable, Normalización de Alias y Formateo es-AR.
 * Implementa las 9 fórmulas clave del negocio porcino de Uniporc Tandil.
 */

import {
  StageCostProductionRecord,
  PharmacyInventoryRecord,
  ScadaSiloBalanceRecord,
  FeedBatchRecord,
  SourceSystem,
} from "../types/domain";

// ============================================================================
// 1. FORMATEADORES LOCALE (es-AR) SEGÚN DIRECTRICES FRONTEND-UX-UI
// ============================================================================

const currencyFormatterArs = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const currencyFormatterArsDecimals = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyFormatterUsd = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatArs(value: number, withDecimals = false): string {
  if (!Number.isFinite(value)) return "$ 0";
  return withDecimals
    ? currencyFormatterArsDecimals.format(value)
    : currencyFormatterArs.format(value);
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "US$ 0,00";
  return currencyFormatterUsd.format(value);
}

export function formatNum(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "0";
  return decimals > 0 ? decimalFormatter.format(value) : numberFormatter.format(value);
}

// ============================================================================
// 2. LAS 9 FÓRMULAS DE NEGOCIO DE UNIPORC
// ============================================================================

/**
 * FÓRMULA 1: Costo Total por Centro / Etapa ($)
 * Origen: Nuvix (Sanidad, Mano de Obra, Otros) + SCADA valorizado (Alimento)
 */
export function calcTotalStageCost(rec: StageCostProductionRecord): number {
  return rec.feedCostArs + rec.healthCostArs + rec.laborCostArs + rec.otherCostArs;
}

/**
 * FÓRMULA 2: Costo por Kg Producido ($/kg) — KPI Rey
 * Fórmula: (Alimento $ + Sanidad $ + Mano de Obra $ + Otros $) / Kg Producidos
 */
export function calcCostPerKg(totalCostArs: number, producedKg: number): number {
  if (producedKg <= 0) return 0;
  return totalCostArs / producedKg;
}

/**
 * FÓRMULA 3: Costo por Lechón Destetado ($/lechón) — Pedido explícito de Sofía
 * Fórmula: Costos directos de Fase Maternidad / Lechones Destetados (S4Farm/Agriness)
 */
export function calcCostPerWeanedPiglet(
  maternityCostArs: number,
  weanedPiglets: number
): number {
  if (weanedPiglets <= 0) return 0;
  return maternityCostArs / weanedPiglets;
}

/**
 * FÓRMULA 4: Conversión Alimenticia Aparente (FCR - Feed Conversion Ratio)
 * Fórmula: Kg Alimento Consumido / Kg Carne Producida
 */
export function calcFeedConversionRatio(
  consumedFeedKg: number,
  producedKg: number
): number {
  if (producedKg <= 0) return 0;
  return consumedFeedKg / producedKg;
}

/**
 * FÓRMULA 5: Balance Biológico de Animales Finales (Cabezas)
 * Fórmula: Animales Iniciales + Entradas - Salidas
 */
export function calcFinalAnimals(
  initial: number,
  entries: number,
  exits: number
): number {
  return initial + entries - exits;
}

/**
 * FÓRMULA 6: Stock Teórico y Discrepancia de Farmacia (Unidades)
 * Stock Teórico = Stock Inicial + Compras (Nuvix) - Consumos (Agriness)
 * Diferencia Nuvix vs Teórico = Stock Nuvix - Stock Teórico (Criterio Archivo 04)
 * Diferencia Agriness vs Nuvix = Stock Agriness - Stock Nuvix (Criterio Archivo 05)
 */
export function calcPharmacyReconciliation(item: PharmacyInventoryRecord) {
  const theoreticalStock =
    item.initialStock + item.purchasesNuvix - item.consumedAgriness;
  const diffNuvixVsTheoretical = item.stockNuvix - theoreticalStock;
  const diffAgrinessVsNuvix = item.stockAgriness - item.stockNuvix;
  const totalConsumptionValueArs = item.consumedAgriness * item.unitCostArs;

  return {
    theoreticalStock,
    diffNuvixVsTheoretical,
    diffAgrinessVsNuvix,
    totalConsumptionValueArs,
    hasDiscrepancy:
      diffNuvixVsTheoretical !== 0 || diffAgrinessVsNuvix !== 0,
    hasSignInversionWarning:
      diffNuvixVsTheoretical !== 0 &&
      diffAgrinessVsNuvix !== 0 &&
      Math.sign(diffNuvixVsTheoretical) !== Math.sign(diffAgrinessVsNuvix),
  };
}

/**
 * FÓRMULA 7: Control de Pesaje en Tolva SCADA (Kg)
 * Fórmula: Kg Fabricados - (Maíz kg + Harina Soja kg + Otros kg)
 * Si es distinto de 0, alerta por descalibración de balanza o pérdida en molienda.
 */
export function calcBatchScaleDeviation(batch: FeedBatchRecord): {
  sumIngredientsKg: number;
  deviationKg: number;
  isBalanced: boolean;
} {
  const sumIngredientsKg = batch.cornKg + batch.soyKg + batch.otherKg;
  const deviationKg = batch.producedKg - sumIngredientsKg;
  return {
    sumIngredientsKg,
    deviationKg,
    isBalanced: Math.abs(deviationKg) < 0.01,
  };
}

/**
 * FÓRMULA 8: Costo Real de Lote de Alimento Balanceado ($ y $/kg)
 * Incluye Maíz + Soja + Otros (Núcleos) + Flete Asignado y su conversión a USD.
 */
export function calcFeedBatchValuation(
  batch: FeedBatchRecord,
  prices: {
    cornArsPerKg: number;
    soyArsPerKg: number;
    otherArsPerKg: number;
    exchangeRateArsUsd: number;
  },
  includeOtherIngredients = true
) {
  const cornCostArs = batch.cornKg * prices.cornArsPerKg;
  const soyCostArs = batch.soyKg * prices.soyArsPerKg;
  const otherCostArs = includeOtherIngredients
    ? batch.otherKg * prices.otherArsPerKg
    : 0;
  const ingredientsCostArs = cornCostArs + soyCostArs + otherCostArs;
  const totalWithFreightArs = ingredientsCostArs + batch.freightAllocatedArs;
  const costPerKgArs =
    batch.producedKg > 0 ? totalWithFreightArs / batch.producedKg : 0;
  const totalUsd =
    prices.exchangeRateArsUsd > 0
      ? totalWithFreightArs / prices.exchangeRateArsUsd
      : 0;

  return {
    cornCostArs,
    soyCostArs,
    otherCostArs,
    ingredientsCostArs,
    totalWithFreightArs,
    costPerKgArs,
    totalUsd,
  };
}

/**
 * FÓRMULA 9: Balance Físico de Silos SCADA (Kg)
 * Stock Final = Stock Inicial + Ingresos - Consumos + Corrección/Ajuste
 */
export function calcSiloFinalStock(silo: ScadaSiloBalanceRecord) {
  const finalStockKg =
    silo.initialStockKg +
    silo.entriesKg -
    silo.consumedKg +
    silo.adjustmentKg;
  const valuationArs = finalStockKg * silo.unitPriceArsPerKg;
  const valuationUsd =
    silo.exchangeRateArsUsd > 0 ? valuationArs / silo.exchangeRateArsUsd : 0;

  return {
    finalStockKg,
    valuationArs,
    valuationUsd,
  };
}

// ============================================================================
// 3. DICCIONARIO DE ALIAS Y MOTOR DE MAPEO DE COLUMNAS (INGESTA EXCEL)
// ============================================================================

export interface ColumnAliasRule {
  canonicalField: string;
  label: string;
  targetSystem: SourceSystem;
  synonyms: string[];
}

export const CANONICAL_COLUMN_DICTIONARY: ColumnAliasRule[] = [
  {
    canonicalField: "establishmentName",
    label: "Establecimiento / Centro de Costo",
    targetSystem: "Nuvix",
    synonyms: [
      "Establecimiento",
      "Centro ficticio",
      "Centro",
      "Planta ficticia",
      "Granja",
      "Ubicacion",
    ],
  },
  {
    canonicalField: "stage",
    label: "Etapa Productiva / Fase",
    targetSystem: "Agriness",
    synonyms: ["Fase", "Etapa", "Sitio", "Categoria"],
  },
  {
    canonicalField: "producedKg",
    label: "Kilos Producidos (Carne)",
    targetSystem: "Agriness",
    synonyms: [
      "Kg producidos",
      "Kilos producidos",
      "Produccion kg",
      "Ganancia kg",
    ],
  },
  {
    canonicalField: "consumedFeedKg",
    label: "Kilos de Alimento Consumidos",
    targetSystem: "SCADA",
    synonyms: [
      "Kg consumidos",
      "Consumos kg",
      "Kg fabricados",
      "Kg elaborados",
      "Kg",
    ],
  },
  {
    canonicalField: "feedCostArs",
    label: "Costo de Alimento ($ ARS)",
    targetSystem: "Nuvix",
    synonyms: [
      "Alimento $",
      "Costo total ficticio $",
      "Costo $",
      "Importe Alimento",
    ],
  },
  {
    canonicalField: "healthCostArs",
    label: "Gasto Sanidad ($ ARS)",
    targetSystem: "Nuvix",
    synonyms: ["Sanidad $", "Gasto sanidad", "Total $"],
  },
  {
    canonicalField: "laborCostArs",
    label: "Mano de Obra ($ ARS)",
    targetSystem: "Nuvix",
    synonyms: ["Mano de obra $", "Sueldos $", "Personal $"],
  },
  {
    canonicalField: "productName",
    label: "Producto Sanitario / Materia Prima",
    targetSystem: "Agriness",
    synonyms: [
      "Producto ficticio",
      "Producto",
      "Materia prima",
      "Formula ficticia",
      "Alimento",
    ],
  },
  {
    canonicalField: "consumedAgriness",
    label: "Unidades Aplicadas (Agriness)",
    targetSystem: "Agriness",
    synonyms: [
      "Consumos Agriness",
      "Cantidad Agriness",
      "Consumo unidades",
    ],
  },
  {
    canonicalField: "stockNuvix",
    label: "Stock Contable (Nuvix)",
    targetSystem: "Nuvix",
    synonyms: ["Stock Nuvix", "Cantidad Nuvix"],
  },
];

/**
 * Analiza una lista de encabezados de un Excel subido y sugiere el mapeo canónico
 * y el sistema de origen (Agriness, SCADA o Nuvix).
 */
export function autoMapExcelHeaders(headers: string[]): {
  detectedSystem: SourceSystem;
  mappings: {
    sourceHeader: string;
    canonicalField: string;
    canonicalLabel: string;
    confidence: "ALTA" | "MEDIA" | "MANUAL";
  }[];
} {
  const cleanHeaders = headers.map((h) => String(h || "").trim()).filter(Boolean);
  let agrinessScore = 0;
  let scadaScore = 0;
  let nuvixScore = 0;

  const mappings = cleanHeaders.map((header) => {
    const normalized = header.toLowerCase();
    for (const rule of CANONICAL_COLUMN_DICTIONARY) {
      const exactMatch = rule.synonyms.some(
        (syn) => syn.toLowerCase() === normalized
      );
      const partialMatch = rule.synonyms.some(
        (syn) =>
          normalized.includes(syn.toLowerCase()) ||
          syn.toLowerCase().includes(normalized)
      );

      if (exactMatch || partialMatch) {
        if (rule.targetSystem === "Agriness") agrinessScore += 2;
        if (rule.targetSystem === "SCADA") scadaScore += 2;
        if (rule.targetSystem === "Nuvix") nuvixScore += 2;

        return {
          sourceHeader: header,
          canonicalField: rule.canonicalField,
          canonicalLabel: rule.label,
          confidence: (exactMatch ? "ALTA" : "MEDIA") as "ALTA" | "MEDIA",
        };
      }
    }

    if (normalized.includes("agriness") || normalized.includes("animales") || normalized.includes("fase")) {
      agrinessScore += 3;
    }
    if (normalized.includes("maiz") || normalized.includes("soja") || normalized.includes("scada") || normalized.includes("formula")) {
      scadaScore += 3;
    }
    if (normalized.includes("$") || normalized.includes("usd") || normalized.includes("nuvix") || normalized.includes("debe")) {
      nuvixScore += 3;
    }

    return {
      sourceHeader: header,
      canonicalField: "custom_attribute",
      canonicalLabel: "Atributo auxiliar / Calculado",
      confidence: "MANUAL" as const,
    };
  });

  let detectedSystem: SourceSystem = "Nuvix";
  if (agrinessScore >= scadaScore && agrinessScore >= nuvixScore && agrinessScore > 0) {
    detectedSystem = "Agriness";
  } else if (scadaScore >= agrinessScore && scadaScore >= nuvixScore && scadaScore > 0) {
    detectedSystem = "SCADA";
  }

  return { detectedSystem, mappings };
}
