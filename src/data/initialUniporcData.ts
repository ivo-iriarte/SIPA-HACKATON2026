/**
 * @file initialUniporcData.ts
 * @description Datos iniciales precargados a partir de los 9 archivos oficiales del
 * Desafío 07 (Uniporc Tandil - Hackaton Agro 2026) y enriquecidos con las etapas
 * productivas (Maternidad, Recría, Engorde) y establecimientos reales indicados
 * por Sofía Gonzalez Grenat (Tandil, San Lorenzo, Porcap).
 */

import {
  Establishment,
  StageCostProductionRecord,
  MonthlyEvolutionRecord,
  PharmacyInventoryRecord,
  ScadaSiloBalanceRecord,
  FeedBatchRecord,
  AccountingEntry,
  IngestionLogRecord,
} from "../types/domain";

export const ESTABLISHMENTS: Establishment[] = [
  {
    id: "tandil",
    name: "Tandil (Granja A)",
    code: "CC-TAN-01",
    aliases: ["Granja A", "Tandil", "Planta A", "Establecimiento Tandil"],
    location: "Tandil, Buenos Aires",
    activeSows: 420,
  },
  {
    id: "san_lorenzo",
    name: "San Lorenzo (Granja B)",
    code: "CC-SLO-02",
    aliases: ["Granja B", "San Lorenzo", "PAB San Lorenzo", "Planta B"],
    location: "San Lorenzo, Santa Fe / Tandil Sur",
    activeSows: 380,
  },
  {
    id: "porcap",
    name: "Porcap (Granja C)",
    code: "CC-POR-03",
    aliases: ["Granja C", "Porcap", "Planta C", "Establecimiento Porcap"],
    location: "Zona Rural Tandil",
    activeSows: 290,
  },
];

/**
 * Registros desagregados por Establecimiento y Etapa Productiva (Septiembre 2026).
 * Nota de conciliación:
 * - La suma de las 3 etapas de Tandil (Granja A) reproduce exactamente el archivo 01:
 *   Alimento $3.400.000 + Sanidad $220.000 + Mano de Obra $610.000 + Otros $180.000 = $4.410.000 y 24.000 kg.
 * - La suma de las 3 etapas de San Lorenzo (Granja B) reproduce exactamente el archivo 01:
 *   Alimento $2.900.000 + Sanidad $180.000 + Mano de Obra $550.000 + Otros $170.000 = $3.800.000 y 21.000 kg.
 * - En Tandil Sitio 2 (Recría) los kg producidos son 10.500 kg con 16.500 kg de alimento Iniciador (Archivo 03).
 * - En San Lorenzo Sitio 3 (Engorde) los kg producidos son 14.000 kg con 38.500 kg de alimento Terminador (Archivo 03).
 * - En Tandil Maternidad los lechones destetados son 1.190 de 92 partos y 1.380 nacidos vivos (Archivo 09 - S4Farm).
 */
