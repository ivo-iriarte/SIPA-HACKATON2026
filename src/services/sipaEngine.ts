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

export interface RawSystemExportDef {
  system: SourceSystem;
  systemTitle: string;
  fileName: string;
  downloadUrl: string;
  description: string;
  rawSheets: {
    sheetName: string;
    description: string;
    primaryColumns: string[];
  }[];
  feedsProcesses: string[];
}

export const RAW_SYSTEM_EXPORTS_CATALOG: RawSystemExportDef[] = [
  {
    system: "SCADA",
    systemTitle: "SCADA Planta de Alimentos",
    fileName: "SCADA_Export_Planta_Septiembre2026.xlsx",
    downloadUrl: "/raw_exports/SCADA_Export_Planta_Septiembre2026.xlsx",
    description:
      "Exportación cruda directa del sistema SCADA de automatización de planta elaboradora de alimentos balanceados.",
    rawSheets: [
      {
        sheetName: "Pesadas_Tolva",
        description:
          "Registro de dosificación y pesaje en tolva con celda de carga por lote.",
        primaryColumns: [
          "ID_Batch",
          "Planta",
          "Formula",
          "Granja_Destino",
          "Kg_Fabricados_Tolva",
          "Maiz_Dosificado_Kg",
          "Soja_Dosificada_Kg",
          "Otros_Nucleos_Kg",
          "Control_Desvio_Kg",
        ],
      },
      {
        sheetName: "Movimientos_Silos",
        description:
          "Stock inicial, descargas de camión, molienda y mermas por silo.",
        primaryColumns: [
          "Codigo_MP",
          "Materia_Prima",
          "Silo_ID",
          "Stock_Inicial_Kg",
          "Ingresos_Descarga_Kg",
          "Consumo_Molienda_Kg",
          "Merma_Ajuste_Kg",
          "Stock_Final_Kg",
        ],
      },
    ],
    feedsProcesses: ["Proceso 4 (Costo de alimento)", "Proceso 1 (Costos)"],
  },
  {
    system: "Nuvix",
    systemTitle: "Nuvix ERP Contabilidad & Compras",
    fileName: "NUVIX_Export_Contable_Septiembre2026.xlsx",
    downloadUrl: "/raw_exports/NUVIX_Export_Contable_Septiembre2026.xlsx",
    description:
      "Exportación cruda contable de facturas de compra de materias primas, fletes y liquidación de gastos por centro de costo.",
    rawSheets: [
      {
        sheetName: "Facturas_Compras",
        description:
          "Facturación de compras de materias primas y medicamentos de farmacia.",
        primaryColumns: [
          "Nro_Factura",
          "Proveedor",
          "Centro_Costo",
          "Codigo_Producto",
          "Cantidad",
          "Precio_Unitario_Ars",
          "Total_Factura_Ars",
        ],
      },
      {
        sheetName: "Facturas_Fletes",
        description: "Comprobantes de flete asignados a materias primas.",
        primaryColumns: [
          "Nro_Comprobante",
          "Transportista",
          "Concepto",
          "Importe_Ars",
          "Tipo_Cambio_Oficial",
          "Importe_Usd",
        ],
      },
      {
        sheetName: "Gastos_Centro_Costo",
        description:
          "Sueldos de operarios y gastos de estructura imputados por centro.",
        primaryColumns: ["Periodo", "Centro_Costo", "Rubro", "Importe_Ars"],
      },
      {
        sheetName: "Stock_Contable_Farmacia",
        description: "Saldo contable en Nuvix de productos sanitarios.",
        primaryColumns: [
          "Codigo_Producto",
          "Producto",
          "Centro_Costo",
          "Stock_Registrado_Nuvix",
        ],
      },
    ],
    feedsProcesses: [
      "Proceso 1 (Informe de costos)",
      "Proceso 3 (Control de inventario)",
      "Proceso 4 (Costo de alimento)",
    ],
  },
  {
    system: "Agriness",
    systemTitle: "Agriness / S4Farm Granjas",
    fileName: "AGRINESS_Export_Granjas_Septiembre2026.xlsx",
    downloadUrl: "/raw_exports/AGRINESS_Export_Granjas_Septiembre2026.xlsx",
    description:
      "Exportación cruda biológica de producción en granja, pesadas de carne, botiquín sanitario y métricas de maternidad S4Farm.",
    rawSheets: [
      {
        sheetName: "Produccion_Hacienda",
        description:
          "Partes de pesada de animales, ganancias de peso y comederos por sitio.",
        primaryColumns: [
          "Periodo",
          "Establecimiento",
          "Fase",
          "Animales_Iniciales",
          "Entradas",
          "Salidas",
          "Kilos_Producidos_Mes",
          "Kilos_Alimento_Consumido",
        ],
      },
      {
        sheetName: "Sanidad_Granja",
        description: "Dosis aplicadas en cerdos y recuento físico en granja.",
        primaryColumns: [
          "Codigo_Insumo",
          "Descripcion",
          "Establecimiento",
          "Stock_Inicial_Fisico",
          "Dosis_Consumidas",
          "Recuento_Fisico_Granja",
        ],
      },
      {
        sheetName: "Maternidad_S4Farm",
        description: "Indicadores zootécnicos del plantel reproductor.",
        primaryColumns: ["Indicador", "Cantidad", "Unidad"],
      },
    ],
    feedsProcesses: [
      "Proceso 2 (Indicadores)",
      "Proceso 1 (Costos)",
      "Proceso 3 (Farmacia)",
    ],
  },
];

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
      "Centro_Costo",
      "Planta",
      "Granja_Destino",
    ],
  },
  {
    canonicalField: "stage",
    label: "Etapa Productiva / Fase",
    targetSystem: "Agriness",
    synonyms: [
      "Fase",
      "Etapa",
      "Sitio",
      "Categoria",
      "Fase_Sitio",
      "Fase_Destino",
    ],
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
      "Kilos_Producidos_Mes",
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
      "Kg_Fabricados_Tolva",
      "Kilos_Alimento_Consumido",
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
      "Total_Factura_Ars",
    ],
  },
  {
    canonicalField: "healthCostArs",
    label: "Gasto Sanidad ($ ARS)",
    targetSystem: "Nuvix",
    synonyms: ["Sanidad $", "Gasto sanidad", "Total $", "Sanidad"],
  },
  {
    canonicalField: "laborCostArs",
    label: "Mano de Obra ($ ARS)",
    targetSystem: "Nuvix",
    synonyms: ["Mano de obra $", "Sueldos", "Mano de Obra"],
  },
  {
    canonicalField: "otherCostArs",
    label: "Otros Gastos ($ ARS)",
    targetSystem: "Nuvix",
    synonyms: ["Otros $", "Indirectos", "Otros Gastos"],
  },
  {
    canonicalField: "initialAnimals",
    label: "Animales Iniciales (Cabezas)",
    targetSystem: "Agriness",
    synonyms: ["Animales iniciales", "Existencia inicial", "Animales_Iniciales"],
  },
  {
    canonicalField: "entries",
    label: "Entradas (Cabezas)",
    targetSystem: "Agriness",
    synonyms: ["Entradas", "Ingresos cabezas", "Entradas_Cabezas"],
  },
  {
    canonicalField: "exits",
    label: "Salidas / Bajas (Cabezas)",
    targetSystem: "Agriness",
    synonyms: ["Salidas", "Bajas cabezas", "Salidas_Cabezas"],
  },
  {
    canonicalField: "finalAnimals",
    label: "Animales Finales (Cabezas)",
    targetSystem: "Agriness",
    synonyms: ["Animales finales", "Stock final hacienda"],
  },
  {
    canonicalField: "formulaName",
    label: "Fórmula de Alimento",
    targetSystem: "SCADA",
    synonyms: [
      "Formula ficticia",
      "Alimento",
      "Dieta",
      "Formula",
      "Formula_Dieta",
      "Tipo_Dieta",
    ],
  },
  {
    canonicalField: "cornKg",
    label: "Maíz Dosificado (kg)",
    targetSystem: "SCADA",
    synonyms: ["Maiz kg", "Consumo maiz", "Maiz_Dosificado_Kg"],
  },
  {
    canonicalField: "soyKg",
    label: "Harina de Soja Dosificada (kg)",
    targetSystem: "SCADA",
    synonyms: [
      "Harina soja kg",
      "Consumo soja",
      "Soja_Dosificada_Kg",
      "Harina_Soja",
    ],
  },
  {
    canonicalField: "otherKg",
    label: "Otros Ingredientes / Núcleos (kg)",
    targetSystem: "SCADA",
    synonyms: ["Otros kg", "Nucleos kg", "Otros_Nucleos_Kg"],
  },
  {
    canonicalField: "productCode",
    label: "Código de Insumo / Producto",
    targetSystem: "Nuvix",
    synonyms: [
      "Codigo ficticio",
      "Codigo",
      "SKU",
      "Codigo_MP",
      "Codigo_Producto",
      "Codigo_Insumo",
    ],
  },
  {
    canonicalField: "productName",
    label: "Nombre / Descripción de Producto",
    targetSystem: "Nuvix",
    synonyms: [
      "Producto ficticio",
      "Producto",
      "Materia prima",
      "Materia_Prima",
      "Descripcion",
      "Descripcion_Articulo",
    ],
  },
  {
    canonicalField: "initialStock",
    label: "Stock Inicial (Unidades / kg)",
    targetSystem: "Agriness",
    synonyms: [
      "Stock inicial",
      "Stock inicial kg",
      "Stock_Inicial_Kg",
      "Stock_Inicial_Fisico",
    ],
  },
  {
    canonicalField: "purchases",
    label: "Compras (Nuvix ERP)",
    targetSystem: "Nuvix",
    synonyms: [
      "Compras",
      "Ingresos kg",
      "Facturado",
      "Cantidad",
      "Ingresos_Descarga_Kg",
    ],
  },
  {
    canonicalField: "consumptions",
    label: "Consumos (Agriness / SCADA)",
    targetSystem: "Agriness",
    synonyms: [
      "Consumos Agriness",
      "Consumo unidades",
      "Consumos kg",
      "Consumo_Molienda_Kg",
      "Dosis_Consumidas",
    ],
  },
  {
    canonicalField: "theoreticalStock",
    label: "Stock Teórico",
    targetSystem: "Nuvix",
    synonyms: ["Stock teorico", "Stock calculado"],
  },
  {
    canonicalField: "actualStockNuvix",
    label: "Stock Registrado en Nuvix ERP",
    targetSystem: "Nuvix",
    synonyms: [
      "Stock Nuvix",
      "Cantidad Nuvix",
      "Stock ERP",
      "Stock_Registrado_Nuvix",
    ],
  },
  {
    canonicalField: "actualStockAgriness",
    label: "Stock Contado en Granja (Agriness)",
    targetSystem: "Agriness",
    synonyms: [
      "Stock Agriness",
      "Cantidad Agriness",
      "Recuento fisico",
      "Recuento_Fisico_Granja",
    ],
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
