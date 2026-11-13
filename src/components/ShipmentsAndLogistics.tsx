import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Container,
  MessageSquareShare,
  Plane,
  Ship,
  Truck,
} from 'lucide-react';
import type {
  CustodyStageKey,
  ExportEntity,
  ExportOrder,
  FreightQuote,
  ProductBatchTrace,
  ShipmentStage,
  TeamMemberAccess,
  UserRoleKey,
} from '../types/export';
import { hasEntityPermission } from '../utils/formatters';
import { ProducerToBuyerTracker } from './ProducerToBuyerTracker';

interface ShipmentsAndLogisticsProps {
  entities: ExportEntity[];
  activeEntityId: string;
  orders: ExportOrder[];
  freightQuotes: FreightQuote[];
  batchTraces: ProductBatchTrace[];
  selectedTraceId: string;
  onSelectTrace: (traceId: string) => void;
  subView: 'freight' | 'custody';
  onChangeSubView: (view: 'freight' | 'custody') => void;
  activeRole: UserRoleKey;
  teamMatrix: TeamMemberAccess[];
  onAdvanceShipment: (orderId: string, nextStage: ShipmentStage) => void;
  onSelectFreightQuote: (quoteId: string) => void;
  onLogBatchIntake: (trace: ProductBatchTrace) => void;
  onRecordHandoff: (
    traceId: string,
    stage: CustodyStageKey,
    payload: {
      custodianName: string;
      location: string;
      verifiedWeightKg: number;
      verifiedQty: number;
      notes: string;
    }
  ) => void;
  onShareWhatsApp: (title: string, message: string, phone?: string) => void;
}

const STAGES: ShipmentStage[] = [
  'Factory Gate-Out',
  'Port Customs Clearance',
  'Vessel Departed',
  'Destination Arrival',
];

