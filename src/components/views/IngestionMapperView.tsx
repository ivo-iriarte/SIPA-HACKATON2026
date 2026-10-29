/**
 * @file IngestionMapperView.tsx
 * @description Vista de carga de archivos (.xlsx) para los 3 orígenes operativos de Uniporc:
 * SCADA, Nuvix ERP y Agriness.
 */

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Factory,
  Briefcase,
  HeartPulse,
  LayoutDashboard,
  Pill,
  Clock,
  X,
  History,
  Trash2,
} from "lucide-react";
import {
  IngestionLogRecord,
  SourceSystem,
  PeriodId,
} from "../../types/domain";
import {
  autoMapExcelHeaders,
  CANONICAL_COLUMN_DICTIONARY,
} from "../../services/sipaEngine";
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
} from "../ui/primitives";
import { ViewHeader } from "../ui/layout";
import type { NavTabId, LoadedSystemsState } from "../../App";

interface IngestionMapperViewProps {
  logs: IngestionLogRecord[];
  activePeriod: PeriodId;
  onAddIngestionLog: (log: IngestionLogRecord) => void;
  loadedSystems: LoadedSystemsState;
  onLoadSystem: (system: "scada" | "nuvix" | "agriness") => void;
  onClearSystem: (system: "scada" | "nuvix" | "agriness") => void;
  onNavigateToTab: (tabId: NavTabId) => void;
}

interface ParsedWorkbookState {
  fileName: string;
  sheetNames: string[];
  activeSheet: string;
  sheetsData: Record<string, Record<string, unknown>[]>;
  headers: string[];
  detectedSystem: SourceSystem;
  mappings: {
    sourceHeader: string;
    canonicalField: string;
    canonicalLabel: string;
    confidence: "ALTA" | "MEDIA" | "MANUAL";
  }[];
}

interface LoadedFileInfo {
  fileName: string;
  totalRows: number;
  sheetNames: string[];
  uploadedAt: string;
}

interface SystemSlotDef {
  key: "scada" | "nuvix" | "agriness";
  system: SourceSystem;
  name: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  feedsProcesses: { id: NavTabId; label: string }[];
}

const SYSTEM_SLOTS: SystemSlotDef[] = [
  {
    key: "scada",
    system: "SCADA",
    name: "SCADA Planta de Alimentos",
    description:
      "Pesaje en tolva con celda de carga y balance de materias primas en silos.",
    icon: Factory,
    feedsProcesses: [
      { id: "feedmill", label: "Planta alimentos" },
      { id: "costs", label: "Costos" },
    ],
  },
  {
    key: "nuvix",
    system: "Nuvix",
    name: "Nuvix ERP Contabilidad",
    description:
      "Facturas de compras de insumos, fletes de cereal y liquidación por centro de costo.",
    icon: Briefcase,
    feedsProcesses: [
      { id: "costs", label: "Costos" },
      { id: "pharmacy", label: "Farmacia" },
    ],
  },
  {
    key: "agriness",
    system: "Agriness",
    name: "Agriness / S4Farm",
    description:
      "Partes zootécnicos de hacienda, consumos sanitarios de farmacia y maternidad.",
    icon: HeartPulse,
    feedsProcesses: [
      { id: "consumptions", label: "Consumos productivos" },
      { id: "pharmacy", label: "Farmacia" },
    ],
  },
];

