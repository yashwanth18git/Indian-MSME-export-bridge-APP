import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  FileText,
  Globe,
  MessageSquareShare,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import type {
  CatalogProduct,
  CurrencyCode,
  ExportEntity,
  ExportOrder,
  FxRateInfo,
  NavTab,
  TeamMemberAccess,
  UserRoleKey,
} from '../types/export';
import { formatFx, formatInr, hasEntityPermission } from '../utils/formatters';

interface DashboardOverviewProps {
  entities: ExportEntity[];
  activeEntityId: string;
  onSelectEntity: (id: string) => void;
  orders: ExportOrder[];
  catalog: CatalogProduct[];
  fxRates: Record<CurrencyCode, FxRateInfo>;
  activeRole: UserRoleKey;
  teamMatrix: TeamMemberAccess[];
  onNavigate: (tab: NavTab) => void;
  onOpenNewOrder: () => void;
  onSelectOrderForDocs: (orderId: string) => void;
  onTraceOrderBatch: (orderId: string) => void;
  onShareWhatsApp: (title: string, message: string, phone?: string) => void;
  onRefreshFx: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  entities,
  activeEntityId,
  onSelectEntity,
  orders,
  catalog,
  fxRates,
  activeRole,
  teamMatrix,
  onNavigate,
  onOpenNewOrder,
  onSelectOrderForDocs,
  onTraceOrderBatch,
  onShareWhatsApp,
  onRefreshFx,
}) => {
  const [converterCurrency, setConverterCurrency] = useState<CurrencyCode>('USD');
  const [converterAmount, setConverterAmount] = useState<number>(10000);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const canViewFinancials = hasEntityPermission(
    activeRole,
    teamMatrix,
    activeEntityId,
    'fema_ebrc'
  ) || hasEntityPermission(activeRole, teamMatrix, activeEntityId, 'invoices_pi');

  const isConsolidated = activeEntityId === 'all';
  const activeEntity = entities.find((e) => e.id === activeEntityId);

  const visibleOrders = useMemo(() => {
    if (isConsolidated) return orders;
    return orders.filter((o) => o.entityId === activeEntityId);
  }, [orders, isConsolidated, activeEntityId]);

  const visibleCatalog = useMemo(() => {
    if (isConsolidated) return catalog;
    return catalog.filter((c) => c.entityId === activeEntityId);
  }, [catalog, isConsolidated, activeEntityId]);

  const metrics = useMemo(() => {
    let totalRevenueInr = 0;
    let pendingReceivablesInr = 0;
    let totalIncentivesInr = 0;
    let activeShipments = 0;

    for (const order of visibleOrders) {
      const rate = order.realizedFxRate || order.fxLockedRate;
      const orderInr = order.totalFx * rate;
      totalRevenueInr += orderInr;
      if (order.advanceReceivedPct < 100) {
        pendingReceivablesInr += orderInr * ((100 - order.advanceReceivedPct) / 100);
      }
      totalIncentivesInr += order.rodtepClaimInr + order.drawbackClaimInr;
      if (order.shipmentStage !== 'Destination Arrival') {
        activeShipments += 1;
      }
    }

    return {
      totalRevenueInr,
      pendingReceivablesInr,
      totalIncentivesInr,
      activeShipments,
    };
  }, [visibleOrders]);

  const actionAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      severity: 'Critical' | 'Warning' | 'Action';
      entityName: string;
      title: string;
      detail: string;
      targetTab: NavTab;
    }> = [];

    const scopeEntities = isConsolidated
      ? entities
      : entities.filter((e) => e.id === activeEntityId);

    for (const ent of scopeEntities) {
      if (ent.lutDaysRemaining <= 30) {
        alerts.push({
          id: `lut-${ent.id}`,
          severity: 'Warning',
          entityName: ent.shortName,
          title: `GST LUT expires in ${ent.lutDaysRemaining} days (${ent.lutValidUntil})`,
          detail: `Renew ARN ${ent.lutArn} on GST portal to continue zero-rated exports.`,
          targetTab: 'compliance',
        });
      }
    }

    for (const ord of visibleOrders) {
      const entName =
        entities.find((e) => e.id === ord.entityId)?.shortName ?? 'Entity';
      if (ord.ebrcStatus === 'Overdue Risk') {
        alerts.push({
          id: `ebrc-${ord.id}`,
          severity: 'Critical',
          entityName: entName,
          title: `FEMA e-BRC deadline ${ord.realizationDeadline} for ${ord.ciNumber}`,
          detail: `${ord.buyerName} · ${formatFx(ord.totalFx, ord.currency)} awaiting FIRC match.`,
          targetTab: 'compliance',
        });
      }
      if (ord.lcExpiryDate) {
        alerts.push({
          id: `lc-${ord.id}`,
          severity: 'Action',
          entityName: entName,
          title: `LC ${ord.lcNumber} expires ${ord.lcExpiryDate}`,
          detail: `Ensure Clean Bill of Lading & CoO submission to ${ord.buyerName}.`,
          targetTab: 'documents',
        });
      }
    }

    return alerts;
  }, [entities, isConsolidated, activeEntityId, visibleOrders]);

  const handleCatalogShare = (product: CatalogProduct) => {
    const ent = entities.find((e) => e.id === product.entityId);
    const msg = [
      `*${ent?.legalName || 'NiryatSetu Exporter'}*`,
      `Product: ${product.name}`,
      `SKU: ${product.sku} | ITC-HS: ${product.hsCode}`,
      `FOB India Price: $${product.fobUsd.toFixed(2)} / ${product.unit}`,
      `MOQ: ${product.moq} ${product.unit} | Origin: ${product.originCity}`,
      ``,
      `FTA Note: ${product.cepaNote}`,
      `Reply on WhatsApp for sample dispatch or a formal Proforma Invoice.`,
    ].join('\n');

    onShareWhatsApp(`Share Catalog: ${product.sku}`, msg);
  };

  return (
    <div className="space-y-6">
      {/* Header Context Bar */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-500">
              {isConsolidated
                ? `Consolidated Master Ledger · ${entities.length} Sister Entities Active`
                : `Isolated Entity Ledger · ${activeEntity?.city}, ${activeEntity?.state}`}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
              {isConsolidated
                ? 'Take Indian Craft & Goods Global'
                : activeEntity?.legalName}
            </h1>
            {!isConsolidated && activeEntity ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-slate-600 tabular-nums pt-0.5">
                <span>IEC {activeEntity.iec}</span>
                <span aria-hidden="true">·</span>
                <span>GSTIN {activeEntity.gstin}</span>
                <span aria-hidden="true">·</span>
                <span>AD {activeEntity.adBank}</span>
                <span aria-hidden="true">·</span>
                <span>Next Bill {activeEntity.invoicePrefix}{String(activeEntity.nextInvoiceSeq).padStart(4, '0')}</span>
              </div>
            ) : (
              <p className="text-sm text-slate-600 max-w-2xl">
                Unified pocket command across all IECs, GSTINs, zero-rated LUTs, multi-currency realizations, and container dispatches.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {hasEntityPermission(activeRole, teamMatrix, activeEntityId, 'invoices_pi') && (
              <button
                type="button"
                onClick={onOpenNewOrder}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F3D5E] text-sm font-medium text-white hover:bg-[#0b2f49] transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>New Export Order</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('documents')}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <FileText className="w-4 h-4" />
              <span>Export Docs</span>
            </button>
          </div>
        </div>

        {/* 4-Column Tabular KPI Strip */}
        <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <p className="text-xs font-medium text-slate-500">
              {canViewFinancials ? 'Export Book Value' : 'Total Dispatched Orders'}
            </p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {canViewFinancials
                ? formatInr(metrics.totalRevenueInr)
                : `${visibleOrders.length} Orders`}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
              {visibleOrders.length} active shipments · FY 26–27
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              {canViewFinancials ? 'Pending FX Realization' : 'Total Net Cargo Weight'}
            </p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {canViewFinancials
                ? formatInr(metrics.pendingReceivablesInr)
                : `${visibleOrders
                    .reduce(
                      (acc, o) =>
                        acc + o.items.reduce((s, i) => s + i.netWeightKg, 0),
                      0
                    )
                    .toLocaleString('en-IN')} kg`}
            </p>
            <p className="mt-0.5 text-xs text-amber-700 font-medium">
              {canViewFinancials ? 'FEMA 9-month tracking active' : 'Verified packing lists'}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              {canViewFinancials ? 'RoDTEP & Drawback' : 'Total Export Cartons'}
            </p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-emerald-700 font-mono tabular-nums">
              {canViewFinancials
                ? formatInr(metrics.totalIncentivesInr)
                : `${visibleOrders.reduce(
                    (acc, o) => acc + o.items.reduce((s, i) => s + i.cartons, 0),
                    0
                  )} Ctns`}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {canViewFinancials ? 'Accrued DGFT / Customs claims' : 'Palletized for dispatch'}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Live Containers in Transit
            </p>
            <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {metrics.activeShipments}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Across sea & air corridors
            </p>
          </div>
        </div>
      </section>

      {/* Live RBI / Interbank FX Strip */}
      {canViewFinancials && (
        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Live Interbank & RBI Reference Rates
                </h2>
                <p className="text-xs text-slate-500">
                  Lock spot rates on Proforma & Commercial Invoices to track FX gain/loss
                </p>
              </div>
              <button
                type="button"
                onClick={onRefreshFx}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Rates</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 flex-1">
              {Object.values(fxRates).map((rate) => (
                <button
                  key={rate.code}
                  type="button"
                  onClick={() => setConverterCurrency(rate.code)}
                  className={`text-left px-3 py-2 rounded-xl border transition-colors ${
                    converterCurrency === rate.code
                      ? 'border-[#0F3D5E] bg-[#0F3D5E]/5'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{rate.code}/INR</span>
                    <span
                      className={`font-mono tabular-nums ${
                        rate.dailyChangePct >= 0
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {rate.dailyChangePct >= 0 ? '+' : ''}
                      {rate.dailyChangePct.toFixed(2)}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold font-mono tabular-nums text-slate-900">
                    ₹{rate.rbiRefRate.toFixed(2)}
                  </p>
                </button>
              ))}
            </div>

            {/* Quick Quote Converter */}
            <div className="flex items-center gap-2 border-t lg:border-t-0 lg:border-l border-slate-200 pt-3 lg:pt-0 lg:pl-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-500">
                  Quote ({converterCurrency})
                </label>
                <input
                  type="number"
                  min={1}
                  value={converterAmount}
                  onChange={(e) =>
                    setConverterAmount(Math.max(0, Number(e.target.value)))
                  }
                  className="mt-0.5 w-28 min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
                />
              </div>
              <div className="text-right">
                <span className="block text-[11px] font-medium text-slate-500">
                  INR Equivalent
                </span>
                <span className="mt-1 inline-block text-sm font-semibold font-mono tabular-nums text-slate-900">
                  {formatInr(
                    converterAmount * fxRates[converterCurrency].rbiRefRate
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Two-Column Split: Entity Ledger Isolation + Priority Compliance Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Sister Firm Ledger Isolation Matrix */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Multi-Entity Ledger & MSME Thresholds
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Strict isolation across IECs, GSTINs, invoice numbering, and LUT filings
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('entities')}
              className="text-xs font-medium text-[#0F3D5E] hover:underline whitespace-nowrap shrink-0"
            >
              Manage Entities
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {entities.map((ent) => {
              const entOrders = orders.filter((o) => o.entityId === ent.id);
              const pctUsed = Math.min(
                100,
                Math.round((ent.fyTurnoverLakhs / ent.msmeCapLakhs) * 100)
              );
              const isSelected = activeEntityId === ent.id;

              return (
                <div
                  key={ent.id}
                  className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected ? 'bg-slate-50/80 -mx-3 px-3 rounded-xl' : ''
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onSelectEntity(isSelected ? 'all' : ent.id)
                        }
                        className="text-sm font-semibold text-slate-900 hover:text-[#0F3D5E] text-left truncate"
                      >
                        {ent.shortName}
                      </button>
                      {isSelected && (
                        <span className="text-[11px] font-medium text-[#0F3D5E]">
                          · Active View
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-mono tabular-nums flex flex-wrap gap-x-2">
                      <span>IEC {ent.iec}</span>
                      <span aria-hidden="true">·</span>
                      <span>GSTIN {ent.gstin}</span>
                      <span aria-hidden="true">·</span>
                      <span>{entOrders.length} Orders</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-36">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 tabular-nums">
                        <span>FY Turnover</span>
                        <span className="font-mono font-medium">
                          ₹{ent.fyTurnoverLakhs}L / {ent.msmeCapLakhs}L
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pctUsed > 80 ? 'bg-amber-600' : 'bg-[#0F3D5E]'
                          }`}
                          style={{ width: `${pctUsed}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onSelectEntity(isSelected ? 'all' : ent.id)
                      }
                      className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
                    >
                      {isSelected ? 'Show All' : 'Isolate'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Actionable Compliance & Payment Milestone Queue */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Compliance & LC Milestones
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time RBI, DGFT, LUT & Letter of Credit reminders
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-[#0F3D5E] shrink-0" />
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {actionAlerts.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  All compliance filings nominal
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Zero overdue e-BRCs or expiring LUT certificates in this entity.
                </p>
              </div>
            ) : (
              actionAlerts.map((alert) => (
                <div key={alert.id} className="py-3.5 flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <AlertTriangle
                        className={`w-3.5 h-3.5 shrink-0 ${
                          alert.severity === 'Critical'
                            ? 'text-rose-600'
                            : 'text-amber-600'
                        }`}
                      />
                      <span
                        className={`font-semibold ${
                          alert.severity === 'Critical'
                            ? 'text-rose-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-600 truncate">
                        {alert.entityName}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">
                      {alert.title}
                    </p>
                    <p className="text-xs text-slate-500">{alert.detail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate(alert.targetTab)}
                    aria-label={`Resolve ${alert.title}`}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shrink-0"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Recent Export Orders Table */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Active Export Orders & Document Status
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tap any order to open one-click PI, Commercial Invoice, Packing List, or CoO draft
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('shipments')}
            className="text-xs font-medium text-[#0F3D5E] hover:underline whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            Track All Containers
          </button>
        </div>

        <div className="overflow-x-auto -mx-5 px-5 mt-2">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2.5 pr-4">Invoice / Entity</th>
                <th className="py-2.5 pr-4">Buyer & Port</th>
                <th className="py-2.5 pr-4">Terms</th>
                <th className="py-2.5 pr-4 text-right">Value</th>
                <th className="py-2.5 pr-4">ICEGATE / e-BRC</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {visibleOrders.map((order) => {
                const ent = entities.find((e) => e.id === order.entityId);
                return (
                  <tr key={order.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4">
                      <p className="font-semibold font-mono tabular-nums text-slate-900">
                        {order.ciNumber}
                      </p>
                      <p className="text-xs text-slate-500 truncate max-w-[180px]">
                        {ent?.shortName}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-900">
                        {order.buyerName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.buyerPort} · {order.incoterm}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-700">
                      <p className="font-medium">{order.paymentTerms}</p>
                      <p className="text-slate-500 tabular-nums">
                        {order.advanceReceivedPct}% settled
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums">
                      {canViewFinancials ? (
                        <>
                          <p className="font-semibold text-slate-900">
                            {formatFx(order.totalFx, order.currency)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatInr(order.totalFx * order.fxLockedRate)}
                          </p>
                        </>
                      ) : (
                        <p className="font-medium text-slate-700">
                          {order.items.reduce((s, i) => s + i.cartons, 0)} Ctns
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      <p className="font-medium text-slate-800">
                        {order.icegateStatus}
                      </p>
                      <p
                        className={`font-medium ${
                          order.ebrcStatus === 'Overdue Risk'
                            ? 'text-rose-700'
                            : order.ebrcStatus === 'e-BRC Issued'
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {order.ebrcStatus}
                      </p>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onTraceOrderBatch(order.id)}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
                        >
                          Trace Batch
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectOrderForDocs(order.id)}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-[#0F3D5E] hover:bg-[#0F3D5E]/5 transition-colors whitespace-nowrap"
                        >
                          Open Docs
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Branded Indian Craft & Goods Catalog (One-Tap WhatsApp Buyer Sharing) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Branded Export Catalog · One-Tap Buyer Quote
            </h2>
            <p className="text-xs text-slate-500">
              Share HSN-verified craft, spice, and metalware specs with international B2B buyers directly on WhatsApp
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Globe className="w-3.5 h-3.5" />
            <span>CEPA & ECTA FTA benefits pre-calculated</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {visibleCatalog.map((product) => {
            const ent = entities.find((e) => e.id === product.entityId);
            const hasErr = imgErrors[product.id];
            return (
              <article
                key={product.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                  {hasErr ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 p-4 text-center">
                      <Package className="w-8 h-8 mb-2 text-[#0F3D5E]" />
                      <span className="text-xs font-medium text-slate-700">
                        {product.name}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setImgErrors((prev) => ({ ...prev, [product.id]: true }))
                      }
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-500 truncate">
                      {ent?.shortName} · {product.originCity}
                    </p>
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-600">
                      <span>HS {product.hsCode}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        FOB ${product.fobUsd.toFixed(2)}/{product.unit}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 pt-0.5">
                      {product.cepaNote}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCatalogShare(product)}
                    className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    <MessageSquareShare className="w-4 h-4 text-[#0F3D5E]" />
                    <span>Share Spec on WhatsApp</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
