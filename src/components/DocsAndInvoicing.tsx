import React, { useMemo, useState } from 'react';
import {
  MessageSquareShare,
  Plus,
  Printer,
  ShieldAlert,
} from 'lucide-react';
import type {
  ExportEntity,
  ExportOrder,
  TeamMemberAccess,
  UserRoleKey,
} from '../types/export';
import { formatFx, formatInr, hasEntityPermission } from '../utils/formatters';

type DocKind = 'PI' | 'CI' | 'PL' | 'COO' | 'SLI';

interface DocsAndInvoicingProps {
  entities: ExportEntity[];
  activeEntityId: string;
  orders: ExportOrder[];
  selectedOrderId: string;
  onSelectOrder: (orderId: string) => void;
  activeRole: UserRoleKey;
  teamMatrix: TeamMemberAccess[];
  onOpenNewOrder: () => void;
  onShareWhatsApp: (title: string, message: string, phone?: string) => void;
}

export const DocsAndInvoicing: React.FC<DocsAndInvoicingProps> = ({
  entities,
  activeEntityId,
  orders,
  selectedOrderId,
  onSelectOrder,
  activeRole,
  teamMatrix,
  onOpenNewOrder,
  onShareWhatsApp,
}) => {
  const [docKind, setDocKind] = useState<DocKind>('CI');
  const [ftaScheme, setFtaScheme] = useState<'Non-Preferential' | 'India-UAE CEPA' | 'IndAus ECTA'>('India-UAE CEPA');

  const scopedOrders = useMemo(() => {
    if (activeEntityId === 'all') return orders;
    return orders.filter((o) => o.entityId === activeEntityId);
  }, [orders, activeEntityId]);

  const activeOrder =
    scopedOrders.find((o) => o.id === selectedOrderId) ?? scopedOrders[0];

  const entity = entities.find((e) => e.id === activeOrder?.entityId);

  const isWarehouseOnly =
    activeRole === 'warehouse' &&
    !hasEntityPermission(activeRole, teamMatrix, activeOrder?.entityId ?? activeEntityId, 'invoices_pi');

  React.useEffect(() => {
    if (isWarehouseOnly && docKind !== 'PL' && docKind !== 'SLI') {
      setDocKind('PL');
    }
  }, [isWarehouseOnly, docKind]);

  if (!activeOrder || !entity) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
        <p className="text-base font-semibold text-slate-900">
          No export orders found for this entity
        </p>
        <p className="text-sm text-slate-500">
          Create your first order to generate compliant Proforma, Commercial Invoice, Packing List, and CoO drafts.
        </p>
        <button
          type="button"
          onClick={onOpenNewOrder}
          className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F3D5E] text-sm font-medium text-white hover:bg-[#0b2f49]"
        >
          <Plus className="w-4 h-4" />
          <span>Create First Export Order</span>
        </button>
      </div>
    );
  }

  const goodsSubtotalFx = activeOrder.items.reduce(
    (sum, item) => sum + item.qty * item.unitPriceFx,
    0
  );
  const totalNetKg = activeOrder.items.reduce((sum, i) => sum + i.netWeightKg, 0);
  const totalGrossKg = activeOrder.items.reduce((sum, i) => sum + i.grossWeightKg, 0);
  const totalCartons = activeOrder.items.reduce((sum, i) => sum + i.cartons, 0);

  const docTabs: Array<{ id: DocKind; label: string; restrictedForWarehouse?: boolean }> = [
    { id: 'PI', label: 'Proforma Invoice', restrictedForWarehouse: true },
    { id: 'CI', label: 'Commercial Invoice', restrictedForWarehouse: true },
    { id: 'PL', label: 'Packing List' },
    { id: 'COO', label: 'Certificate of Origin', restrictedForWarehouse: true },
    { id: 'SLI', label: "Shipper's Letter (SLI)" },
  ];

  const handleShareDoc = () => {
    const docTitles: Record<DocKind, string> = {
      PI: `Proforma Invoice ${activeOrder.piNumber}`,
      CI: `Commercial Invoice ${activeOrder.ciNumber}`,
      PL: `Packing List ${activeOrder.packingListNo}`,
      COO: `Certificate of Origin Draft (${ftaScheme})`,
      SLI: `Shipper's Letter of Instruction (${activeOrder.sbNumber})`,
    };
    const msg = [
      `*${entity.legalName}* (IEC: ${entity.iec})`,
      `Document: ${docTitles[docKind]}`,
      `Buyer: ${activeOrder.buyerName}`,
      `Port of Discharge: ${activeOrder.buyerPort} (${activeOrder.incoterm})`,
      docKind !== 'PL'
        ? `Value: ${formatFx(activeOrder.totalFx, activeOrder.currency)} | Terms: ${activeOrder.paymentTerms}`
        : `Cargo: ${totalCartons} Cartons | Net ${totalNetKg} kg / Gross ${totalGrossKg} kg`,
      `Container: ${activeOrder.containerNo} · Vessel: ${activeOrder.vesselName}`,
    ].join('\n');
    onShareWhatsApp(`Send ${docTitles[docKind]}`, msg, activeOrder.buyerContact);
  };

  return (
    <div className="space-y-5">
      {/* Control Toolbar (hidden on print) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <label className="block sm:min-w-[280px]">
              <span className="text-xs font-medium text-slate-500">
                Select Active Order / Bill Series
              </span>
              <select
                value={activeOrder.id}
                onChange={(e) => onSelectOrder(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
              >
                {scopedOrders.map((ord) => (
                  <option key={ord.id} value={ord.id}>
                    {ord.ciNumber} — {ord.buyerName} ({ord.buyerCountry})
                  </option>
                ))}
              </select>
            </label>

            {docKind === 'COO' && (
              <label className="block sm:min-w-[210px]">
                <span className="text-xs font-medium text-slate-500">
                  Origin Agreement Scheme
                </span>
                <select
                  value={ftaScheme}
                  onChange={(e) =>
                    setFtaScheme(
                      e.target.value as
                        | 'Non-Preferential'
                        | 'India-UAE CEPA'
                        | 'IndAus ECTA'
                    )
                  }
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
                >
                  <option value="India-UAE CEPA">India-UAE CEPA (Preferential)</option>
                  <option value="IndAus ECTA">India-Australia ECTA (Preferential)</option>
                  <option value="Non-Preferential">Non-Preferential CoO (FIEO/Chamber)</option>
                </select>
              </label>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!isWarehouseOnly && (
              <button
                type="button"
                onClick={onOpenNewOrder}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>New Order</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleShareDoc}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
            >
              <MessageSquareShare className="w-4 h-4 text-[#0F3D5E]" />
              <span>Share Summary</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F3D5E] text-xs font-semibold text-white hover:bg-[#0b2f49] whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Document Type Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 bg-slate-100 rounded-xl">
          {docTabs.map((tab) => {
            const disabled = isWarehouseOnly && tab.restrictedForWarehouse;
            return (
              <button
                key={tab.id}
                type="button"
                disabled={disabled}
                onClick={() => setDocKind(tab.id)}
                className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  docKind === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : disabled
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {isWarehouseOnly && (
          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              Role Scope (Warehouse Supervisor): Commercial pricing, Proforma Invoices, and FX ledgers are restricted. Packing Lists & Dispatch SLIs remain active.
            </span>
          </div>
        )}
      </div>

      {/* Printable A4 Trade Document Preview */}
      <article className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 print-only-doc">
        {/* Document Masthead */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#0F3D5E]">
              {docKind === 'PI' && 'PROFORMA INVOICE'}
              {docKind === 'CI' && 'COMMERCIAL INVOICE (EXPORT UNDER LUT)'}
              {docKind === 'PL' && 'EXPORT PACKING LIST'}
              {docKind === 'COO' && `CERTIFICATE OF ORIGIN DRAFT — ${ftaScheme.toUpperCase()}`}
              {docKind === 'SLI' && "SHIPPER'S LETTER OF INSTRUCTION (SLI)"}
            </p>
            <h2 className="text-xl font-bold text-slate-900">{entity.legalName}</h2>
            <p className="text-xs text-slate-600">
              {entity.city}, {entity.state}, India · Port of Loading: {entity.portOfLoading}
            </p>
            <div className="text-xs font-mono tabular-nums text-slate-600 flex flex-wrap gap-x-3 pt-1">
              <span>IEC: {entity.iec}</span>
              <span>GSTIN: {entity.gstin}</span>
              <span>AD Code: {entity.adCode}</span>
            </div>
          </div>

          <div className="sm:text-right space-y-1 font-mono tabular-nums">
            <p className="text-sm font-bold text-slate-900">
              {docKind === 'PI' && activeOrder.piNumber}
              {docKind === 'CI' && activeOrder.ciNumber}
              {docKind === 'PL' && activeOrder.packingListNo}
              {docKind === 'COO' && `COO-${activeOrder.ciNumber}`}
              {docKind === 'SLI' && `SLI-${activeOrder.sbNumber}`}
            </p>
            <p className="text-xs text-slate-600">Date: {activeOrder.createdAt}</p>
            <p className="text-xs text-slate-600">
              Shipping Bill: {activeOrder.sbNumber}
            </p>
            <p className="text-xs text-emerald-700 font-medium">
              LUT ARN: {entity.lutArn}
            </p>
          </div>
        </div>

        {/* Consignee & Logistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5 border-b border-slate-200 text-sm">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">
              Consignee / Importer
            </p>
            <p className="font-semibold text-slate-900">{activeOrder.buyerName}</p>
            <p className="text-xs text-slate-600">
              Destination Country: {activeOrder.buyerCountry}
            </p>
            <p className="text-xs text-slate-600">
              Port of Discharge: {activeOrder.buyerPort}
            </p>
            <p className="text-xs text-slate-600 font-mono">
              Contact: {activeOrder.buyerContact}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">
              Shipment & Banking Particulars
            </p>
            <p className="text-xs text-slate-700">
              Incoterm: <span className="font-semibold">{activeOrder.incoterm}</span> · Terms:{' '}
              <span className="font-semibold">{activeOrder.paymentTerms}</span>
            </p>
            <p className="text-xs text-slate-700 font-mono tabular-nums">
              Container: {activeOrder.containerNo} · Vessel: {activeOrder.vesselName}
            </p>
            <p className="text-xs text-slate-700">AD Bank: {entity.adBank}</p>
            {docKind !== 'PL' && (
              <p className="text-xs text-slate-700 font-mono tabular-nums">
                Locked Spot Rate: 1 {activeOrder.currency} = ₹
                {activeOrder.fxLockedRate.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* Document Body Table */}
        <div className="py-5 overflow-x-auto">
          {docKind === 'PL' ? (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2 pr-3">Marks & Nos</th>
                  <th className="py-2 pr-3">Description of Goods & SKU</th>
                  <th className="py-2 pr-3">HS Code</th>
                  <th className="py-2 pr-3 text-right">Cartons</th>
                  <th className="py-2 pr-3 text-right">Qty</th>
                  <th className="py-2 pr-3 text-right">Net Wt (kg)</th>
                  <th className="py-2 text-right">Gross Wt (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {activeOrder.items.map((item, idx) => (
                  <tr key={item.sku}>
                    <td className="py-3 pr-3 font-mono text-xs text-slate-700">
                      CTN 01–{String(item.cartons).padStart(2, '0')} (#{idx + 1})
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-slate-900">{item.description}</p>
                      <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                    </td>
                    <td className="py-3 pr-3 font-mono text-xs text-slate-700">
                      {item.hsCode}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono tabular-nums">
                      {item.cartons}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono tabular-nums">
                      {item.qty.toLocaleString('en-IN')} {item.unit}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono tabular-nums">
                      {item.netWeightKg.toFixed(1)}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums font-semibold">
                      {item.grossWeightKg.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-300 text-sm font-semibold text-slate-900 font-mono tabular-nums">
                  <td className="pt-3" colSpan={3}>
                    TOTAL PACKAGES & WEIGHT
                  </td>
                  <td className="pt-3 text-right">{totalCartons} Ctns</td>
                  <td className="pt-3 text-right">—</td>
                  <td className="pt-3 text-right">{totalNetKg.toFixed(1)} kg</td>
                  <td className="pt-3 text-right">{totalGrossKg.toFixed(1)} kg</td>
                </tr>
              </tfoot>
            </table>
          ) : docKind === 'COO' ? (
            <div className="space-y-4 text-sm text-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Origin Criterion Declaration
                  </p>
                  <p className="mt-1 font-medium text-slate-900">
                    {ftaScheme === 'India-UAE CEPA'
                      ? 'Wholly Obtained (WO) / CTSH + 40% Value Addition in India'
                      : ftaScheme === 'IndAus ECTA'
                      ? 'Wholly Obtained (WO) / 35% Qualifying Value Content (QVC)'
                      : 'Goods Manufactured & Processed in Republic of India'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Issuing Agency Route
                  </p>
                  <p className="mt-1 font-medium text-slate-900">
                    DGFT Common Digital Platform for CoO (e-CoO Portal)
                  </p>
                </div>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2 pr-3">HS Classification (8-Digit)</th>
                    <th className="py-2 pr-3">Description of Goods</th>
                    <th className="py-2 pr-3 text-right">Quantity / Weight</th>
                    <th className="py-2 text-right">FOB Value ({activeOrder.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeOrder.items.map((item) => (
                    <tr key={item.sku}>
                      <td className="py-3 pr-3 font-mono text-xs">{item.hsCode}</td>
                      <td className="py-3 pr-3 font-medium">{item.description}</td>
                      <td className="py-3 pr-3 text-right font-mono tabular-nums">
                        {item.netWeightKg} kg ({item.cartons} Ctns)
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums font-semibold">
                        {formatFx(item.qty * item.unitPriceFx, activeOrder.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : docKind === 'SLI' ? (
            <div className="space-y-4 text-sm text-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">Port of Loading</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {entity.portOfLoading}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Customs / Incentive Scheme</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    Scheme Code 19 (Drawback + RoDTEP)
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Cargo Totals</p>
                  <p className="font-semibold font-mono tabular-nums text-slate-900 mt-0.5">
                    {totalCartons} Ctns · {totalGrossKg} kg Gross
                  </p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                Instruction to CHA / Freight Forwarder: Please file Electronic Shipping Bill on ICEGATE under Export Promotion / RoDTEP Scheme against LUT ARN{' '}
                <span className="font-mono font-semibold text-slate-800">
                  {entity.lutArn}
                </span>
                . Declare AD Code{' '}
                <span className="font-mono font-semibold text-slate-800">
                  {entity.adCode}
                </span>{' '}
                ({entity.adBank}) for automated IGST & Drawback credit.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2 pr-3">Description of Goods</th>
                  <th className="py-2 pr-3">ITC-HS Code</th>
                  <th className="py-2 pr-3 text-right">Quantity</th>
                  <th className="py-2 pr-3 text-right">
                    Unit Rate ({activeOrder.currency})
                  </th>
                  <th className="py-2 text-right">
                    Amount ({activeOrder.currency})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {activeOrder.items.map((item) => (
                  <tr key={item.sku}>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-slate-900">{item.description}</p>
                      <p className="text-xs text-slate-500 font-mono">
                        SKU: {item.sku} · {item.cartons} Export Cartons
                      </p>
                    </td>
                    <td className="py-3 pr-3 font-mono text-xs text-slate-700">
                      {item.hsCode}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono tabular-nums">
                      {item.qty.toLocaleString('en-IN')} {item.unit}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono tabular-nums">
                      {formatFx(item.unitPriceFx, activeOrder.currency)}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums font-semibold">
                      {formatFx(item.qty * item.unitPriceFx, activeOrder.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-sm font-mono tabular-nums">
                <tr className="border-t border-slate-200 text-slate-600">
                  <td colSpan={4} className="pt-3 text-right pr-3">
                    Goods FOB Subtotal
                  </td>
                  <td className="pt-3 text-right">
                    {formatFx(goodsSubtotalFx, activeOrder.currency)}
                  </td>
                </tr>
                {activeOrder.freightFx > 0 && (
                  <tr className="text-slate-600">
                    <td colSpan={4} className="pt-1 text-right pr-3">
                      Ocean / Air Freight
                    </td>
                    <td className="pt-1 text-right">
                      {formatFx(activeOrder.freightFx, activeOrder.currency)}
                    </td>
                  </tr>
                )}
                {activeOrder.insuranceFx > 0 && (
                  <tr className="text-slate-600">
                    <td colSpan={4} className="pt-1 text-right pr-3">
                      Marine Insurance
                    </td>
                    <td className="pt-1 text-right">
                      {formatFx(activeOrder.insuranceFx, activeOrder.currency)}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-slate-300 text-base font-bold text-slate-900">
                  <td colSpan={4} className="pt-3 text-right pr-3">
                    TOTAL INVOICE VALUE ({activeOrder.incoterm})
                  </td>
                  <td className="pt-3 text-right">
                    {formatFx(activeOrder.totalFx, activeOrder.currency)}
                  </td>
                </tr>
                <tr className="text-xs text-slate-500">
                  <td colSpan={5} className="pt-1 text-right">
                    INR Taxable Value (Zero-Rated IGST 0%):{' '}
                    {formatInr(activeOrder.totalFx * activeOrder.fxLockedRate)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Statutory Export Declarations Footer */}
        <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-xs text-slate-600">
          <div className="space-y-1 max-w-xl">
            <p className="font-semibold text-slate-800">Statutory Declarations</p>
            <p>
              1. Supply meant for export under Letter of Undertaking (LUT) ARN{' '}
              <span className="font-mono font-medium">{entity.lutArn}</span> without payment of Integrated Tax (IGST).
            </p>
            <p>
              2. We intend to claim RoDTEP & All-Industry Duty Drawback rewards under applicable DGFT/Customs notifications.
            </p>
          </div>
          <div className="sm:text-right shrink-0 pt-2 sm:pt-0">
            <p className="font-semibold text-slate-900">
              For {entity.legalName}
            </p>
            <p className="mt-6 font-medium text-slate-800">
              {entity.signatory} · Authorised Signatory
            </p>
          </div>
        </div>
      </article>
    </div>
  );
};
