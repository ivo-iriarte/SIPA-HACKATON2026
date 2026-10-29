/**
 * @file PharmacyAuditView.tsx
 * @description Proceso Farmacia — Salida: Control de inventario.
 * - Conciliación de inventario sanitario (Agriness vs Nuvix ERP) y cálculo de Stock Teórico.
 * - Detección de diferencias de stock con exposición explícita de criterios de signo.
 * - Generación de asiento contable para Nuvix ERP.
 */

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  ArrowLeftRight,
} from "lucide-react";
import {
  PharmacyInventoryRecord,
  AccountingEntry,
  EstablishmentId,
  PeriodId,
} from "../../types/domain";
import {
  calcPharmacyReconciliation,
  formatArs,
  formatNum,
} from "../../services/sipaEngine";
import {
  Card,
  CardHeader,
  CardTitle,
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

interface PharmacyAuditViewProps {
  inventory: PharmacyInventoryRecord[];
  selectedEstablishment: EstablishmentId | "ALL";
  includePorcap: boolean;
  activePeriod: PeriodId;
  onGenerateAccountingEntry: (
    item: PharmacyInventoryRecord,
    entry: AccountingEntry
  ) => void;
  onReconcileStock: (itemId: string) => void;
  loadedSystems?: { scada: boolean; nuvix: boolean; agriness: boolean };
  filterSlot?: React.ReactNode;
  onGoToUpload?: () => void;
}

export const PharmacyAuditView: React.FC<PharmacyAuditViewProps> = ({
  inventory,
  selectedEstablishment,
  includePorcap,
  activePeriod,
  onGenerateAccountingEntry,
  onReconcileStock,
  loadedSystems,
  filterSlot,
  onGoToUpload,
}) => {
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const filtered = inventory.filter((item) => {
    if (!includePorcap && item.establishmentId === "porcap") return false;
    if (
      selectedEstablishment !== "ALL" &&
      item.establishmentId !== selectedEstablishment
    )
      return false;
    return true;
  });

  const totalConsumptionValue = filtered.reduce(
    (s, i) => s + i.consumedAgriness * i.unitCostArs,
    0
  );
  const discrepancyCount = filtered.filter(
    (i) => calcPharmacyReconciliation(i).hasDiscrepancy
  ).length;

  const handleCreateEntry = (item: PharmacyInventoryRecord) => {
    const amount = item.consumedAgriness * item.unitCostArs;
    const newEntry: AccountingEntry = {
      id: `ast-pharm-${Date.now()}`,
      date: new Date().toLocaleDateString("es-AR"),
      period: activePeriod,
      originModule: "Farmacia",
      costCenter: item.establishmentName,
      debitAccount: "5.1.02 - Gasto Sanidad Granja",
      debitAmountArs: amount,
      creditAccount: "1.1.08 - Stock Farmacia",
      creditAmountArs: amount,
      status: "EXPORTADO_NUVIX",
      referenceNote: `Imputación automática SIPA: ${item.productName} (${item.consumedAgriness} uds x ${formatArs(
        item.unitCostArs
      )})`,
    };
    onGenerateAccountingEntry(item, newEntry);
    setFeedbackToast(
      `Asiento contable generado por ${formatArs(amount)} para ${
        item.establishmentName
      } (${item.productName}) y enviado al Libro Nuvix.`
    );
  };

  const handleExportCsv = () => {
    const headers = [
      "Codigo SKU",
      "Establecimiento",
      "Producto",
      "Stock Inicial",
      "Compras Nuvix",
      "Consumo Agriness",
      "Stock Teorico",
      "Stock Nuvix",
      "Dif (Nuvix - Teorico)",
      "Dif (Agriness - Nuvix)",
      "Valor Consumo ($)",
    ];
    const rows = filtered.map((item) => {
      const rec = calcPharmacyReconciliation(item);
      return [
        item.productCode,
        item.establishmentName,
        item.productName,
        item.initialStock,
        item.purchasesNuvix,
        item.consumedAgriness,
        rec.theoreticalStock,
        item.stockNuvix,
        rec.diffNuvixVsTheoretical,
        rec.diffAgrinessVsNuvix,
        rec.totalConsumptionValueArs,
      ];
    });
    downloadCsv("SIPA_Control_Inventario_Farmacia_Sep2026.csv", headers, rows);
  };

  const missingSources = loadedSystems
    ? [
        !loadedSystems.nuvix ? "Nuvix ERP" : null,
        !loadedSystems.agriness ? "Agriness" : null,
      ].filter((x): x is string => Boolean(x))
    : [];

  return (
    <div className="space-y-6">
      <ViewHeader
        title="Farmacia"
        status={
          discrepancyCount > 0 ? (
            <Badge variant="danger">
              <AlertTriangle className="w-3.5 h-3.5" /> {discrepancyCount}{" "}
              discrepancias
            </Badge>
          ) : (
            <Badge variant="forest">
              <CheckCircle2 className="w-3.5 h-3.5" /> Inventario conciliado
            </Badge>
          )
        }
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

      {feedbackToast && (
        <div
          role="status"
          className="p-3.5 rounded-lg bg-[#43533D] text-[#FBF8F0] text-xs font-semibold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#D6C8AE]" />
            <span>{feedbackToast}</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setFeedbackToast(null)}
          >
            Cerrar
          </Button>
        </div>
      )}

      {/* TABLA DE CONCILIACIÓN Y VALORIZACIÓN DE FARMACIA */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>
              Conciliación de stock y valorización de consumos sanitarios
            </CardTitle>
            <FormulaHint
              align="left"
              formula="Stock Teórico = Stock Inicial + Compras (Nuvix) − Consumo Aplicado (Agriness)"
            />
          </div>
          <Badge variant="ocean">
            Consumo valorizado: {formatArs(totalConsumptionValue)}
          </Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="table-head">
              <tr>
                <th className="py-3 px-4">Establecimiento / SKU</th>
                <th className="py-3 px-3 text-right">Stk Inicial</th>
                <th className="py-3 px-3 text-right">+ Compras</th>
                <th className="py-3 px-3 text-right">- Consumo Agriness</th>
                <th className="py-3 px-3 text-right">= Stk Teórico</th>
                <th className="py-3 px-3 text-right">Stk Nuvix</th>
                <th className="py-3 px-3 text-center">
                  Dif. (Nuvix − Teórico)
                </th>
                <th className="py-3 px-3 text-center">
                  Dif. (Agriness − Nuvix)
                </th>
                <th className="py-3 px-3 text-right">Valor consumo ($)</th>
                <th className="py-3 px-4 text-center">Acción contable / Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60">
              {filtered.map((item) => {
                const rec = calcPharmacyReconciliation(item);
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-[var(--color-surface)] ${
                      rec.hasDiscrepancy ? "bg-[#FEE2E2]/25" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[#43533D]">
                          [{item.productCode}]
                        </span>
                        <span className="font-semibold text-[var(--color-text)]">
                          {item.establishmentName}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {item.productName}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {formatNum(item.initialStock)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-[#566647] font-medium">
                      +{formatNum(item.purchasesNuvix)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-[#991B1B] font-bold">
                      -{formatNum(item.consumedAgriness)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold bg-[var(--color-surface)]">
                      {formatNum(rec.theoreticalStock)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold">
                      {formatNum(item.stockNuvix)}
                    </td>
                    <td className="py-3 px-3 text-center tabular-nums">
                      {rec.diffNuvixVsTheoretical === 0 ? (
                        <Badge variant="forest">0 (OK)</Badge>
                      ) : (
                        <Badge variant="danger">
                          {rec.diffNuvixVsTheoretical > 0 ? "+" : ""}
                          {rec.diffNuvixVsTheoretical} ud
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center tabular-nums">
                      {rec.diffAgrinessVsNuvix === 0 ? (
                        <Badge variant="forest">0 (OK)</Badge>
                      ) : (
                        <Badge variant="warning">
                          {rec.diffAgrinessVsNuvix > 0 ? "+" : ""}
                          {rec.diffAgrinessVsNuvix} ud
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      <div className="font-bold text-[#43533D]">
                        {formatArs(rec.totalConsumptionValueArs)}
                      </div>
                      <div className="text-xs text-[var(--color-text-subtle)]">
                        {formatNum(item.consumedAgriness)} x{" "}
                        {formatArs(item.unitCostArs)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {rec.hasDiscrepancy && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onReconcileStock(item.id)}
                            title="Ajustar Stock Nuvix al Stock Teórico auditado"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            Conciliar
                          </Button>
                        )}
                        {item.accountingPosted ? (
                          <Badge variant="forest">✓ Imputado Nuvix</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleCreateEntry(item)}
                          >
                            <FilePlus2 className="w-3.5 h-3.5" />
                            Generar asiento
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* INFORMACIÓN DEL PROCESO AL PIE */}
      <ProcessNotes>
        <ProcessNote title="Conciliación automática e imputación contable">
          Cruza las compras registradas en Nuvix ERP con los consumos sanitarios
          aplicados en Agriness por establecimiento y código SKU, eliminando la
          doble carga manual y generando el asiento contable para Nuvix.
        </ProcessNote>
        <ProcessNote title="Auditoría de criterios de signo (Agriness vs Nuvix)">
          La planilla de consumo calcula la diferencia como{" "}
          <strong>Stock Nuvix − Stock Teórico (74 − 75 = −1)</strong>, mientras
          que la de granja la calcula como{" "}
          <strong>Cantidad Agriness − Cantidad Nuvix (75 − 74 = +1)</strong>.
          Ambas columnas se exponen lado a lado para evitar ajustes con signo
          invertido.
        </ProcessNote>
      </ProcessNotes>
    </div>
  );
};