export const IngestionMapperView: React.FC<IngestionMapperViewProps> = ({
  logs,
  activePeriod,
  onAddIngestionLog,
  loadedSystems,
  onLoadSystem,
  onClearSystem,
  onNavigateToTab,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentSystemTarget, setCurrentSystemTarget] = useState<
    "scada" | "nuvix" | "agriness" | null
  >(null);
  const [dragOverSystem, setDragOverSystem] = useState<
    "scada" | "nuvix" | "agriness" | null
  >(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedWorkbook, setParsedWorkbook] =
    useState<ParsedWorkbookState | null>(null);
  const [syncConfirmation, setSyncConfirmation] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [systemFiles, setSystemFiles] = useState<
    Record<"scada" | "nuvix" | "agriness", LoadedFileInfo | null>
  >({
    scada: {
      fileName: "SCADA_Export_Planta_Septiembre2026.xlsx",
      totalRows: 24,
      sheetNames: ["Pesadas_Tolva", "Movimientos_Silos"],
      uploadedAt: "28/10/2026 10:35",
    },
    nuvix: {
      fileName: "NUVIX_Export_Contable_Septiembre2026.xlsx",
      totalRows: 38,
      sheetNames: [
        "Facturas_Compras",
        "Facturas_Fletes",
        "Gastos_Centro_Costo",
        "Stock_Contable_Farmacia",
      ],
      uploadedAt: "28/10/2026 09:15",
    },
    agriness: {
      fileName: "AGRINESS_Export_Granjas_Septiembre2026.xlsx",
      totalRows: 30,
      sheetNames: ["Produccion_Hacienda", "Sanidad_Granja", "Maternidad_S4Farm"],
      uploadedAt: "28/10/2026 09:42",
    },
  });

  const processExcelBuffer = (
    buffer: ArrayBuffer,
    fileName: string,
    forcedSystem?: "scada" | "nuvix" | "agriness"
  ) => {
    try {
      const wb = XLSX.read(buffer, { type: "array" });
      const sheetNames = wb.SheetNames;
      const sheetsData: Record<string, Record<string, unknown>[]> = {};
      let totalRowCount = 0;

      for (const sName of sheetNames) {
        const ws = wb.Sheets[sName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
        });
        sheetsData[sName] = jsonRows;
        totalRowCount += jsonRows.length;
      }

      const preferredSheet =
        sheetNames.find((s) => s.toUpperCase() !== "LEER PRIMERO") ||
        sheetNames[0];
      const rows = sheetsData[preferredSheet] || [];
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      const autoMapped = autoMapExcelHeaders(headers);

      setParsedWorkbook({
        fileName,
        sheetNames,
        activeSheet: preferredSheet,
        sheetsData,
        headers,
        detectedSystem: autoMapped.detectedSystem,
        mappings: autoMapped.mappings,
      });

      const targetSystem =
        forcedSystem ||
        currentSystemTarget ||
        (autoMapped.detectedSystem === "SCADA"
          ? "scada"
          : autoMapped.detectedSystem === "Nuvix"
          ? "nuvix"
          : "agriness");

      onLoadSystem(targetSystem);

      setSystemFiles((prev) => ({
        ...prev,
        [targetSystem]: {
          fileName,
          totalRows: totalRowCount,
          sheetNames,
          uploadedAt: new Date().toLocaleString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      }));

      const newLog: IngestionLogRecord = {
        id: `ing-${Date.now()}`,
        fileName,
        uploadedAt: new Date().toLocaleString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        sourceSystem: autoMapped.detectedSystem,
        period: activePeriod,
        rowsProcessed: totalRowCount,
        mappedColumns: autoMapped.mappings.map((m) => ({
          sourceHeader: m.sourceHeader,
          canonicalField: m.canonicalField,
        })),
        status: "SINCRONIZADO",
        summaryMessage: `Archivo "${fileName}" cargado correctamente para ${targetSystem.toUpperCase()} (${totalRowCount} registros en ${sheetNames.length} hojas).`,
      };
      onAddIngestionLog(newLog);

      setErrorMsg(null);
      setSyncConfirmation(
        `✓ Archivo "${fileName}" procesado e integrado para ${targetSystem.toUpperCase()} (${totalRowCount} registros en ${sheetNames.length} hojas).`
      );
    } catch {
      setErrorMsg(
        `No se pudo leer el archivo "${fileName}". Verificá que sea un archivo Excel (.xlsx) válido.`
      );
    } finally {
      setCurrentSystemTarget(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result instanceof ArrayBuffer) {
        processExcelBuffer(
          evt.target.result,
          file.name,
          currentSystemTarget || undefined
        );
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const triggerSystemUpload = (system: "scada" | "nuvix" | "agriness") => {
    setCurrentSystemTarget(system);
    fileInputRef.current?.click();
  };

  const handleClearSystemSlot = (system: "scada" | "nuvix" | "agriness") => {
    const currentFile = systemFiles[system];
    if (parsedWorkbook && currentFile && parsedWorkbook.fileName === currentFile.fileName) {
      setParsedWorkbook(null);
    }
    setSystemFiles((prev) => ({ ...prev, [system]: null }));
    onClearSystem(system);
    setSyncConfirmation(null);
    setErrorMsg(null);
  };

  const handleDragOver = (
    e: React.DragEvent,
    system: "scada" | "nuvix" | "agriness"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSystem(system);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSystem(null);
  };

  const handleDrop = (
    e: React.DragEvent,
    system: "scada" | "nuvix" | "agriness"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSystem(null);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result instanceof ArrayBuffer) {
        processExcelBuffer(evt.target.result, file.name, system);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSelectSheet = (sheetName: string) => {
    if (!parsedWorkbook) return;
    const rows = parsedWorkbook.sheetsData[sheetName] || [];
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const autoMapped = autoMapExcelHeaders(headers);
    setParsedWorkbook({
      ...parsedWorkbook,
      activeSheet: sheetName,
      headers,
      detectedSystem: autoMapped.detectedSystem,
      mappings: autoMapped.mappings,
    });
  };

  const handleChangeColumnMapping = (
    sourceHeader: string,
    newCanonicalField: string
  ) => {
    if (!parsedWorkbook) return;
    const rule = CANONICAL_COLUMN_DICTIONARY.find(
      (r) => r.canonicalField === newCanonicalField
    );
    const updated = parsedWorkbook.mappings.map((m) =>
      m.sourceHeader === sourceHeader
        ? {
            ...m,
            canonicalField: newCanonicalField,
            canonicalLabel: rule ? rule.label : "Atributo auxiliar / Ignorar",
            confidence: "ALTA" as const,
          }
        : m
    );
    setParsedWorkbook({ ...parsedWorkbook, mappings: updated });
  };

  const allLoaded =
    loadedSystems.scada && loadedSystems.nuvix && loadedSystems.agriness;

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        className="hidden"
      />

      <ViewHeader
        title="Carga de archivos (.xlsx)"
        actions={
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsHistoryModalOpen(true)}
          >
            <History className="w-4 h-4 text-[#43533D]" />
            Ver registros históricos ({logs.length})
          </Button>
        }
      />

      {syncConfirmation && (
        <div className="p-3.5 rounded-lg bg-[#EAEEE6] border border-[#566647]/40 text-xs font-semibold text-[#30291F] flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#566647] shrink-0" />
            <span>{syncConfirmation}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncConfirmation(null)}
            className="text-[#30291F] hover:text-[#43533D] p-1"
            aria-label="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-[#FEE2E2] border border-[#DC2626]/30 text-[#7F1D1D] text-xs font-semibold flex items-center justify-between gap-2 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#DC2626]" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-[#7F1D1D] hover:text-[#991B1B] p-1"
            aria-label="Cerrar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* LAS 3 TARJETAS DE CARGA DE SISTEMAS (SCADA, NUVIX, AGRINESS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {SYSTEM_SLOTS.map((slot) => {
          const isLoaded = loadedSystems[slot.key];
          const fileInfo = systemFiles[slot.key];
          const Icon = slot.icon;
          const isDragOver = dragOverSystem === slot.key;

          return (
            <div
              key={slot.key}
              onDragOver={(e) => handleDragOver(e, slot.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, slot.key)}
              className={`p-5 rounded-xl border flex flex-col justify-between transition-all shadow-sm ${
                isDragOver
                  ? "border-[#566647] ring-2 ring-[#566647]/40 bg-[#EAEEE6]"
                  : isLoaded
                  ? "bg-[#FBF8F0] border-[#566647]/50 ring-1 ring-[#566647]/20"
                  : "bg-[#FBF8F0] border-[#D6C8AE]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-[#43533D] text-[#FBF8F0]">
                      <Icon className="w-4 h-4" />
                    </span>
                    <h3 className="type-card-title">{slot.name}</h3>
                  </div>
                  {isLoaded ? (
                    <Badge variant="forest">
                      <CheckCircle2 className="w-3 h-3" /> Cargado
                    </Badge>
                  ) : (
                    <Badge variant="warning">
                      <Clock className="w-3 h-3" /> Pendiente
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-[#6B543B] mb-4 leading-relaxed">
                  {slot.description}
                </p>

                {isLoaded && fileInfo ? (
                  <div className="bg-[#EAEEE6]/60 border border-[#566647]/35 rounded-lg p-3.5 mb-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-mono font-semibold text-[#30291F] border-b border-[#566647]/25 pb-1.5">
                      <span className="truncate" title={fileInfo.fileName}>
                        {fileInfo.fileName}
                      </span>
                      <span className="text-[#566647] shrink-0 ml-2 tabular-nums">
                        {fileInfo.totalRows} filas
                      </span>
                    </div>

                    <div>
                      <span className="type-label block mb-1">
                        Hojas procesadas
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {fileInfo.sheetNames.map((sName) => (
                          <span
                            key={sName}
                            className="bg-[#FBF8F0] px-2 py-0.5 rounded font-mono text-xs text-[#43533D] border border-[#D6C8AE]"
                          >
                            {sName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-[#566647]/25 text-xs text-[#6B543B] flex items-center justify-between">
                      <span>Cargado: {fileInfo.uploadedAt}</span>
                      <span className="font-semibold text-[#43533D]">
                        {slot.system}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => triggerSystemUpload(slot.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        triggerSystemUpload(slot.key);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Subir archivo .xlsx para ${slot.name}`}
                    className="border-2 border-dashed border-[#6B543B]/45 hover:border-[#43533D] bg-[#F4EFE3]/60 rounded-lg p-5 text-center cursor-pointer transition-colors mb-4 group"
                  >
                    <div className="mx-auto w-9 h-9 rounded-full bg-[#43533D]/10 text-[#43533D] group-hover:bg-[#566647]/15 group-hover:text-[#566647] flex items-center justify-center mb-2 transition-colors">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-semibold text-[#30291F]">
                      Arrastrá el archivo .xlsx aquí
                    </p>
                    <p className="text-xs text-[#6B543B] mt-0.5">
                      o hacé clic para explorar desde tu equipo
                    </p>
                  </div>
                )}

                <div className="text-xs text-[#6B543B] mb-4">
                  <span className="font-semibold text-[#43533D]">
                    Alimenta:
                  </span>{" "}
                  {slot.feedsProcesses.map((p) => p.label).join(", ")}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#D6C8AE]/70">
                {isLoaded ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleClearSystemSlot(slot.key)}
                    title={`Quitar archivo cargado de ${slot.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#6B543B]" />
                    Limpiar
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  variant={isLoaded ? "outline" : "primary"}
                  size="sm"
                  onClick={() => triggerSystemUpload(slot.key)}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isLoaded ? "Reemplazar .xlsx" : "Seleccionar archivo .xlsx"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ACCESO RÁPIDO A LOS 4 PROCESOS */}
      {allLoaded && (
        <div className="p-4 rounded-xl bg-[#43533D] text-[#FBF8F0] flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-full bg-[#566647] text-[#FBF8F0] shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <span className="text-sm font-semibold">
              Sistemas cargados para el período. Consultar por proceso:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => onNavigateToTab("costs")}
              className="px-3.5 py-1.5 text-xs font-semibold rounded bg-[#FBF8F0] text-[#30291F] hover:bg-[#F4EFE3] transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#566647]" />
              Costos
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab("consumptions")}
              className="px-3.5 py-1.5 text-xs font-semibold rounded bg-[#FBF8F0] text-[#30291F] hover:bg-[#F4EFE3] transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              <HeartPulse className="w-3.5 h-3.5 text-[#566647]" />
              Consumos productivos
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab("feedmill")}
              className="px-3.5 py-1.5 text-xs font-semibold rounded bg-[#FBF8F0] text-[#30291F] hover:bg-[#F4EFE3] transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              <Factory className="w-3.5 h-3.5 text-[#566647]" />
              Planta alimentos
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab("pharmacy")}
              className="px-3.5 py-1.5 text-xs font-semibold rounded bg-[#FBF8F0] text-[#30291F] hover:bg-[#F4EFE3] transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              <Pill className="w-3.5 h-3.5 text-[#566647]" />
              Farmacia
            </button>
          </div>
        </div>
      )}

      {/* PREVISUALIZADOR SHEETJS DE ARCHIVO INSPECCIONADO */}
      {parsedWorkbook && (
        <Card className="border-[#43533D]/40 shadow-md">
          <CardHeader className="bg-[#F4EFE3]">
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-md bg-[#43533D] text-[#FBF8F0]">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="type-card-title font-mono">
                      {parsedWorkbook.fileName}
                    </h3>
                    <Badge variant="ocean">
                      Sistema: {parsedWorkbook.detectedSystem}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#6B543B]">
                    Hojas leídas:{" "}
                    <strong>{parsedWorkbook.sheetNames.join(", ")}</strong>
                  </p>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setParsedWorkbook(null)}
              >
                <X className="w-3.5 h-3.5" /> Cerrar vista
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-4">
            <div>
              <label className="type-label block mb-2">Hojas del archivo</label>
              <div className="flex flex-wrap gap-1.5">
                {parsedWorkbook.sheetNames.map((sName) => (
                  <button
                    key={sName}
                    type="button"
                    onClick={() => handleSelectSheet(sName)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                      parsedWorkbook.activeSheet === sName
                        ? "bg-[#43533D] text-[#FBF8F0] border-[#43533D]"
                        : "bg-[#FBF8F0] text-[#30291F] border-[#D6C8AE] hover:bg-[#F4EFE3]"
                    }`}
                  >
                    {sName}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="type-label">
                  Mapeo de columnas en "{parsedWorkbook.activeSheet}"
                </label>
                <span className="text-xs text-[#6B543B]">
                  {parsedWorkbook.mappings.length} columnas
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {parsedWorkbook.mappings.map((m) => (
                  <div
                    key={m.sourceHeader}
                    className="p-2.5 rounded-md border border-[#D6C8AE] bg-[#F4EFE3]/70 text-xs"
                  >
                    <div
                      className="font-mono font-semibold text-[#30291F] truncate"
                      title={m.sourceHeader}
                    >
                      {m.sourceHeader}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#6B543B] mt-1">
                      <ArrowRight className="w-3 h-3 text-[#566647] shrink-0" />
                      <select
                        value={m.canonicalField}
                        onChange={(e) =>
                          handleChangeColumnMapping(
                            m.sourceHeader,
                            e.target.value
                          )
                        }
                        className="w-full bg-[#FBF8F0] border border-[#D6C8AE] rounded px-1.5 py-0.5 text-xs text-[#30291F] font-medium"
                      >
                        {CANONICAL_COLUMN_DICTIONARY.map((dict) => (
                          <option
                            key={dict.canonicalField}
                            value={dict.canonicalField}
                          >
                            {dict.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="type-label block mb-2">
                Primeras filas leídas (
                {parsedWorkbook.sheetsData[parsedWorkbook.activeSheet]?.length ||
                  0}{" "}
                filas totales)
              </label>
              <div className="border border-[#D6C8AE] rounded-lg overflow-x-auto max-h-[280px]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#43533D] text-[#FBF8F0] sticky top-0">
                    <tr>
                      {parsedWorkbook.headers.map((h) => (
                        <th
                          key={h}
                          className="p-2.5 font-semibold border-b border-[#D6C8AE]/40 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D6C8AE]/50 bg-[#FBF8F0]">
                    {(
                      parsedWorkbook.sheetsData[parsedWorkbook.activeSheet] ||
                      []
                    )
                      .slice(0, 10)
                      .map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[#F4EFE3]">
                          {parsedWorkbook.headers.map((h) => (
                            <td
                              key={h}
                              className="p-2.5 whitespace-nowrap text-[#30291F]"
                            >
                              {String(row[h] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL: "VER REGISTROS HISTÓRICOS" */}
      {isHistoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-dialog-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FBF8F0] rounded-xl shadow-2xl border border-[#D6C8AE] max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 bg-[#43533D] text-[#FBF8F0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-[#566647] text-[#FBF8F0]">
                  <History className="w-5 h-5" />
                </span>
                <h3
                  id="history-dialog-title"
                  className="text-base sm:text-lg font-bold"
                >
                  Registros históricos de ingesta
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 rounded-lg text-[#FBF8F0]/80 hover:text-[#FBF8F0] hover:bg-white/10 transition-colors"
                aria-label="Cerrar registros históricos"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-[#6B543B]">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-sm">
                    No hay registros históricos de ingesta aún.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#D6C8AE]/60">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[#F4EFE3] px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                            log.status === "SINCRONIZADO"
                              ? "bg-[#566647]"
                              : "bg-amber-500"
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-semibold text-sm text-[#30291F]">
                              {log.fileName}
                            </span>
                            <Badge
                              variant={
                                log.sourceSystem === "SCADA"
                                  ? "forest"
                                  : log.sourceSystem === "Nuvix"
                                  ? "ocean"
                                  : "neutral"
                              }
                            >
                              {log.sourceSystem}
                            </Badge>
                            <span className="text-xs text-[#6B543B] font-mono">
                              ({log.rowsProcessed} filas · Período {log.period})
                            </span>
                          </div>
                          <p className="text-xs text-[#6B543B] mt-1 leading-relaxed">
                            {log.summaryMessage}
                          </p>
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0 pl-5 sm:pl-0">
                        <span className="text-xs text-[#6B543B] block tabular-nums">
                          {log.uploadedAt}
                        </span>
                        <Badge
                          variant={
                            log.status === "SINCRONIZADO" ? "forest" : "warning"
                          }
                          className="mt-1"
                        >
                          {log.status === "SINCRONIZADO"
                            ? "Sincronizado"
                            : "Duplicado prevenido"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-[#F4EFE3] border-t border-[#D6C8AE] flex items-center justify-between">
              <span className="text-xs text-[#6B543B] font-medium">
                Total: <strong>{logs.length}</strong> cargas registradas
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsHistoryModalOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
