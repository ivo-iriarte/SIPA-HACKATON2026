/**
 * @file FarmsProductionView.tsx
 * @description Vista 3 — Sector Granjas y Producción Zootécnica (Agriness / S4Farm).
 * Aísla la información biológica y productiva para veterinarios y encargados de granja,
 * ocultando sueldos y contabilidad financiera. Incluye conciliación explícita entre
 * los kilos parciales por fase (Excel 03) y los kilos totales del mes (Excel 01).
 */

import React from "react";
import {
  Activity,
  Baby,
  HeartPulse,
  Scale,
  Wheat,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
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
  CardDescription,
  CardContent,
  Badge,
} from "../ui/primitives";
import { ESTABLISHMENTS } from "../../data/initialUniporcData";

interface FarmsProductionViewProps {
  records: StageCostProductionRecord[];
  selectedEstablishment: EstablishmentId | "ALL";
  selectedStage: ProductionStage | "ALL";
  includePorcap: boolean;
}

export const FarmsProductionView: React.FC<FarmsProductionViewProps> = ({
  records,
  selectedEstablishment,
  selectedStage,
  includePorcap,
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

  return (
    <div className="space-y-6">
      {/* Banner de Rol Sectorial: Vista Exclusiva Producción */}
      <div className="p-4 rounded-lg bg-[#E4F0EB] border border-[#1E4D3B]/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-md bg-[#1E4D3B] text-white">
            <HeartPulse className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[#14382A]">
              Vista Sectorial: Producción & Zootecnia (Agriness + S4Farm)
            </h2>
            <p className="text-xs text-[#14382A]/80">
              Visualización limpia de indicadores biológicos, existencias por
              sitio y eficiencia de conversión alimenticia (sin datos salariales
              ni contables).
            </p>
          </div>
        </div>
        <Badge variant="forest">Origen: Excels 03 y PDF 09 (S4Farm)</Badge>
      </div>

      {/* 1. INDICADORES S4FARM DE MATERNIDAD Y CRÍA (Archivo 09) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase text-[var(--color-text-muted)]">
                Madres Activas & Partos
              </span>
              <Baby className="w-4 h-4 text-[#1E4D3B]" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">
              {formatNum(totalActiveSows)} madres
            </div>
            <div className="mt-1 text-xs text-[var(--color-text-subtle)] tabular-nums">
              Partos del período: <strong>{formatNum(totalFarrowings)}</strong>{" "}
              (Nacidos vivos: <strong>{formatNum(totalBornAlive)}</strong>)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase text-[var(--color-text-muted)]">
                Lechones Destetados
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#1E4D3B]" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-[#1E4D3B]">
              {formatNum(totalWeaned)} cab.
            </div>
            <div className="mt-1 text-xs text-[var(--color-text-subtle)] tabular-nums">
              Peso medio destete: <strong>6,3 kg</strong> (Reporte S4Farm 09)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase text-[var(--color-text-muted)]">
                Ganancia Neta de Carne
              </span>
              <Scale className="w-4 h-4 text-[#2C365A]" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">
              {formatNum(totalProducedKg)} kg
            </div>
            <div className="mt-1 text-xs text-[var(--color-text-subtle)] tabular-nums">
              Mortalidad promedio: <strong>{formatNum(avgMortality, 1)}%</strong>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase text-[var(--color-text-muted)]">
                Conversión Aparente (FCR)
              </span>
              <Wheat className="w-4 h-4 text-[#2C365A]" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">
              {formatNum(
                calcFeedConversionRatio(totalConsumedKg, totalProducedKg),
                2
              )}{" "}
              <span className="text-xs font-normal">kg/kg</span>
            </div>
            <div className="mt-1 text-xs text-[var(--color-text-subtle)] tabular-nums">
              Consumo total: <strong>{formatNum(totalConsumedKg)} kg</strong>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. EXPLICACIÓN DE DISCREPANCIA ENTRE ARCHIVO 03 Y ARCHIVO 01 (Requerimiento Guía pág. 3) */}
      <Card className="border-l-4 border-l-[#92400E] bg-[#FEF3C7]/40">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#92400E] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 text-[var(--color-text)]">
            <div className="font-bold text-[#78350F]">
              Conciliación de Alcance: ¿Por qué el Excel 03 informa 10.500 kg y
              14.000 kg mientras el Excel 01 informa 24.000 kg y 21.000 kg?
            </div>
            <p className="text-[var(--color-text-muted)]">
              Tal como advierte la Guía del Desafío (pág. 3), el archivo{" "}
              <code>03 - Producción y consumos</code> reporta únicamente un lote
              específico por sitio (<strong>Tandil Sitio 2 Recría = 10.500 kg</strong> y{" "}
              <strong>San Lorenzo Sitio 3 Engorde = 14.000 kg</strong>), mientras
              que el archivo <code>01 - Costos mensual</code> consolida la
              producción de <strong>todas las etapas del establecimiento</strong>{" "}
              en el mes (<strong>24.000 kg en Tandil</strong> y{" "}
              <strong>21.000 kg en San Lorenzo</strong>). SIPA resuelve esta
              ambigüedad desglosando explícitamente las 3 etapas de cada granja.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. TABLA DE EXISTENCIAS BIOLÓGICAS Y CONVERSIÓN POR FASE (Archivo 03) */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              Balance de Hacienda por Fase y Conversión Alimenticia (Agriness)
            </CardTitle>
            <CardDescription>
              Fórmula de stock: Animales Finales = Iniciales + Entradas - Salidas
              | FCR = Kg Consumidos ÷ Kg Producidos
            </CardDescription>
          </div>
          <Badge variant="ocean">Control Biológico por Sitio</Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)] text-xs uppercase font-bold text-[var(--color-text-muted)]">
              <tr>
                <th className="py-3 px-4">Establecimiento</th>
                <th className="py-3 px-4">Fase / Sitio</th>
                <th className="py-3 px-3 text-right">Anim. Iniciales</th>
                <th className="py-3 px-3 text-right">Entradas</th>
                <th className="py-3 px-3 text-right">Salidas</th>
                <th className="py-3 px-3 text-right">Anim. Finales</th>
                <th className="py-3 px-3">Dieta Suministrada</th>
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
                const isExactFile03 =
                  (r.establishmentId === "tandil" && r.stage === "Recría") ||
                  (r.establishmentId === "san_lorenzo" && r.stage === "Engorde");

                return (
                  <tr
                    key={r.id}
                    className={`hover:bg-[var(--color-surface)] ${
                      isExactFile03 ? "bg-[#E4F0EB]/30" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-[var(--color-text)]">
                      {r.establishmentName}
                      {isExactFile03 && (
                        <span className="block text-[11px] font-semibold text-[#1E4D3B]">
                          ★ Lote testigo Excel 03
                        </span>
                      )}
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
                    <td className="py-3 px-3 text-right tabular-nums text-[#1E4D3B] font-medium">
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
                    <td className="py-3 px-3 text-right tabular-nums font-bold text-[#2C365A]">
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
    </div>
  );
};