export const INITIAL_STAGE_RECORDS: StageCostProductionRecord[] = [
  // ================= TANDIL (GRANJA A) - Total: $4.410.000 | 24.000 kg =================
  {
    id: "rec-tan-mat-202609",
    period: "2026-09",
    establishmentId: "tandil",
    establishmentName: "Tandil (Granja A)",
    stage: "Maternidad",
    initialAnimals: 420,
    entries: 92,
    exits: 85,
    finalAnimals: 427,
    producedKg: 3500, // Kilos de destete (1.190 lechones * ~6,3 kg peso medio ajustado)
    weanedPiglets: 1190,
    farrowings: 92,
    bornAlive: 1380,
    mortalityPct: 2.1,
    avgWeaningWeightKg: 6.3,
    feedType: "Lactancia",
    consumedFeedKg: 8900,
    feedCostArs: 680000,
    healthCostArs: 85000,
    laborCostArs: 240000,
    otherCostArs: 65000,
  },
  {
    id: "rec-tan-rec-202609",
    period: "2026-09",
    establishmentId: "tandil",
    establishmentName: "Tandil (Granja A)",
    stage: "Recría",
    initialAnimals: 1500, // Exacto de 03 - Producción y consumos (Granja A - Sitio 2)
    entries: 300,
    exits: 280,
    finalAnimals: 1520,
    producedKg: 10500, // Exacto de 03 (10.500 kg en Sitio 2)
    weanedPiglets: 0,
    farrowings: 0,
    bornAlive: 0,
    mortalityPct: 1.8,
    avgWeaningWeightKg: 0,
    feedType: "Iniciador",
    consumedFeedKg: 16500, // Exacto de 03 (16.500 kg Iniciador -> FCR 1,57)
    feedCostArs: 1220000,
    healthCostArs: 75000,
    laborCostArs: 190000,
    otherCostArs: 55000,
  },
  {
    id: "rec-tan-eng-202609",
    period: "2026-09",
    establishmentId: "tandil",
    establishmentName: "Tandil (Granja A)",
    stage: "Engorde",
    initialAnimals: 1240,
    entries: 280,
    exits: 260,
    finalAnimals: 1260,
    producedKg: 10000, // Completa los 24.000 kg mensuales de Granja A en Archivo 01
    weanedPiglets: 0,
    farrowings: 0,
    bornAlive: 0,
    mortalityPct: 1.4,
    avgWeaningWeightKg: 0,
    feedType: "Terminador",
    consumedFeedKg: 26800,
    feedCostArs: 1500000,
    healthCostArs: 60000,
    laborCostArs: 180000,
    otherCostArs: 60000,
  },

  // ================= SAN LORENZO (GRANJA B) - Total: $3.800.000 | 21.000 kg =================
  {
    id: "rec-slo-mat-202609",
    period: "2026-09",
    establishmentId: "san_lorenzo",
    establishmentName: "San Lorenzo (Granja B)",
    stage: "Maternidad",
    initialAnimals: 380,
    entries: 80,
    exits: 74,
    finalAnimals: 386,
    producedKg: 2200,
    weanedPiglets: 1040,
    farrowings: 82,
    bornAlive: 1210,
    mortalityPct: 2.3,
    avgWeaningWeightKg: 6.1,
    feedType: "Lactancia",
    consumedFeedKg: 7600,
    feedCostArs: 580000,
    healthCostArs: 70000,
    laborCostArs: 210000,
    otherCostArs: 60000,
  },
  {
    id: "rec-slo-rec-202609",
    period: "2026-09",
    establishmentId: "san_lorenzo",
    establishmentName: "San Lorenzo (Granja B)",
    stage: "Recría",
    initialAnimals: 1120,
    entries: 260,
    exits: 250,
    finalAnimals: 1130,
    producedKg: 4800, // Completa los 21.000 kg mensuales de Granja B en Archivo 01
    weanedPiglets: 0,
    farrowings: 0,
    bornAlive: 0,
    mortalityPct: 1.9,
    avgWeaningWeightKg: 0,
    feedType: "Iniciador",
    consumedFeedKg: 8200,
    feedCostArs: 690000,
    healthCostArs: 55000,
    laborCostArs: 165000,
    otherCostArs: 50000,
  },
  {
    id: "rec-slo-eng-202609",
    period: "2026-09",
    establishmentId: "san_lorenzo",
    establishmentName: "San Lorenzo (Granja B)",
    stage: "Engorde",
    initialAnimals: 1300, // Exacto de 03 - Producción y consumos (Granja B - Sitio 3)
    entries: 250,
    exits: 240,
    finalAnimals: 1310,
    producedKg: 14000, // Exacto de 03 (14.000 kg en Sitio 3)
    weanedPiglets: 0,
    farrowings: 0,
    bornAlive: 0,
    mortalityPct: 1.5,
    avgWeaningWeightKg: 0,
    feedType: "Terminador",
    consumedFeedKg: 38500, // Exacto de 03 (38.500 kg Terminador -> FCR 2,75)
    feedCostArs: 1630000,
    healthCostArs: 55000,
    laborCostArs: 175000,
    otherCostArs: 60000,
  },

  // ================= PORCAP (GRANJA C) - Establecimiento adicional mencionado por Sofía =================
  {
    id: "rec-por-mat-202609",
    period: "2026-09",
    establishmentId: "porcap",
    establishmentName: "Porcap (Granja C)",
    stage: "Maternidad",
    initialAnimals: 290,
    entries: 64,
    exits: 58,
    finalAnimals: 296,
    producedKg: 1950,
    weanedPiglets: 860,
    farrowings: 66,
    bornAlive: 980,
    mortalityPct: 1.9,
    avgWeaningWeightKg: 6.4,
    feedType: "Lactancia",
    consumedFeedKg: 6100,
    feedCostArs: 460000,
    healthCostArs: 58000,
    laborCostArs: 175000,
    otherCostArs: 45000,
  },
  {
    id: "rec-por-rec-202609",
    period: "2026-09",
    establishmentId: "porcap",
    establishmentName: "Porcap (Granja C)",
    stage: "Recría",
    initialAnimals: 940,
    entries: 220,
    exits: 210,
    finalAnimals: 950,
    producedKg: 6200,
    weanedPiglets: 0,
    farrowings: 0,
    bornAlive: 0,
    mortalityPct: 1.6,
    avgWeaningWeightKg: 0,
    feedType: "Iniciador",
    consumedFeedKg: 9800,
    feedCostArs: 740000,
    healthCostArs: 48000,
    laborCostArs: 140000,
    otherCostArs: 42000,
  },
  {
    id: "rec-por-eng-202609",
    period: "2026-09",
    establishmentId: "porcap",
    establishmentName: "Porcap (Granja C)",
    stage: "Engorde",
    initialAnimals: 980,
    entries: 210,
    exits: 195,
    finalAnimals: 995,
    producedKg: 9850,
    weanedPiglets: 0,
    farrowings: 0,
    bornAlive: 0,
    mortalityPct: 1.3,
    avgWeaningWeightKg: 0,
    feedType: "Terminador",
    consumedFeedKg: 25400,
    feedCostArs: 1180000,
    healthCostArs: 44000,
    laborCostArs: 145000,
    otherCostArs: 48000,
  },
];

