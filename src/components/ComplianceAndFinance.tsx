import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Calculator,
  Landmark,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { HSN_TARIFF_DB } from '../data/seedData';
import type {
  CurrencyCode,
  ExportEntity,
  ExportOrder,
  FxRateInfo,
  IcegateStatus,
  TeamMemberAccess,
  UserRoleKey,
} from '../types/export';
import { formatFx, formatInr, hasEntityPermission } from '../utils/formatters';

type ComplianceTab = 'fema' | 'gst_dgft' | 'hsn_fta';

interface ComplianceAndFinanceProps {
  entities: ExportEntity[];
  activeEntityId: string;
  orders: ExportOrder[];
  fxRates: Record<CurrencyCode, FxRateInfo>;
  activeRole: UserRoleKey;
  teamMatrix: TeamMemberAccess[];
  onReconcileFirc: (
    orderId: string,
    fircNumber: string,
    realizedRate: number
  ) => void;
  onRenewLut: (entityId: string) => void;
  onAdvanceIcegate: (orderId: string, nextStatus: IcegateStatus) => void;
}

const ICEGATE_SEQUENCE: IcegateStatus[] = [
  'SB Filed',
  'Customs Examined',
  'LEO Granted',
  'EGM Filed',
  'Scroll Generated',
];

