/**
 * @file FeedMillScadaView.tsx
 * @description Proceso Planta alimentos — Salida: Costo de alimento.
 * - Parámetros de valorización de fórmula y tipo de cambio bimonetario.
 * - Seguimiento de fabricación por planta y control de tolva SCADA (Control kg = 0).
 * - Balance de stock de materias primas en silos y ajustes de inventario.
 */

import React, { useState } from "react";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Truck,
  PlusCircle,
  DollarSign,
  Sliders,
} from "lucide-react";
import {
  ScadaSiloBalanceRecord,
  FeedBatchRecord,
  EstablishmentId,
} from "../../types/domain";
import {
  calcBatchScaleDeviation,
  calcFeedBatchValuation,
  calcSiloFinalStock,
  formatArs,
  formatUsd,
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

interface FeedMillScadaViewProps {
  silos: ScadaSiloBalanceRecord[];
  batches: FeedBatchRecord[];
  selectedEstablishment: EstablishmentId | "ALL";
  onAddBatch: (newBatch: FeedBatchRecord) => void;
  onUpdateExchangeRate: (newTc: number) => void;
  loadedSystems?: { scada: boolean; nuvix: boolean; agriness: boolean };
  filterSlot?: React.ReactNode;
  onGoToUpload?: () => void;
}

export const FeedMillScadaView: React.FC<FeedMillScadaViewProps> = ({
  silos,
  batches,
  selectedEstablishment,
  onAddBatch,
  onUpdateExchangeRate,
  loadedSystems,
  filterSlot,
  onGoToUpload,
}) => {
  const [includeOtherCost, setIncludeOtherCost] = useState<boolean>(false);
  const [exchangeRate, setExchangeRate] = useState<number>(1400);
  const [showNewBatchForm, setShowNewBatchForm] = useState<boolean>(false);

  // Estado del formulario de nuevo lote SCADA
  const [newFormula, setNewFormula] = useState("Fórmula C (Recría Especial)");
  const [newProducedKg, setNewProducedKg] = useState(15000);
  const [newCornKg, setNewCornKg] = useState(9800);
  const [newSoyKg, setNewSoyKg] = useState(3700);
  const [newOtherKg, setNewOtherKg] = useState(1500);

  const cornPrice =
    silos.find((s) => s.code === "MP-01")?.unitPriceArsPerKg || 230;
  const soyPrice =
    silos.find((s) => s.code === "MP-02")?.unitPriceArsPerKg || 420;
  const otherPrice =
    silos.find((s) => s.code === "MP-03")?.unitPriceArsPerKg || 980;

  const filteredBatches = batches.filter(
    (b) =>
      selectedEstablishment === "ALL" ||
      b.establishmentId === selectedEstablishment
  );

  const file08Batches = batches.slice(0, 2);
  const totalCornFile08 = file08Batches.reduce((s, b) => s + b.cornKg, 0);
  const totalSoyFile08 = file08Batches.reduce((s, b) => s + b.soyKg, 0);
  const totalOtherFile08 = file08Batches.reduce((s, b) => s + b.otherKg, 0);
  const totalFreightFile08 = file08Batches.reduce(
    (s, b) => s + b.freightAllocatedArs,
    0
  );

  const handleExchangeRateChange = (val: number) => {
    const safeVal = Math.max(100, val);
    setExchangeRate(safeVal);
    onUpdateExchangeRate(safeVal);
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const created: FeedBatchRecord = {
      id: `batch-${Date.now()}`,
      date: new Date().toLocaleDateString("es-AR"),
      plantName: "PAB Tandil (Planta A)",
      establishmentId:
        selectedEstablishment === "ALL" ? "tandil" : selectedEstablishment,
      formulaName: newFormula,
      feedCategory: "Iniciador",
      producedKg: Number(newProducedKg),
      cornKg: Number(newCornKg),
      soyKg: Number(newSoyKg),
      otherKg: Number(newOtherKg),
      freightAllocatedArs: 95000,
    };
    onAddBatch(created);
    setShowNewBatchForm(false);
  };

  const handleExportCsv = () => {
    const headers = [
      "Fecha",
      "Planta",
      "Formula",
      "Kg Fabricados",
      "Maiz (kg)",
      "Soja (kg)",
      "Otros (kg)",
      "Desvio Balanza (kg)",
      "Costo Total ($)",
      "Costo Total (USD)",
      "Costo por Kg ($/kg)",
    ];
    const rows = filteredBatches.map((batch) => {
      const scaleCheck = calcBatchScaleDeviation(batch);
      const val = calcFeedBatchValuation(
        batch,
        {
          cornArsPerKg: cornPrice,
          soyArsPerKg: soyPrice,
          otherArsPerKg: otherPrice,
          exchangeRateArsUsd: exchangeRate,
        },
        includeOtherCost
      );
      return [
        batch.date,
        batch.plantName,
        batch.formulaName,
        batch.producedKg,
        batch.cornKg,
        batch.soyKg,
        batch.otherKg,
        scaleCheck.deviationKg,
        val.totalWithFreightArs.toFixed(0),
        val.totalUsd.toFixed(2),
        val.costPerKgArs.toFixed(2),
      ];
    });
    downloadCsv("SIPA_Costo_Alimento_Planta_Sep2026.csv", headers, rows);
  };

  const missingSources = loadedSystems
    ? [
        !loadedSystems.scada ? "SCADA" : null,
        !loadedSystems.nuvix ? "Nuvix ERP" : null,
      ].filter((x): x is string => Boolean(x))
    : [];

  return (
    <div className="space-y-6">
      <ViewHeader
        title="Planta alimentos"
        actions={
          <>
            {filterSlot}
            <Button
              size="md"
              variant="outline"
              onClick={() => setShowNewBatchForm(!showNewBatchForm)}
            >
              <PlusCircle className="w-4 h-4" />
              {showNewBatchForm ? "Cerrar formulario" : "Registrar batch"}
            </Button>
            <ExportButton onClick={handleExportCsv} />
          </>
        }
      />

      <MissingSourcesAlert
        missing={missingSources}
        onGoToUpload={onGoToUpload}
      />

      {/* FORMULARIO PARA REGISTRAR BATCH DE MOLIENDA */}
      {showNewBatchForm && (
        <Card className="border-2 border-[#566647]">
          <CardHeader>
            <CardTitle>Registrar batch de molienda (Balanza SCADA)</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCreateBatch}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end"
            >
              <div className="lg:col-span-2">
                <label
                  htmlFor="batch-formula"
                  className="type-label block mb-1"
                >
                  Fórmula / Receta
                </label>
                <input
                  id="batch-formula"
                  type="text"
                  value={newFormula}
                  onChange={(e) => setNewFormula(e.target.value)}
                  className="w-full rounded-md border border-[var(--color-border-input)] bg-[#FBF8F0] px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="batch-prod" className="type-label block mb-1">
                  Kg Fabricados
                </label>
                <input
                  id="batch-prod"
                  type="number"
                  value={newProducedKg}
                  onChange={(e) => setNewProducedKg(Number(e.target.value))}
                  className="w-full rounded-md border border-[var(--color-border-input)] bg-[#FBF8F0] px-3 py-2 text-sm tabular-nums"
                  required
                />
              </div>
              <div>
                <label htmlFor="batch-corn" className="type-label block mb-1">
                  Maíz (kg)
                </label>
                <input
                  id="batch-corn"
                  type="number"
                  value={newCornKg}
                  onChange={(e) => setNewCornKg(Number(e.target.value))}
                  className="w-full rounded-md border border-[var(--color-border-input)] bg-[#FBF8F0] px-3 py-2 text-sm tabular-nums"
                  required
                />
              </div>
              <div>
                <label htmlFor="batch-soy" className="type-label block mb-1">
                  Harina Soja (kg)
                </label>
                <input
                  id="batch-soy"
                  type="number"
                  value={newSoyKg}
                  onChange={(e) => setNewSoyKg(Number(e.target.value))}
                  className="w-full rounded-md border border-[var(--color-border-input)] bg-[#FBF8F0] px-3 py-2 text-sm tabular-nums"
                  required
                />
              </div>
              <div>
                <label htmlFor="batch-other" className="type-label block mb-1">
                  Otros / Núcleo (kg)
                </label>
                <input
                  id="batch-other"
                  type="number"
                  value={newOtherKg}
                  onChange={(e) => setNewOtherKg(Number(e.target.value))}
                  className="w-full rounded-md border border-[var(--color-border-input)] bg-[#FBF8F0] px-3 py-2 text-sm tabular-nums"
                  required
                />
              </div>
              <div className="lg:col-span-6 flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                <div className="text-xs font-medium">
                  Control de pesaje:{" "}
                  <strong
                    className={
                      newProducedKg - (newCornKg + newSoyKg + newOtherKg) === 0
                        ? "text-[#566647]"
                        : "text-[#991B1B]"
                    }
                  >
                    {newProducedKg - (newCornKg + newSoyKg + newOtherKg)} kg de
                    diferencia
                  </strong>
                </div>
                <Button type="submit" variant="forest" size="sm">
                  Guardar lote
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 1. VALORIZACIÓN DE FÓRMULA Y TIPO DE CAMBIO BIMONETARIO */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>
              Valorización de fórmula y tipo de cambio bimonetario
            </CardTitle>
            <FormulaHint
              align="left"
              formula="Costo Lote = (Maíz × $/kg) + (Soja × $/kg) + (Núcleos × $/kg) + Flete · USD = ARS ÷ TC"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[var(--color-surface)] px-3 py-1.5 rounded-md border border-[var(--color-border)]">
              <DollarSign className="w-4 h-4 text-[#566647]" />
              <label
                htmlFor="tc-input"
                className="text-xs font-semibold text-[var(--color-text)]"
              >
                TC ($/USD):
              </label>
              <input
                id="tc-input"
                type="number"
                value={exchangeRate}
                onChange={(e) =>
                  handleExchangeRateChange(Number(e.target.value))
                }
                className="w-20 text-xs font-bold tabular-nums bg-[#FBF8F0] border border-[var(--color-border-input)] rounded px-2 py-1"
              />
            </div>

            <Button
              size="sm"
              variant={includeOtherCost ? "forest" : "secondary"}
              onClick={() => setIncludeOtherCost(!includeOtherCost)}
            >
              <Sliders className="w-4 h-4" />
              {includeOtherCost
                ? "Costo completo (+ Núcleos)"
                : "Solo Maíz + Soja"}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="type-label">
                Maíz ({formatNum(totalCornFile08)} kg)
              </div>
              <div className="mt-1 type-kpi">
                {formatArs(totalCornFile08 * cornPrice)}
              </div>
              <div className="text-xs text-[var(--color-text-subtle)] tabular-nums mt-1">
                {formatArs(cornPrice)}/kg ·{" "}
                <strong>
                  {formatUsd((totalCornFile08 * cornPrice) / exchangeRate)}
                </strong>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="type-label">
                Harina Soja ({formatNum(totalSoyFile08)} kg)
              </div>
              <div className="mt-1 type-kpi">
                {formatArs(totalSoyFile08 * soyPrice)}
              </div>
              <div className="text-xs text-[var(--color-text-subtle)] tabular-nums mt-1">
                {formatArs(soyPrice)}/kg ·{" "}
                <strong>
                  {formatUsd((totalSoyFile08 * soyPrice) / exchangeRate)}
                </strong>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg border ${
                includeOtherCost
                  ? "bg-[#EAEEE6] border-[#566647]"
                  : "bg-[#FEF3C7]/60 border-[#92400E]/40"
              }`}
            >
              <div className="type-label">
                Otros kg / Núcleos ({formatNum(totalOtherFile08)} kg)
              </div>
              <div className="mt-1 type-kpi">
                {includeOtherCost
                  ? formatArs(totalOtherFile08 * otherPrice)
                  : "$ 0"}
              </div>
              <div className="text-xs text-[var(--color-text-subtle)] tabular-nums mt-1">
                {includeOtherCost
                  ? `${formatArs(otherPrice)}/kg incluido`
                  : "No incluido en valorización base"}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="type-label flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Flete asignado
              </div>
              <div className="mt-1 type-kpi text-[#43533D]">
                {formatArs(totalFreightFile08)}
              </div>
              <div className="text-xs text-[var(--color-text-subtle)] tabular-nums mt-1">
                Equivalente:{" "}
                <strong>{formatUsd(totalFreightFile08 / exchangeRate)}</strong>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. TABLA DE FABRICACIÓN Y CONTROL DE BALANZA SCADA */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>
              Seguimiento de fabricación por planta y control de tolva SCADA
            </CardTitle>
            <FormulaHint
              align="left"
              formula="Control kg = Kg fabricados − (Maíz kg + Harina soja kg + Otros kg)"
            />
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="table-head">
              <tr>
                <th className="py-3 px-4">Fecha / Planta</th>
                <th className="py-3 px-4">Fórmula elaborada</th>
                <th className="py-3 px-3 text-right">Kg Fabricados</th>
                <th className="py-3 px-3 text-right">Maíz (kg)</th>
                <th className="py-3 px-3 text-right">Soja (kg)</th>
                <th className="py-3 px-3 text-right">Otros (kg)</th>
                <th className="py-3 px-3 text-center">Control balanza</th>
                <th className="py-3 px-3 text-right">Costo total lote</th>
                <th className="py-3 px-4 text-right">Costo / Kg ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60">
              {filteredBatches.map((batch) => {
                const scaleCheck = calcBatchScaleDeviation(batch);
                const val = calcFeedBatchValuation(
                  batch,
                  {
                    cornArsPerKg: cornPrice,
                    soyArsPerKg: soyPrice,
                    otherArsPerKg: otherPrice,
                    exchangeRateArsUsd: exchangeRate,
                  },
                  includeOtherCost
                );

                return (
                  <tr
                    key={batch.id}
                    className="hover:bg-[var(--color-surface)]"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[var(--color-text)]">
                        {batch.plantName}
                      </div>
                      <div className="text-xs text-[var(--color-text-subtle)] tabular-nums">
                        {batch.date}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {batch.formulaName}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold">
                      {formatNum(batch.producedKg)} kg
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {formatNum(batch.cornKg)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {formatNum(batch.soyKg)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {formatNum(batch.otherKg)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {scaleCheck.isBalanced ? (
                        <Badge variant="forest">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 0 kg (Exacto)
                        </Badge>
                      ) : (
                        <Badge variant="danger">
                          <AlertTriangle className="w-3.5 h-3.5" /> Desvío:{" "}
                          {formatNum(scaleCheck.deviationKg)} kg
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      <div className="font-bold text-[#43533D]">
                        {formatArs(val.totalWithFreightArs)}
                      </div>
                      <div className="text-xs text-[var(--color-text-subtle)]">
                        {formatUsd(val.totalUsd)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-[#566647]">
                      {formatArs(val.costPerKgArs, true)} / kg
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. BALANCE DE STOCK EN SILOS SCADA */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>
              Balance de stock de materias primas en silos y ajustes
            </CardTitle>
            <FormulaHint
              align="left"
              formula="Stock Final (kg) = Stock Inicial + Ingresos − Consumos + Corrección Manual"
            />
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="table-head">
              <tr>
                <th className="py-3 px-4">Código / Materia prima</th>
                <th className="py-3 px-3 text-right">Stock inicial</th>
                <th className="py-3 px-3 text-right">Ingresos camión</th>
                <th className="py-3 px-3 text-right">Consumos tolva</th>
                <th className="py-3 px-3 text-right">Corrección / Merma</th>
                <th className="py-3 px-3 text-right">Stock final silo</th>
                <th className="py-3 px-3 text-right">Valorización stock</th>
                <th className="py-3 px-4">Motivo de corrección</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60">
              {silos.map((silo) => {
                const calc = calcSiloFinalStock({
                  ...silo,
                  exchangeRateArsUsd: exchangeRate,
                });
                return (
                  <tr key={silo.id} className="hover:bg-[var(--color-surface)]">
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-[#43533D] block">
                        {silo.code}
                      </span>
                      <span className="font-semibold text-[var(--color-text)]">
                        {silo.rawMaterial}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {formatNum(silo.initialStockKg)} kg
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-[#566647] font-medium">
                      +{formatNum(silo.entriesKg)} kg
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-[#991B1B] font-medium">
                      -{formatNum(silo.consumedKg)} kg
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {silo.adjustmentKg === 0 ? (
                        <Badge variant="neutral">0 kg</Badge>
                      ) : silo.adjustmentKg < 0 ? (
                        <Badge variant="warning">
                          <Scale className="w-3 h-3" />{" "}
                          {formatNum(silo.adjustmentKg)} kg
                        </Badge>
                      ) : (
                        <Badge variant="forest">
                          +{formatNum(silo.adjustmentKg)} kg
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold text-[#43533D]">
                      {formatNum(calc.finalStockKg)} kg
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      <div className="font-bold">
                        {formatArs(calc.valuationArs)}
                      </div>
                      <div className="text-xs text-[var(--color-text-subtle)]">
                        {formatUsd(calc.valuationUsd)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[var(--color-text-muted)]">
                      {silo.adjustmentReason ? (
                        <>
                          <strong className="text-[var(--color-text)]">
                            [{silo.adjustmentDate}]
                          </strong>{" "}
                          {silo.adjustmentReason}
                        </>
                      ) : (
                        "Sin ajustes manuales en el período"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. INFORMACIÓN DEL PROCESO AL PIE */}
      <ProcessNotes>
        <ProcessNote title="Control de pesaje SCADA y balance de silos">
          Audita automáticamente cada batch verificando que los kilos fabricados
          en tolva coincidan con la suma de ingredientes dosificados (Control
          kg = 0) y actualiza el saldo físico de silos considerando descargas de
          camión y mermas por humedad.
        </ProcessNote>
        <ProcessNote title="Valorización bimonetaria e inclusión de núcleos">
          Cruza los consumos físicos de SCADA con las facturas de compra y
          fletes de Nuvix ERP en ARS y USD, permitiendo incluir el costo de
          núcleos vitamínicos y microingredientes ("Otros kg") en el costo por
          kilo de ración.
        </ProcessNote>
      </ProcessNotes>
    </div>
  );
};
