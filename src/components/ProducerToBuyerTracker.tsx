import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  MessageSquareShare,
  PackageCheck,
  Plus,
  Printer,
  QrCode,
  Search,
  UserCheck,
  X,
} from 'lucide-react';
import { CUSTODY_STAGES } from '../data/seedData';
import type {
  CustodyStageKey,
  ExportEntity,
  ExportOrder,
  ProductBatchTrace,
  TeamMemberAccess,
  UserRoleKey,
} from '../types/export';
import { hasEntityPermission } from '../utils/formatters';
import { QrCodeSvg } from './QrCodeSvg';

interface ProducerToBuyerTrackerProps {
  entities: ExportEntity[];
  activeEntityId: string;
  orders: ExportOrder[];
  batchTraces: ProductBatchTrace[];
  selectedTraceId: string;
  onSelectTrace: (traceId: string) => void;
  activeRole: UserRoleKey;
  teamMatrix: TeamMemberAccess[];
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

export const ProducerToBuyerTracker: React.FC<ProducerToBuyerTrackerProps> = ({
  entities,
  activeEntityId,
  orders,
  batchTraces,
  selectedTraceId,
  onSelectTrace,
  activeRole,
  teamMatrix,
  onLogBatchIntake,
  onRecordHandoff,
  onShareWhatsApp,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [showBuyerPass, setShowBuyerPass] = useState(false);

  // Inline Handoff Logger state
  const [custodianName, setCustodianName] = useState('');
  const [location, setLocation] = useState('');
  const [verifiedWeightKg, setVerifiedWeightKg] = useState<number>(0);
  const [verifiedQty, setVerifiedQty] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // New Producer Batch Intake Modal state
  const scopedOrders = useMemo(() => {
    if (activeEntityId === 'all') return orders;
    return orders.filter((o) => o.entityId === activeEntityId);
  }, [orders, activeEntityId]);

  const [intakeOrderId, setIntakeOrderId] = useState(scopedOrders[0]?.id ?? '');
  const [intakeProducerName, setIntakeProducerName] = useState('');
  const [intakeProducerLocation, setIntakeProducerLocation] = useState('');
  const [intakeReceivedQty, setIntakeReceivedQty] = useState<number>(0);
  const [intakeReceivedWeight, setIntakeReceivedWeight] = useState<number>(0);
  const [intakeNotes, setIntakeNotes] = useState('');

  React.useEffect(() => {
    if (scopedOrders.length > 0 && !scopedOrders.some((o) => o.id === intakeOrderId)) {
      const first = scopedOrders[0];
      setIntakeOrderId(first.id);
      setIntakeReceivedQty(first.items[0]?.qty ?? 100);
      setIntakeReceivedWeight(first.items[0]?.netWeightKg ?? 100);
    }
  }, [scopedOrders, intakeOrderId]);

  const scopedTraces = useMemo(() => {
    const byEntity =
      activeEntityId === 'all'
        ? batchTraces
        : batchTraces.filter((t) => t.entityId === activeEntityId);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byEntity;
    return byEntity.filter(
      (t) =>
        t.batchCode.toLowerCase().includes(q) ||
        t.producerName.toLowerCase().includes(q) ||
        t.productName.toLowerCase().includes(q)
    );
  }, [batchTraces, activeEntityId, searchQuery]);

  const activeTrace =
    scopedTraces.find((t) => t.id === selectedTraceId) ?? scopedTraces[0];

  const linkedOrder = orders.find((o) => o.id === activeTrace?.orderId);
  const linkedEntity = entities.find((e) => e.id === activeTrace?.entityId);

  const completedCount = activeTrace
    ? activeTrace.checkpoints.filter((c) => c.completed).length
    : 0;
  const nextCheckpoint = activeTrace?.checkpoints.find((c) => !c.completed);

  // Pre-fill inline handoff fields when activeTrace or nextCheckpoint changes
  React.useEffect(() => {
    if (!activeTrace || !nextCheckpoint) return;
    const defaultLocations: Record<CustodyStageKey, string> = {
      producer_receipt: activeTrace.producerLocation,
      qc_inspection: `${linkedEntity?.city ?? 'Origin'} QA Inspection Lab`,
      warehouse_packing: `${linkedEntity?.city ?? 'Export'} Packhouse`,
      port_customs: linkedEntity?.portOfLoading ?? 'Indian Gateway Port',
      buyer_delivery: linkedOrder?.buyerPort ?? 'Buyer Warehouse',
    };
    const defaultCustodians: Record<CustodyStageKey, string> = {
      producer_receipt: 'Field Procurement Lead',
      qc_inspection: 'QA & Weight Inspector',
      warehouse_packing: 'Warehouse Dispatch Lead',
      port_customs: 'Licensed CHA / Customs Desk',
      buyer_delivery: linkedOrder?.buyerName ?? 'Buyer Receiving Team',
    };
    setCustodianName(defaultCustodians[nextCheckpoint.stage]);
    setLocation(defaultLocations[nextCheckpoint.stage]);
    setVerifiedWeightKg(activeTrace.receivedWeightKg);
    setVerifiedQty(activeTrace.receivedQty);
    setNotes('');
  }, [activeTrace?.id, nextCheckpoint?.stage, linkedEntity, linkedOrder]);

  const canLogStage = (stage: CustodyStageKey): boolean => {
    if (activeRole === 'owner') return true;
    if (!activeTrace) return false;
    const hasDispatch = hasEntityPermission(
      activeRole,
      teamMatrix,
      activeTrace.entityId,
      'packing_dispatch'
    );
    const hasCustoms = hasEntityPermission(
      activeRole,
      teamMatrix,
      activeTrace.entityId,
      'customs_icegate'
    );
    if (
      stage === 'producer_receipt' ||
      stage === 'qc_inspection' ||
      stage === 'warehouse_packing'
    ) {
      return hasDispatch;
    }
    if (stage === 'port_customs') {
      return hasCustoms;
    }
    return hasDispatch || hasCustoms;
  };

  const handleOpenIntake = () => {
    const ord = scopedOrders[0];
    if (ord) {
      setIntakeOrderId(ord.id);
      setIntakeReceivedQty(ord.items[0]?.qty ?? 100);
      setIntakeReceivedWeight(ord.items[0]?.netWeightKg ?? 100);
    }
    setIntakeProducerName('');
    setIntakeProducerLocation('');
    setIntakeNotes('');
    setShowIntakeModal(true);
  };

  const handleIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ord = orders.find((o) => o.id === intakeOrderId);
    const ent = entities.find((e) => e.id === ord?.entityId);
    if (!ord || !ent || !intakeProducerName.trim()) return;

    const item = ord.items[0];
    const expectedQty = item?.qty ?? intakeReceivedQty;
    const expectedWeight = item?.netWeightKg ?? intakeReceivedWeight;
    const weightDiff = Math.abs(intakeReceivedWeight - expectedWeight);
    const hasVariance =
      intakeReceivedQty !== expectedQty || weightDiff > expectedWeight * 0.01;

    const batchCode = `LOT-${ent.invoicePrefix.slice(0, 3)}-26-${Math.floor(
      100 + Math.random() * 899
    )}`;
    const nowLabel = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const newTrace: ProductBatchTrace = {
      id: `trace-${Date.now()}`,
      entityId: ent.id,
      orderId: ord.id,
      batchCode,
      productName: item?.description ?? 'Export Goods Batch',
      sku: item?.sku ?? 'EXP-SKU-01',
      hsCode: item?.hsCode ?? '0000.00.00',
      producerName: intakeProducerName.trim(),
      producerLocation: intakeProducerLocation.trim() || `${ent.city}, ${ent.state}`,
      receivedDate: new Date().toISOString().slice(0, 10),
      expectedQty,
      receivedQty: intakeReceivedQty,
      unit: item?.unit ?? 'Units',
      expectedWeightKg: expectedWeight,
      receivedWeightKg: intakeReceivedWeight,
      qcStatus: hasVariance ? 'Minor Variance' : 'Pending QC',
      checkpoints: CUSTODY_STAGES.map((st, idx) =>
        idx === 0
          ? {
              stage: st.key,
              label: st.label,
              completed: true,
              timestamp: `${nowLabel} · Intake Logged`,
              custodianName: `${ent.signatory} / Intake Desk`,
              location: intakeProducerLocation.trim() || `${ent.city}, ${ent.state}`,
              verifiedWeightKg: intakeReceivedWeight,
              verifiedQty: intakeReceivedQty,
              notes:
                intakeNotes.trim() ||
                `Received batch ${batchCode} from ${intakeProducerName.trim()} against ${ord.ciNumber}.`,
            }
          : {
              stage: st.key,
              label: st.label,
              completed: false,
            }
      ),
    };

    onLogBatchIntake(newTrace);
    onSelectTrace(newTrace.id);
    setShowIntakeModal(false);
  };

  const handleHandoffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrace || !nextCheckpoint) return;
    onRecordHandoff(activeTrace.id, nextCheckpoint.stage, {
      custodianName: custodianName.trim() || 'Authorized Handler',
      location: location.trim() || 'Facility',
      verifiedWeightKg,
      verifiedQty,
      notes: notes.trim() || `${nextCheckpoint.label} verified without discrepancy.`,
    });
  };

  const shareBuyerPass = () => {
    if (!activeTrace || !linkedEntity) return;
    const completedStages = activeTrace.checkpoints.filter((c) => c.completed);
    const latest = completedStages[completedStages.length - 1];
    const msg = [
      `*NiryatSetu Provenance & Custody Pass*`,
      `Batch Lot: ${activeTrace.batchCode} | Invoice: ${linkedOrder?.ciNumber ?? 'N/A'}`,
      `Exporter: ${linkedEntity.legalName} (IEC ${linkedEntity.iec})`,
      `Product: ${activeTrace.productName} (HS ${activeTrace.hsCode})`,
      `Origin Producer: ${activeTrace.producerName}, ${activeTrace.producerLocation}`,
      `Progress: ${completedCount}/5 Verified Handoffs`,
      `Latest Checkpoint: ${latest?.label ?? 'Producer Intake'} (${latest?.location ?? ''})`,
      `Track Pass: https://niryatsetu.trade/provenance/${activeTrace.batchCode}`,
    ].join('\n');

    onShareWhatsApp(
      `Share Buyer Tracking Pass (${activeTrace.batchCode})`,
      msg,
      linkedOrder?.buyerContact
    );
  };

  const canLogIntake =
    activeRole === 'owner' ||
    hasEntityPermission(activeRole, teamMatrix, activeEntityId, 'packing_dispatch');

  return (
    <div className="space-y-6">
      {/* Top Action & Search Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Producer-to-Buyer Chain-of-Custody
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify every batch from artisan or grower receipt through QC, export packing, customs, and final buyer receipt
          </p>
        </div>

        {canLogIntake && (
          <button
            type="button"
            onClick={handleOpenIntake}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F3D5E] text-xs font-semibold text-white hover:bg-[#0b2f49] transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Log Producer Intake</span>
          </button>
        )}
      </div>

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Batch Selector List */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lot code, producer, or item..."
              className="w-full min-h-[42px] rounded-xl border border-slate-300 pl-9 pr-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
            />
          </div>

          <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
            {scopedTraces.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  No producer batches logged
                </p>
                <p className="text-xs text-slate-500">
                  Record your first artisan or farm batch receipt to start tracking custody to the buyer.
                </p>
              </div>
            ) : (
              scopedTraces.map((trace) => {
                const isSelected = trace.id === activeTrace?.id;
                const ord = orders.find((o) => o.id === trace.orderId);
                const done = trace.checkpoints.filter((c) => c.completed).length;
                const wtDelta = Number(
                  (trace.receivedWeightKg - trace.expectedWeightKg).toFixed(1)
                );

                return (
                  <button
                    key={trace.id}
                    type="button"
                    onClick={() => onSelectTrace(trace.id)}
                    className={`w-full text-left py-3.5 px-3 rounded-xl transition-colors space-y-1 ${
                      isSelected ? 'bg-[#0F3D5E]/6' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="font-bold text-[#0F3D5E]">
                        {trace.batchCode}
                      </span>
                      <span
                        className={`font-semibold ${
                          done === 5 ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {done}/5 Stages
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 leading-snug">
                      {trace.producerName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {trace.productName}
                    </p>
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 pt-0.5">
                      <span>{ord?.ciNumber ?? 'Unlinked'}</span>
                      <span>
                        {wtDelta === 0
                          ? '0.0 kg variance'
                          : `${wtDelta > 0 ? '+' : ''}${wtDelta} kg diff`}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Detailed Custody Timeline & Handoff Logger */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 space-y-6">
          {!activeTrace ? (
            <div className="py-12 text-center space-y-3">
              <PackageCheck className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-base font-semibold text-slate-900">
                Select or log a producer batch
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Track product provenance from producer intake all the way to buyer delivery confirmation.
              </p>
            </div>
          ) : (
            <>
              {/* Batch Provenance Summary */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono tabular-nums text-slate-600">
                    <span className="font-bold text-[#0F3D5E]">
                      {activeTrace.batchCode}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>HS {activeTrace.hsCode}</span>
                    <span aria-hidden="true">·</span>
                    <span>{linkedOrder?.ciNumber ?? 'Draft Lot'}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-semibold font-sans ${
                        activeTrace.qcStatus === 'Passed'
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      QC: {activeTrace.qcStatus}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {activeTrace.productName}
                  </h2>
                  <p className="text-xs text-slate-600">
                    Producer: <span className="font-semibold text-slate-800">{activeTrace.producerName}</span> ({activeTrace.producerLocation}) → Buyer: <span className="font-semibold text-slate-800">{linkedOrder?.buyerName ?? 'Pending Buyer'}</span> ({linkedOrder?.buyerPort ?? ''})
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowBuyerPass(true)}
                    className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <QrCode className="w-4 h-4 text-[#0F3D5E]" />
                    <span>Buyer QR Pass</span>
                  </button>
                  <button
                    type="button"
                    onClick={shareBuyerPass}
                    className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F3D5E] text-xs font-semibold text-white hover:bg-[#0b2f49] whitespace-nowrap"
                  >
                    <MessageSquareShare className="w-4 h-4" />
                    <span>WhatsApp Buyer</span>
                  </button>
                </div>
              </div>

              {/* Weight & Quantity Reconciliation Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-5 border-b border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">Producer Intake Qty</p>
                  <p className="mt-0.5 text-sm font-bold font-mono tabular-nums text-slate-900">
                    {activeTrace.receivedQty.toLocaleString('en-IN')} /{' '}
                    {activeTrace.expectedQty.toLocaleString('en-IN')} {activeTrace.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Verified Net Weight</p>
                  <p className="mt-0.5 text-sm font-bold font-mono tabular-nums text-slate-900">
                    {activeTrace.receivedWeightKg.toFixed(1)} kg
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Packing List Target</p>
                  <p className="mt-0.5 text-sm font-bold font-mono tabular-nums text-slate-900">
                    {activeTrace.expectedWeightKg.toFixed(1)} kg
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Chain Progress</p>
                  <p className="mt-0.5 text-sm font-bold font-mono tabular-nums text-emerald-700">
                    {completedCount} of 5 Verified
                  </p>
                </div>
              </div>

              {/* 5-Stage Custody Audit Timeline */}
              <div className="space-y-4">
                {activeTrace.checkpoints.map((cp) => {
                  const isNext = nextCheckpoint?.stage === cp.stage;
                  const allowedToLog = isNext && canLogStage(cp.stage);

                  return (
                    <div
                      key={cp.stage}
                      className={`p-4 rounded-xl border ${
                        cp.completed
                          ? 'border-slate-200 bg-white'
                          : isNext
                          ? 'border-[#0F3D5E]/40 bg-[#0F3D5E]/[0.03]'
                          : 'border-slate-100 bg-slate-50/60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 ${
                              cp.completed
                                ? 'text-emerald-700'
                                : isNext
                                ? 'text-[#0F3D5E]'
                                : 'text-slate-300'
                            }`}
                          />
                          <h3
                            className={`text-sm font-semibold ${
                              cp.completed || isNext
                                ? 'text-slate-900'
                                : 'text-slate-400'
                            }`}
                          >
                            {cp.label}
                          </h3>
                        </div>

                        {cp.completed && cp.timestamp ? (
                          <span className="text-xs font-mono tabular-nums text-slate-500">
                            {cp.timestamp}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-500">
                            {isNext ? 'Awaiting Handoff Verification' : 'Pending'}
                          </span>
                        )}
                      </div>

                      {cp.completed && (
                        <div className="mt-2.5 pl-6 space-y-1 text-xs text-slate-600">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                              {cp.custodianName}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {cp.location}
                            </span>
                            <span className="font-mono tabular-nums text-slate-700">
                              {cp.verifiedQty?.toLocaleString('en-IN')} {activeTrace.unit} ·{' '}
                              {cp.verifiedWeightKg?.toFixed(1)} kg
                            </span>
                          </div>
                          {cp.notes && (
                            <p className="text-slate-600 leading-relaxed">
                              {cp.notes}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Inline Handoff Check-in Form for Next Pending Stage */}
                      {isNext && (
                        <div className="mt-3 pl-0 sm:pl-6">
                          {!allowedToLog ? (
                            <p className="text-xs text-amber-700">
                              Current role ({activeRole}) is read-only for this stage. Switch role to Owner, Warehouse, or CHA to record this handoff.
                            </p>
                          ) : (
                            <form
                              onSubmit={handleHandoffSubmit}
                              className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="block">
                                  <span className="text-[11px] font-medium text-slate-600">
                                    Custodian / Receiving Handler
                                  </span>
                                  <input
                                    type="text"
                                    required
                                    value={custodianName}
                                    onChange={(e) => setCustodianName(e.target.value)}
                                    className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-[11px] font-medium text-slate-600">
                                    Facility / Port / Buyer Location
                                  </span>
                                  <input
                                    type="text"
                                    required
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
                                  />
                                </label>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <label className="block">
                                  <span className="text-[11px] font-medium text-slate-600">
                                    Verified Qty ({activeTrace.unit})
                                  </span>
                                  <input
                                    type="number"
                                    min={1}
                                    required
                                    value={verifiedQty}
                                    onChange={(e) =>
                                      setVerifiedQty(Number(e.target.value))
                                    }
                                    className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-xs font-mono tabular-nums text-slate-900"
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-[11px] font-medium text-slate-600">
                                    Verified Net Wt (kg)
                                  </span>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min={0.1}
                                    required
                                    value={verifiedWeightKg}
                                    onChange={(e) =>
                                      setVerifiedWeightKg(Number(e.target.value))
                                    }
                                    className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-xs font-mono tabular-nums text-slate-900"
                                  />
                                </label>
                                <label className="block col-span-2">
                                  <span className="text-[11px] font-medium text-slate-600">
                                    Inspection / Seal / POD Remarks
                                  </span>
                                  <input
                                    type="text"
                                    placeholder={
                                      cp.stage === 'buyer_delivery'
                                        ? 'e.g. POD signed cleanly, cartons intact'
                                        : 'e.g. Carton seal #8821 verified, moisture nominal'
                                    }
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-xs text-slate-900"
                                  />
                                </label>
                              </div>

                              <div className="flex justify-end">
                                <button
                                  type="submit"
                                  className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F3D5E] text-xs font-semibold text-white hover:bg-[#0b2f49] whitespace-nowrap"
                                >
                                  <ClipboardCheck className="w-4 h-4" />
                                  <span>
                                    {cp.stage === 'buyer_delivery'
                                      ? 'Confirm Buyer Delivery'
                                      : 'Verify & Log Handoff'}
                                  </span>
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Log New Producer Batch Intake Modal */}
      {showIntakeModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4 no-print"
          role="dialog"
          aria-modal="true"
          aria-label="Log Producer Batch Intake"
        >
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="sm:hidden w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-3" />
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Log Producer / Artisan Batch Intake
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Start chain-of-custody tracking from raw receipt to international buyer
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIntakeModal(false)}
                aria-label="Close modal"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIntakeSubmit} className="p-5 space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-slate-700">
                  Link to Export Order / Commercial Invoice
                </span>
                <select
                  value={intakeOrderId}
                  onChange={(e) => {
                    const ord = orders.find((o) => o.id === e.target.value);
                    setIntakeOrderId(e.target.value);
                    if (ord?.items[0]) {
                      setIntakeReceivedQty(ord.items[0].qty);
                      setIntakeReceivedWeight(ord.items[0].netWeightKg);
                    }
                  }}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                >
                  {scopedOrders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      {ord.ciNumber} — {ord.buyerName} ({ord.items[0]?.description})
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-slate-700">
                    Producer / Artisan Cluster Name
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bagru Weavers Collective"
                    value={intakeProducerName}
                    onChange={(e) => setIntakeProducerName(e.target.value)}
                    className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-700">
                    Producer Village / City
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Bagru, Jaipur (RJ)"
                    value={intakeProducerLocation}
                    onChange={(e) => setIntakeProducerLocation(e.target.value)}
                    className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-slate-700">
                    Received Qty
                  </span>
                  <input
                    type="number"
                    min={1}
                    required
                    value={intakeReceivedQty}
                    onChange={(e) => setIntakeReceivedQty(Number(e.target.value))}
                    className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-mono tabular-nums"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-700">
                    Received Net Weight (kg)
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    min={0.1}
                    required
                    value={intakeReceivedWeight}
                    onChange={(e) =>
                      setIntakeReceivedWeight(Number(e.target.value))
                    }
                    className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-mono tabular-nums"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-slate-700">
                  Intake Remarks
                </span>
                <input
                  type="text"
                  placeholder="Condition on arrival from producer/factory..."
                  value={intakeNotes}
                  onChange={(e) => setIntakeNotes(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#0F3D5E] text-sm font-semibold text-white hover:bg-[#0b2f49]"
                >
                  Register Batch & Start Tracking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Buyer Provenance QR Pass Modal */}
      {showBuyerPass && activeTrace && linkedEntity && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Buyer Provenance QR Pass"
        >
          <div className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl print-only-doc">
            <div className="sm:hidden w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 no-print" />
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 no-print">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Buyer Provenance & Tracking Pass
                </h3>
                <p className="text-xs text-slate-500">
                  Read-only buyer audit view · Attach QR to export cartons or share via WhatsApp
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBuyerPass(false)}
                aria-label="Close buyer pass"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div className="space-y-1">
                  <p className="text-xs font-mono font-bold text-[#0F3D5E]">
                    PROVENANCE PASS · {activeTrace.batchCode}
                  </p>
                  <h4 className="text-lg font-bold text-slate-900">
                    {activeTrace.productName}
                  </h4>
                  <p className="text-xs text-slate-600">
                    Exporter: {linkedEntity.legalName} (IEC {linkedEntity.iec})
                  </p>
                  <p className="text-xs text-slate-600">
                    Origin Producer: {activeTrace.producerName} ·{' '}
                    {activeTrace.producerLocation}
                  </p>
                  <p className="text-xs font-mono tabular-nums text-slate-500">
                    Buyer: {linkedOrder?.buyerName} · {linkedOrder?.ciNumber}
                  </p>
                </div>

                <div className="shrink-0">
                  <QrCodeSvg
                    value={`https://niryatsetu.trade/provenance/${activeTrace.batchCode}`}
                    size={128}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-slate-700">
                  Verified Chain-of-Custody Audit Trail ({completedCount}/5)
                </p>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl px-4">
                  {activeTrace.checkpoints.map((cp) => (
                    <div
                      key={cp.stage}
                      className="py-2.5 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <p
                          className={`font-semibold ${
                            cp.completed ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {cp.label}
                        </p>
                        {cp.completed && (
                          <p className="text-slate-600 mt-0.5">
                            {cp.location} · {cp.custodianName}
                          </p>
                        )}
                      </div>
                      <span className="font-mono tabular-nums text-slate-500 shrink-0">
                        {cp.completed ? cp.timestamp : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2 no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print QR Carton Label</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBuyerPass(false);
                    shareBuyerPass();
                  }}
                  className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F3D5E] text-xs font-semibold text-white hover:bg-[#0b2f49]"
                >
                  <MessageSquareShare className="w-4 h-4" />
                  <span>Send Pass on WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
