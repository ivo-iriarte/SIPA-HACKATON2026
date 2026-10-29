/**
 * @file IngestionMapperView.tsx
 * @description Vista de Carga de Archivos (.xlsx) y Flujo de Ingesta Multi-Origen para Uniporc.
 * Flujo de empleado:
 * - Carga directa de las exportaciones de los 3 sistemas: SCADA, Nuvix ERP y Agriness.
 * - Los archivos de prueba o reales se procesan con el mismo flujo unificado mediante SheetJS.
 * - Acceso a registros históricos bajo demanda mediante modal "Ver registros históricos".
 */

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Factory,
  Briefcase,
  HeartPulse,
  LayoutDashboard,
  Pill,
  Clock,
  RotateCcw,
  Download,
  Eye,
  X,
  History,
  FileCheck2,
  RefreshCw,
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
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
} from "../ui/primitives";
import type { NavTabId, LoadedSystemsState } from "../../App";

interface IngestionMapperViewProps {
  logs: IngestionLogRecord[];
  activePeriod: PeriodId;
  onAddIngestionLog: (log: IngestionLogRecord) => void;
  loadedSystems: LoadedSystemsState;
  onLoadAllSystems: () => void;
  onLoadSystem: (system: "scada" | "nuvix" | "agriness") => void;
  onResetSystems: () => void;
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
  subtitle: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  expectedSheets: string[];
  feedsProcesses: { id: NavTabId; label: string }[];
  defaultExportFileName: string;
  defaultExportUrl: string;
}

const SYSTEM_SLOTS: SystemSlotDef[] = [
  {
    key: "scada",
    system: "SCADA",
    name: "SCADA Planta de Alimentos",
    subtitle: "Molienda, tolva y balanzas",
    description: "Pesaje en tolva con celda de carga y balance de materias primas en silos.",
    icon: Factory,
    expectedSheets: ["Pesadas_Tolva", "Movimientos_Silos"],
    feedsProcesses: [
      { id: "feedmill", label: "Proceso 4: Costo de alimento" },
      { id: "costs", label: "Proceso 1: Costos" },
    ],
    defaultExportFileName: "SCADA_Export_Planta_Septiembre2026.xlsx",
    defaultExportUrl: "/raw_exports/SCADA_Export_Planta_Septiembre2026.xlsx",
  },
  {
    key: "nuvix",
    system: "Nuvix",
    name: "Nuvix ERP Contabilidad",
    subtitle: "Facturación, fletes y centros",
    description: "Facturas de compras de insumos, fletes de cereal y liquidación por centro de costo.",
    icon: Briefcase,
    expectedSheets: ["Facturas_Compras", "Facturas_Fletes", "Gastos_Centro_Costo"],
    feedsProcesses: [
      { id: "costs", label: "Proceso 1: Costos" },
      { id: "pharmacy", label: "Proceso 3: Farmacia" },
    ],
    defaultExportFileName: "NUVIX_Export_Contable_Septiembre2026.xlsx",
    defaultExportUrl: "/raw_exports/NUVIX_Export_Contable_Septiembre2026.xlsx",
  },
  {
    key: "agriness",
    system: "Agriness",
    name: "Agriness / S4Farm",
    subtitle: "Producción y sanidad en granja",
    description: "Partes zootécnicos de hacienda, consumos sanitarios de farmacia y maternidad.",
    icon: HeartPulse,
    expectedSheets: ["Produccion_Hacienda", "Sanidad_Granja", "Maternidad_S4Farm"],
    feedsProcesses: [
      { id: "consumptions", label: "Proceso 2: Consumos productivos" },
      { id: "pharmacy", label: "Proceso 3: Farmacia" },
    ],
    defaultExportFileName: "AGRINESS_Export_Granjas_Septiembre2026.xlsx",
    defaultExportUrl: "/raw_exports/AGRINESS_Export_Granjas_Septiembre2026.xlsx",
  },
];

