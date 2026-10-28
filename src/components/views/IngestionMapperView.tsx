/**
 * @file IngestionMapperView.tsx
 * @description Vista 2 — Motor de Ingesta Multi-Origen (.xlsx) y Wizard de Mapeo de Columnas.
 * Utiliza SheetJS (`xlsx`) para parsear archivos Excel reales tanto desde el disco del usuario
 * como desde el paquete oficial del Hackaton Agro 2026 (`/data/01...08.xlsx`).
 */

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Download,
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

interface IngestionMapperViewProps {
  logs: IngestionLogRecord[];
  activePeriod: PeriodId;
  onAddIngestionLog: (log: IngestionLogRecord) => void;
}

const HACKATHON_SAMPLE_FILES = [
  {
    name: "00 - Guía y mapa de procesos.xlsx",
    system: "Nuvix" as SourceSystem,
    desc: "Mapa general de procesos, orígenes y tareas manuales",
  },
  {
    name: "01 - Informe de costos mensual ficticio.xlsx",
    system: "Nuvix" as SourceSystem,
    desc: "Costos por centro (Granja A y B), rubros y $/kg",
  },
  {
    name: "02 - Informe de costos anual ficticio.xlsx",
    system: "Nuvix" as SourceSystem,
    desc: "Evolución mensual Julio, Agosto y Septiembre",
  },
  {
    name: "03 - Producción y consumos ficticios.xlsx",
    system: "Agriness" as SourceSystem,
    desc: "Producción por Sitio 2 y Sitio 3 y conversión aparente",
  },
  {
    name: "04 - Consumo de farmacia ficticio.xlsx",
    system: "Agriness" as SourceSystem,
    desc: "Inventario, valorización y asiento modelo contable",
  },
  {
    name: "05 - Stock Agriness ficticio.xlsx",
    system: "Agriness" as SourceSystem,
    desc: "Conciliación de stock sanitario Agriness vs Nuvix",
  },
  {
    name: "06 - Balance de stock SCADA ficticio.xlsx",
    system: "SCADA" as SourceSystem,
    desc: "Balance de silos de Maíz y Harina de Soja + ajustes",
  },
  {
    name: "07 - Resumen de consumo PAB ficticio.xlsx",
    system: "SCADA" as SourceSystem,
    desc: "Consolidado mensual de kilos elaborados por planta",
  },
  {
    name: "08 - Consumo de planta ficticio.xlsx",
    system: "SCADA" as SourceSystem,
    desc: "Fórmulas, control de pesaje, valorización USD y fletes",
  },
];

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

