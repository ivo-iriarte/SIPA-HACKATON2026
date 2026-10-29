/**
 * @file csv.ts
 * @description Utilidad compartida para exportar informes de cada proceso a CSV
 * (separador ";" y BOM UTF-8 para compatibilidad directa con Excel en es-AR).
 */

export function downloadCsv(
  fileName: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const body = [headers, ...rows]
    .map((r) => r.map((c) => String(c).replace(/;/g, ",")).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

