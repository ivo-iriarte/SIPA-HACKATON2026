/**
 * @file AccountingClosingView.tsx
 * @description Vista 6 — Sector Administración, Libro de Asientos Contables Nuvix y Cierre Mensual.
 * Implementa el requerimiento clave expresado por Sofía Gonzalez Grenat:
 * "Mantener el cierre mensual, pero poder incorporar información y realizar controles
 * durante el mes, sin esperar al cierre para detectar diferencias o errores."
 */

import React, { useState } from "react";
import {
  Briefcase,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileCheck2,
  ArrowRight,
} from "lucide-react";
import {
  AccountingEntry,
  PeriodStatus,
  PeriodId,
  PharmacyInventoryRecord,
  FeedBatchRecord,
} from "../../types/domain";
import {
  calcPharmacyReconciliation,
  calcBatchScaleDeviation,
  formatArs,
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

interface AccountingClosingViewProps {
  entries: AccountingEntry[];
  periodStatus: PeriodStatus;
  activePeriod: PeriodId;
  pharmacyInventory: PharmacyInventoryRecord[];
  feedBatches: FeedBatchRecord[];
  onTogglePeriodClosing: () => void;
  onExportAllEntriesToNuvix: () => void;
}

export const AccountingClosingView: React.FC<AccountingClosingViewProps> = ({
  entries,
  periodStatus,
  activePeriod,
  pharmacyInventory,
  feedBatches,
  onTogglePeriodClosing,
  onExportAllEntriesToNuvix,
}) => {
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const totalDebit = entries.reduce((s, e) => s + e.debitAmountArs, 0);
  const totalCredit = entries.reduce((s, e) => s + e.creditAmountArs, 0);
  const pendingDrafts = entries.filter((e) => e.status === "BORRADOR").length;

  // Controles de Pre-Cierre durante el mes
  const pharmacyDiscrepancies = pharmacyInventory.filter(
    (p) => calcPharmacyReconciliation(p).hasDiscrepancy
  ).length;
  const scadaDeviations = feedBatches.filter(
    (b) => !calcBatchScaleDeviation(b).isBalanced
  ).length;

  const handleDownloadNuvixBatch = () => {
    onExportAllEntriesToNuvix();
    const headers = [
      "ID_Asiento",
      "Fecha",
      "Periodo",
      "Modulo_Origen",
      "Centro_Costo",
      "Cuenta_Debe",
      "Importe_Debe_ARS",
      "Cuenta_Haber",
      "Importe_Haber_ARS",
      "Detalle",
    ];
    const rows = entries.map((e) =>
      [
        e.id,
        e.date,
        e.period,
        e.originModule,
        e.costCenter,
        e.debitAccount,
        e.debitAmountArs,
        e.creditAccount,
        e.creditAmountArs,
        `"${e.referenceNote}"`,
      ].join(";")
    );
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Nuvix_Asientos_Contables_${activePeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportMessage(
      `Se exportaron ${entries.length} asientos contables por ${formatArs(
        totalDebit
      )} en formato compatible con Nuvix ERP.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner Sectorial Administración y Cierre */}
      <div className="p-4 rounded-lg bg-[#E2E6F2] border border-[#2C365A]/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-md bg-[#2C365A] text-white">
            <Briefcase className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[#1E2642]">
              Vista Sectorial: Administración, Contabilidad Nuvix y Control de Pre-Cierre
            </h2>
            <p className="text-xs text-[#1E2642]/80">
              Auditoría continua durante el mes, generación de asientos de
              imputación por centro de costo y bloqueo de Cierre Mensual.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={periodStatus === "CERRADO" ? "forest" : "warning"}>
            {periodStatus === "CERRADO" ? (
              <>
                <Lock className="w-3.5 h-3.5" /> Período {activePeriod} CERRADO
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5" /> Período {activePeriod} ABIERTO
                (Controles en curso)
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* 1. CHECKLIST DE CONTROLES CONTINUOS PREVIO AL CIERRE MENSUAL */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              Panel de Controles Continuos (Pre-Cierre Mensual {activePeriod})
            </CardTitle>
            <CardDescription>
              Permite detectar diferencias durante el mes antes de consolidar el
              cierre contable definitivo.
            </CardDescription>
          </div>
          <Button
            variant={periodStatus === "CERRADO" ? "outline" : "forest"}
            onClick={onTogglePeriodClosing}
          >
            {periodStatus === "CERRADO" ? (
              <>
                <Unlock className="w-4 h-4" /> Reabrir Período para Ajustes
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" /> Ejecutar Cierre Mensual Definitivo
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Control 1: Balanza SCADA */}
            <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-start gap-3">
              {scadaDeviations === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-[#1E4D3B] shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#991B1B] shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-sm font-bold text-[var(--color-text)]">
                  1. Cuadratura de Tolvas SCADA
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {scadaDeviations === 0
                    ? `Todos los ${feedBatches.length} lotes de alimento balanceado tienen desvío 0 kg.`
                    : `Atención: ${scadaDeviations} lote(s) presentan diferencia entre Kg fabricados y suma de ingredientes.`}
                </p>
              </div>
            </div>

            {/* Control 2: Conciliación Farmacia */}
            <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-start gap-3">
              {pharmacyDiscrepancies === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-[#1E4D3B] shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#92400E] shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-sm font-bold text-[var(--color-text)]">
                  2. Stock Agriness vs. Nuvix (Farmacia)
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {pharmacyDiscrepancies === 0
                    ? "100% de los insumos sanitarios están conciliados entre campo y contabilidad."
                    : `Hay ${pharmacyDiscrepancies} producto(s) con diferencia entre Stock Teórico y Nuvix. Podés conciliarlos en la pestaña Farmacia.`}
                </p>
              </div>
            </div>

            {/* Control 3: Asientos Contables */}
            <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-start gap-3">
              {pendingDrafts === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-[#1E4D3B] shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#92400E] shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-sm font-bold text-[var(--color-text)]">
                  3. Imputación de Asientos en Nuvix
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {pendingDrafts === 0
                    ? "Todos los asientos del mes fueron impactados y exportados a Nuvix."
                    : `Quedan ${pendingDrafts} asiento(s) en estado Borrador listos para exportar a Nuvix ERP.`}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. LIBRO DE ASIENTOS CONTABLES MODELO (Archivo 04 Hoja Asiento Modelo) */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              Libro de Asientos Contables Generados para Nuvix ERP
            </CardTitle>
            <CardDescription>
              Partida doble cuadrada automáticamente: Total Debe{" "}
              <strong>{formatArs(totalDebit)}</strong> = Total Haber{" "}
              <strong>{formatArs(totalCredit)}</strong>
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handleDownloadNuvixBatch}
          >
            <Download className="w-4 h-4" />
            Impactar Borradores y Descargar Lote Nuvix (.CSV)
          </Button>
        </CardHeader>

        {exportMessage && (
          <div className="mx-5 mb-4 p-3 rounded-lg bg-[#E4F0EB] border border-[#1E4D3B] text-[#14382A] text-xs font-semibold flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[#1E4D3B]" />
            <span>{exportMessage}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)] text-xs uppercase font-bold text-[var(--color-text-muted)]">
              <tr>
                <th className="py-3 px-4">Fecha / Origen</th>
                <th className="py-3 px-4">Centro de Costo</th>
                <th className="py-3 px-4">Cuenta Debe (Imputación)</th>
                <th className="py-3 px-3 text-right">Debe ($)</th>
                <th className="py-3 px-4">Cuenta Haber (Contrapartida)</th>
                <th className="py-3 px-3 text-right">Haber ($)</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60">
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-[var(--color-surface)]"
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-[var(--color-text)]">
                      {entry.originModule}
                    </div>
                    <div className="text-xs text-[var(--color-text-subtle)] tabular-nums">
                      {entry.date}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#2C365A]">
                    {entry.costCenter}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-[var(--color-text)]">
                      {entry.debitAccount}
                    </div>
                    <div className="text-xs text-[var(--color-text-subtle)]">
                      {entry.referenceNote}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums font-bold text-[#1E4D3B]">
                    {formatArs(entry.debitAmountArs)}
                  </td>
                  <td className="py-3 px-4 font-medium text-[var(--color-text)]">
                    <span className="inline-flex items-center gap-1">
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-subtle)]" />
                      {entry.creditAccount}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums font-bold text-[#2C365A]">
                    {formatArs(entry.creditAmountArs)}
                  </td>
                  <td className="py-3 px-4">
                    {entry.status === "EXPORTADO_NUVIX" ? (
                      <Badge variant="forest">✓ Exportado Nuvix</Badge>
                    ) : (
                      <Badge variant="warning">● Borrador Pendiente</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#2C365A] text-white font-bold text-sm">
              <tr>
                <td colSpan={3} className="py-3 px-4">
                  TOTALES PARTIDA DOBLE ({entries.length} asientos)
                </td>
                <td className="py-3 px-3 text-right tabular-nums">
                  {formatArs(totalDebit)}
                </td>
                <td className="py-3 px-4"></td>
                <td className="py-3 px-3 text-right tabular-nums">
                  {formatArs(totalCredit)}
                </td>
                <td className="py-3 px-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};