/**
 * Evolución histórica mensual (Archivo 02 - Informe de costos anual ficticio.xlsx)
 */
export const INITIAL_MONTHLY_EVOLUTION: MonthlyEvolutionRecord[] = [
  {
    period: "2026-07",
    monthLabel: "Julio 2026",
    status: "CERRADO",
    tandilCostArs: 4100000,
    sanLorenzoCostArs: 3600000,
    porcapCostArs: 2890000,
    totalCostArs: 7700000, // Base Granja A + B = 7.700.000 (Archivo 02)
    totalProducedKg: 46000,
    totalWeanedPiglets: 2180,
    costPerKgArs: 167.39,
    costPerWeanedPigletArs: 865.5,
    globalFcr: 2.38,
  },
  {
    period: "2026-08",
    monthLabel: "Agosto 2026",
    status: "CERRADO",
    tandilCostArs: 4200000,
    sanLorenzoCostArs: 3700000,
    porcapCostArs: 2980000,
    totalCostArs: 7900000, // Base Granja A + B = 7.900.000 (Archivo 02)
    totalProducedKg: 47000,
    totalWeanedPiglets: 2210,
    costPerKgArs: 168.09,
    costPerWeanedPigletArs: 882.0,
    globalFcr: 2.41,
  },
  {
    period: "2026-09",
    monthLabel: "Septiembre 2026",
    status: "ABIERTO",
    tandilCostArs: 4410000,
    sanLorenzoCostArs: 3800000,
    porcapCostArs: 3125000,
    totalCostArs: 8210000, // Base Granja A + B = 8.210.000 (Archivo 01 y 02)
    totalProducedKg: 45000,
    totalWeanedPiglets: 2230,
    costPerKgArs: 182.44,
    costPerWeanedPigletArs: 892.38,
    globalFcr: 2.45,
  },
];

/**
 * Inventario y Conciliación de Farmacia (Archivos 04 y 05)
 * Reproduce exactamente las discrepancias planteadas en la guía del desafío.
 */
