/**
 * @file ControlTowerView.tsx
 * @description Vista 1 — Torre de Control Gerencial (Dirección / Sofía Gonzalez Grenat).
 * Diseñada bajo los lineamientos de `references/dashboards-and-data-ui.md` de la skill frontend-ux-ui:
 * - Responde las 4 preguntas críticas del negocio porcino arriba del pliegue.
 * - Permite filtrar y agrupar (Roll-up / Drill-down) por Establecimiento y Etapa.
 * - Incluye modo "Conciliación Exacta Guía (Granja A + B = $8.210.000 / 45.000 kg)" y modo "Expansión Uniporc (+Porcap)".
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  PiggyBank,
  Wheat,
  Activity,
  ChevronRight,
  Info,
  Download,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Layers,
  LayoutDashboard,
  X,
} from "lucide-react";
import {
  StageCostProductionRecord,
  MonthlyEvolutionRecord,
  EstablishmentId,
  ProductionStage,
} from "../../types/domain";
import {
  calcTotalStageCost,
  calcCostPerKg,
  calcCostPerWeanedPiglet,
  calcFeedConversionRatio,
  formatArs,
  formatNum,
} from "../../services/sipaEngine";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
} from "../ui/primitives";

interface ControlTowerViewProps {
  records: StageCostProductionRecord[];
  evolution: MonthlyEvolutionRecord[];
  selectedEstablishment: EstablishmentId | "ALL";
  selectedStage: ProductionStage | "ALL";
  includePorcap: boolean;
  onTogglePorcap: (val: boolean) => void;
  onUpdateStageRecord: (updated: StageCostProductionRecord) => void;
  loadedSystems?: { scada: boolean; nuvix: boolean; agriness: boolean };
  onLoadAllSystems?: () => void;
  onNavigateToTab?: (tab: any) => void;
}

export const ControlTowerView: React.FC<ControlTowerViewProps> = ({
  records,
  evolution,
  selectedEstablishment,
  selectedStage,
  includePorcap,
  onTogglePorcap,
  loadedSystems,
  onLoadAllSystems,
  onNavigateToTab,
}) => {
  const [selectedRowDetail, setSelectedRowDetail] =
    useState<StageCostProductionRecord | null>(null);
  const [groupByEstablishment, setGroupByEstablishment] = useState<boolean>(false);
  const [sortField, setSortField] = useState<
    "establishmentName" | "producedKg" | "totalCost" | "costPerKg" | "fcr"
  >("establishmentName");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Filtrado de registros según selectores globales
  const activeRecords = records.filter((r) => {
    if (!includePorcap && r.establishmentId === "porcap") return false;
    if (
      selectedEstablishment !== "ALL" &&
      r.establishmentId !== selectedEstablishment
    )
      return false;
    if (selectedStage !== "ALL" && r.stage !== selectedStage) return false;
    return true;
  });

  // Cálculos agregados del conjunto filtrado
  const totalFeedCost = activeRecords.reduce((acc, r) => acc + r.feedCostArs, 0);
  const totalHealthCost = activeRecords.reduce((acc, r) => acc + r.healthCostArs, 0);
  const totalLaborCost = activeRecords.reduce((acc, r) => acc + r.laborCostArs, 0);
  const totalOtherCost = activeRecords.reduce((acc, r) => acc + r.otherCostArs, 0);
  const grandTotalCost =
    totalFeedCost + totalHealthCost + totalLaborCost + totalOtherCost;

  const totalProducedKg = activeRecords.reduce((acc, r) => acc + r.producedKg, 0);
  const totalConsumedFeedKg = activeRecords.reduce(
    (acc, r) => acc + r.consumedFeedKg,
    0
  );

  // Para el Costo por Lechón Destetado: se toma la etapa Maternidad del filtro activo
  const maternityRecords = records.filter((r) => {
    if (!includePorcap && r.establishmentId === "porcap") return false;
    if (
      selectedEstablishment !== "ALL" &&
      r.establishmentId !== selectedEstablishment
    )
      return false;
    return r.stage === "Maternidad";
  });

  const totalMaternityCost = maternityRecords.reduce(
    (acc, r) => acc + calcTotalStageCost(r),
    0
  );
  const totalWeanedPiglets = maternityRecords.reduce(
    (acc, r) => acc + r.weanedPiglets,
    0
  );

  const kpiCostPerKg = calcCostPerKg(grandTotalCost, totalProducedKg);
  const kpiCostPerWeanedPiglet = calcCostPerWeanedPiglet(
    totalMaternityCost,
    totalWeanedPiglets
  );
  const kpiFcr = calcFeedConversionRatio(totalConsumedFeedKg, totalProducedKg);

  // Ordenamiento de la tabla
  const sortedRecords = [...activeRecords].sort((a, b) => {
    const costA = calcTotalStageCost(a);
    const costB = calcTotalStageCost(b);
    let cmp = 0;
    if (sortField === "establishmentName") {
      cmp = `${a.establishmentName}-${a.stage}`.localeCompare(
        `${b.establishmentName}-${b.stage}`
      );
    } else if (sortField === "producedKg") {
      cmp = a.producedKg - b.producedKg;
    } else if (sortField === "totalCost") {
      cmp = costA - costB;
    } else if (sortField === "costPerKg") {
      cmp = calcCostPerKg(costA, a.producedKg) - calcCostPerKg(costB, b.producedKg);
    } else if (sortField === "fcr") {
      cmp =
        calcFeedConversionRatio(a.consumedFeedKg, a.producedKg) -
        calcFeedConversionRatio(b.consumedFeedKg, b.producedKg);
    }
    return sortAsc ? cmp : -cmp;
  });

  // Agrupación por establecimiento (Roll-up que pidió Sofía)
  const groupedEstablishments = ["tandil", "san_lorenzo", ...(includePorcap ? ["porcap"] : [])]
    .filter((id) => selectedEstablishment === "ALL" || selectedEstablishment === id)
    .map((estId) => {
      const estRows = activeRecords.filter((r) => r.establishmentId === estId);
      const feed = estRows.reduce((s, r) => s + r.feedCostArs, 0);
      const health = estRows.reduce((s, r) => s + r.healthCostArs, 0);
      const labor = estRows.reduce((s, r) => s + r.laborCostArs, 0);
      const other = estRows.reduce((s, r) => s + r.otherCostArs, 0);
      const total = feed + health + labor + other;
      const kg = estRows.reduce((s, r) => s + r.producedKg, 0);
      const weaned = estRows.reduce((s, r) => s + r.weanedPiglets, 0);
      const feedKg = estRows.reduce((s, r) => s + r.consumedFeedKg, 0);
      return {
        estId,
        name: estRows[0]?.establishmentName || estId,
        feed,
        health,
        labor,
        other,
        total,
        kg,
        weaned,
        costPerKg: calcCostPerKg(total, kg),
        fcr: calcFeedConversionRatio(feedKg, kg),
      };
    });

  // Exportación a CSV de la vista actual
  const handleExportCsv = () => {
    const headers = [
      "Establecimiento",
      "Etapa",
      "Alimento ($)",
      "Sanidad ($)",
      "Mano de Obra ($)",
      "Otros ($)",
      "Total ($)",
      "Kg Producidos",
      "Destetados",
      "Costo por Kg ($/kg)",
      "Conversion Aparente (FCR)",
    ];
    const rows = sortedRecords.map((r) => {
      const tot = calcTotalStageCost(r);
      return [
        r.establishmentName,
        r.stage,
        r.feedCostArs,
        r.healthCostArs,
        r.laborCostArs,
        r.otherCostArs,
        tot,
        r.producedKg,
        r.weanedPiglets,
        calcCostPerKg(tot, r.producedKg).toFixed(2),
        calcFeedConversionRatio(r.consumedFeedKg, r.producedKg).toFixed(2),
      ].join(";");
    });
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "SIPA_Informe_Costos_Uniporc_Sept2026.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (
    field: "establishmentName" | "producedKg" | "totalCost" | "costPerKg" | "fcr"
  ) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Porcentajes de composición de costos
  const pctFeed = grandTotalCost > 0 ? (totalFeedCost / grandTotalCost) * 100 : 0;
  const pctLabor = grandTotalCost > 0 ? (totalLaborCost / grandTotalCost) * 100 : 0;
  const pctHealth = grandTotalCost > 0 ? (totalHealthCost / grandTotalCost) * 100 : 0;
  const pctOther = grandTotalCost > 0 ? (totalOtherCost / grandTotalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Banner de Proceso 1 segun Guia 00 */}
      <div className="p-4 rounded-xl bg-[#2C365A] text-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <span className="p-2.5 rounded-lg bg-white/10 text-[#86EFAC] shrink-0">
            <LayoutDashboard className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold">Proceso 1: Costos</h2>
              <Badge variant="forest" className="bg-[#1E4D3B] text-white border-none text-xs">
                Salida Específica: Informe de costos
              </Badge>
            </div>
            <p className="text-xs text-[#C4BCB0] mt-0.5">
              <strong>Origen:</strong> Agriness + SCADA + Nuvix · <strong>Operación manual reemplazada:</strong> Consolidar por granja, imputar rubros, convertir monedas. (Ejemplos: 01 y 02).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportCsv}
            className="text-xs font-semibold gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Informe (.csv)
          </Button>
        </div>
      </div>

      {/* Alerta si faltan orígenes */}
      {loadedSystems && (!loadedSystems.scada || !loadedSystems.nuvix || !loadedSystems.agriness) && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Atención:</strong> Para consolidar el <strong>Informe de Costos</strong> completo se requieren los 3 orígenes crudos. Faltan por extraer:{" "}
              <strong>
                {[
                  !loadedSystems.scada ? "SCADA (Alimento)" : null,
                  !loadedSystems.nuvix ? "Nuvix ERP (Sueldos y Compras)" : null,
                  !loadedSystems.agriness ? "Agriness (Kilos Carne)" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </strong>
            </span>
          </div>
          {onLoadAllSystems && (
            <Button
              variant="forest"
              size="sm"
              onClick={onLoadAllSystems}
              className="text-xs h-auto py-1 font-bold"
            >
              Cargar exportaciones requeridas
            </Button>
          )}
        </div>
      )}

      {/* Barra de Modo de Alcance para Conciliación Exacta vs Expansión Uniporc */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-[#2C365A] text-white">
            <SlidersHorizontal className="w-4 h-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              Alcance de Consolidación Activo:{" "}
              <span className="text-[#1E4D3B] font-bold">
                {includePorcap
                  ? "3 Establecimientos (Tandil + San Lorenzo + Porcap)"
                  : "Base Oficial Guía 01/02 (Tandil / Granja A + San Lorenzo / Granja B)"}
              </span>
            </p>
            <p className="text-xs text-[var(--color-text-subtle)]">
              {includePorcap
                ? "Incluye los 3 establecimientos reales mencionados por Sofía en el relevamiento."
                : "Reproduce con exactitud matemática los totales de los Excels 01 y 02 ($8.210.000 y 45.000 kg en Septiembre)."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={!includePorcap ? "primary" : "outline"}
            onClick={() => onTogglePorcap(false)}
          >
            Exacto Guía (Granja A + B)
          </Button>
          <Button
            size="sm"
            variant={includePorcap ? "forest" : "outline"}
            onClick={() => onTogglePorcap(true)}
          >
            + Incluir Porcap (3 Granjas)
          </Button>
        </div>
      </div>

      {/* 1. CUATRO TARJETAS KPI PRINCIPALES (Arriba del pliegue) */}
      <section
        aria-label="Indicadores clave de desempeño"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* KPI 1: Costo por Kg Producido */}
        <Card className="relative overflow-hidden border-l-4 border-l-[#2C365A]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Costo / Kg Producido
              </span>
              <span className="p-2 rounded-md bg-[#2C365A]/10 text-[#2C365A]">
                <Scale className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums text-[var(--color-text)]">
                {formatArs(kpiCostPerKg, true)}
              </span>
              <span className="text-xs font-medium text-[var(--color-text-subtle)]">
                / kg vivo
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Badge variant="warning">
                <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                +8,5% vs. Ago ($168,09)
              </Badge>
            </div>
            <p className="mt-2.5 pt-2.5 border-t border-[var(--color-border)]/50 text-xs text-[var(--color-text-subtle)] tabular-nums">
              Fórmula: {formatArs(grandTotalCost)} ÷ {formatNum(totalProducedKg)} kg
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Costo por Lechón Destetado (Pedido explícito de Sofía) */}
        <Card className="relative overflow-hidden border-l-4 border-l-[#1E4D3B]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Costo / Lechón Destetado
              </span>
              <span className="p-2 rounded-md bg-[#1E4D3B]/10 text-[#1E4D3B]">
                <PiggyBank className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums text-[var(--color-text)]">
                {formatArs(kpiCostPerWeanedPiglet, true)}
              </span>
              <span className="text-xs font-medium text-[var(--color-text-subtle)]">
                / destetado
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Badge variant="forest">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                {formatNum(totalWeanedPiglets)} lechones (S4Farm)
              </Badge>
            </div>
            <p className="mt-2.5 pt-2.5 border-t border-[var(--color-border)]/50 text-xs text-[var(--color-text-subtle)] tabular-nums">
              Maternidad: {formatArs(totalMaternityCost)} ÷{" "}
              {formatNum(totalWeanedPiglets)} cab.
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Conversión Alimenticia Global (FCR) */}
        <Card className="relative overflow-hidden border-l-4 border-l-[#5C6F73]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Conversión Aparente (FCR)
              </span>
              <span className="p-2 rounded-md bg-[#5C6F73]/15 text-[#2C365A]">
                <Wheat className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums text-[var(--color-text)]">
                {formatNum(kpiFcr, 2)}
              </span>
              <span className="text-xs font-medium text-[var(--color-text-subtle)]">
                kg alim. / kg carne
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Badge variant="ocean">
                <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                Recría: 1,57 | Engorde: 2,75
              </Badge>
            </div>
            <p className="mt-2.5 pt-2.5 border-t border-[var(--color-border)]/50 text-xs text-[var(--color-text-subtle)] tabular-nums">
              {formatNum(totalConsumedFeedKg)} kg ración ÷{" "}
              {formatNum(totalProducedKg)} kg ganados
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Costo Operativo Consolidado & Peso del Alimento */}
        <Card className="relative overflow-hidden border-l-4 border-l-[#2C365A]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Costo Total Consolidado
              </span>
              <span className="p-2 rounded-md bg-[#2C365A]/10 text-[#2C365A]">
                <TrendingDown className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums text-[var(--color-text)]">
                {formatArs(grandTotalCost)}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Badge variant="neutral">
                Alimento representa {formatNum(pctFeed, 1)}% del total
              </Badge>
            </div>
            <p className="mt-2.5 pt-2.5 border-t border-[var(--color-border)]/50 text-xs text-[var(--color-text-subtle)] tabular-nums">
              Producción neta: {formatNum(totalProducedKg)} kg en el período
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 2. GRÁFICOS DE EVOLUCIÓN MENSUAL Y DESGLOSE POR RUBRO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Evolución Mensual (Archivo 02 - Informe Anual) */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <div>
              <CardTitle>
                Evolución del Costo por Kg y Gasto Mensual (Jul – Sep 2026)
              </CardTitle>
              <CardDescription>
                El costo unitario subió un 8,5% en septiembre por menor volumen de
                kilos (45.000 kg vs 47.000 kg en agosto) y suba de insumos.
              </CardDescription>
            </div>
            <Badge variant="ocean">Origen: Excel 02 (Anual)</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {evolution.map((m) => {
                const displayTotal = includePorcap
                  ? m.totalCostArs + m.porcapCostArs
                  : m.totalCostArs;
                const maxBar = includePorcap ? 12000000 : 9000000;
                const tandilPct = (m.tandilCostArs / maxBar) * 100;
                const sloPct = (m.sanLorenzoCostArs / maxBar) * 100;
                const porcapPct = includePorcap
                  ? (m.porcapCostArs / maxBar) * 100
                  : 0;

                return (
                  <div
                    key={m.period}
                    className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]/70"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--color-text)]">
                          {m.monthLabel}
                        </span>
                        <Badge
                          variant={m.status === "CERRADO" ? "forest" : "warning"}
                        >
                          {m.status === "CERRADO"
                            ? "✓ Cierre definitivo"
                            : "● Abierto (En control)"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs tabular-nums">
                        <span className="text-[var(--color-text-subtle)]">
                          Prod: <strong>{formatNum(m.totalProducedKg)} kg</strong>
                        </span>
                        <span className="text-[var(--color-text)] font-semibold">
                          Total: {formatArs(displayTotal)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#2C365A] text-white font-bold">
                          {formatArs(m.costPerKgArs, true)} / kg
                        </span>
                      </div>
                    </div>

                    {/* Barra apilada accesible con etiquetas claras */}
                    <div
                      className="w-full h-7 bg-[#E2DACD] rounded-md overflow-hidden flex"
                      role="img"
                      aria-label={`Costos de ${m.monthLabel}: Tandil ${formatArs(
                        m.tandilCostArs
                      )}, San Lorenzo ${formatArs(m.sanLorenzoCostArs)}`}
                    >
                      <div
                        style={{ width: `${tandilPct}%` }}
                        className="bg-[#2C365A] h-full flex items-center justify-center text-[11px] font-semibold text-white truncate px-1.5"
                        title={`Tandil (Granja A): ${formatArs(m.tandilCostArs)}`}
                      >
                        Tandil {formatArs(m.tandilCostArs)}
                      </div>
                      <div
                        style={{ width: `${sloPct}%` }}
                        className="bg-[#1E4D3B] h-full flex items-center justify-center text-[11px] font-semibold text-white truncate px-1.5 border-l border-white/30"
                        title={`San Lorenzo (Granja B): ${formatArs(
                          m.sanLorenzoCostArs
                        )}`}
                      >
                        San Lorenzo {formatArs(m.sanLorenzoCostArs)}
                      </div>
                      {includePorcap && (
                        <div
                          style={{ width: `${porcapPct}%` }}
                          className="bg-[#5C6F73] h-full flex items-center justify-center text-[11px] font-semibold text-white truncate px-1.5 border-l border-white/30"
                          title={`Porcap (Granja C): ${formatArs(m.porcapCostArs)}`}
                        >
                          Porcap {formatArs(m.porcapCostArs)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Desglose por Rubro de Costo (Archivo 01) */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <div>
              <CardTitle>Composición por Rubro Contable</CardTitle>
              <CardDescription>
                Participación de cada insumo sobre el gasto de{" "}
                {formatArs(grandTotalCost)}
              </CardDescription>
            </div>
            <Badge variant="forest">Cruce SCADA + Nuvix</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                label: "Alimento Balanceado (SCADA + Fletes)",
                amount: totalFeedCost,
                pct: pctFeed,
                color: "bg-[#2C365A]",
                source: "SCADA + Nuvix",
              },
              {
                label: "Mano de Obra Directa e Indirecta",
                amount: totalLaborCost,
                pct: pctLabor,
                color: "bg-[#1E4D3B]",
                source: "Nuvix Sueldos",
              },
              {
                label: "Sanidad y Farmacia Veterinaria",
                amount: totalHealthCost,
                pct: pctHealth,
                color: "bg-[#5C6F73]",
                source: "Agriness + Nuvix",
              },
              {
                label: "Otros Gastos Operativos y Energía",
                amount: totalOtherCost,
                pct: pctOther,
                color: "bg-[#92400E]",
                source: "Nuvix Contable",
              },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--color-text)]">
                    {item.label}
                  </span>
                  <span className="tabular-nums font-bold text-[var(--color-text)]">
                    {formatArs(item.amount)}{" "}
                    <span className="text-[var(--color-text-subtle)] font-normal">
                      ({formatNum(item.pct, 1)}%)
                    </span>
                  </span>
                </div>
                <div className="w-full h-3 bg-[#E2DACD] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-300`}
                    style={{ width: `${Math.max(item.pct, 2)}%` }}
                  />
                </div>
                <div className="text-[11px] text-[var(--color-text-subtle)]">
                  Fuente de datos: {item.source}
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-[var(--color-border)] flex items-start gap-2.5 text-xs text-[var(--color-text-muted)]">
              <Info className="w-4 h-4 text-[#1E4D3B] shrink-0 mt-0.5" />
              <span>
                <strong>Regla de oro zootécnica:</strong> El alimento representa el{" "}
                <strong>{formatNum(pctFeed, 1)}%</strong> de la estructura. Cualquier
                desvío en conversión alimenticia o humedad del maíz impacta
                directamente en el margen neto.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. MATRIZ MULTIDIMENSIONAL DE COSTOS POR ESTABLECIMIENTO Y ETAPA */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              Matriz Integrada de Costos y Producción por Establecimiento y Etapa
            </CardTitle>
            <CardDescription>
              Hacé clic en cualquier fila para abrir la trazabilidad completa de
              los 3 sistemas (Agriness, SCADA y Nuvix).
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={groupByEstablishment ? "primary" : "secondary"}
              onClick={() => setGroupByEstablishment(!groupByEstablishment)}
            >
              <Layers className="w-4 h-4" />
              {groupByEstablishment
                ? "Ver Desglosado por Etapa (Maternidad/Recría/Engorde)"
                : "Agrupar por Establecimiento (Roll-up Excel 01)"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportCsv}>
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          {groupByEstablishment ? (
            /* VISTA ROLL-UP CONSOLIDADA POR GRANJA (Idéntica a Excel 01) */
            <table className="w-full text-sm text-left">
              <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)] text-xs uppercase font-bold text-[var(--color-text-muted)]">
                <tr>
                  <th className="py-3.5 px-4">Establecimiento (Centro)</th>
                  <th className="py-3.5 px-4 text-right">Alimento $</th>
                  <th className="py-3.5 px-4 text-right">Sanidad $</th>
                  <th className="py-3.5 px-4 text-right">Mano de Obra $</th>
                  <th className="py-3.5 px-4 text-right">Otros $</th>
                  <th className="py-3.5 px-4 text-right">Total Costo $</th>
                  <th className="py-3.5 px-4 text-right">Kg Producidos</th>
                  <th className="py-3.5 px-4 text-right">Destetados</th>
                  <th className="py-3.5 px-4 text-right">Costo / Kg</th>
                  <th className="py-3.5 px-4 text-right">FCR Global</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/60">
                {groupedEstablishments.map((g) => (
                  <tr
                    key={g.estId}
                    className="hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-[var(--color-text)]">
                      {g.name}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums">
                      {formatArs(g.feed)}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums">
                      {formatArs(g.health)}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums">
                      {formatArs(g.labor)}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums">
                      {formatArs(g.other)}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums font-bold text-[#2C365A]">
                      {formatArs(g.total)}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums font-semibold">
                      {formatNum(g.kg)} kg
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums">
                      {formatNum(g.weaned)} cab.
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums">
                      <Badge variant="ocean">
                        {formatArs(g.costPerKg, true)} / kg
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums font-semibold">
                      {formatNum(g.fcr, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#2C365A] text-white font-bold text-sm">
                <tr>
                  <td className="py-3.5 px-4">TOTAL CONSOLIDADO UNIPORC</td>
                  <td className="py-3.5 px-4 text-right tabular-nums">
                    {formatArs(totalFeedCost)}
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums">
                    {formatArs(totalHealthCost)}
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums">
                    {formatArs(totalLaborCost)}
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums">
                    {formatArs(totalOtherCost)}
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums">
                    {formatArs(grandTotalCost)}
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums">
                    {formatNum(totalProducedKg)} kg
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums">
                    {formatNum(totalWeanedPiglets)} cab.
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums">
                    {formatArs(kpiCostPerKg, true)} / kg
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums">
                    {formatNum(kpiFcr, 2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            /* VISTA DESAGREGADA POR ETAPA PRODUCTIVA (Maternidad, Recría, Engorde) */
            <table className="w-full text-sm text-left">
              <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)] text-xs uppercase font-bold text-[var(--color-text-muted)]">
                <tr>
                  <th className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort("establishmentName")}
                      className="inline-flex items-center gap-1 hover:text-[var(--color-text)]"
                    >
                      Establecimiento & Etapa
                      {sortField === "establishmentName" && (sortAsc ? " ↑" : " ↓")}
                    </button>
                  </th>
                  <th className="py-3.5 px-3 text-right">Alimento $</th>
                  <th className="py-3.5 px-3 text-right">Sanidad $</th>
                  <th className="py-3.5 px-3 text-right">Mano Obra $</th>
                  <th className="py-3.5 px-3 text-right">Otros $</th>
                  <th className="py-3.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("totalCost")}
                      className="inline-flex items-center gap-1 hover:text-[var(--color-text)]"
                    >
                      Total $
                      {sortField === "totalCost" && (sortAsc ? " ↑" : " ↓")}
                    </button>
                  </th>
                  <th className="py-3.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("producedKg")}
                      className="inline-flex items-center gap-1 hover:text-[var(--color-text)]"
                    >
                      Kg Carne / Destetados
                      {sortField === "producedKg" && (sortAsc ? " ↑" : " ↓")}
                    </button>
                  </th>
                  <th className="py-3.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("costPerKg")}
                      className="inline-flex items-center gap-1 hover:text-[var(--color-text)]"
                    >
                      Costo Unitario
                      {sortField === "costPerKg" && (sortAsc ? " ↑" : " ↓")}
                    </button>
                  </th>
                  <th className="py-3.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("fcr")}
                      className="inline-flex items-center gap-1 hover:text-[var(--color-text)]"
                    >
                      FCR
                      {sortField === "fcr" && (sortAsc ? " ↑" : " ↓")}
                    </button>
                  </th>
                  <th className="py-3.5 px-3 text-center">Trazabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/60">
                {sortedRecords.map((row) => {
                  const rowTotal = calcTotalStageCost(row);
                  const rowCostKg = calcCostPerKg(rowTotal, row.producedKg);
                  const rowCostPiglet = calcCostPerWeanedPiglet(
                    rowTotal,
                    row.weanedPiglets
                  );
                  const rowFcr = calcFeedConversionRatio(
                    row.consumedFeedKg,
                    row.producedKg
                  );

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRowDetail(row)}
                      className="hover:bg-[var(--color-surface)] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-[var(--color-text)]">
                          {row.establishmentName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge
                            variant={
                              row.stage === "Maternidad"
                                ? "forest"
                                : row.stage === "Recría"
                                ? "ocean"
                                : "neutral"
                            }
                          >
                            {row.stage}
                          </Badge>
                          <span className="text-xs text-[var(--color-text-subtle)]">
                            Dieta: {row.feedType}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        {formatArs(row.feedCostArs)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        {formatArs(row.healthCostArs)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        {formatArs(row.laborCostArs)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        {formatArs(row.otherCostArs)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold text-[#2C365A]">
                        {formatArs(rowTotal)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        <div className="font-semibold text-[var(--color-text)]">
                          {formatNum(row.producedKg)} kg
                        </div>
                        {row.stage === "Maternidad" && (
                          <div className="text-xs text-[#1E4D3B] font-medium">
                            {formatNum(row.weanedPiglets)} destetados
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        <div className="font-bold text-[var(--color-text)]">
                          {formatArs(rowCostKg, true)}/kg
                        </div>
                        {row.stage === "Maternidad" && (
                          <div className="text-xs font-semibold text-[#1E4D3B]">
                            {formatArs(rowCostPiglet, true)}/lechón
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        <Badge
                          variant={rowFcr > 2.6 ? "warning" : "forest"}
                        >
                          {formatNum(rowFcr, 2)}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Ver trazabilidad de ${row.establishmentName} ${row.stage}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRowDetail(row);
                          }}
                        >
                          Detalle <ChevronRight className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-[#2C365A] text-white font-bold text-sm">
                <tr>
                  <td className="py-3.5 px-4">
                    TOTAL FILTRADO ({sortedRecords.length} registros)
                  </td>
                  <td className="py-3.5 px-3 text-right tabular-nums">
                    {formatArs(totalFeedCost)}
                  </td>
                  <td className="py-3.5 px-3 text-right tabular-nums">
                    {formatArs(totalHealthCost)}
                  </td>
                  <td className="py-3.5 px-3 text-right tabular-nums">
                    {formatArs(totalLaborCost)}
                  </td>
                  <td className="py-3.5 px-3 text-right tabular-nums">
                    {formatArs(totalOtherCost)}
                  </td>
                  <td className="py-3.5 px-3 text-right tabular-nums">
                    {formatArs(grandTotalCost)}
                  </td>
                  <td className="py-3.5 px-3 text-right tabular-nums">
                    {formatNum(totalProducedKg)} kg
                  </td>
                  <td className="py-3.5 px-3 text-right tabular-nums">
                    {formatArs(kpiCostPerKg, true)} / kg
                  </td>
                  <td className="py-3.5 px-3 text-right tabular-nums">
                    {formatNum(kpiFcr, 2)}
                  </td>
                  <td className="py-3.5 px-3"></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </Card>

      {/* DRAWER LATERAL DE TRAZABILIDAD EXTREMO A EXTREMO */}
      <AnimatePresence>
        {selectedRowDetail && (
          <div
            className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs"
            onClick={() => setSelectedRowDetail(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-lg bg-[var(--color-surface-raised)] h-full shadow-lg border-l border-[var(--color-border)] p-6 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
                <div>
                  <Badge variant="ocean">{selectedRowDetail.period}</Badge>
                  <h2
                    id="drawer-title"
                    className="text-xl font-bold text-[var(--color-text)] mt-1"
                  >
                    {selectedRowDetail.establishmentName} —{" "}
                    {selectedRowDetail.stage}
                  </h2>
                  <p className="text-xs text-[var(--color-text-subtle)]">
                    Trazabilidad de origen en Agriness, SCADA y Nuvix ERP
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedRowDetail(null)}
                  aria-label="Cerrar panel de detalle"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mt-5 space-y-5">
                {/* Bloque 1: Origen Agriness */}
                <div className="p-4 rounded-lg bg-[#E4F0EB]/60 border border-[#1E4D3B]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[#14382A]">
                      1. Origen Biológico — Agriness / S4Farm
                    </span>
                    <Badge variant="forest">Sincronizado</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1 text-sm tabular-nums">
                    <div>
                      <span className="text-xs text-[var(--color-text-subtle)] block">
                        Stock Animales (Ini → Fin)
                      </span>
                      <strong>
                        {formatNum(selectedRowDetail.initialAnimals)} →{" "}
                        {formatNum(selectedRowDetail.finalAnimals)} cab.
                      </strong>
                    </div>
                    <div>
                      <span className="text-xs text-[var(--color-text-subtle)] block">
                        Entradas / Salidas
                      </span>
                      <strong>
                        +{formatNum(selectedRowDetail.entries)} / -
                        {formatNum(selectedRowDetail.exits)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-xs text-[var(--color-text-subtle)] block">
                        Kilos Producidos (Denominador)
                      </span>
                      <strong className="text-[#1E4D3B]">
                        {formatNum(selectedRowDetail.producedKg)} kg
                      </strong>
                    </div>
                    <div>
                      <span className="text-xs text-[var(--color-text-subtle)] block">
                        Mortalidad Registrada
                      </span>
                      <strong>
                        {formatNum(selectedRowDetail.mortalityPct, 1)}%
                      </strong>
                    </div>
                    {selectedRowDetail.stage === "Maternidad" && (
                      <div className="col-span-2 pt-2 border-t border-[#1E4D3B]/20 flex justify-between">
                        <span>
                          Partos: <strong>{selectedRowDetail.farrowings}</strong> |
                          Nacidos vivos:{" "}
                          <strong>{formatNum(selectedRowDetail.bornAlive)}</strong>
                        </span>
                        <span className="font-bold text-[#14382A]">
                          Destetados: {formatNum(selectedRowDetail.weanedPiglets)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bloque 2: Origen SCADA */}
                <div className="p-4 rounded-lg bg-[#E2E6F2]/60 border border-[#2C365A]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[#1E2642]">
                      2. Origen Planta de Alimentos — SCADA
                    </span>
                    <Badge variant="ocean">Balanza OK</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1 text-sm tabular-nums">
                    <div>
                      <span className="text-xs text-[var(--color-text-subtle)] block">
                        Fórmula Suministrada
                      </span>
                      <strong>{selectedRowDetail.feedType}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-[var(--color-text-subtle)] block">
                        Kg Ración Consumidos
                      </span>
                      <strong>
                        {formatNum(selectedRowDetail.consumedFeedKg)} kg
                      </strong>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-[#2C365A]/20 flex justify-between items-center">
                      <span className="text-xs">
                        Conversión Aparente (Kg consumidos ÷ Kg producidos):
                      </span>
                      <span className="text-base font-bold text-[#2C365A]">
                        {formatNum(
                          calcFeedConversionRatio(
                            selectedRowDetail.consumedFeedKg,
                            selectedRowDetail.producedKg
                          ),
                          2
                        )}{" "}
                        kg/kg
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloque 3: Origen Nuvix ERP */}
                <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[var(--color-text)]">
                      3. Imputación Contable — Nuvix ERP
                    </span>
                    <Badge variant="neutral">Centro de Costo</Badge>
                  </div>
                  <div className="space-y-1.5 pt-1 text-sm tabular-nums">
                    <div className="flex justify-between">
                      <span>Alimento valorizado (con flete):</span>
                      <strong>{formatArs(selectedRowDetail.feedCostArs)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Sanidad y Farmacia imputada:</span>
                      <strong>{formatArs(selectedRowDetail.healthCostArs)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Mano de Obra asignada:</span>
                      <strong>{formatArs(selectedRowDetail.laborCostArs)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Otros gastos de estructura:</span>
                      <strong>{formatArs(selectedRowDetail.otherCostArs)}</strong>
                    </div>
                    <div className="pt-2 border-t border-[var(--color-border)] flex justify-between text-base font-bold text-[#2C365A]">
                      <span>Costo Total de la Etapa:</span>
                      <span>
                        {formatArs(calcTotalStageCost(selectedRowDetail))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resultado del Cruce */}
                <div className="p-4 rounded-lg bg-[#2C365A] text-white space-y-2">
                  <div className="text-xs uppercase tracking-wider opacity-80 font-semibold">
                    Resultado del Cruce SIPA
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span>Costo por Kg Producido:</span>
                    <span className="text-2xl font-bold tabular-nums">
                      {formatArs(
                        calcCostPerKg(
                          calcTotalStageCost(selectedRowDetail),
                          selectedRowDetail.producedKg
                        ),
                        true
                      )}
                    </span>
                  </div>
                  {selectedRowDetail.stage === "Maternidad" && (
                    <div className="flex items-baseline justify-between pt-2 border-t border-white/20">
                      <span>Costo por Lechón Destetado:</span>
                      <span className="text-xl font-bold tabular-nums text-[#86EFAC]">
                        {formatArs(
                          calcCostPerWeanedPiglet(
                            calcTotalStageCost(selectedRowDetail),
                            selectedRowDetail.weanedPiglets
                          ),
                          true
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
