/**
 * @file PharmacyAuditView.tsx
 * @description Vista 5 — Sector Farmacia, Sanidad y Conciliación de Inventario (Agriness vs Nuvix).
 * Resuelve los Excels 04 y 05:
 * - Elimina la doble carga: toma los consumos de Agriness, los cruza contra las compras de Nuvix
 *   y calcula el Stock Teórico.
 * - Detecta y explica la inversión de signos advertida en la Guía del Desafío (Archivo 04 calcula
 *   Nuvix - Teórico = -1, mientras Archivo 05 calcula Agriness - Nuvix = +1).
 * - Genera automáticamente el Asiento Contable para Nuvix con 1 clic.
 */

import React, { useState } from "react";
import {
  Pill,
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  ArrowLeftRight,
  Info,
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
  CardDescription,
  CardContent,
  Badge,
  Button,
} from "../ui/primitives";

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
  onLoadAllSystems?: () => void;
  onNavigateToTab?: (tab: any) => void;
}

export const PharmacyAuditView: React.FC<PharmacyAuditViewProps> = ({
  inventory,
  selectedEstablishment,
  includePorcap,
  activePeriod,
  onGenerateAccountingEntry,
  onReconcileStock,
  loadedSystems,
  onLoadAllSystems,
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

  return (
    <div className="space-y-6">
      {/* Banner de Proceso 3 segun Guia 00 */}
      <div className="p-4 rounded-xl bg-[#2C365A] text-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <span className="p-2.5 rounded-lg bg-white/10 text-[#86EFAC] shrink-0">
            <Pill className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold">Proceso 3: Farmacia</h2>
              <Badge variant="forest" className="bg-[#1E4D3B] text-white border-none text-xs">
                Salida Específica: Control de inventario
              </Badge>
            </div>
            <p className="text-xs text-[#C4BCB0] mt-0.5">
              <strong>Origen:</strong> Agriness + Nuvix · <strong>Operación manual reemplazada:</strong> Doble carga, conciliación de stock, asiento contable. (Ejemplos: 04 y 05).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {discrepancyCount > 0 ? (
            <Badge variant="danger" className="bg-[#FEE2E2] text-[#7F1D1D] border-none font-bold">
              <AlertTriangle className="w-3.5 h-3.5" /> {discrepancyCount}{" "}
              discrepancias detectadas
            </Badge>
          ) : (
            <Badge variant="forest" className="bg-[#E4F0EB] text-[#14382A] border-none font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Inventario 100% conciliado
            </Badge>
          )}
        </div>
      </div>

      {/* Alerta si falta Agriness o Nuvix */}
      {loadedSystems && (!loadedSystems.agriness || !loadedSystems.nuvix) && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Atención:</strong> Para realizar el <strong>Control de Inventario y Conciliación</strong> se requieren las compras de <strong>Nuvix ERP</strong> y los consumos aplicados de <strong>Agriness</strong>. Faltan:{" "}
              <strong>
                {[
                  !loadedSystems.nuvix ? "Nuvix ERP (Compras)" : null,
                  !loadedSystems.agriness ? "Agriness (Sanidad Granja)" : null,
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

      {feedbackToast && (
        <div
          role="status"
          className="p-3.5 rounded-lg bg-[#2C365A] text-white text-xs font-semibold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#86EFAC]" />
            <span>{feedbackToast}</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setFeedbackToast(null)}
          >
            Cerrar aviso
          </Button>
        </div>
      )}

      {/* AUDITORÍA DE CRITERIO DE SIGNOS EN CONCILIACIÓN DE FARMACIA */}
      <Card className="border-l-4 border-l-[#2C365A] bg-[#E2E6F2]/50">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#2C365A] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-[#1E2642]">
              Auditoría de Signos y Criterios entre Sistemas (Agriness vs Nuvix ERP):
            </div>
            <p className="text-[var(--color-text-muted)]">
              En las conciliaciones de inventario sanitario, la planilla de consumo calcula la diferencia como{" "}
              <strong>Stock Nuvix - Stock Teórico (74 - 75 = -1)</strong>,
              mientras que la planilla de granja la calcula como{" "}
              <strong>Cantidad Agriness - Cantidad Nuvix (75 - 74 = +1)</strong>.
              SIPA unifica la clave relacional por{" "}
              <code>(Establecimiento + Código SKU)</code> y expone ambas
              fórmulas lado a lado para evitar ajustes contables con el signo invertido.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* TABLA DE CONCILIACIÓN Y VALORIZACIÓN DE FARMACIA */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              Matriz de Conciliación de Stock y Valorización de Consumos Sanitarios
            </CardTitle>
            <CardDescription>
              Fórmula: Stock Teórico = Stock Inicial + Compras (Nuvix) - Consumo
              Aplicado (Agriness) | Valor Total Consumido:{" "}
              <strong>{formatArs(totalConsumptionValue)}</strong>
            </CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)] text-xs uppercase font-bold text-[var(--color-text-muted)]">
              <tr>
                <th className="py-3 px-4">Establecimiento / SKU</th>
                <th className="py-3 px-3 text-right">Stk Inicial</th>
                <th className="py-3 px-3 text-right">+ Compras</th>
                <th className="py-3 px-3 text-right">- Consumo Agriness</th>
                <th className="py-3 px-3 text-right">= Stk Teórico</th>
                <th className="py-3 px-3 text-right">Stk Nuvix</th>
                <th className="py-3 px-3 text-center">
                  Dif. (Nuvix - Teórico) [04]
                </th>
                <th className="py-3 px-3 text-center">
                  Dif. (Agriness - Nuvix) [05]
                </th>
                <th className="py-3 px-3 text-right">Valor Consumo ($)</th>
                <th className="py-3 px-4 text-center">Acción Contable / Stock</th>
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
                        <span className="font-mono text-xs font-bold text-[#2C365A]">
                          [{item.productCode}]
                        </span>
                        <span className="font-bold text-[var(--color-text)]">
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
                    <td className="py-3 px-3 text-right tabular-nums text-[#1E4D3B] font-medium">
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
                      <div className="font-bold text-[#2C365A]">
                        {formatArs(rec.totalConsumptionValueArs)}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-subtle)]">
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
                            Generar Asiento
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
    </div>
  );
};