export const ShipmentsAndLogistics: React.FC<ShipmentsAndLogisticsProps> = ({
  entities,
  activeEntityId,
  orders,
  freightQuotes,
  batchTraces,
  selectedTraceId,
  onSelectTrace,
  subView,
  onChangeSubView,
  activeRole,
  teamMatrix,
  onAdvanceShipment,
  onSelectFreightQuote,
  onLogBatchIntake,
  onRecordHandoff,
  onShareWhatsApp,
}) => {
  const [modeFilter, setModeFilter] = useState<string>('All');

  const scopedOrders = useMemo(() => {
    if (activeEntityId === 'all') return orders;
    return orders.filter((o) => o.entityId === activeEntityId);
  }, [orders, activeEntityId]);

  const filteredQuotes = useMemo(() => {
    if (modeFilter === 'All') return freightQuotes;
    return freightQuotes.filter((q) => q.mode === modeFilter);
  }, [freightQuotes, modeFilter]);

  const canUpdateDispatch =
    hasEntityPermission(activeRole, teamMatrix, activeEntityId, 'packing_dispatch') ||
    hasEntityPermission(activeRole, teamMatrix, activeEntityId, 'customs_icegate');

  const shareTrackingLink = (order: ExportOrder) => {
    const ent = entities.find((e) => e.id === order.entityId);
    const msg = [
      `*Shipment Update — ${ent?.shortName}*`,
      `Invoice: ${order.ciNumber} | Container: ${order.containerNo}`,
      `Vessel: ${order.vesselName}`,
      `Current Milestone: ${order.shipmentStage}`,
      `Port of Discharge: ${order.buyerPort} | ETA: ${order.eta}`,
      `Live Status: https://niryatsetu.trade/track/${order.containerNo}`,
    ].join('\n');
    onShareWhatsApp(
      `Share Tracking: ${order.containerNo}`,
      msg,
      order.buyerContact
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Segmented Switcher: Container & Freight vs Producer-to-Buyer Custody */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-3 sm:px-5 sm:py-3.5 no-print">
        <p className="text-xs font-medium text-slate-600">
          Switch between port-to-port container tracking and full producer-to-buyer batch custody
        </p>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => onChangeSubView('freight')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              subView === 'freight'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Container & Freight
          </button>
          <button
            type="button"
            onClick={() => onChangeSubView('custody')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              subView === 'custody'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Producer-to-Buyer Custody
          </button>
        </div>
      </div>

      {subView === 'custody' ? (
        <ProducerToBuyerTracker
          entities={entities}
          activeEntityId={activeEntityId}
          orders={orders}
          batchTraces={batchTraces}
          selectedTraceId={selectedTraceId}
          onSelectTrace={onSelectTrace}
          activeRole={activeRole}
          teamMatrix={teamMatrix}
          onLogBatchIntake={onLogBatchIntake}
          onRecordHandoff={onRecordHandoff}
          onShareWhatsApp={onShareWhatsApp}
        />
      ) : (
        <>
          {/* Container & Live Shipment Milestone Tracker */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  Live Container & Shipment Milestones
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track cargo from factory gate-out through Indian port customs to destination arrival
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Container className="w-4 h-4 text-[#0F3D5E]" />
                <span>{scopedOrders.length} Active Shipments</span>
              </div>
            </div>

            <div className="space-y-5">
          {scopedOrders.map((order) => {
            const ent = entities.find((e) => e.id === order.entityId);
            const currentIdx = STAGES.indexOf(order.shipmentStage);
            const nextStage =
              currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null;

            return (
              <div
                key={order.id}
                className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="text-sm font-bold font-mono text-slate-900">
                        {order.containerNo}
                      </span>
                      <span className="text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-sm font-semibold text-slate-800">
                        {order.buyerName}
                      </span>
                      <span className="text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs text-slate-600">
                        {ent?.shortName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      {order.ciNumber} · {order.vesselName} · {order.buyerPort} · ETA {order.eta}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {nextStage && canUpdateDispatch && (
                      <button
                        type="button"
                        onClick={() => onAdvanceShipment(order.id, nextStage)}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0F3D5E] text-xs font-semibold text-white hover:bg-[#0b2f49] whitespace-nowrap"
                      >
                        Advance to {nextStage}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => shareTrackingLink(order)}
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                    >
                      <MessageSquareShare className="w-4 h-4 text-[#0F3D5E]" />
                      <span>Share Buyer Link</span>
                    </button>
                  </div>
                </div>

                {/* 4-Stage Milestone Stepper */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {STAGES.map((stage, idx) => {
                    const completed = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;
                    return (
                      <div key={stage} className="space-y-1.5">
                        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              completed ? 'bg-[#0F3D5E]' : 'bg-transparent'
                            }`}
                            style={{ width: completed ? '100%' : '0%' }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 shrink-0 ${
                              completed ? 'text-emerald-700' : 'text-slate-300'
                            }`}
                          />
                          <span
                            className={`${
                              isCurrent
                                ? 'font-semibold text-slate-900'
                                : completed
                                ? 'font-medium text-slate-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {stage}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Freight Quote Comparison Matrix */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Freight Forwarder Quote Comparison
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare FCL, LCL, Air Cargo, and Express Courier rates across Indian gateways
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
            {['All', 'Sea FCL 20ft', 'Sea LCL', 'Air Freight', 'Express Courier'].map(
              (mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setModeFilter(mode)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    modeFilter === mode
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode}
                </button>
              )
            )}
          </div>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2.5 pr-4">Forwarder & Mode</th>
                <th className="py-2.5 pr-4">Corridor</th>
                <th className="py-2.5 pr-4 text-right">Transit</th>
                <th className="py-2.5 pr-4 text-right">Detention Free</th>
                <th className="py-2.5 pr-4 text-right">All-In Rate (USD)</th>
                <th className="py-2.5 pr-4">Terms / Notes</th>
                <th className="py-2.5 text-right">Booking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredQuotes.map((quote) => {
                const isBooked = Boolean(quote.selectedForOrderId);
                return (
                  <tr key={quote.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-900">
                        {quote.forwarder}
                      </p>
                      <p className="text-xs text-slate-500 inline-flex items-center gap-1">
                        {quote.mode.includes('Air') || quote.mode.includes('Courier') ? (
                          <Plane className="w-3 h-3" />
                        ) : quote.mode.includes('LCL') ? (
                          <Truck className="w-3 h-3" />
                        ) : (
                          <Ship className="w-3 h-3" />
                        )}
                        <span>{quote.mode}</span>
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-700 font-mono">
                      {quote.originPort} → {quote.destinationPort}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-xs">
                      {quote.transitDays} days
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-xs">
                      {quote.freeDetentionDays} days
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      ${quote.rateUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-500 max-w-[220px]">
                      {quote.surchargesNote}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectFreightQuote(quote.id)}
                        className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                          isBooked
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'border border-slate-300 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {isBooked ? 'Locked Quote' : 'Lock Rate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
        </>
      )}
    </div>
  );
};