export const IngestionMapperView: React.FC<IngestionMapperViewProps> = ({
  logs,
  activePeriod,
  onAddIngestionLog,
  loadedSystems,
  onLoadAllSystems,
  onLoadSystem,
  onResetSystems,
  onNavigateToTab,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentSystemTarget, setCurrentSystemTarget] = useState<
    "scada" | "nuvix" | "agriness" | null
  >(null);
  const [dragOverSystem, setDragOverSystem] = useState<
    "scada" | "nuvix" | "agriness" | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedWorkbook, setParsedWorkbook] =
    useState<ParsedWorkbookState | null>(null);
  const [syncConfirmation, setSyncConfirmation] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Registro en memoria de archivos cargados por sistema
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

  // Procesa un ArrayBuffer con SheetJS (mismo motor para archivos subidos y de prueba)
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

      // Determinar qué sistema se actualiza
      const targetSystem =
        forcedSystem ||
        currentSystemTarget ||
        (autoMapped.detectedSystem === "SCADA"
          ? "scada"
          : autoMapped.detectedSystem === "Nuvix"
          ? "nuvix"
          : "agriness");

      onLoadSystem(targetSystem);

      // Guardar información del archivo cargado
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

      // Registrar automáticamente en los logs de ingesta
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
    } catch (err) {
      setErrorMsg(
        `No se pudo leer el archivo "${fileName}". Verificá que sea un archivo Excel (.xlsx) válido.`
      );
    } finally {
      setIsLoading(false);
      setCurrentSystemTarget(null);
    }
  };

  // Manejador de subida de archivo local por input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result instanceof ArrayBuffer) {
        processExcelBuffer(evt.target.result, file.name, currentSystemTarget || undefined);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // Disparador de selector de archivos para un sistema específico
  const triggerSystemUpload = (system: "scada" | "nuvix" | "agriness") => {
    setCurrentSystemTarget(system);
    fileInputRef.current?.click();
  };

  // Carga un archivo de prueba directo al mismo flujo del lector
  const handleLoadSampleForSystem = async (slot: SystemSlotDef) => {
    setIsLoading(true);
    setErrorMsg(null);
    setCurrentSystemTarget(slot.key);
    try {
      const response = await fetch(slot.defaultExportUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      processExcelBuffer(buffer, slot.defaultExportFileName, slot.key);
    } catch (err) {
      setErrorMsg(`No se pudo cargar el archivo de prueba para ${slot.name}.`);
      setIsLoading(false);
    }
  };

  // Drag & drop handlers
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
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result instanceof ArrayBuffer) {
        processExcelBuffer(evt.target.result, file.name, system);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Cambia la hoja activa en el previsualizador SheetJS
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

  // Cambio manual de mapeo de columna
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
      {/* Input de archivo invisible reutilizable */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* =====================================================================
          CABECERA PRINCIPAL DE LA VISTA: FLUJO LIMPIO DE EMPLEADO
         ===================================================================== */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#2C365A] text-[#EEE8DF] border border-[#182038] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-white/10 text-[#86EFAC] shrink-0 mt-0.5">
              <FileCheck2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Carga de Archivos de Sistemas (.xlsx)
                <Badge
                  variant="forest"
                  className="bg-[#1E4D3B] text-white border-none text-[11px]"
                >
                  Período {activePeriod}
                </Badge>
              </h2>
              <p className="text-xs text-[#C4BCB0] mt-1 max-w-2xl leading-relaxed">
                Carga los archivos <strong>.xlsx</strong> extraídos de cada software operativo
                (<strong>SCADA</strong>, <strong>Nuvix ERP</strong> y <strong>Agriness</strong>).
                Una vez cargados, podrás consultar los resultados consolidados según proceso.
              </p>
            </div>
          </div>

          {/* Acciones principales: Ver registros históricos y controles de prueba */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsHistoryModalOpen(true)}
              className="gap-2 text-xs font-semibold bg-white/10 text-white hover:bg-white/20 border-white/20"
              title="Abrir historial de archivos procesados y auditoría de ingesta"
            >
              <History className="w-4 h-4 text-[#86EFAC]" />
              Ver registros históricos ({logs.length})
            </Button>

            <Button
              variant="forest"
              size="md"
              onClick={onLoadAllSystems}
              className="gap-1.5 text-xs font-bold shadow-sm"
              title="Cargar las exportaciones de los 3 sistemas simultáneamente"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Cargar exportaciones del período
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onResetSystems();
                setParsedWorkbook(null);
                setSyncConfirmation(null);
                setSystemFiles({
                  scada: null,
                  nuvix: null,
                  agriness: null,
                });
              }}
              className="gap-1.5 text-xs text-[#C4BCB0] hover:text-white bg-transparent hover:bg-white/10 border-white/20"
              title="Limpiar estado para simular la experiencia desde cero"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reiniciar
            </Button>
          </div>
        </div>
      </div>

      {/* Alerta de confirmación o error de procesamiento */}
      {syncConfirmation && (
        <div className="p-3.5 rounded-lg bg-[#E4F0EB] border border-[#1E4D3B]/30 text-xs font-semibold text-[#14382A] flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#1E4D3B] shrink-0" />
            <span>{syncConfirmation}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncConfirmation(null)}
            className="text-[#14382A] hover:text-[#2C365A] p-1"
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
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          LAS 3 TARJETAS DE CARGA DE SISTEMAS (SCADA, NUVIX, AGRINESS)
         ===================================================================== */}
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
                  ? "border-[#1E4D3B] ring-2 ring-[#1E4D3B]/40 bg-[#E4F0EB]"
                  : isLoaded
                  ? "bg-white border-[#1E4D3B]/40 ring-1 ring-[#1E4D3B]/20"
                  : "bg-[#F7F4EF] border-[#C4BCB0]"
              }`}
            >
              <div>
                {/* Cabecera de la tarjeta */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-[#2C365A] text-white">
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-[#2C365A]">
                        {slot.name}
                      </h3>
                      <p className="text-[11px] text-[#5C6F73]">{slot.subtitle}</p>
                    </div>
                  </div>
                  {isLoaded ? (
                    <Badge variant="forest" className="gap-1 text-[11px] font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Cargado ✓
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="gap-1 text-[11px]">
                      <Clock className="w-3 h-3" /> Pendiente
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-[#5C6F73] mb-4 leading-relaxed">
                  {slot.description}
                </p>

                {/* Zona de estado / Dropzone de archivo */}
                {isLoaded && fileInfo ? (
                  <div className="bg-[#E4F0EB]/50 border border-[#1E4D3B]/30 rounded-lg p-3.5 mb-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-mono font-bold text-[#14382A] text-[11px] border-b border-[#1E4D3B]/20 pb-1.5">
                      <span className="truncate" title={fileInfo.fileName}>
                        📄 {fileInfo.fileName}
                      </span>
                      <span className="text-[10px] text-[#1E4D3B] font-semibold shrink-0 ml-2">
                        {fileInfo.totalRows} filas
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#5C6F73] block mb-1">
                        Hojas procesadas:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {fileInfo.sheetNames.map((sName) => (
                          <span
                            key={sName}
                            className="bg-white px-2 py-0.5 rounded text-[10px] font-semibold text-[#2C365A] border border-[#C4BCB0]"
                          >
                            {sName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-[#1E4D3B]/20 text-[10px] text-[#5C6F73] flex items-center justify-between">
                      <span>Cargado: {fileInfo.uploadedAt}</span>
                      <span className="font-semibold text-[#14382A]">
                        {slot.system} Engine OK
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
                    className="border-2 border-dashed border-[#2C365A]/30 hover:border-[#1E4D3B] bg-white rounded-lg p-5 text-center cursor-pointer transition-colors mb-4 group"
                  >
                    <div className="mx-auto w-9 h-9 rounded-full bg-[#2C365A]/10 text-[#2C365A] group-hover:bg-[#1E4D3B]/10 group-hover:text-[#1E4D3B] flex items-center justify-center mb-2 transition-colors">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-[#182038]">
                      Arrastrá el archivo .xlsx aquí
                    </p>
                    <p className="text-[11px] text-[#5C6F73] mt-0.5">
                      o hacé clic para explorar desde tu PC
                    </p>
                  </div>
                )}

                {/* Salidas que alimenta este sistema */}
                <div className="text-[11px] text-[#5C6F73] mb-4">
                  <span className="font-semibold text-[#2C365A]">Alimenta:</span>{" "}
                  {slot.feedsProcesses.map((p) => p.label).join(", ")}
                </div>
              </div>

              {/* Botones de acción inferiores */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#C4BCB0]/50 text-xs">
                {isLoaded ? (
                  <>
                    <button
                      type="button"
                      onClick={() => triggerSystemUpload(slot.key)}
                      className="text-[#2C365A] hover:underline font-semibold text-xs inline-flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" /> Reemplazar .xlsx
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadSampleForSystem(slot)}
                      className="text-[#5C6F73] hover:text-[#2C365A] text-xs font-medium"
                      title="Volver a sincronizar el archivo del período"
                    >
                      Recargar archivo
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => triggerSystemUpload(slot.key)}
                      className="text-[#2C365A] hover:underline font-bold text-xs"
                    >
                      Seleccionar archivo
                    </button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleLoadSampleForSystem(slot)}
                      className="text-[11px] font-semibold text-[#2C365A] bg-white hover:bg-[#EEE8DF]"
                    >
                      Cargar archivo del período
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          BANNER DE ACCESO RÁPIDO A LOS 4 PROCESOS CUANDO ESTÁN CARGADOS
         ===================================================================== */}
      {allLoaded && (
        <div className="p-4 rounded-xl bg-[#2C365A] text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-full bg-[#1E4D3B] text-white shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <div>
              <h4 className="text-sm font-bold">
                ¡Los 3 sistemas se encuentran cargados para el período!
              </h4>
              <p className="text-xs text-[#C4BCB0] mt-0.5">
                Datos sincronizados. Podés consultar directamente la información según proceso:
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => onNavigateToTab("costs")}
              className="px-3.5 py-1.5 text-xs font-bold rounded bg-white text-[#2C365A] hover:bg-[#EEE8DF] transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#1E4D3B]" />
              Proceso 1: Costos
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab("consumptions")}
              className="px-3.5 py-1.5 text-xs font-bold rounded bg-white text-[#2C365A] hover:bg-[#EEE8DF] transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              <HeartPulse className="w-3.5 h-3.5 text-[#1E4D3B]" />
              Proceso 2: Consumos
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab("pharmacy")}
              className="px-3.5 py-1.5 text-xs font-bold rounded bg-white text-[#2C365A] hover:bg-[#EEE8DF] transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              <Pill className="w-3.5 h-3.5 text-[#1E4D3B]" />
              Proceso 3: Farmacia
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab("feedmill")}
              className="px-3.5 py-1.5 text-xs font-bold rounded bg-white text-[#2C365A] hover:bg-[#EEE8DF] transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              <Factory className="w-3.5 h-3.5 text-[#1E4D3B]" />
              Proceso 4: Planta
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          PREVISUALIZADOR SHEETJS DE ARCHIVO INSPECCIONADO
         ===================================================================== */}
      {parsedWorkbook && (
        <Card className="border-[#2C365A]/40 shadow-md">
          <CardHeader className="bg-[#F7F4EF]">
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-md bg-[#2C365A] text-white">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-[#2C365A]">
                      {parsedWorkbook.fileName}
                    </h3>
                    <Badge variant="ocean">
                      Sistema: {parsedWorkbook.detectedSystem}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#5C6F73]">
                    Hojas leídas: <strong>{parsedWorkbook.sheetNames.join(", ")}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setParsedWorkbook(null)}
                  className="text-xs gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Cerrar vista
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-4">
            {/* Pestañas de Hojas del Excel */}
            <div>
              <label className="text-xs font-bold text-[#2C365A] uppercase tracking-wider block mb-2">
                Hojas del archivo:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {parsedWorkbook.sheetNames.map((sName) => (
                  <button
                    key={sName}
                    type="button"
                    onClick={() => handleSelectSheet(sName)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                      parsedWorkbook.activeSheet === sName
                        ? "bg-[#2C365A] text-white border-[#2C365A]"
                        : "bg-white text-[#182038] border-[#C4BCB0] hover:bg-[#F7F4EF]"
                    }`}
                  >
                    📄 {sName}
                  </button>
                ))}
              </div>
            </div>

            {/* Mapeo de Columnas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#2C365A] uppercase tracking-wider">
                  Mapeo de Columnas detectadas en "{parsedWorkbook.activeSheet}":
                </label>
                <span className="text-[11px] text-[#5C6F73]">
                  {parsedWorkbook.mappings.length} columnas analizadas
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {parsedWorkbook.mappings.map((m) => (
                  <div
                    key={m.sourceHeader}
                    className="p-2.5 rounded-md border border-[#C4BCB0] bg-[#F7F4EF] text-xs"
                  >
                    <div
                      className="font-semibold text-[#182038] truncate"
                      title={m.sourceHeader}
                    >
                      "{m.sourceHeader}"
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[#5C6F73] mt-1">
                      <ArrowRight className="w-3 h-3 text-[#1E4D3B] shrink-0" />
                      <select
                        value={m.canonicalField}
                        onChange={(e) =>
                          handleChangeColumnMapping(
                            m.sourceHeader,
                            e.target.value
                          )
                        }
                        className="w-full bg-white border border-[#C4BCB0] rounded px-1.5 py-0.5 text-[11px] text-[#182038] font-medium"
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

            {/* Muestra de Registros Tabulados */}
            <div>
              <label className="text-xs font-bold text-[#2C365A] uppercase tracking-wider block mb-2">
                Primeras filas leídas (
                {parsedWorkbook.sheetsData[parsedWorkbook.activeSheet]?.length || 0}{" "}
                filas totales):
              </label>
              <div className="border border-[#C4BCB0] rounded-lg overflow-x-auto max-h-[280px]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#2C365A] text-white sticky top-0">
                    <tr>
                      {parsedWorkbook.headers.map((h) => (
                        <th
                          key={h}
                          className="p-2.5 font-semibold border-b border-[#C4BCB0]/40 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C4BCB0]/40 bg-white">
                    {(
                      parsedWorkbook.sheetsData[parsedWorkbook.activeSheet] || []
                    )
                      .slice(0, 10)
                      .map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[#F7F4EF]">
                          {parsedWorkbook.headers.map((h) => (
                            <td
                              key={h}
                              className="p-2.5 whitespace-nowrap text-[#182038]"
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

      {/* =====================================================================
          MODAL DE DIÁLOGO: "VER REGISTROS HISTÓRICOS"
         ===================================================================== */}
      {isHistoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-dialog-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-[#C4BCB0] max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera del modal */}
            <div className="p-4 sm:p-5 bg-[#2C365A] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-white/10 text-[#86EFAC]">
                  <History className="w-5 h-5" />
                </span>
                <div>
                  <h3
                    id="history-dialog-title"
                    className="text-base sm:text-lg font-bold"
                  >
                    Registros Históricos de Ingesta
                  </h3>
                  <p className="text-xs text-[#C4BCB0]">
                    Auditoría de archivos .xlsx procesados e integrados por período.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Cerrar registros históricos"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del modal: Tabla de logs */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-[#5C6F73]">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-sm">
                    No hay registros históricos de ingesta aún.
                  </p>
                  <p className="text-xs text-[#5C6F73] mt-1">
                    Los archivos cargados se registrarán aquí con su detalle de validación.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#C4BCB0]/50">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[#F7F4EF]/60 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                            log.status === "SINCRONIZADO"
                              ? "bg-[#1E4D3B]"
                              : "bg-amber-500"
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-[#182038]">
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
                              className="text-[10px]"
                            >
                              {log.sourceSystem}
                            </Badge>
                            <span className="text-xs text-[#5C6F73] font-mono">
                              ({log.rowsProcessed} filas · Período {log.period})
                            </span>
                          </div>
                          <p className="text-xs text-[#5C6F73] mt-1 leading-relaxed">
                            {log.summaryMessage}
                          </p>
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0 pl-5 sm:pl-0">
                        <span className="text-[11px] text-[#5C6F73] block">
                          {log.uploadedAt}
                        </span>
                        <Badge
                          variant={
                            log.status === "SINCRONIZADO" ? "forest" : "warning"
                          }
                          className="text-[10px] mt-1"
                        >
                          {log.status === "SINCRONIZADO"
                            ? "Sincronizado"
                            : "Duplicado Prevenido"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pie del modal */}
            <div className="p-4 bg-[#F7F4EF] border-t border-[#C4BCB0] flex items-center justify-between">
              <span className="text-xs text-[#5C6F73] font-medium">
                Total: <strong>{logs.length}</strong> cargas registradas
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-xs font-semibold"
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