export const INITIAL_PHARMACY_INVENTORY: PharmacyInventoryRecord[] = [
  {
    id: "pharm-01",
    period: "2026-09",
    establishmentId: "tandil",
    establishmentName: "Tandil (Granja A)",
    productCode: "P-001",
    productName: "Producto sanitario A (Amoxicilina 50%)",
    initialStock: 80,
    purchasesNuvix: 25,
    consumedAgriness: 30,
    // Stock Teórico = 80 + 25 - 30 = 75
    stockNuvix: 74,     // En Archivo 04 y 05: Nuvix = 74, Agriness = 75 -> Diferencia -1 / +1
    stockAgriness: 75,
    unitCostArs: 1400,  // 30 * $1.400 = $42.000 (Asiento modelo Archivo 04)
    accountingPosted: false,
  },
  {
    id: "pharm-02",
    period: "2026-09",
    establishmentId: "san_lorenzo",
    establishmentName: "San Lorenzo (Granja B)",
    productCode: "P-002",
    productName: "Producto sanitario B (Vacuna Circovirus)",
    initialStock: 45,
    purchasesNuvix: 15,
    consumedAgriness: 20,
    // Stock Teórico = 45 + 15 - 20 = 40
    stockNuvix: 40,
    stockAgriness: 40,
    unitCostArs: 2100,  // 20 * $2.100 = $42.000 (Asiento modelo Archivo 04)
    accountingPosted: false,
  },
  {
    id: "pharm-03",
    period: "2026-09",
    establishmentId: "san_lorenzo",
    establishmentName: "San Lorenzo (Granja B)",
    productCode: "P-001",
    productName: "Producto sanitario A (Amoxicilina 50%)",
    initialStock: 50,
    purchasesNuvix: 20,
    consumedAgriness: 18,
    stockNuvix: 52,
    stockAgriness: 52, // Exacto de Archivo 05 Hoja Granja B (52 vs 52)
    unitCostArs: 1400,
    accountingPosted: true,
  },
  {
    id: "pharm-04",
    period: "2026-09",
    establishmentId: "san_lorenzo",
    establishmentName: "San Lorenzo (Granja B)",
    productCode: "P-003",
    productName: "Producto sanitario C (Ivermectina Inyectable)",
    initialStock: 30,
    purchasesNuvix: 10,
    consumedAgriness: 18,
    // Stock Teórico = 22
    stockNuvix: 24,     // Exacto de Archivo 05 Hoja Granja B: Agriness 22 vs Nuvix 24 (Faltante de registrar consumo en Nuvix)
    stockAgriness: 22,
    unitCostArs: 1850,
    accountingPosted: false,
  },
  {
    id: "pharm-05",
    period: "2026-09",
    establishmentId: "porcap",
    establishmentName: "Porcap (Granja C)",
    productCode: "P-002",
    productName: "Producto sanitario B (Vacuna Circovirus)",
    initialStock: 35,
    purchasesNuvix: 20,
    consumedAgriness: 15,
    stockNuvix: 40,
    stockAgriness: 40,
    unitCostArs: 2100,
    accountingPosted: false,
  },
];

/**
 * Balance de Stock de Materias Primas en Silos SCADA (Archivos 06 y 08)
 */
export const INITIAL_SILO_BALANCES: ScadaSiloBalanceRecord[] = [
  {
    id: "silo-mp01",
    code: "MP-01",
    rawMaterial: "Maíz Grano Seco",
    initialStockKg: 85000,
    entriesKg: 42000,
    consumedKg: 50000,
    adjustmentKg: -300, // Exacto de Archivo 06: -300 kg el 15/09/2026
    adjustmentDate: "15/09/2026",
    adjustmentReason: "Ajuste por medición manual de humedad en silo #2",
    unitPriceArsPerKg: 230, // Exacto de Archivo 08 Hoja Valorización ($230/kg)
    exchangeRateArsUsd: 1400, // Exacto de Archivo 08 ($1.400 ARS/USD)
  },
  {
    id: "silo-mp02",
    code: "MP-02",
    rawMaterial: "Harina de Soja Hi-Pro",
    initialStockKg: 18000,
    entriesKg: 12000,
    consumedKg: 14000,
    adjustmentKg: 100, // Exacto de Archivo 06: +100 kg el 18/09/2026
    adjustmentDate: "18/09/2026",
    adjustmentReason: "Diferencia positiva de inventario en pesaje de tolva",
    unitPriceArsPerKg: 420, // Exacto de Archivo 08 Hoja Valorización ($420/kg)
    exchangeRateArsUsd: 1400,
  },
  {
    id: "silo-mp03",
    code: "MP-03",
    rawMaterial: "Núcleo Vitamínico & Aminoácidos (Otros)",
    initialStockKg: 6500,
    entriesKg: 4000,
    consumedKg: 4000,
    adjustmentKg: 0,
    unitPriceArsPerKg: 980, // Nota de la Guía: "La hoja Valorizacion de 08 no incluye el costo de Otros kg" -> Aquí se explicita y parametriza
    exchangeRateArsUsd: 1400,
  },
];

/**
 * Lotes de Fabricación de Alimento Balanceado (Archivos 07 y 08)
 */