export const ComplianceAndFinance: React.FC<ComplianceAndFinanceProps> = ({
  entities,
  activeEntityId,
  orders,
  fxRates,
  activeRole,
  teamMatrix,
  onReconcileFirc,
  onRenewLut,
  onAdvanceIcegate,
}) => {
  const [subTab, setSubTab] = useState<ComplianceTab>('fema');
  const [matchingOrderId, setMatchingOrderId] = useState<string | null>(null);
  const [fircInput, setFircInput] = useState('FIRC-AD-2611904');
  const [realizedRateInput, setRealizedRateInput] = useState<number>(84.42);

  // HSN & FTA Estimator state
  const [hsnQuery, setHsnQuery] = useState('');
  const [selectedHsCode, setSelectedHsCode] = useState(HSN_TARIFF_DB[0].hsCode);
  const [destCountry, setDestCountry] = useState<'UAE' | 'Australia' | 'UK' | 'EU' | 'USA'>('UAE');
  const [estimatorFobUsd, setEstimatorFobUsd] = useState<number>(25000);

  const canManageFema = hasEntityPermission(
    activeRole,
    teamMatrix,
    activeEntityId,
    'fema_ebrc'
  );
  const canManageGst = hasEntityPermission(
    activeRole,
    teamMatrix,
    activeEntityId,
    'gst_lut'
  );
  const canManageCustoms = hasEntityPermission(
    activeRole,
    teamMatrix,
    activeEntityId,
    'customs_icegate'
  );

  const scopedEntities = useMemo(() => {
    if (activeEntityId === 'all') return entities;
    return entities.filter((e) => e.id === activeEntityId);
  }, [entities, activeEntityId]);

  const scopedOrders = useMemo(() => {
    if (activeEntityId === 'all') return orders;
    return orders.filter((o) => o.entityId === activeEntityId);
  }, [orders, activeEntityId]);

  const filteredHsnList = useMemo(() => {
    const q = hsnQuery.trim().toLowerCase();
    if (!q) return HSN_TARIFF_DB;
    return HSN_TARIFF_DB.filter(
      (entry) =>
        entry.hsCode.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q)
    );
  }, [hsnQuery]);

  const activeHsn =
    HSN_TARIFF_DB.find((h) => h.hsCode === selectedHsCode) ?? HSN_TARIFF_DB[0];
  const destTariff = activeHsn.tariffs[destCountry];
  const buyerDutySavingsUsd =
    estimatorFobUsd * ((destTariff.mfn - destTariff.fta) / 100);
  const exporterRodtepInr =
    estimatorFobUsd * fxRates.USD.rbiRefRate * (activeHsn.rodtepPct / 100);
  const exporterDrawbackInr =
    estimatorFobUsd * fxRates.USD.rbiRefRate * (activeHsn.drawbackPct / 100);

  const startFircMatch = (order: ExportOrder) => {
    setMatchingOrderId(order.id);
    setFircInput(`FIRC-${order.entityId.slice(4, 7).toUpperCase()}-2611${Math.floor(100 + Math.random() * 899)}`);
    setRealizedRateInput(fxRates[order.currency].interbankRate);
  };

  const submitFircMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchingOrderId || !fircInput.trim()) return;
    onReconcileFirc(matchingOrderId, fircInput.trim(), realizedRateInput);
    setMatchingOrderId(null);
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Regulatory Compliance, FEMA e-BRC & FTA Duty Estimator
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track RBI remittance timelines, GST LUT renewals, ICEGATE RoDTEP claims, and CEPA/ECTA tariffs
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setSubTab('fema')}
            className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'fema'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            FEMA & e-BRC
          </button>
          <button
            type="button"
            onClick={() => setSubTab('gst_dgft')}
            className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'gst_dgft'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            GST, LUT & ICEGATE
          </button>
          <button
            type="button"
            onClick={() => setSubTab('hsn_fta')}
            className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'hsn_fta'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            HSN & FTA Estimator
          </button>
        </div>
      </div>

      {/* TAB 1: FEMA & e-BRC Reconciliation + Forex Gain/Loss */}
      {subTab === 'fema' && (
        <div className="space-y-5">
          {!canManageFema ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-600">
              Current role ({activeRole}) does not have access to FEMA / e-BRC bank ledgers. Switch to Owner or CA / Accountant in the workspace switcher to reconcile FIRCs.
            </div>
          ) : (
            <section className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    FIRC & e-BRC Reconciliation Ledger
                  </h2>
                  <p className="text-xs text-slate-500">
                    Match inward foreign remittances against export invoices within RBI's 9-month FEMA window
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Landmark className="w-4 h-4 text-[#0F3D5E]" />
                  <span>EDPMS Sync Active</span>
                </div>
              </div>

              {matchingOrderId && (
                <form
                  onSubmit={submitFircMatch}
                  className="my-4 p-4 rounded-xl border border-[#0F3D5E]/30 bg-[#0F3D5E]/5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
                >
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-medium text-slate-700">
                      AD Bank FIRC / e-FIRC Reference Number
                    </span>
                    <input
                      type="text"
                      required
                      value={fircInput}
                      onChange={(e) => setFircInput(e.target.value)}
                      className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-700">
                      Bank Realized FX Rate (₹)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={realizedRateInput}
                      onChange={(e) =>
                        setRealizedRateInput(Number(e.target.value))
                      }
                      className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="flex-1 min-h-[42px] px-3 py-2 rounded-lg bg-[#0F3D5E] text-xs font-semibold text-white hover:bg-[#0b2f49]"
                    >
                      Match & Issue e-BRC
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchingOrderId(null)}
                      className="min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto -mx-5 px-5 mt-2">
                <table className="w-full text-left border-collapse min-w-[780px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                      <th className="py-2.5 pr-4">Invoice & Entity</th>
                      <th className="py-2.5 pr-4">Payment / LC Terms</th>
                      <th className="py-2.5 pr-4 text-right">Billed (FX)</th>
                      <th className="py-2.5 pr-4 text-right">Locked vs Realized</th>
                      <th className="py-2.5 pr-4 text-right">FX Gain / Loss</th>
                      <th className="py-2.5 pr-4">e-BRC Status</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {scopedOrders.map((order) => {
                      const ent = entities.find((e) => e.id === order.entityId);
                      const spotRate =
                        order.realizedFxRate ??
                        fxRates[order.currency].interbankRate;
                      const fxDeltaInr =
                        (spotRate - order.fxLockedRate) * order.totalFx;

                      return (
                        <tr key={order.id} className="hover:bg-slate-50/70">
                          <td className="py-3 pr-4">
                            <p className="font-semibold font-mono tabular-nums text-slate-900">
                              {order.ciNumber}
                            </p>
                            <p className="text-xs text-slate-500">
                              {ent?.shortName} · Due {order.realizationDeadline}
                            </p>
                          </td>
                          <td className="py-3 pr-4 text-xs">
                            <p className="font-medium text-slate-800">
                              {order.paymentTerms}
                            </p>
                            {order.lcNumber && (
                              <p className="text-amber-700 font-mono">
                                {order.lcNumber} (Exp {order.lcExpiryDate})
                              </p>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {formatFx(order.totalFx, order.currency)}
                          </td>
                          <td className="py-3 pr-4 text-right font-mono tabular-nums text-xs text-slate-700">
                            ₹{order.fxLockedRate.toFixed(2)} → ₹
                            {spotRate.toFixed(2)}
                          </td>
                          <td
                            className={`py-3 pr-4 text-right font-mono tabular-nums font-medium ${
                              fxDeltaInr >= 0
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {fxDeltaInr >= 0 ? '+' : ''}
                            {formatInr(fxDeltaInr)}
                          </td>
                          <td className="py-3 pr-4 text-xs">
                            <p
                              className={`font-semibold ${
                                order.ebrcStatus === 'e-BRC Issued'
                                  ? 'text-emerald-700'
                                  : order.ebrcStatus === 'Overdue Risk'
                                  ? 'text-rose-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {order.ebrcStatus}
                            </p>
                            {order.fircNumber && (
                              <p className="font-mono text-slate-500">
                                {order.fircNumber}
                              </p>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            {order.ebrcStatus === 'e-BRC Issued' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Reconciled</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startFircMatch(order)}
                                className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 hover:bg-slate-100 whitespace-nowrap"
                              >
                                Match FIRC
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* TAB 2: GST, LUT & DGFT (RoDTEP / ICEGATE) */}
      {subTab === 'gst_dgft' && (
        <div className="space-y-6">
          {/* GST LUT Renewal Status */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  GST Letter of Undertaking (LUT) & Zero-Rated Status
                </h2>
                <p className="text-xs text-slate-500">
                  Separate LUT ARN records per GSTIN prevent IGST cash-flow lockup
                </p>
              </div>
              <ShieldCheck className="w-5 h-5 text-[#0F3D5E]" />
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {scopedEntities.map((ent) => {
                const expiringSoon = ent.lutDaysRemaining <= 30;
                return (
                  <div
                    key={ent.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {ent.legalName}
                      </p>
                      <div className="text-xs font-mono tabular-nums text-slate-600 flex flex-wrap gap-x-3">
                        <span>GSTIN {ent.gstin}</span>
                        <span>ARN {ent.lutArn}</span>
                        <span>Valid until {ent.lutValidUntil}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-xs font-semibold tabular-nums ${
                          expiringSoon ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {expiringSoon
                          ? `Renewal Due (${ent.lutDaysRemaining}d left)`
                          : `Active (${ent.lutDaysRemaining}d left)`}
                      </span>
                      {canManageGst && expiringSoon && (
                        <button
                          type="button"
                          onClick={() => onRenewLut(ent.id)}
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0F3D5E] text-xs font-semibold text-white hover:bg-[#0b2f49] whitespace-nowrap"
                        >
                          Renew LUT Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ICEGATE Shipping Bill & RoDTEP Tracker */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="pb-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">
                ICEGATE Shipping Bills, RoDTEP & Duty Drawback Claims
              </h2>
              <p className="text-xs text-slate-500">
                Advance customs clearance stage as LEO / EGM / e-Scrip scroll progresses
              </p>
            </div>

            <div className="overflow-x-auto -mx-5 px-5 mt-2">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="py-2.5 pr-4">Shipping Bill / CI</th>
                    <th className="py-2.5 pr-4">IGST Route</th>
                    <th className="py-2.5 pr-4 text-right">RoDTEP (₹)</th>
                    <th className="py-2.5 pr-4 text-right">Drawback (₹)</th>
                    <th className="py-2.5 pr-4">ICEGATE Status</th>
                    <th className="py-2.5 text-right">Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {scopedOrders.map((order) => {
                    const currentIdx = ICEGATE_SEQUENCE.indexOf(
                      order.icegateStatus
                    );
                    const nextStage =
                      currentIdx >= 0 && currentIdx < ICEGATE_SEQUENCE.length - 1
                        ? ICEGATE_SEQUENCE[currentIdx + 1]
                        : null;

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/70">
                        <td className="py-3 pr-4 font-mono tabular-nums">
                          <p className="font-semibold text-slate-900">
                            {order.sbNumber}
                          </p>
                          <p className="text-xs text-slate-500">{order.ciNumber}</p>
                        </td>
                        <td className="py-3 pr-4 text-xs font-medium text-slate-700">
                          {order.igstRefundStatus}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                          {formatInr(order.rodtepClaimInr)}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-800">
                          {formatInr(order.drawbackClaimInr)}
                        </td>
                        <td className="py-3 pr-4 text-xs font-semibold text-slate-900">
                          {order.icegateStatus}
                        </td>
                        <td className="py-3 text-right">
                          {nextStage && canManageCustoms ? (
                            <button
                              type="button"
                              onClick={() => onAdvanceIcegate(order.id, nextStage)}
                              className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 hover:bg-slate-100 whitespace-nowrap"
                            >
                              Mark {nextStage}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">
                              {nextStage ? 'View Only' : 'Scrip Scroll Ready'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: Smart HSN & FTA Duty Estimator */}
      {subTab === 'hsn_fta' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* HSN Search List */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col">
            <h2 className="text-base font-semibold text-slate-900">
              Indian ITC-HS Code Lookup
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Search textiles, spices, brassware, leather, or engineering goods
            </p>

            <div className="relative mt-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={hsnQuery}
                onChange={(e) => setHsnQuery(e.target.value)}
                placeholder="Search HS code or product (e.g. 5208, brass, spice)"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 pl-9 pr-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
              />
            </div>

            <div className="mt-4 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[380px]">
              {filteredHsnList.map((entry) => {
                const isSelected = entry.hsCode === activeHsn.hsCode;
                return (
                  <button
                    key={entry.hsCode}
                    type="button"
                    onClick={() => setSelectedHsCode(entry.hsCode)}
                    className={`w-full text-left py-3 px-3 rounded-xl transition-colors ${
                      isSelected ? 'bg-[#0F3D5E]/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="font-bold text-[#0F3D5E]">
                        HS {entry.hsCode}
                      </span>
                      <span className="text-slate-500">{entry.category}</span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-800 leading-snug">
                      {entry.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* FTA Benefit & Export Incentive Calculator */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <p className="text-xs font-mono font-semibold text-[#0F3D5E]">
                  HS {activeHsn.hsCode} · {activeHsn.category}
                </p>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  {activeHsn.description}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {activeHsn.gstExportRule}
                </p>
              </div>
              <Calculator className="w-5 h-5 text-[#0F3D5E] shrink-0" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-medium text-slate-700">
                  Destination Market (FTA Check)
                </span>
                <select
                  value={destCountry}
                  onChange={(e) =>
                    setDestCountry(
                      e.target.value as 'UAE' | 'Australia' | 'UK' | 'EU' | 'USA'
                    )
                  }
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
                >
                  <option value="UAE">UAE (India-UAE CEPA)</option>
                  <option value="Australia">Australia (IndAus ECTA)</option>
                  <option value="UK">United Kingdom (DCTS)</option>
                  <option value="EU">European Union (GSP)</option>
                  <option value="USA">United States (MFN)</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-700">
                  Shipment FOB Value (USD)
                </span>
                <input
                  type="number"
                  min={100}
                  step={500}
                  value={estimatorFobUsd}
                  onChange={(e) =>
                    setEstimatorFobUsd(Math.max(0, Number(e.target.value)))
                  }
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-500">Destination Import Duty</p>
                <p className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">
                  {destTariff.fta.toFixed(1)}%{' '}
                  <span className="text-xs font-normal text-slate-500 line-through">
                    {destTariff.mfn.toFixed(1)}%
                  </span>
                </p>
                <p className="mt-1 text-xs font-medium text-[#0F3D5E]">
                  {destTariff.agreement}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-500">Buyer Duty Saved via FTA</p>
                <p className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-700">
                  {formatFx(buyerDutySavingsUsd, 'USD')}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Competitive pitch for buyer
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-500">Exporter Incentive (India)</p>
                <p className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-700">
                  {formatInr(exporterRodtepInr + exporterDrawbackInr)}
                </p>
                <p className="mt-1 text-xs text-slate-600 font-mono tabular-nums">
                  RoDTEP {activeHsn.rodtepPct}% + DBK {activeHsn.drawbackPct}%
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">
                Origin & Compliance Rule for {destCountry}
              </p>
              <p>{destTariff.rule}</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
