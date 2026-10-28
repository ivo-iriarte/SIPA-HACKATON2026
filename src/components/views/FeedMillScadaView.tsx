/**
 * @file FeedMillScadaView.tsx
 * @description Vista 4 — Sector Planta de Alimento Balanceado (SCADA / Silos & Fórmulas).
 * Resuelve los Excels 06, 07 y 08:
 * - Verifica la cuadratura de pesaje de balanza SCADA: Control kg = Fabricados - (Maíz + Soja + Otros).
 * - Audita el stock de silos de materias primas y sus ajustes por humedad/pesaje.
 * - Incluye la corrección de la omisión advertida en la Guía (pág. 3): permite incluir o excluir
 *   el costo de "Otros kg (Núcleos)" en la valorización de la fórmula y prorratear fletes en USD/ARS.
 */

import React, { useState } from "react";
import {
  Factory,
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
  CardDescription,
  CardContent,
  Badge,
  Button,
} from "../ui/primitives";

interface FeedMillScadaViewProps {
  silos: ScadaSiloBalanceRecord[];
  batches: FeedBatchRecord[];
  selectedEstablishment: EstablishmentId | "ALL";
  onAddBatch: (newBatch: FeedBatchRecord) => void;
  onUpdateExchangeRate: (newTc: number) => void;
}

