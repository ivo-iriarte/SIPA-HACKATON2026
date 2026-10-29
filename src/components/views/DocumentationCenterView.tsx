/**
 * @file DocumentationCenterView.tsx
 * @description Vista 7 — Centro de Documentación Técnica, Catálogo de las 9 Fórmulas,
 * Diccionario de Relaciones Columna por Columna y Preparación para Iteración 2 (Backend & BD).
 */

import React from "react";
import {
  BookOpen,
  Calculator,
  Database,
  GitBranch,
  Layers,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from "../ui/primitives";

const FORMULAS_CATALOG = [
  {
    num: "01",
    name: "Costo por Kg Producido ($/kg) — KPI Rey",
    formula:
      "(Alimento $ + Sanidad $ + Mano de Obra $ + Otros $) ÷ Kg Producidos",
    source: "Numerador: Nuvix + SCADA (01) | Denominador: Agriness (01 / 03)",
    example: "Tandil: $4.410.000 ÷ 24.000 kg = $183,75 / kg",
  },
  {
    num: "02",
    name: "Costo por Lechón Destetado ($/lechón) — Pedido Sofía",
    formula: "Costos Directos Fase Maternidad ($) ÷ Lechones Destetados",
    source: "Numerador: Alimento Lactancia + Sanidad Parto + Sueldos Maternidad | Denominador: S4Farm (09)",
    example: "Tandil Maternidad: $1.070.000 ÷ 1.190 destetados = $899,16 / lechón",
  },
  {
    num: "03",
    name: "Conversión Alimenticia Aparente (FCR)",
    formula: "Kg Alimento Consumido ÷ Kg Carne Producida",
    source: "Consumos (03) ÷ Producción (03)",
    example: "Tandil Recría: 16.500 kg ÷ 10.500 kg = 1,57 | San Lorenzo Engorde: 38.500 ÷ 14.000 = 2,75",
  },
  {
    num: "04",
    name: "Balance Biológico de Hacienda por Sitio",
    formula: "Animales Iniciales + Entradas - Salidas = Animales Finales",
    source: "Agriness (03 - Hoja Produccion)",
    example: "Sitio 2 Tandil: 1.500 + 300 - 280 = 1.520 cabezas",
  },
  {
    num: "05",
    name: "Stock Teórico de Farmacia Veterinaria",
    formula: "Stock Inicial + Compras (Nuvix) - Consumo Aplicado (Agriness)",
    source: "Nuvix Facturas + Agriness Sanidad (04 - Hoja Inventario)",
    example: "Prod. Sanitario A: 80 + 25 - 30 = 75 unidades teóricas",
  },
  {
    num: "06",
    name: "Auditoría Dual de Discrepancia en Farmacia",
    formula: "Criterio [04]: Stock Nuvix - Stock Teórico | Criterio [05]: Agriness - Nuvix",
    source: "Cruce Archivos 04 y 05",
    example: "74 - 75 = -1 ud (Archivo 04) vs 75 - 74 = +1 ud (Archivo 05)",
  },
  {
    num: "07",
    name: "Imputación de Asiento Contable Automático",
    formula: "Unidades Consumidas (Agriness) × Costo Unitario Compra (Nuvix)",
    source: "Archivo 04 - Hojas Valorizacion y Asiento modelo",
    example: "30 uds × $1.400 = $42.000 (Debe: Gasto Sanidad / Haber: Stock Farmacia)",
  },
  {
    num: "08",
    name: "Control de Cuadratura de Balanza en Tolva SCADA",
    formula: "Kg Fabricados - (Maíz kg + Harina Soja kg + Otros kg) = 0",
    source: "Archivo 08 - Hoja Fabricacion",
    example: "Fórmula A: 20.000 - (13.000 + 5.000 + 2.000) = 0 kg (Sin desvío)",
  },
  {
    num: "09",
    name: "Valorización Bimonetaria de Ración y Balance de Silos",
    formula: "Costo USD = ((Kg × Precio $/kg) + Flete $) ÷ Tipo de Cambio ($/USD)",
    source: "Archivos 06, 07 y 08 (Hojas Stock, Valorizacion y Fletes)",
    example: "Maíz 24.000 kg × $230 = $5.520.000 ÷ TC 1.400 = US$ 3.942,86",
  },
];

export const DocumentationCenterView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Encabezado Documentación y Mapa de Procesos */}
      <div className="p-5 rounded-xl bg-[#2C365A] text-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <span className="p-2.5 rounded-lg bg-white/10 text-[#86EFAC] shrink-0">
            <BookOpen className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">
                Mapa Oficial de los 4 Procesos de Uniporc (Documento 00)
              </h2>
              <Badge variant="forest" className="bg-[#1E4D3B] text-white border-none text-xs">
                Normativa Operativa Uniporc
              </Badge>
            </div>
            <p className="text-xs text-[#C4BCB0] mt-0.5 max-w-3xl">
              Correspondencia oficial entre los 3 sistemas fuente (SCADA, Nuvix ERP, Agriness), las tareas manuales eliminadas por SIPA y las 4 salidas específicas de cada proceso.
            </p>
          </div>
        </div>
      </div>

      {/* MATRIZ DE LOS 4 PROCESOS DEL DOCUMENTO 00 */}
      <Card className="border-[#2C365A]/30 shadow-sm overflow-hidden">
        <CardHeader className="bg-[#F7F4EF]">
          <div>
            <CardTitle>Matriz de Procesos, Orígenes y Salidas Específicas</CardTitle>
            <CardDescription>
              Definición extraída fielmente de la hoja "Mapa de procesos" del archivo <code>00 - Guía y mapa de procesos.xlsx</code>.
            </CardDescription>
          </div>
          <Badge variant="ocean">Guía 00</Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#2C365A] text-white">
              <tr>
                <th className="py-3 px-4 font-bold">Proceso</th>
                <th className="py-3 px-4 font-bold">Origen de Datos</th>
                <th className="py-3 px-4 font-bold">Operación Manual Reemplazada</th>
                <th className="py-3 px-4 font-bold">Salida Específica (Front SIPA)</th>
                <th className="py-3 px-4 font-bold">Archivos de Ejemplo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C4BCB0] bg-white">
              <tr className="hover:bg-[#F7F4EF]/70 transition-colors">
                <td className="py-3 px-4 font-bold text-[#2C365A] whitespace-nowrap">
                  1. Costos
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono bg-[#E2E6F2] text-[#1E2642] px-2 py-0.5 rounded font-semibold">
                    Agriness + SCADA + Nuvix
                  </span>
                </td>
                <td className="py-3 px-4 text-[#5C6F73]">
                  Consolidar por granja, imputar rubros, convertir monedas
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 font-bold text-[#1E4D3B] bg-[#E4F0EB] px-2.5 py-1 rounded">
                    Informe de costos ($/kg y $/lechón)
                  </span>
                </td>
                <td className="py-3 px-4 font-mono font-medium text-[#2C365A]">
                  01 y 02
                </td>
              </tr>
              <tr className="hover:bg-[#F7F4EF]/70 transition-colors">
                <td className="py-3 px-4 font-bold text-[#2C365A] whitespace-nowrap">
                  2. Consumos productivos
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono bg-[#E2E6F2] text-[#1E2642] px-2 py-0.5 rounded font-semibold">
                    Agriness + Excel
                  </span>
                </td>
                <td className="py-3 px-4 text-[#5C6F73]">
                  Cruzar animales, fases y kg de alimento
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 font-bold text-[#1E4D3B] bg-[#E4F0EB] px-2.5 py-1 rounded">
                    Indicadores (FCR + Hacienda + Maternidad)
                  </span>
                </td>
                <td className="py-3 px-4 font-mono font-medium text-[#2C365A]">
                  03 y 09
                </td>
              </tr>
              <tr className="hover:bg-[#F7F4EF]/70 transition-colors">
                <td className="py-3 px-4 font-bold text-[#2C365A] whitespace-nowrap">
                  3. Farmacia
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono bg-[#E2E6F2] text-[#1E2642] px-2 py-0.5 rounded font-semibold">
                    Agriness + Nuvix
                  </span>
                </td>
                <td className="py-3 px-4 text-[#5C6F73]">
                  Doble carga, conciliación de stock, asiento contable
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 font-bold text-[#1E4D3B] bg-[#E4F0EB] px-2.5 py-1 rounded">
                    Control de inventario (Stock + Asiento Nuvix)
                  </span>
                </td>
                <td className="py-3 px-4 font-mono font-medium text-[#2C365A]">
                  04 y 05
                </td>
              </tr>
              <tr className="hover:bg-[#F7F4EF]/70 transition-colors">
                <td className="py-3 px-4 font-bold text-[#2C365A] whitespace-nowrap">
                  4. Planta alimentos
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono bg-[#E2E6F2] text-[#1E2642] px-2 py-0.5 rounded font-semibold">
                    SCADA + Nuvix
                  </span>
                </td>
                <td className="py-3 px-4 text-[#5C6F73]">
                  Conciliar silos, fabricación y valorización de raciones
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 font-bold text-[#1E4D3B] bg-[#E4F0EB] px-2.5 py-1 rounded">
                    Costo de alimento (Tolvas + Silos + ARS/USD)
                  </span>
                </td>
                <td className="py-3 px-4 font-mono font-medium text-[#2C365A]">
                  06, 07 y 08
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* 1. CATÁLOGO DE LAS 9 FÓRMULAS MATEMÁTICAS */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#1E4D3B]" />
            <div>
              <CardTitle>
                Catálogo Completo de Fórmulas de Negocio Implementadas
              </CardTitle>
              <CardDescription>
                Todas las fórmulas se calculan en tiempo real en{" "}
                <code>src/services/sipaEngine.ts</code> y están auditadas contra
                los procesos y especificaciones de Uniporc.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)] text-xs uppercase font-bold text-[var(--color-text-muted)]">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Indicador / Regla</th>
                <th className="py-3 px-4">Fórmula Matemática</th>
                <th className="py-3 px-4">Tablas y Columnas de Origen</th>
                <th className="py-3 px-4">Verificación en Datos Uniporc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60">
              {FORMULAS_CATALOG.map((f) => (
                <tr key={f.num} className="hover:bg-[var(--color-surface)]">
                  <td className="py-3 px-4 font-mono font-bold text-[#2C365A]">
                    {f.num}
                  </td>
                  <td className="py-3 px-4 font-bold text-[var(--color-text)]">
                    {f.name}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-[#1E4D3B] font-semibold">
                    {f.formula}
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--color-text-muted)]">
                    {f.source}
                  </td>
                  <td className="py-3 px-4 text-xs tabular-nums font-medium">
                    {f.example}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 2. MAPEO DE RELACIONES ENTRE TABLAS Y ARQUITECTURA ITERACIÓN 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-[#2C365A]" />
              <div>
                <CardTitle>
                  Relación entre Tablas por Claves Foráneas (Foreign Keys)
                </CardTitle>
                <CardDescription>
                  Cómo SIPA une registros sin clave común de transacción nativa
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <strong className="text-[#2C365A] block mb-1">
                1. Clave Establecimiento / Centro de Costo (establishmentId)
              </strong>
              Une <code>01.Centro ficticio</code> ("Granja A") ↔{" "}
              <code>03.Establecimiento</code> ↔ <code>04.Inventario.Establecimiento</code>{" "}
              ↔ <code>05.Nombre de Hoja</code> ↔{" "}
              <strong>Tandil / San Lorenzo / Porcap</strong>.
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <strong className="text-[#1E4D3B] block mb-1">
                2. Clave Etapa Productiva / Sitio (stage)
              </strong>
              Une <code>09.S4Farm (Maternidad)</code> ↔{" "}
              <code>03.Fase (Sitio 2 = Recría, Sitio 3 = Engorde)</code> ↔{" "}
              <code>07.Alimento (Iniciador / Crecimiento / Terminador)</code>.
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <strong className="text-[#2C365A] block mb-1">
                3. Clave Compuesta Insumo Sanitario (establishmentId + productCode)
              </strong>
              Une <code>05.Codigo ficticio (P-001, P-002, P-003)</code> ↔{" "}
              <code>04.Producto ficticio</code> evitando colisiones cuando un
              mismo medicamento se utiliza en distintas granjas.
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <strong className="text-[#1E4D3B] block mb-1">
                4. Clave Materia Prima e Ingrediente SCADA (rawMaterialCode)
              </strong>
              Une <code>06.Codigo ficticio (MP-01 Maíz, MP-02 Soja)</code> ↔{" "}
              <code>08.Fabricacion (Maiz kg, Harina soja kg)</code> ↔{" "}
              <code>08.Valorizacion (Precio $/kg y TC USD)</code>.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#1E4D3B]" />
              <div>
                <CardTitle>
                  Arquitectura Preparada para Iteración 2 (Backend & Persistencia)
                </CardTitle>
                <CardDescription>
                  Diseño desacoplado listo para conectar API REST y Base de Datos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#1E4D3B] shrink-0 mt-0.5" />
              <div>
                <strong>Capa de Dominio Canónica (<code>src/types/domain.ts</code>):</strong>{" "}
                Interfaces tipadas que reflejan directamente las tablas SQL de la
                futura base de datos (<code>establishments</code>,{" "}
                <code>stage_cost_production</code>,{" "}
                <code>pharmacy_inventory</code>, <code>scada_silo_balances</code>,{" "}
                <code>feed_batches</code>, <code>accounting_entries</code>,{" "}
                <code>ingestion_logs</code>).
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#1E4D3B] shrink-0 mt-0.5" />
              <div>
                <strong>Motor Puro Sin Efectos Secundarios (<code>src/services/sipaEngine.ts</code>):</strong>{" "}
                La lógica matemática y el mapeador de encabezados Excel son
                funciones puras que pueden ejecutarse tanto en el cliente como en
                un servidor Node.js / FastAPI.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#1E4D3B] shrink-0 mt-0.5" />
              <div>
                <strong>Carga Asíncrona durante el Mes + Cierre Mensual:</strong>{" "}
                El modelo de estado soporta períodos <code>ABIERTO</code> y{" "}
                <code>CERRADO</code>, permitiendo que producción (Agriness),
                planta (SCADA) y administración (Nuvix) suban archivos en
                distintos días del mes sin pisar datos ni duplicar asientos.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Layers className="w-4 h-4 text-[#2C365A] shrink-0 mt-0.5" />
              <div>
                <strong>Sistema de Diseño Auditado (WCAG 2.2 AA):</strong>{" "}
                Construido siguiendo la skill <code>frontend-ux-ui</code> con la
                paleta institucional <em>Cream (#EEE8DF)</em>,{" "}
                <em>Beige (#C4BCB0)</em>, <em>Deep Ocean (#2C365A)</em> y{" "}
                <em>Forest Pig Green (#1E4D3B)</em> (ratios de contraste verificados
                entre 6.65:1 y 13.23:1).
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