export const IngestionMapperView: React.FC<IngestionMapperViewProps> = ({
  logs,
  activePeriod,
  onAddIngestionLog,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedWorkbook, setParsedWorkbook] =
    useState<ParsedWorkbookState | null>(null);
  const [syncConfirmation, setSyncConfirmation] = useState<string | null>(null);

  // Procesa un ArrayBuffer con SheetJS
  const processExcelBuffer = (buffer: ArrayBuffer, fileName: string) => {
    try {
      const wb = XLSX.read(buffer, { type: "array" });
      const sheetNames = wb.SheetNames;
      const sheetsData: Record<string, Record<string, unknown>[]> = {};

      for (const sName of sheetNames) {
        const ws = wb.Sheets[sName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
        });
        sheetsData[sName] = jsonRows;
      }

      // Seleccionar la primera hoja de datos (saltando "LEER PRIMERO" si hay otra disponible)
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
      setErrorMsg(null);
      setSyncConfirmation(null);
    } catch (err) {
      setErrorMsg(
        `No se pudo leer el archivo "${fileName}". Verificá que sea un archivo Excel (.xlsx) válido.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Carga un archivo subido desde el input file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result instanceof ArrayBuffer) {
        processExcelBuffer(evt.target.result, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Carga con 1 clic cualquiera de los 9 archivos reales del Hackathon desde /data/
  const handleLoadSampleFile = async (sampleName: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`/data/${encodeURIComponent(sampleName)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      processExcelBuffer(buffer, sampleName);
    } catch (err) {
      setErrorMsg(
        `Error al cargar el archivo de ejemplo ${sampleName}.`
      );
      setIsLoading(false);
    }
  };

  // Cambia la hoja activa dentro del libro Excel inspeccionado
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

  // Permite cambiar manualmente a qué campo canónico apunta una columna
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

  // Confirma e impacta la ingesta en el registro de SIPA
  const handleConfirmIngestion = () => {
    if (!parsedWorkbook) return;
    const alreadyExists = logs.some(
      (l) =>
        l.fileName === parsedWorkbook.fileName && l.period === activePeriod
    );
    const activeRows =
      parsedWorkbook.sheetsData[parsedWorkbook.activeSheet] || [];

    const newLog: IngestionLogRecord = {
      id: `ing-${Date.now()}`,
      fileName: parsedWorkbook.fileName,
      uploadedAt: new Date().toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      sourceSystem: parsedWorkbook.detectedSystem,
      period: activePeriod,
      rowsProcessed: activeRows.length,
      mappedColumns: parsedWorkbook.mappings.map((m) => ({
        sourceHeader: m.sourceHeader,
        canonicalField: m.canonicalField,
      })),
      status: alreadyExists ? "DUPLICADO_PREVENIDO" : "SINCRONIZADO",
      summaryMessage: alreadyExists
        ? `Re-sincronización controlada de hoja "${parsedWorkbook.activeSheet}" (${activeRows.length} filas). Se previno duplicación contable.`
        : `Hoja "${parsedWorkbook.activeSheet}" normalizada e integrada al período ${activePeriod} (${activeRows.length} registros).`,
    };

    onAddIngestionLog(newLog);
    setSyncConfirmation(
      alreadyExists
        ? `Archivo "${parsedWorkbook.fileName}" verificado: SIPA detectó que este lote ya había sido cargado en ${activePeriod} y actualizó las referencias sin duplicar saldos.`
        : `¡Archivo "${parsedWorkbook.fileName}" (${parsedWorkbook.detectedSystem}) mapeado e integrado con éxito!`
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. ZONA SUPERIOR: SUBIDA DE ARCHIVO + EXPLORADOR DIRECTO DE LOS 9 EXCELS DEL DESAFÍO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dropzone de Carga */}
        <Card className="lg:col-span-5 flex flex-col justify-between">
          <CardHeader>
            <div>
              <CardTitle>1. Subir Exportación (.xlsx / .csv)</CardTitle>
              <CardDescription>
                Arrastrá o seleccioná el reporte exportado desde Agriness, SCADA
                o Nuvix ERP.
              </CardDescription>
            </div>
            <Badge variant="ocean">SheetJS Engine</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  fileInputRef.current?.click();
                }
              }}
              tabIndex={0}
              role="button"
              aria-label="Seleccionar archivo Excel o CSV desde tu dispositivo"
              className="border-2 border-dashed border-[#2C365A]/50 hover:border-[#1E4D3B] bg-[var(--color-surface)] rounded-lg p-6 text-center cursor-pointer transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="mx-auto w-12 h-12 rounded-full bg-[#2C365A]/10 text-[#2C365A] flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[var(--color-text)]">
                Hacé clic para subir una planilla .xlsx
              </p>
              <p className="text-xs text-[var(--color-text-subtle)] mt-1">
                Reconocimiento automático de encabezados, equivalencias de granjas
                (Granja A → Tandil, Granja B → San Lorenzo) y prevención de doble
                carga.
              </p>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3 rounded-md bg-[var(--color-danger-bg)] text-[var(--color-on-danger-bg)] text-xs font-medium flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="p-3.5 rounded-lg bg-[#E4F0EB]/60 border border-[#1E4D3B]/30 text-xs space-y-1">
              <div className="font-bold text-[#14382A] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Reglas de Equivalencia Activas en Catálogo:
              </div>
              <p className="text-[var(--color-text-muted)]">
                • <code>"Granja A" / "Planta A"</code> →{" "}
                <strong>Tandil (CC-TAN-01)</strong>
              </p>
              <p className="text-[var(--color-text-muted)]">
                • <code>"Granja B" / "Planta B"</code> →{" "}
                <strong>San Lorenzo (CC-SLO-02)</strong>
              </p>
              <p className="text-[var(--color-text-muted)]">
                • <code>"Sitio 1 / Sitio 2 / Sitio 3"</code> →{" "}
                <strong>Maternidad / Recría / Engorde</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Probador Instantáneo de los 9 Archivos Oficiales del Hackathon */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <div>
              <CardTitle>
                2. Inspeccionar en Vivo el Paquete Oficial de Uniporc (00 al 08)
              </CardTitle>
              <CardDescription>
                Hacé clic en cualquiera de los 9 archivos reales del desafío para
                abrir sus hojas, ver sus fórmulas y ejecutar el mapeador en vivo.
              </CardDescription>
            </div>
            <Badge variant="forest">9 Archivos Precargados</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {HACKATHON_SAMPLE_FILES.map((f) => {
                const isSelected = parsedWorkbook?.fileName === f.name;
                return (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => handleLoadSampleFile(f.name)}
                    className={`text-left p-3 rounded-lg border transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-[#2C365A] text-white border-[#2C365A] shadow-sm"
                        : "bg-[var(--color-surface)] hover:bg-[#E2DACD]/60 border-[var(--color-border)] text-[var(--color-text)]"
                    }`}
                  >
                    <FileSpreadsheet
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        isSelected ? "text-[#86EFAC]" : "text-[#1E4D3B]"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{f.name}</div>
                      <div
                        className={`text-[11px] line-clamp-1 mt-0.5 ${
                          isSelected
                            ? "text-white/80"
                            : "text-[var(--color-text-subtle)]"
                        }`}
                      >
                        {f.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. WIZARD VISUAL DE MAPEO DE COLUMNAS E INSPECCIÓN DE HOJAS EXCEL */}
      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center text-sm font-medium text-[var(--color-text-muted)] flex items-center justify-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-[#2C365A]" />
            Leyendo libro Excel y ejecutando motor de mapeo de alias...
          </CardContent>
        </Card>
      )}

      {parsedWorkbook && !isLoading && (
        <Card className="border-2 border-[#2C365A]">
          <CardHeader className="bg-[#2C365A] text-white rounded-t-md">
            <div className="flex flex-wrap items-center justify-between gap-4 w-full">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#86EFAC]" />
                  <span className="text-xs uppercase tracking-wider font-bold text-[#86EFAC]">
                    Wizard de Mapeo Inteligente SIPA
                  </span>
                </div>
                <h3 className="text-lg font-bold mt-0.5">
                  {parsedWorkbook.fileName}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs bg-white/15 px-3 py-1.5 rounded-md font-semibold">
                  Sistema Detectado:{" "}
                  <strong className="text-[#86EFAC]">
                    {parsedWorkbook.detectedSystem}
                  </strong>
                </span>
                <a
                  href={`/data/${encodeURIComponent(parsedWorkbook.fileName)}`}
                  download={parsedWorkbook.fileName}
                  className="inline-flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-md font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar .xlsx original
                </a>
                <Button
                  size="sm"
                  variant="forest"
                  onClick={handleConfirmIngestion}
                >
                  <Database className="w-4 h-4" />
                  Confirmar e Integrar al Data Warehouse
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {syncConfirmation && (
              <div
                role="status"
                className="p-3.5 rounded-lg bg-[#E4F0EB] border border-[#1E4D3B] text-[#14382A] text-xs font-semibold flex items-center gap-2.5"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0 text-[#1E4D3B]" />
                <span>{syncConfirmation}</span>
              </div>
            )}

            {/* Selector de Hojas del Archivo Excel */}
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-[var(--color-border)]">
              <span className="text-xs font-bold uppercase text-[var(--color-text-muted)] mr-2">
                Hojas en el libro Excel:
              </span>
              {parsedWorkbook.sheetNames.map((sName) => (
                <Button
                  key={sName}
                  size="sm"
                  variant={
                    parsedWorkbook.activeSheet === sName ? "primary" : "secondary"
                  }
                  onClick={() => handleSelectSheet(sName)}
                >
                  {sName} (
                  {(parsedWorkbook.sheetsData[sName] || []).length} filas)
                </Button>
              ))}
            </div>

            {/* Mapeador de Columnas */}
            <div>
              <h4 className="text-sm font-bold text-[var(--color-text)] mb-2">
                Correspondencia de Columnas (Hoja "{parsedWorkbook.activeSheet}")
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {parsedWorkbook.mappings.map((m) => (
                  <div
                    key={m.sourceHeader}
                    className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-[#2C365A] truncate">
                        [{m.sourceHeader}]
                      </span>
                      <Badge
                        variant={
                          m.confidence === "ALTA"
                            ? "forest"
                            : m.confidence === "MEDIA"
                            ? "ocean"
                            : "neutral"
                        }
                      >
                        {m.confidence === "ALTA"
                          ? "✓ Auto-Mapeado"
                          : m.confidence === "MEDIA"
                          ? "Sugerido"
                          : "Auxiliar"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-[var(--color-text-subtle)] shrink-0" />
                      <select
                        aria-label={`Mapear columna ${m.sourceHeader}`}
                        value={m.canonicalField}
                        onChange={(e) =>
                          handleChangeColumnMapping(
                            m.sourceHeader,
                            e.target.value
                          )
                        }
                        className="w-full text-xs rounded-md border border-[var(--color-border-input)] bg-white px-2.5 py-1.5 font-medium text-[var(--color-text)]"
                      >
                        {CANONICAL_COLUMN_DICTIONARY.map((rule) => (
                          <option
                            key={rule.canonicalField}
                            value={rule.canonicalField}
                          >
                            {rule.label} ({rule.canonicalField})
                          </option>
                        ))}
                        <option value="custom_attribute">
                          Atributo Auxiliar / Fórmula Calculada
                        </option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vista Previa de los Datos Crudos del Excel */}
            <div>
              <h4 className="text-sm font-bold text-[var(--color-text)] mb-2">
                Vista Previa de Filas Leídas desde "{parsedWorkbook.activeSheet}"
              </h4>
              <div className="overflow-x-auto border border-[var(--color-border)] rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)] font-bold text-[var(--color-text-muted)]">
                    <tr>
                      {parsedWorkbook.headers.map((h) => (
                        <th key={h} className="py-2.5 px-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/50 bg-white">
                    {(
                      parsedWorkbook.sheetsData[parsedWorkbook.activeSheet] || []
                    ).map((row, idx) => (
                      <tr key={idx} className="hover:bg-[var(--color-surface)]">
                        {parsedWorkbook.headers.map((h) => (
                          <td
                            key={h}
                            className="py-2 px-3 tabular-nums text-[var(--color-text)]"
                          >
                            {String(row[h] ?? "—")}
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

      {/* 3. BITÁCORA DE AUDITORÍA Y CONTROL DE LOTES IMPORTADOS */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              Bitácora de Sincronización y Control de Estado de Archivos
            </CardTitle>
            <CardDescription>
              Evita la duplicación de gastos o asientos contables registrando qué
              archivos ya fueron procesados en el período.
            </CardDescription>
          </div>
          <Badge variant="neutral">{logs.length} lotes registrados</Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)] text-xs uppercase font-bold text-[var(--color-text-muted)]">
              <tr>
                <th className="py-3 px-4">Archivo Exportado</th>
                <th className="py-3 px-4">Sistema Origen</th>
                <th className="py-3 px-4">Período</th>
                <th className="py-3 px-4">Fecha / Hora</th>
                <th className="py-3 px-4 text-right">Filas</th>
                <th className="py-3 px-4">Estado de Control</th>
                <th className="py-3 px-4">Resultado del Mapeo y Validación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--color-surface)]">
                  <td className="py-3 px-4 font-bold text-[var(--color-text)]">
                    {log.fileName}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        log.sourceSystem === "Agriness"
                          ? "forest"
                          : log.sourceSystem === "SCADA"
                          ? "ocean"
                          : "neutral"
                      }
                    >
                      {log.sourceSystem}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 tabular-nums font-medium">
                    {log.period}
                  </td>
                  <td className="py-3 px-4 tabular-nums text-xs text-[var(--color-text-subtle)]">
                    {log.uploadedAt}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-semibold">
                    {log.rowsProcessed}
                  </td>
                  <td className="py-3 px-4">
                    {log.status === "SINCRONIZADO" && (
                      <Badge variant="forest">✓ Sincronizado</Badge>
                    )}
                    {log.status === "CON_ADVERTENCIAS" && (
                      <Badge variant="warning">⚠ Con Advertencias</Badge>
                    )}
                    {log.status === "DUPLICADO_PREVENIDO" && (
                      <Badge variant="ocean">↺ Re-sincronizado (Sin duplicar)</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--color-text-muted)] max-w-md">
                    {log.summaryMessage}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
