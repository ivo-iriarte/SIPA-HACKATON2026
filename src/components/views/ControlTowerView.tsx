/**
 * @file ControlTowerView.tsx
 * @description Proceso Costos — Salida: Informe de costos.
 * - KPIs de costo por kg, costo por lechón destetado, conversión y costo total.
 * - Evolución mensual, composición por rubro y matriz por establecimiento y etapa.
 * - Drill-down de trazabilidad por fila (Agriness, SCADA y Nuvix).
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  Layers,
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
  CardContent,
  Badge,
  Button,
} from "../ui/primitives";
import {
  ViewHeader,
  ExportButton,
  FormulaHint,
  MissingSourcesAlert,
  ProcessNotes,
  ProcessNote,
} from "../ui/layout";
import { downloadCsv } from "../../lib/csv";

interface ControlTowerViewProps {
  records: StageCostProductionRecord[];
  evolution: MonthlyEvolutionRecord[];
  selectedEstablishment: EstablishmentId | "ALL";
  selectedStage: ProductionStage | "ALL";
  includePorcap: boolean;
  onUpdateStageRecord: (updated: StageCostProductionRecord) => void;
  loadedSystems?: { scada: boolean; nuvix: boolean; agriness: boolean };
  filterSlot?: React.ReactNode;
  onGoToUpload?: () => void;
}

export const ControlTowerView: React.FC<ControlTowerViewProps> = ({
  records,
  evolution,
  selectedEstablishment,
  selectedStage,
  includePorcap,
  loadedSystems,
  filterSlot,
  onGoToUpload,
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
      ];
    });
    downloadCsv("SIPA_Informe_Costos_Sep2026.csv", headers, rows);
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

  const missingSources = loadedSystems
    ? [
        !loadedSystems.scada ? "SCADA" : null,
        !loadedSystems.nuvix ? "Nuvix ERP" : null,
        !loadedSystems.agriness ? "Agriness" : null,
      ].filter((x): x is string => Boolean(x))
    : [];

  return (
    <div className="space-y-6">
      <ViewHeader
        title="Costos"
        actions={
          <>
            {filterSlot}
            <ExportButton onClick={handleExportCsv} />
          </>
        }
      />

      <MissingSourcesAlert
        missing={missingSources}
        onGoToUpload={onGoToUpload}
      />

      {/* 1. INDICADORES PRINCIPALES */}
      <section
        aria-label="Indicadores clave de costos"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* KPI 1: Costo por Kg Producido */}
        <Card className="border-l-4 border-l-[#43533D]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="type-label">Costo / Kg producido</span>
              <FormulaHint
                formula={`Costo Total ÷ Kg Producidos = ${formatArs(
                  grandTotalCost
                )} ÷ ${formatNum(totalProducedKg)} kg`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="type-kpi">{formatArs(kpiCostPerKg, true)}</span>
              <span className="text-xs text-[var(--color-text-subtle)]">
                / kg
              </span>
            </div>
            <div className="mt-3">
              <Badge variant="warning">
                <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                +8,5% vs. Ago ($168,09)
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Costo por Lechón Destetado */}
        <Card className="border-l-4 border-l-[#566647]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="type-label">Costo / Lechón destetado</span>
              <FormulaHint
                formula={`Costo Maternidad ÷ Lechones Destetados = ${formatArs(
                  totalMaternityCost
                )} ÷ ${formatNum(totalWeanedPiglets)} cab.`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="type-kpi">
                {formatArs(kpiCostPerWeanedPiglet, true)}
              </span>
              <span className="text-xs text-[var(--color-text-subtle)]">
                / cab.
              </span>
            </div>
            <div className="mt-3">
              <Badge variant="forest">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                {formatNum(totalWeanedPiglets)} destetados
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Conversión Alimenticia Global (FCR) */}
        <Card className="border-l-4 border-l-[#6B543B]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="type-label">Conversión (FCR)</span>
              <FormulaHint
                formula={`Kg Alimento ÷ Kg Producidos = ${formatNum(
                  totalConsumedFeedKg
                )} kg ÷ ${formatNum(totalProducedKg)} kg`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="type-kpi">{formatNum(kpiFcr, 2)}</span>
              <span className="text-xs text-[var(--color-text-subtle)]">
                kg / kg
              </span>
            </div>
            <div className="mt-3">
              <Badge variant="ocean">Recría: 1,57 · Engorde: 2,75</Badge>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Costo Total Consolidado */}
        <Card className="border-l-4 border-l-[#43533D]">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="type-label">Costo total</span>
              <FormulaHint
                formula={`Alimento + Mano de Obra + Sanidad + Otros (${formatNum(
                  totalProducedKg
                )} kg producidos)`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="type-kpi">{formatArs(grandTotalCost)}</span>
            </div>
            <div className="mt-3">
              <Badge variant="neutral">
                Alimento: {formatNum(pctFeed, 1)}% del total
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 2. EVOLUCIÓN MENSUAL Y COMPOSICIÓN POR RUBRO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Evolución mensual (Jul – Sep 2026)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                        <span className="font-semibold text-sm text-[var(--color-text)]">
                          {m.monthLabel}
                        </span>
                        <Badge
                          variant={m.status === "CERRADO" ? "forest" : "warning"}
                        >
                          {m.status === "CERRADO" ? "Cerrado" : "Abierto"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs tabular-nums">
                        <span className="text-[var(--color-text-subtle)]">
                          <strong>{formatNum(m.totalProducedKg)} kg</strong>
                        </span>
                        <span className="text-[var(--color-text)] font-semibold">
                          {formatArs(displayTotal)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#43533D] text-[#FBF8F0] font-semibold">
                          {formatArs(m.costPerKgArs, true)} / kg
                        </span>
                      </div>
                    </div>

                    <div
                      className="w-full h-7 bg-[#F4EFE3] rounded-md overflow-hidden flex border border-[#D6C8AE]/60"
                      role="img"
                      aria-label={`Costos de ${m.monthLabel}: Tandil ${formatArs(
                        m.tandilCostArs
                      )}, San Lorenzo ${formatArs(m.sanLorenzoCostArs)}`}
                    >
                      <div
                        style={{ width: `${tandilPct}%` }}
                        className="bg-[#43533D] h-full flex items-center justify-center text-xs font-medium text-[#FBF8F0] truncate px-1.5"
                        title={`Tandil: ${formatArs(m.tandilCostArs)}`}
                      >
                        Tandil {formatArs(m.tandilCostArs)}
                      </div>
                      <div
                        style={{ width: `${sloPct}%` }}
                        className="bg-[#566647] h-full flex items-center justify-center text-xs font-medium text-[#FBF8F0] truncate px-1.5 border-l border-[#FBF8F0]/30"
                        title={`San Lorenzo: ${formatArs(m.sanLorenzoCostArs)}`}
                      >
                        San Lorenzo {formatArs(m.sanLorenzoCostArs)}
                      </div>
                      {includePorcap && (
                        <div
                          style={{ width: `${porcapPct}%` }}
                          className="bg-[#6B543B] h-full flex items-center justify-center text-xs font-medium text-[#FBF8F0] truncate px-1.5 border-l border-[#FBF8F0]/30"
                          title={`Porcap: ${formatArs(m.porcapCostArs)}`}
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

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Composición por rubro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                label: "Alimento balanceado",
                amount: totalFeedCost,
                pct: pctFeed,
                color: "bg-[#43533D]",
              },
              {
                label: "Mano de obra",
                amount: totalLaborCost,
                pct: pctLabor,
                color: "bg-[#566647]",
              },
              {
                label: "Sanidad y farmacia",
                amount: totalHealthCost,
                pct: pctHealth,
                color: "bg-[#6B543B]",
              },
              {
                label: "Otros gastos operativos",
                amount: totalOtherCost,
                pct: pctOther,
                color: "bg-[#92400E]",
              },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[var(--color-text)]">
                    {item.label}
                  </span>
                  <span className="tabular-nums font-semibold text-[var(--color-text)]">
                    {formatArs(item.amount)}{" "}
                    <span className="text-xs text-[var(--color-text-subtle)] font-normal">
                      ({formatNum(item.pct, 1)}%)
                    </span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#F4EFE3] rounded-full overflow-hidden border border-[#D6C8AE]/60">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-300`}
                    style={{ width: `${Math.max(item.pct, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 3. MATRIZ DE COSTOS POR ESTABLECIMIENTO Y ETAPA */}
      <Card>
        <CardHeader>
          <CardTitle>Costos y producción por establecimiento y etapa</CardTitle>
          <Button
            size="sm"
            variant={groupByEstablishment ? "primary" : "secondary"}
            onClick={() => setGroupByEstablishment(!groupByEstablishment)}
          >
            <Layers className="w-4 h-4" />
            {groupByEstablishment
              ? "Desglosar por etapa"
              : "Agrupar por granja"}
          </Button>
        </CardHeader>

        <div className="overflow-x-auto">
          {groupByEstablishment ? (
            <table className="w-full text-sm text-left">
              <thead className="table-head">
                <tr>
                  <th className="py-3.5 px-4">Establecimiento</th>
                  <th className="py-3.5 px-4 text-right">Alimento $</th>
                  <th className="py-3.5 px-4 text-right">Sanidad $</th>
                  <th className="py-3.5 px-4 text-right">Mano de Obra $</th>
                  <th className="py-3.5 px-4 text-right">Otros $</th>
                  <th className="py-3.5 px-4 text-right">Total $</th>
                  <th className="py-3.5 px-4 text-right">Kg Producidos</th>
                  <th className="py-3.5 px-4 text-right">Destetados</th>
                  <th className="py-3.5 px-4 text-right">Costo / Kg</th>
                  <th className="py-3.5 px-4 text-right">FCR</th>
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
                    <td className="py-3.5 px-4 text-right tabular-nums font-bold text-[#43533D]">
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
              <tfoot className="bg-[#43533D] text-[#FBF8F0] font-bold text-sm">
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
            <table className="w-full text-sm text-left">
              <thead className="table-head">
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
                      <td className="py-3 px-3 text-right tabular-nums font-bold text-[#43533D]">
                        {formatArs(rowTotal)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        <div className="font-semibold text-[var(--color-text)]">
                          {formatNum(row.producedKg)} kg
                        </div>
                        {row.stage === "Maternidad" && (
                          <div className="text-xs text-[#566647] font-medium">
                            {formatNum(row.weanedPiglets)} destetados
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        <div className="font-bold text-[var(--color-text)]">
                          {formatArs(rowCostKg, true)}/kg
                        </div>
                        {row.stage === "Maternidad" && (
                          <div className="text-xs font-semibold text-[#566647]">
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
              <tfoot className="bg-[#43533D] text-[#FBF8F0] font-bold text-sm">
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

      {/* 4. INFORMACIÓN DEL PROCESO AL PIE */}
      <ProcessNotes>
        <ProcessNote title="Consolidación multi-origen (Agriness + SCADA + Nuvix)">
          Integra automáticamente los kilos producidos y cabezas destetadas de
          Agriness, el consumo de ración valorizado en planta SCADA y las
          imputaciones contables de sueldos, sanidad y gastos operativos de
          Nuvix ERP por establecimiento y etapa.
        </ProcessNote>
        <ProcessNote title="Incidencia nutricional en el costo">
          El alimento balanceado representa el{" "}
          <strong>{formatNum(pctFeed, 1)}%</strong> de la estructura de costos.
          Cualquier variación en conversión alimenticia o precios de granos
          impacta de forma directa en el costo por kilo producido.
        </ProcessNote>
      </ProcessNotes>

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
                <div className="p-4 rounded-lg bg-[#EAEEE6]/70 border border-[#566647]/35 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[#43533D]">
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
                      <strong className="text-[#566647]">
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
                      <div className="col-span-2 pt-2 border-t border-[#566647]/25 flex justify-between">
                        <span>
                          Partos: <strong>{selectedRowDetail.farrowings}</strong> |
                          Nacidos vivos:{" "}
                          <strong>{formatNum(selectedRowDetail.bornAlive)}</strong>
                        </span>
                        <span className="font-bold text-[#43533D]">
                          Destetados: {formatNum(selectedRowDetail.weanedPiglets)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bloque 2: Origen SCADA */}
                <div className="p-4 rounded-lg bg-[#F4EFE3] border border-[#D6C8AE] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[#43533D]">
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
                    <div className="col-span-2 pt-2 border-t border-[#D6C8AE] flex justify-between items-center">
                      <span className="text-xs">
                        Conversión Aparente (Kg consumidos ÷ Kg producidos):
                      </span>
                      <span className="text-base font-bold text-[#43533D]">
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
                    <div className="pt-2 border-t border-[var(--color-border)] flex justify-between text-base font-bold text-[#43533D]">
                      <span>Costo Total de la Etapa:</span>
                      <span>
                        {formatArs(calcTotalStageCost(selectedRowDetail))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resultado del Cruce */}
                <div className="p-4 rounded-lg bg-[#43533D] text-[#FBF8F0] space-y-2">
                  <div className="text-xs uppercase tracking-wider text-[#D6C8AE] font-semibold">
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
                    <div className="flex items-baseline justify-between pt-2 border-t border-[#D6C8AE]/30">
                      <span>Costo por Lechón Destetado:</span>
                      <span className="text-xl font-bold tabular-nums text-[#D6C8AE]">
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