export const FeedMillScadaView: React.FC<FeedMillScadaViewProps> = ({
  silos,
  batches,
  selectedEstablishment,
  onAddBatch,
  onUpdateExchangeRate,
}) => {
  // Parámetros interactivos de valorización (Archivo 08)
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

  // Lotes del Archivo 08 (PAB San Lorenzo: Fórmula A 20.000 kg + Fórmula B 18.000 kg)
  const file08Batches = batches.slice(0, 2);
  const totalCornFile08 = file08Batches.reduce((s, b) => s + b.cornKg, 0); // 24.000 kg
  const totalSoyFile08 = file08Batches.reduce((s, b) => s + b.soyKg, 0); // 10.000 kg
  const totalOtherFile08 = file08Batches.reduce((s, b) => s + b.otherKg, 0); // 4.000 kg
  const totalFreightFile08 = file08Batches.reduce(
    (s, b) => s + b.freightAllocatedArs,
    0
  ); // $230.000

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

  return (
    <div className="space-y-6">
      {/* Banner Sectorial: Planta de Alimentos Balanceados (SCADA) */}
      <div className="p-4 rounded-lg bg-[#E2E6F2] border border-[#2C365A]/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-md bg-[#2C365A] text-white">
            <Factory className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[#1E2642]">
              Vista Sectorial: Planta de Alimento Balanceado (SCADA + Valorización Nuvix)
            </h2>
            <p className="text-xs text-[#1E2642]/80">
              Control de pesaje de tolvas, balance físico de silos de granos,
              prorrateo de fletes y valorización bimonetaria (ARS / USD).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="ocean">Origen: Excels 06, 07 y 08</Badge>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowNewBatchForm(!showNewBatchForm)}
          >
            <PlusCircle className="w-4 h-4" />
            {showNewBatchForm
              ? "Cerrar Formulario"
              : "Registrar Batch de Molienda SCADA"}
          </Button>
        </div>
      </div>

      {/* FORMULARIO OPCIONAL PARA SIMULAR NUEVA MOLIENDA O DESVÍO DE BALANZA */}
      {showNewBatchForm && (
        <Card className="border-2 border-[#1E4D3B]">
          <CardHeader>
            <div>
              <CardTitle>
                Simulador de Batch de Molienda (Balanza SCADA)
              </CardTitle>
              <CardDescription>
                Si la suma de ingredientes no coincide con los Kg Fabricados,
                SIPA disparará una alerta de descalibración de celda de carga.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCreateBatch}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end"
            >
              <div className="lg:col-span-2">
                <label
                  htmlFor="batch-formula"
                  className="block text-xs font-bold mb-1"
                >
                  Nombre de Fórmula / Receta
                </label>
                <input
                  id="batch-formula"
                  type="text"
                  value={newFormula}
                  onChange={(e) => setNewFormula(e.target.value)}
                  className="w-full rounded-md border border-[var(--color-border-input)] bg-white px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="batch-prod"
                  className="block text-xs font-bold mb-1"
                >
                  Kg Fabricados (Balanza)
                </label>
                <input
                  id="batch-prod"
                  type="number"
                  value={newProducedKg}
                  onChange={(e) => setNewProducedKg(Number(e.target.value))}
                  className="w-full rounded-md border border-[var(--color-border-input)] bg-white px-3 py-2 text-sm tabular-nums"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="batch-corn"
                  className="block text-xs font-bold mb-1"
                >
                  Maíz (kg)
                </label>
                <input
                  id="batch-corn"
                  type="number"
                  value={newCornKg}
                  onChange={(e) => setNewCornKg(Number(e.target.value))}
                  className="w-full rounded-md border border-[var(--color-border-input)] bg-white px-3 py-2 text-sm tabular-nums"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="batch-soy"
                  className="block text-xs font-bold mb-1"
                >
                  Harina Soja (kg)
                </label>
                <input
                  id="batch-soy"
                  type="number"
                  value={newSoyKg}
                  onChange={(e) => setNewSoyKg(Number(e.target.value))}
                  className="w-full rounded-md border border-[var(--color-border-input)] bg-white px-3 py-2 text-sm tabular-nums"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="batch-other"
                  className="block text-xs font-bold mb-1"
                >
                  Otros / Núcleo (kg)
                </label>
                <input
                  id="batch-other"
                  type="number"
                  value={newOtherKg}
                  onChange={(e) => setNewOtherKg(Number(e.target.value))}
                  className="w-full rounded-md border border-[var(--color-border-input)] bg-white px-3 py-2 text-sm tabular-nums"
                  required
                />
              </div>
              <div className="lg:col-span-6 flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                <div className="text-xs font-medium">
                  Control de pesaje previo:{" "}
                  <strong
                    className={
                      newProducedKg - (newCornKg + newSoyKg + newOtherKg) === 0
                        ? "text-[#1E4D3B]"
                        : "text-[#991B1B]"
                    }
                  >
                    {newProducedKg - (newCornKg + newSoyKg + newOtherKg)} kg de
                    diferencia
                  </strong>
                </div>
                <Button type="submit" variant="forest" size="sm">
                  Guardar e Impactar Lote SCADA
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 1. CONTROLES DE VALORIZACIÓN BIMONETARIA Y ADVERTENCIA DE "OTROS KG" (Archivo 08) */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              Parámetros de Valorización de Fórmula y Tipo de Cambio (Archivo 08)
            </CardTitle>
            <CardDescription>
              La hoja "Valorizacion" del Excel 08 calcula Maíz (24.000 kg x $230)
              y Harina de Soja (10.000 kg x $420), pero omite los 4.000 kg de
              "Otros kg". Aquí podés activar su inclusión para obtener el costo
              completo real.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[var(--color-surface)] px-3 py-1.5 rounded-md border border-[var(--color-border)]">
              <DollarSign className="w-4 h-4 text-[#1E4D3B]" />
              <label
                htmlFor="tc-input"
                className="text-xs font-bold text-[var(--color-text)]"
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
                className="w-20 text-xs font-bold tabular-nums bg-white border border-[var(--color-border-input)] rounded px-2 py-1"
              />
            </div>

            <Button
              size="sm"
              variant={includeOtherCost ? "forest" : "secondary"}
              onClick={() => setIncludeOtherCost(!includeOtherCost)}
            >
              <Sliders className="w-4 h-4" />
              {includeOtherCost
                ? "✓ Costo Completo (Incluye Otros kg / Núcleos)"
                : "Modo Excel 08 Original (Solo Maíz + Soja)"}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Maíz */}
            <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="text-xs font-bold uppercase text-[var(--color-text-muted)]">
                Maíz (Lotes 08: {formatNum(totalCornFile08)} kg)
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-[var(--color-text)]">
                {formatArs(totalCornFile08 * cornPrice)}
              </div>
              <div className="text-xs text-[var(--color-text-subtle)] tabular-nums mt-0.5">
                {formatArs(cornPrice)}/kg →{" "}
                <strong>
                  {formatUsd((totalCornFile08 * cornPrice) / exchangeRate)}
                </strong>
              </div>
            </div>

            {/* Harina de Soja */}
            <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="text-xs font-bold uppercase text-[var(--color-text-muted)]">
                Harina Soja (Lotes 08: {formatNum(totalSoyFile08)} kg)
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-[var(--color-text)]">
                {formatArs(totalSoyFile08 * soyPrice)}
              </div>
              <div className="text-xs text-[var(--color-text-subtle)] tabular-nums mt-0.5">
                {formatArs(soyPrice)}/kg →{" "}
                <strong>
                  {formatUsd((totalSoyFile08 * soyPrice) / exchangeRate)}
                </strong>
              </div>
            </div>

            {/* Otros kg (Núcleos vitamínicos) */}
            <div
              className={`p-3.5 rounded-lg border ${
                includeOtherCost
                  ? "bg-[#E4F0EB] border-[#1E4D3B]"
                  : "bg-[#FEF3C7]/60 border-[#92400E]/40"
              }`}
            >
              <div className="text-xs font-bold uppercase text-[var(--color-text-muted)]">
                Otros kg / Núcleos ({formatNum(totalOtherFile08)} kg)
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-[var(--color-text)]">
                {includeOtherCost
                  ? formatArs(totalOtherFile08 * otherPrice)
                  : "$ 0 (Omitido en 08)"}
              </div>
              <div className="text-xs text-[var(--color-text-subtle)] tabular-nums mt-0.5">
                {includeOtherCost
                  ? `${formatArs(otherPrice)}/kg incluido`
                  : "Activá el botón superior para valorizar"}
              </div>
            </div>

            {/* Flete Materias Primas */}
            <div className="p-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="text-xs font-bold uppercase text-[var(--color-text-muted)] flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Flete Asignado (Hoja Fletes)
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-[#2C365A]">
                {formatArs(totalFreightFile08)}
              </div>
              <div className="text-xs text-[var(--color-text-subtle)] tabular-nums mt-0.5">
                Equivalente:{" "}
                <strong>{formatUsd(totalFreightFile08 / exchangeRate)}</strong>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. TABLA DE FABRICACIÓN Y CONTROL DE BALANZA SCADA (Archivos 07 y 08) */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              Seguimiento de Fabricación por Planta y Control de Tolva SCADA
            </CardTitle>
            <CardDescription>
              Fórmula de auditoría física: Control kg = Kg fabricados - (Maíz kg
              + Harina soja kg + Otros kg).
            </CardDescription>
          </div>
          <Badge variant="forest">Auditoría de Pesaje Automática</Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)] text-xs uppercase font-bold text-[var(--color-text-muted)]">
              <tr>
                <th className="py-3 px-4">Fecha / Planta</th>
                <th className="py-3 px-4">Fórmula Elaborada</th>
                <th className="py-3 px-3 text-right">Kg Fabricados</th>
                <th className="py-3 px-3 text-right">Maíz (kg)</th>
                <th className="py-3 px-3 text-right">Soja (kg)</th>
                <th className="py-3 px-3 text-right">Otros (kg)</th>
                <th className="py-3 px-3 text-center">Control Balanza</th>
                <th className="py-3 px-3 text-right">Costo Total Lote</th>
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
                      <div className="font-bold text-[var(--color-text)]">
                        {batch.plantName}
                      </div>
                      <div className="text-xs text-[var(--color-text-subtle)] tabular-nums">
                        Fecha: {batch.date}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold">
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
                      <div className="font-bold text-[#2C365A]">
                        {formatArs(val.totalWithFreightArs)}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-subtle)]">
                        {formatUsd(val.totalUsd)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-[#1E4D3B]">
                      {formatArs(val.costPerKgArs, true)} / kg
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. BALANCE DE STOCK EN SILOS SCADA Y CORRECCIONES DE INVENTARIO (Archivo 06) */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              Balance de Stock de Materias Primas en Silos y Ajustes (Archivo 06)
            </CardTitle>
            <CardDescription>
              Fórmula: Stock Final (kg) = Stock Inicial + Ingresos - Consumos +
              Corrección Manual
            </CardDescription>
          </div>
          <Badge variant="ocean">Conciliación de Silos SCADA</Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)] text-xs uppercase font-bold text-[var(--color-text-muted)]">
              <tr>
                <th className="py-3 px-4">Código / Materia Prima</th>
                <th className="py-3 px-3 text-right">Stock Inicial</th>
                <th className="py-3 px-3 text-right">Ingresos Camión</th>
                <th className="py-3 px-3 text-right">Consumos Tolva</th>
                <th className="py-3 px-3 text-right">Corrección / Merma</th>
                <th className="py-3 px-3 text-right">Stock Final Silo</th>
                <th className="py-3 px-3 text-right">Valorización Stock</th>
                <th className="py-3 px-4">Motivo de Corrección Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60">
              {silos.map((silo) => {
                const calc = calcSiloFinalStock({
                  ...silo,
                  exchangeRateArsUsd: exchangeRate,
                });
                return (
                  <tr
                    key={silo.id}
                    className="hover:bg-[var(--color-surface)]"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-[#2C365A] block">
                        {silo.code}
                      </span>
                      <span className="font-bold text-[var(--color-text)]">
                        {silo.rawMaterial}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {formatNum(silo.initialStockKg)} kg
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-[#1E4D3B] font-medium">
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
                    <td className="py-3 px-3 text-right tabular-nums font-bold text-[#2C365A]">
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
    </div>
  );
};