export const INITIAL_FEED_BATCHES: FeedBatchRecord[] = [
  {
    id: "batch-01",
    date: "10/09/2026",
    plantName: "PAB San Lorenzo (Planta A)",
    establishmentId: "san_lorenzo",
    formulaName: "Fórmula A (Iniciador Recría)",
    feedCategory: "Iniciador",
    producedKg: 20000, // Exacto Archivo 08: 20.000 kg = 13.000 Maíz + 5.000 Soja + 2.000 Otros
    cornKg: 13000,
    soyKg: 5000,
    otherKg: 2000,
    freightAllocatedArs: 120000,
  },
  {
    id: "batch-02",
    date: "11/09/2026",
    plantName: "PAB San Lorenzo (Planta B)",
    establishmentId: "san_lorenzo",
    formulaName: "Fórmula B (Terminador Engorde)",
    feedCategory: "Terminador",
    producedKg: 18000, // Exacto Archivo 08: 18.000 kg = 11.000 Maíz + 5.000 Soja + 2.000 Otros
    cornKg: 11000,
    soyKg: 5000,
    otherKg: 2000,
    freightAllocatedArs: 110000, // Suma fletes = $230.000 (Exacto Archivo 08 Hoja Fletes)
  },
  {
    id: "batch-03",
    date: "18/09/2026",
    plantName: "PAB Tandil (Planta A)",
    establishmentId: "tandil",
    formulaName: "Fórmula Iniciador Sitio 2",
    feedCategory: "Iniciador",
    producedKg: 48000, // Exacto Archivo 07 Resumen PAB: Planta A Iniciador 48.000 kg ($16.800.000 -> $350/kg)
    cornKg: 31200,
    soyKg: 12000,
    otherKg: 4800,
    freightAllocatedArs: 280000,
  },
  {
    id: "batch-04",
    date: "22/09/2026",
    plantName: "PAB San Lorenzo (Planta B)",
    establishmentId: "san_lorenzo",
    formulaName: "Fórmula Terminador Sitio 3",
    feedCategory: "Terminador",
    producedKg: 72000, // Exacto Archivo 07 Resumen PAB: Planta B Terminador 72.000 kg ($24.480.000 -> $340/kg)
    cornKg: 49000,
    soyKg: 16500,
    otherKg: 6500,
    freightAllocatedArs: 410000,
  },
  {
    id: "batch-05",
    date: "25/09/2026",
    plantName: "PAB Porcap (Planta C)",
    establishmentId: "porcap",
    formulaName: "Fórmula Crecimiento Recría-Engorde",
    feedCategory: "Crecimiento",
    producedKg: 56000, // Exacto Archivo 07 Resumen PAB: Planta C Crecimiento 56.000 kg ($18.480.000 -> $330/kg)
    cornKg: 37500,
    soyKg: 13500,
    otherKg: 5000,
    freightAllocatedArs: 320000,
  },
];

/**
 * Asientos Contables Generados (Archivo 04 - Asiento modelo)
 */
export const INITIAL_ACCOUNTING_ENTRIES: AccountingEntry[] = [
  {
    id: "ast-001",
    date: "28/09/2026",
    period: "2026-09",
    originModule: "Farmacia",
    costCenter: "Tandil (Granja A)",
    debitAccount: "5.1.02 - Gasto Sanidad Granja",
    debitAmountArs: 42000, // Exacto Archivo 04: 30 uds * $1.400 = $42.000
    creditAccount: "1.1.08 - Stock Farmacia",
    creditAmountArs: 42000,
    status: "BORRADOR",
    referenceNote: "Imputación consumo Producto sanitario A (30 uds x $1.400) desde Agriness",
  },
  {
    id: "ast-002",
    date: "28/09/2026",
    period: "2026-09",
    originModule: "Farmacia",
    costCenter: "San Lorenzo (Granja B)",
    debitAccount: "5.1.02 - Gasto Sanidad Granja",
    debitAmountArs: 42000, // Exacto Archivo 04: 20 uds * $2.100 = $42.000
    creditAccount: "1.1.08 - Stock Farmacia",
    creditAmountArs: 42000,
    status: "BORRADOR",
    referenceNote: "Imputación consumo Producto sanitario B (20 uds x $2.100) desde Agriness",
  },
  {
    id: "ast-003",
    date: "28/09/2026",
    period: "2026-09",
    originModule: "Alimento",
    costCenter: "Tandil (Granja A)",
    debitAccount: "5.1.01 - Costo Alimento Balanceado",
    debitAmountArs: 3400000, // Exacto Archivo 01: Alimento $ Granja A
    creditAccount: "1.1.05 - Stock Materias Primas y Raciones PAB",
    creditAmountArs: 3400000,
    status: "EXPORTADO_NUVIX",
    referenceNote: "Valorización consumos SCADA + Fletes imputados a Tandil",
  },
  {
    id: "ast-004",
    date: "28/09/2026",
    period: "2026-09",
    originModule: "Alimento",
    costCenter: "San Lorenzo (Granja B)",
    debitAccount: "5.1.01 - Costo Alimento Balanceado",
    debitAmountArs: 2900000, // Exacto Archivo 01: Alimento $ Granja B
    creditAccount: "1.1.05 - Stock Materias Primas y Raciones PAB",
    creditAmountArs: 2900000,
    status: "EXPORTADO_NUVIX",
    referenceNote: "Valorización consumos SCADA + Fletes imputados a San Lorenzo",
  },
];

