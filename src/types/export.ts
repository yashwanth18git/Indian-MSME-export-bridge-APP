export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'AED' | 'AUD';

export type UserRoleKey = 'owner' | 'ca_accountant' | 'cha_agent' | 'warehouse';

export type NavTab = 'overview' | 'documents' | 'compliance' | 'shipments' | 'entities';

export type Incoterm = 'FOB' | 'CIF' | 'CFR' | 'EXW';

export type PaymentTerms =
  | '100% Advance'
  | '30% Advance / 70% DP'
  | '60 Days DA'
  | 'Irrevocable LC at Sight';

export type EbrcStatus =
  | 'Pending FIRC'
  | 'FIRC Matched'
  | 'e-BRC Issued'
  | 'Overdue Risk';

export type ShipmentStage =
  | 'Factory Gate-Out'
  | 'Port Customs Clearance'
  | 'Vessel Departed'
  | 'Destination Arrival';

export type IcegateStatus =
  | 'SB Filed'
  | 'Customs Examined'
  | 'LEO Granted'
  | 'EGM Filed'
  | 'Scroll Generated';

export type PermissionKey =
  | 'gst_lut'
  | 'invoices_pi'
  | 'packing_dispatch'
  | 'fema_ebrc'
  | 'customs_icegate';

export interface ExportEntity {
  id: string;
  shortName: string;
  legalName: string;
  category: string;
  city: string;
  state: string;
  iec: string;
  gstin: string;
  pan: string;
  adCode: string;
  adBank: string;
  lutArn: string;
  lutValidUntil: string;
  lutDaysRemaining: number;
  invoicePrefix: string;
  nextInvoiceSeq: number;
  fyTurnoverLakhs: number;
  msmeCapLakhs: number;
  portOfLoading: string;
  signatory: string;
}

export interface CatalogProduct {
  id: string;
  entityId: string;
  sku: string;
  name: string;
  hsCode: string;
  unit: string;
  fobUsd: number;
  moq: number;
  weightKgPerUnit: number;
  originCity: string;
  image: string;
  rodtepPct: number;
  drawbackPct: number;
  cepaNote: string;
  ectaNote: string;
}

export interface OrderLineItem {
  productId: string;
  sku: string;
  description: string;
  hsCode: string;
  qty: number;
  unit: string;
  unitPriceFx: number;
  netWeightKg: number;
  grossWeightKg: number;
  cartons: number;
}

export interface ExportOrder {
  id: string;
  entityId: string;
  piNumber: string;
  ciNumber: string;
  packingListNo: string;
  sbNumber: string;
  buyerName: string;
  buyerContact: string;
  buyerCountry: string;
  buyerPort: string;
  currency: CurrencyCode;
  fxLockedRate: number;
  incoterm: Incoterm;
  paymentTerms: PaymentTerms;
  lcNumber?: string;
  lcExpiryDate?: string;
  advanceReceivedPct: number;
  items: OrderLineItem[];
  freightFx: number;
  insuranceFx: number;
  totalFx: number;
  ebrcStatus: EbrcStatus;
  fircNumber?: string;
  fircBankRef?: string;
  realizedFxRate?: number;
  realizationDeadline: string;
  igstRefundStatus: 'Zero-Rated LUT' | 'Refund Pending' | 'Credited';
  rodtepClaimInr: number;
  drawbackClaimInr: number;
  icegateStatus: IcegateStatus;
  shipmentStage: ShipmentStage;
  containerNo: string;
  vesselName: string;
  eta: string;
  createdAt: string;
}

export interface HsnTariffEntry {
  hsCode: string;
  description: string;
  category: string;
  rodtepPct: number;
  drawbackPct: number;
  gstExportRule: string;
  tariffs: {
    UAE: { mfn: number; fta: number; agreement: string; rule: string };
    Australia: { mfn: number; fta: number; agreement: string; rule: string };
    UK: { mfn: number; fta: number; agreement: string; rule: string };
    EU: { mfn: number; fta: number; agreement: string; rule: string };
    USA: { mfn: number; fta: number; agreement: string; rule: string };
  };
}

export interface FreightQuote {
  id: string;
  forwarder: string;
  mode: 'Sea FCL 20ft' | 'Sea LCL' | 'Air Freight' | 'Express Courier';
  originPort: string;
  destinationPort: string;
  transitDays: number;
  rateUsd: number;
  freeDetentionDays: number;
  validUntil: string;
  surchargesNote: string;
  selectedForOrderId?: string;
}

export interface TeamMemberAccess {
  id: string;
  name: string;
  roleTitle: string;
  roleKey: UserRoleKey;
  email: string;
  entityPermissions: Record<string, PermissionKey[]>;
}

export interface FxRateInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  rbiRefRate: number;
  interbankRate: number;
  dailyChangePct: number;
}

export type CustodyStageKey =
  | 'producer_receipt'
  | 'qc_inspection'
  | 'warehouse_packing'
  | 'port_customs'
  | 'buyer_delivery';

export interface CustodyCheckpoint {
  stage: CustodyStageKey;
  label: string;
  completed: boolean;
  timestamp?: string;
  custodianName?: string;
  location?: string;
  verifiedWeightKg?: number;
  verifiedQty?: number;
  notes?: string;
}

export interface ProductBatchTrace {
  id: string;
  entityId: string;
  orderId: string;
  batchCode: string;
  productName: string;
  sku: string;
  hsCode: string;
  producerName: string;
  producerLocation: string;
  receivedDate: string;
  expectedQty: number;
  receivedQty: number;
  unit: string;
  expectedWeightKg: number;
  receivedWeightKg: number;
  qcStatus: 'Passed' | 'Minor Variance' | 'Pending QC';
  checkpoints: CustodyCheckpoint[];
}

