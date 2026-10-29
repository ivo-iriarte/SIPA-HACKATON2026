/**
 * @file FarmsProductionView.tsx
 * @description Proceso Consumos productivos — Salida: Indicadores.
 * - Indicadores de maternidad y cría (madres activas, partos, destetados, ganancia de carne, FCR).
 * - Balance de hacienda por fase y conversión alimenticia por sitio.
 */

import React from "react";
import { Activity } from "lucide-react";
import {
  StageCostProductionRecord,
  EstablishmentId,
  ProductionStage,
} from "../../types/domain";
import {
  calcFeedConversionRatio,
  calcFinalAnimals,
  formatNum,
} from "../../services/sipaEngine";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
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
import { ESTABLISHMENTS } from "../../data/initialUniporcData";

interface FarmsProductionViewProps {
  records: StageCostProductionRecord[];
  selectedEstablishment: EstablishmentId | "ALL";
  selectedStage: ProductionStage | "ALL";
  includePorcap: boolean;
  loadedSystems?: { scada: boolean; nuvix: boolean; agriness: boolean };
  filterSlot?: React.ReactNode;
  onGoToUpload?: () => void;
}

export const FarmsProductionView: React.FC<FarmsProductionViewProps> = ({
  records,
  selectedEstablishment,
  selectedStage,
  includePorcap,
  loadedSystems,
  filterSlot,
  onGoToUpload,
}) => {
  const filtered = records.filter((r) => {
    if (!includePorcap && r.establishmentId === "porcap") return false;
    if (
      selectedEstablishment !== "ALL" &&
      r.establishmentId !== selectedEstablishment
    )
      return false;
    if (selectedStage !== "ALL" && r.stage !== selectedStage) return false;
    return true;
  });

  const maternityRows = records.filter((r) => {
    if (!includePorcap && r.establishmentId === "porcap") return false;
    if (
      selectedEstablishment !== "ALL" &&
      r.establishmentId !== selectedEstablishment
    )
      return false;
    return r.stage === "Maternidad";
  });

  const totalActiveSows = ESTABLISHMENTS.filter((e) => {
    if (!includePorcap && e.id === "porcap") return false;
    return selectedEstablishment === "ALL" || e.id === selectedEstablishment;
  }).reduce((acc, e) => acc + e.activeSows, 0);

  const totalFarrowings = maternityRows.reduce((s, r) => s + r.farrowings, 0);
  const totalBornAlive = maternityRows.reduce((s, r) => s + r.bornAlive, 0);
  const totalWeaned = maternityRows.reduce((s, r) => s + r.weanedPiglets, 0);
  const totalProducedKg = filtered.reduce((s, r) => s + r.producedKg, 0);
  const totalConsumedKg = filtered.reduce((s, r) => s + r.consumedFeedKg, 0);
  const avgMortality =
    filtered.length > 0
      ? filtered.reduce((s, r) => s + r.mortalityPct, 0) / filtered.length
      : 0;
  const globalFcr = calcFeedConversionRatio(totalConsumedKg, totalProducedKg);

  const handleExportCsv = () => {
    const headers = [
      "Establecimiento",
      "Fase",
      "Animales Iniciales",
      "Entradas",
      "Salidas",
      "Animales Finales",
      "Dieta",
      "Kg Alimento",
      "Kg Producidos",
      "Conversion (FCR)",
    ];
    const rows = filtered.map((r) => [
      r.establishmentName,
      r.stage,
      r.initialAnimals,
      r.entries,
      r.exits,
      calcFinalAnimals(r.initialAnimals, r.entries, r.exits),
      r.feedType,
      r.consumedFeedKg,
      r.producedKg,
      calcFeedConversionRatio(r.consumedFeedKg, r.producedKg).toFixed(2),
    ]);
    downloadCsv("SIPA_Indicadores_Consumos_Sep2026.csv", headers, rows);
  };

  const missingSources =
    loadedSystems && !loadedSystems.agriness ? ["Agriness"] : [];

  return (
    <div className="space-y-6">
      <ViewHeader
        title="Consumos productivos"
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

      {/* 1. INDICADORES PRODUCTIVOS Y DE MATERNIDAD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#566647]">
          <CardContent className="p-5">
            <div className="flex justify-between items-start gap-2">
              <span className="type-label">Madres activas y partos</span>
            </div>
            <div className="mt-2 type-kpi">{formatNum(totalActiveSows)} madres</div>
            <div className="mt-2 text-xs text-[var(--color-text-subtle)] tabular-nums">
              Partos: <strong>{formatNum(totalFarrowings)}</strong> · Nacidos
              vivos: <strong>{formatNum(totalBornAlive)}</strong>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#566647]">
          <CardContent className="p-5">
            <div className="flex justify-between items-start gap-2">
              <span className="type-label">Lechones destetados</span>
            </div>
            <div className="mt-2 type-kpi text-[#566647]">
              {formatNum(totalWeaned)} cab.
            </div>
            <div className="mt-2 text-xs text-[var(--color-text-subtle)] tabular-nums">
              Peso medio al destete: <strong>6,3 kg</strong>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#43533D]">
          <CardContent className="p-5">
            <div className="flex justify-between items-start gap-2">
              <span className="type-label">Ganancia neta de carne</span>
            </div>
            <div className="mt-2 type-kpi">{formatNum(totalProducedKg)} kg</div>
            <div className="mt-2 text-xs text-[var(--color-text-subtle)] tabular-nums">
              Mortalidad promedio:{" "}
              <strong>{formatNum(avgMortality, 1)}%</strong>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#43533D]">
          <CardContent className="p-5">
            <div className="flex justify-between items-start gap-2">
              <span className="type-label">Conversión aparente (FCR)</span>
              <FormulaHint
                formula={`FCR = Kg Consumidos ÷ Kg Producidos (${formatNum(
                  totalConsumedKg
                )} kg ÷ ${formatNum(totalProducedKg)} kg)`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="type-kpi">{formatNum(globalFcr, 2)}</span>
              <span className="text-xs text-[var(--color-text-subtle)]">
                kg / kg
              </span>
            </div>
            <div className="mt-2 text-xs text-[var(--color-text-subtle)] tabular-nums">
              Consumo total: <strong>{formatNum(totalConsumedKg)} kg</strong>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. TABLA DE EXISTENCIAS BIOLÓGICAS Y CONVERSIÓN POR FASE */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>
              Balance de hacienda por fase y conversión alimenticia
            </CardTitle>
            <FormulaHint
              align="left"
              formula="Animales Finales = Iniciales + Entradas − Salidas · FCR = Kg Consumidos ÷ Kg Producidos"
            />
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="table-head">
              <tr>
                <th className="py-3 px-4">Establecimiento</th>
                <th className="py-3 px-4">Fase / Sitio</th>
                <th className="py-3 px-3 text-right">Anim. Iniciales</th>
                <th className="py-3 px-3 text-right">Entradas</th>
                <th className="py-3 px-3 text-right">Salidas</th>
                <th className="py-3 px-3 text-right">Anim. Finales</th>
                <th className="py-3 px-3">Dieta suministrada</th>
                <th className="py-3 px-3 text-right">Kg Alimento</th>
                <th className="py-3 px-3 text-right">Kg Producidos</th>
                <th className="py-3 px-4 text-right">Conversión (FCR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60">
              {filtered.map((r) => {
                const finalCalc = calcFinalAnimals(
                  r.initialAnimals,
                  r.entries,
                  r.exits
                );
                const fcr = calcFeedConversionRatio(
                  r.consumedFeedKg,
                  r.producedKg
                );

                return (
                  <tr key={r.id} className="hover:bg-[var(--color-surface)]">
                    <td className="py-3 px-4 font-semibold text-[var(--color-text)]">
                      {r.establishmentName}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          r.stage === "Maternidad"
                            ? "forest"
                            : r.stage === "Recría"
                            ? "ocean"
                            : "neutral"
                        }
                      >
                        {r.stage}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {formatNum(r.initialAnimals)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-[#566647] font-medium">
                      +{formatNum(r.entries)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-[#991B1B] font-medium">
                      -{formatNum(r.exits)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold">
                      {formatNum(finalCalc)}
                    </td>
                    <td className="py-3 px-3 font-medium">{r.feedType}</td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {formatNum(r.consumedFeedKg)} kg
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold text-[#43533D]">
                      {formatNum(r.producedKg)} kg
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      <Badge variant={fcr > 2.6 ? "warning" : "forest"}>
                        <Activity className="w-3 h-3" />
                        {formatNum(fcr, 2)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. INFORMACIÓN DEL PROCESO AL PIE */}
      <ProcessNotes>
        <ProcessNote title="Cruce productivo por fase (Agriness + S4Farm)">
          Vincula el movimiento de cabezas por sitio (Maternidad, Recría y
          Engorde) con los kilos de alimento consumidos y la ganancia neta de
          peso vivo para calcular el índice de conversión aparente (FCR).
        </ProcessNote>
        <ProcessNote title="Conciliación de alcance con cierre mensual">
          Los reportes por sitio informan lotes específicos (Tandil Recría =
          10.500 kg; San Lorenzo Engorde = 14.000 kg), mientras que el cierre
          contable suma las tres etapas completas de cada establecimiento
          (24.000 kg en Tandil y 21.000 kg en San Lorenzo).
        </ProcessNote>
      </ProcessNotes>
    </div>
  );
};