/**
 * Historial inicial de archivos sincronizados
 */
export const INITIAL_INGESTION_LOGS: IngestionLogRecord[] = [
  {
    id: "ing-01",
    fileName: "01 - Informe de costos mensual ficticio.xlsx",
    uploadedAt: "28/10/2026 09:15",
    sourceSystem: "Nuvix",
    period: "2026-09",
    rowsProcessed: 2,
    mappedColumns: [
      { sourceHeader: "Centro ficticio", canonicalField: "establishmentName" },
      { sourceHeader: "Alimento $", canonicalField: "feedCostArs" },
      { sourceHeader: "Sanidad $", canonicalField: "healthCostArs" },
      { sourceHeader: "Mano de obra $", canonicalField: "laborCostArs" },
      { sourceHeader: "Kg producidos", canonicalField: "producedKg" },
    ],
    status: "SINCRONIZADO",
    summaryMessage: "Vinculados centros Granja A -> Tandil y Granja B -> San Lorenzo ($8.210.000 / 45.000 kg).",
  },
  {
    id: "ing-03",
    fileName: "03 - Producción y consumos ficticios.xlsx",
    uploadedAt: "28/10/2026 09:42",
    sourceSystem: "Agriness",
    period: "2026-09",
    rowsProcessed: 4,
    mappedColumns: [
      { sourceHeader: "Establecimiento", canonicalField: "establishmentName" },
      { sourceHeader: "Fase", canonicalField: "stage (Sitio 2 -> Recría, Sitio 3 -> Engorde)" },
      { sourceHeader: "Kg consumidos", canonicalField: "consumedFeedKg" },
      { sourceHeader: "Kg producidos", canonicalField: "producedKg" },
    ],
    status: "CON_ADVERTENCIAS",
    summaryMessage: "Detectada diferencia de alcance: Sitio 2 y Sitio 3 suman 24.500 kg parciales frente a 45.000 kg del cierre mensual.",
  },
  {
    id: "ing-04",
    fileName: "04 - Consumo de farmacia ficticio.xlsx",
    uploadedAt: "28/10/2026 10:10",
    sourceSystem: "Agriness",
    period: "2026-09",
    rowsProcessed: 6,
    mappedColumns: [
      { sourceHeader: "Producto ficticio", canonicalField: "productName" },
      { sourceHeader: "Consumos Agriness", canonicalField: "consumedAgriness" },
      { sourceHeader: "Stock Nuvix", canonicalField: "stockNuvix" },
    ],
    status: "CON_ADVERTENCIAS",
    summaryMessage: "Alerta de conciliación en Tandil: Producto sanitario A presenta diferencia de -1 ud entre Stock Nuvix (74) y Teórico (75).",
  },
  {
    id: "ing-08",
    fileName: "08 - Consumo de planta ficticio.xlsx",
    uploadedAt: "28/10/2026 10:35",
    sourceSystem: "SCADA",
    period: "2026-09",
    rowsProcessed: 5,
    mappedColumns: [
      { sourceHeader: "Formula ficticia", canonicalField: "formulaName" },
      { sourceHeader: "Kg fabricados", canonicalField: "producedKg" },
      { sourceHeader: "Maiz kg", canonicalField: "cornKg" },
      { sourceHeader: "Harina soja kg", canonicalField: "soyKg" },
    ],
    status: "SINCRONIZADO",
    summaryMessage: "Control de pesaje SCADA exacto (0 kg desvío en 38.000 kg elaborados). Flete de $230.000 convertido a USD (TC $1.400).",
  },
];
