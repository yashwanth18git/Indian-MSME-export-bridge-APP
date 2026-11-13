import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type {
  CatalogProduct,
  CurrencyCode,
  ExportEntity,
  ExportOrder,
  FxRateInfo,
  Incoterm,
  PaymentTerms,
} from '../types/export';
import { formatFx, formatInr } from '../utils/formatters';

interface NewOrderModalProps {
  open: boolean;
  onClose: () => void;
  entities: ExportEntity[];
  activeEntityId: string;
  catalog: CatalogProduct[];
  fxRates: Record<CurrencyCode, FxRateInfo>;
  onCreateOrder: (order: ExportOrder, entityId: string) => void;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  open,
  onClose,
  entities,
  activeEntityId,
  catalog,
  fxRates,
  onCreateOrder,
}) => {
  const defaultEntityId =
    activeEntityId === 'all' ? entities[0]?.id ?? '' : activeEntityId;

  const [entityId, setEntityId] = useState(defaultEntityId);
  const [buyerName, setBuyerName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [buyerCountry, setBuyerCountry] = useState<'UAE' | 'Australia' | 'UK' | 'EU' | 'USA'>('UAE');
  const [buyerPort, setBuyerPort] = useState('Jebel Ali (AEJEA)');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [incoterm, setIncoterm] = useState<Incoterm>('FOB');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('30% Advance / 70% DP');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(500);
  const [freightFx, setFreightFx] = useState(0);

  React.useEffect(() => {
    const nextEntity =
      activeEntityId === 'all' ? entities[0]?.id ?? '' : activeEntityId;
    setEntityId(nextEntity);
  }, [activeEntityId, entities, open]);

  const entityProducts = useMemo(() => {
    const filtered = catalog.filter((p) => p.entityId === entityId);
    return filtered.length > 0 ? filtered : catalog;
  }, [catalog, entityId]);

  React.useEffect(() => {
    if (entityProducts.length > 0 && !entityProducts.some((p) => p.id === selectedProductId)) {
      setSelectedProductId(entityProducts[0].id);
      setQty(entityProducts[0].moq);
    }
  }, [entityProducts, selectedProductId]);

  if (!open) return null;

  const currentEntity = entities.find((e) => e.id === entityId) ?? entities[0];
  const product =
    entityProducts.find((p) => p.id === selectedProductId) ?? entityProducts[0];
  const fxInfo = fxRates[currency];

  const usdToSelectedFactor =
    currency === 'USD' ? 1 : fxRates.USD.interbankRate / fxInfo.interbankRate;
  const unitPriceFx = Number(((product?.fobUsd ?? 10) * usdToSelectedFactor).toFixed(2));
  const goodsTotalFx = Number((unitPriceFx * qty).toFixed(2));
  const effectiveFreight = incoterm === 'FOB' || incoterm === 'EXW' ? 0 : freightFx;
  const totalFx = Number((goodsTotalFx + effectiveFreight).toFixed(2));
  const totalInr = totalFx * fxInfo.rbiRefRate;

  const seqPadded = String(currentEntity.nextInvoiceSeq).padStart(4, '0');
  const previewInvoiceNo = `${currentEntity.invoicePrefix}${seqPadded}`;

  const handleCountryChange = (country: 'UAE' | 'Australia' | 'UK' | 'EU' | 'USA') => {
    setBuyerCountry(country);
    const portDefaults: Record<typeof country, string> = {
      UAE: 'Jebel Ali (AEJEA)',
      Australia: 'Melbourne (AUMEL)',
      UK: 'Felixstowe (GBFXT)',
      EU: 'Hamburg (DEHAM)',
      USA: 'New York / Newark (USNYC)',
    };
    setBuyerPort(portDefaults[country]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEntity || !product || !buyerName.trim()) return;

    const netWeight = Number((qty * product.weightKgPerUnit).toFixed(1));
    const grossWeight = Number((netWeight * 1.08).toFixed(1));
    const cartons = Math.max(1, Math.ceil(netWeight / 24));
    const rodtepClaimInr = Math.round(totalInr * (product.rodtepPct / 100));
    const drawbackClaimInr = Math.round(totalInr * (product.drawbackPct / 100));

    const newOrder: ExportOrder = {
      id: `ord-${Date.now()}`,
      entityId: currentEntity.id,
      piNumber: `PI-${currentEntity.invoicePrefix.replace('/', '-')}${seqPadded}`,
      ciNumber: previewInvoiceNo,
      packingListNo: `PL-${seqPadded}`,
      sbNumber: `SB-${Math.floor(7800000 + Math.random() * 190000)}`,
      buyerName: buyerName.trim(),
      buyerContact: buyerContact.trim() || '+971 50 555 0192',
      buyerCountry,
      buyerPort: buyerPort.trim(),
      currency,
      fxLockedRate: fxInfo.rbiRefRate,
      incoterm,
      paymentTerms,
      advanceReceivedPct: paymentTerms === '100% Advance' ? 100 : 30,
      items: [
        {
          productId: product.id,
          sku: product.sku,
          description: product.name,
          hsCode: product.hsCode,
          qty,
          unit: product.unit,
          unitPriceFx,
          netWeightKg: netWeight,
          grossWeightKg: grossWeight,
          cartons,
        },
      ],
      freightFx: effectiveFreight,
      insuranceFx: incoterm === 'CIF' ? Math.round(goodsTotalFx * 0.01) : 0,
      totalFx:
        totalFx + (incoterm === 'CIF' ? Math.round(goodsTotalFx * 0.01) : 0),
      ebrcStatus: 'Pending FIRC',
      realizationDeadline: '2027-05-10',
      igstRefundStatus: 'Zero-Rated LUT',
      rodtepClaimInr,
      drawbackClaimInr,
      icegateStatus: 'SB Filed',
      shipmentStage: 'Factory Gate-Out',
      containerNo: `MSKU${Math.floor(1000000 + Math.random() * 8999999)}`,
      vesselName: 'PENDING VESSEL NOMINATION',
      eta: '18 Dec 2026',
      createdAt: new Date().toISOString().slice(0, 10),
    };

    onCreateOrder(newOrder, currentEntity.id);
    setBuyerName('');
    setBuyerContact('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Create New Export Order"
    >
      <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl">
        <div className="sm:hidden w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-3" />
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Create Export Order & One-Click Doc Suite
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
              Auto-Series: {previewInvoiceNo} · LUT {currentEntity?.lutArn}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                Exporting Legal Entity (IEC / GSTIN)
              </span>
              <select
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
              >
                {entities.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.shortName} ({ent.gstin})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                Buyer Company Name
              </span>
              <input
                type="text"
                required
                placeholder="e.g. Emirates Craft Trading LLC"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                Destination Country
              </span>
              <select
                value={buyerCountry}
                onChange={(e) =>
                  handleCountryChange(
                    e.target.value as 'UAE' | 'Australia' | 'UK' | 'EU' | 'USA'
                  )
                }
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
              >
                <option value="UAE">UAE (CEPA Benefit)</option>
                <option value="Australia">Australia (ECTA Benefit)</option>
                <option value="UK">United Kingdom</option>
                <option value="EU">European Union</option>
                <option value="USA">United States</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                Discharge Port
              </span>
              <input
                type="text"
                value={buyerPort}
                onChange={(e) => setBuyerPort(e.target.value)}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                Buyer WhatsApp / Phone
              </span>
              <input
                type="text"
                placeholder="+971 50 482 1190"
                value={buyerContact}
                onChange={(e) => setBuyerContact(e.target.value)}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-slate-700">
                Product / SKU (ITC-HS Linked)
              </span>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
              >
                {entityProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (HS {p.hsCode})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                Quantity ({product?.unit})
              </span>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                Billing Currency (Lock RBI Rate)
              </span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
              >
                {Object.values(fxRates).map((rate) => (
                  <option key={rate.code} value={rate.code}>
                    {rate.code} — ₹{rate.rbiRefRate.toFixed(2)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                Incoterm
              </span>
              <select
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value as Incoterm)}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
              >
                <option value="FOB">FOB (Free On Board)</option>
                <option value="CIF">CIF (Cost, Insurance & Freight)</option>
                <option value="CFR">CFR (Cost & Freight)</option>
                <option value="EXW">EXW (Ex Works)</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                Payment Terms
              </span>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
              >
                <option value="100% Advance">100% Advance</option>
                <option value="30% Advance / 70% DP">30% Advance / 70% DP</option>
                <option value="60 Days DA">60 Days DA</option>
                <option value="Irrevocable LC at Sight">Irrevocable LC at Sight</option>
              </select>
            </label>
          </div>

          {(incoterm === 'CIF' || incoterm === 'CFR') && (
            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                Estimated Freight ({currency})
              </span>
              <input
                type="number"
                min={0}
                value={freightFx}
                onChange={(e) => setFreightFx(Math.max(0, Number(e.target.value)))}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
              />
            </label>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">
                Invoice Total ({incoterm}) · Zero-Rated GST under LUT
              </p>
              <p className="text-lg font-semibold text-slate-900 font-mono tabular-nums">
                {formatFx(totalFx, currency)}{' '}
                <span className="text-sm font-normal text-slate-600">
                  ({formatInr(totalInr)})
                </span>
              </p>
            </div>
            <div className="text-xs text-emerald-700 font-medium font-mono tabular-nums">
              Est. RoDTEP + Drawback:{' '}
              {formatInr(
                totalInr *
                  (((product?.rodtepPct ?? 0) + (product?.drawbackPct ?? 0)) /
                    100)
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#0F3D5E] text-sm font-medium text-white hover:bg-[#0b2f49] transition-colors"
            >
              Generate Order & Document Suite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
