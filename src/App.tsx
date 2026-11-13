import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ChevronDown,
  FileSpreadsheet,
  LayoutDashboard,
  Plus,
  ShieldCheck,
  Ship,
  X,
} from 'lucide-react';
import { ComplianceAndFinance } from './components/ComplianceAndFinance';
import { DashboardOverview } from './components/DashboardOverview';
import { DocsAndInvoicing } from './components/DocsAndInvoicing';
import { EntitiesAndTeam } from './components/EntitiesAndTeam';
import { NewOrderModal } from './components/NewOrderModal';
import { ShipmentsAndLogistics } from './components/ShipmentsAndLogistics';
import { WhatsAppShareSheet } from './components/WhatsAppShareSheet';
import {
  INITIAL_CATALOG,
  INITIAL_ENTITIES,
  INITIAL_FREIGHT_QUOTES,
  INITIAL_FX_RATES,
  INITIAL_ORDERS,
  INITIAL_TEAM_ACCESS,
  ROLE_META,
} from './data/seedData';
import type {
  CurrencyCode,
  ExportEntity,
  ExportOrder,
  FreightQuote,
  FxRateInfo,
  IcegateStatus,
  NavTab,
  PermissionKey,
  ShipmentStage,
  TeamMemberAccess,
  UserRoleKey,
} from './types/export';
import { getAccessibleEntityIds, hasEntityPermission } from './utils/formatters';

const STORAGE_KEY = 'niryatsetu_workspace_v1';

export default function App() {
  const [entities, setEntities] = useState<ExportEntity[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.entities) && parsed.entities.length > 0) {
          return parsed.entities;
        }
      }
    } catch {
      // Fallback to seed
    }
    return INITIAL_ENTITIES;
  });

  const [orders, setOrders] = useState<ExportOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.orders) && parsed.orders.length > 0) {
          return parsed.orders;
        }
      }
    } catch {
      // Fallback to seed
    }
    return INITIAL_ORDERS;
  });

  const [freightQuotes, setFreightQuotes] = useState<FreightQuote[]>(
    INITIAL_FREIGHT_QUOTES
  );
  const [teamMatrix, setTeamMatrix] = useState<TeamMemberAccess[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.teamMatrix) && parsed.teamMatrix.length > 0) {
          return parsed.teamMatrix;
        }
      }
    } catch {
      // Fallback to seed
    }
    return INITIAL_TEAM_ACCESS;
  });

  const [fxRates, setFxRates] =
    useState<Record<CurrencyCode, FxRateInfo>>(INITIAL_FX_RATES);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [activeEntityId, setActiveEntityId] = useState<string>('all');
  const [activeRole, setActiveRole] = useState<UserRoleKey>('owner');
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    INITIAL_ORDERS[0].id
  );

  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [mobileSwitcherOpen, setMobileSwitcherOpen] = useState(false);
  const [shareModal, setShareModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    phone?: string;
  }>({ open: false, title: '', message: '' });

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ entities, orders, teamMatrix })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [entities, orders, teamMatrix]);

  const accessibleEntityIds = useMemo(
    () =>
      getAccessibleEntityIds(
        activeRole,
        teamMatrix,
        entities.map((e) => e.id)
      ),
    [activeRole, teamMatrix, entities]
  );

  const visibleEntities = useMemo(
    () => entities.filter((e) => accessibleEntityIds.includes(e.id)),
    [entities, accessibleEntityIds]
  );

  const visibleOrders = useMemo(
    () => orders.filter((o) => accessibleEntityIds.includes(o.entityId)),
    [orders, accessibleEntityIds]
  );

  useEffect(() => {
    if (
      activeEntityId !== 'all' &&
      !accessibleEntityIds.includes(activeEntityId)
    ) {
      setActiveEntityId(accessibleEntityIds[0] ?? 'all');
    }
  }, [activeEntityId, accessibleEntityIds]);

  const activeEntityName =
    activeEntityId === 'all'
      ? 'All Entities (Consolidated)'
      : entities.find((e) => e.id === activeEntityId)?.shortName ??
        'All Entities';

  const handleCreateOrder = (newOrder: ExportOrder, entityId: string) => {
    setOrders((prev) => [newOrder, ...prev]);
    setEntities((prev) =>
      prev.map((ent) =>
        ent.id === entityId
          ? {
              ...ent,
              nextInvoiceSeq: ent.nextInvoiceSeq + 1,
              fyTurnoverLakhs: Number(
                (
                  ent.fyTurnoverLakhs +
                  (newOrder.totalFx * newOrder.fxLockedRate) / 100000
                ).toFixed(1)
              ),
            }
          : ent
      )
    );
    setSelectedOrderId(newOrder.id);
    setActiveTab('documents');
  };

  const handleReconcileFirc = (
    orderId: string,
    fircNumber: string,
    realizedRate: number
  ) => {
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              ebrcStatus: 'e-BRC Issued',
              fircNumber,
              realizedFxRate: realizedRate,
              advanceReceivedPct: 100,
            }
          : ord
      )
    );
  };

  const handleRenewLut = (entityId: string) => {
    setEntities((prev) =>
      prev.map((ent) =>
        ent.id === entityId
          ? {
              ...ent,
              lutArn: `AD090327${Math.floor(100000 + Math.random() * 899999)}R`,
              lutValidUntil: '31 Mar 2028',
              lutDaysRemaining: 365,
            }
          : ent
      )
    );
  };

  const handleAdvanceIcegate = (orderId: string, nextStatus: IcegateStatus) => {
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId ? { ...ord, icegateStatus: nextStatus } : ord
      )
    );
  };

  const handleAdvanceShipment = (orderId: string, nextStage: ShipmentStage) => {
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId ? { ...ord, shipmentStage: nextStage } : ord
      )
    );
  };

  const handleSelectFreightQuote = (quoteId: string) => {
    setFreightQuotes((prev) =>
      prev.map((q) =>
        q.id === quoteId
          ? {
              ...q,
              selectedForOrderId: q.selectedForOrderId
                ? undefined
                : selectedOrderId,
            }
          : q
      )
    );
  };

  const handleAddEntity = (newEntity: ExportEntity) => {
    setEntities((prev) => [...prev, newEntity]);
    setTeamMatrix((prev) =>
      prev.map((member) =>
        member.roleKey === 'owner'
          ? {
              ...member,
              entityPermissions: {
                ...member.entityPermissions,
                [newEntity.id]: [
                  'gst_lut',
                  'invoices_pi',
                  'packing_dispatch',
                  'fema_ebrc',
                  'customs_icegate',
                ],
              },
            }
          : member
      )
    );
    setActiveEntityId(newEntity.id);
  };

  const handleTogglePermission = (
    memberId: string,
    entityId: string,
    perm: PermissionKey
  ) => {
    setTeamMatrix((prev) =>
      prev.map((member) => {
        if (member.id !== memberId) return member;
        const current = member.entityPermissions[entityId] || [];
        const updated = current.includes(perm)
          ? current.filter((p) => p !== perm)
          : [...current, perm];
        return {
          ...member,
          entityPermissions: {
            ...member.entityPermissions,
            [entityId]: updated,
          },
        };
      })
    );
  };

  const handleRefreshFx = () => {
    setFxRates((prev) => {
      const next = { ...prev };
      (Object.keys(next) as CurrencyCode[]).forEach((code) => {
        const delta = Number(((Math.random() - 0.48) * 0.12).toFixed(2));
        const newRef = Number((next[code].rbiRefRate + delta).toFixed(2));
        next[code] = {
          ...next[code],
          rbiRefRate: newRef,
          interbankRate: Number((newRef + 0.05).toFixed(2)),
          dailyChangePct: Number((delta * 1.4).toFixed(2)),
        };
      });
      return next;
    });
  };

  const navItems: Array<{
    id: NavTab;
    label: string;
    mobileLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'overview',
      label: 'Master Dashboard',
      mobileLabel: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'documents',
      label: 'Export Docs & Bills',
      mobileLabel: 'Docs',
      icon: FileSpreadsheet,
    },
    {
      id: 'compliance',
      label: 'Compliance, FX & FTA',
      mobileLabel: 'Comply',
      icon: ShieldCheck,
    },
    {
      id: 'shipments',
      label: 'Shipments & Freight',
      mobileLabel: 'Ship',
      icon: Ship,
    },
    {
      id: 'entities',
      label: 'Entities & Team RBAC',
      mobileLabel: 'Firms',
      icon: Building2,
    },
  ];

  const canCreateOrders = hasEntityPermission(
    activeRole,
    teamMatrix,
    activeEntityId,
    'invoices_pi'
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar (264px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-white border-r border-slate-200 p-4 justify-between no-print">
        <div className="space-y-6 overflow-y-auto no-scrollbar">
          {/* Brand */}
          <div className="px-2 pt-1">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('overview');
              }}
              className="text-xl font-bold tracking-tight text-[#0F3D5E] whitespace-nowrap"
            >
              NiryatSetu
            </a>
            <p className="text-xs text-slate-500 mt-0.5">
              Indian Export Pocket Hub
            </p>
          </div>

          {/* Instant Entity Switcher */}
          <div className="space-y-1.5">
            <p className="px-2 text-[11px] font-semibold text-slate-500">
              Active Entity / IEC Switcher
            </p>
            <button
              type="button"
              onClick={() => setActiveEntityId('all')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeEntityId === 'all'
                  ? 'bg-[#0F3D5E] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              All Entities ({visibleEntities.length} Firms)
            </button>
            {visibleEntities.map((ent) => (
              <button
                key={ent.id}
                type="button"
                onClick={() => setActiveEntityId(ent.id)}
                className={`w-full text-left px-3 py-2 rounded-xl transition-colors ${
                  activeEntityId === ent.id
                    ? 'bg-[#0F3D5E] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <p className="text-xs font-semibold truncate">{ent.shortName}</p>
                <p
                  className={`text-[11px] font-mono tabular-nums truncate ${
                    activeEntityId === ent.id
                      ? 'text-slate-200'
                      : 'text-slate-500'
                  }`}
                >
                  IEC {ent.iec}
                </p>
              </button>
            ))}
          </div>

          {/* Primary Navigation */}
          <nav className="space-y-1" aria-label="Primary Workspace Navigation">
            <p className="px-2 pb-1 text-[11px] font-semibold text-slate-500">
              Workspace Modules
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full min-h-[42px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-100 text-[#0F3D5E] font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Role / RBAC Persona Switcher */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <label className="block">
            <span className="text-[11px] font-semibold text-slate-500">
              Role View (RBAC Preview)
            </span>
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as UserRoleKey)}
              className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F3D5E]"
            >
              {(Object.keys(ROLE_META) as UserRoleKey[]).map((key) => (
                <option key={key} value={key}>
                  {ROLE_META[key].label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-slate-500 leading-snug">
            {ROLE_META[activeRole].scopeSummary}
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Header */}
        <header className="hidden lg:flex items-center justify-between gap-8 px-8 py-4 bg-white border-b border-slate-200 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-2 text-sm text-slate-600 min-w-0">
            <span className="font-medium text-slate-900 truncate">
              {activeEntityName}
            </span>
            <span aria-hidden="true">/</span>
            <span className="truncate">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
          </div>

          <div className="shrink-0">
            {canCreateOrders && (
              <button
                type="button"
                onClick={() => setNewOrderOpen(true)}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F3D5E] text-xs font-semibold text-white hover:bg-[#0b2f49] transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>New Export Order</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Sticky Top Bar (Compact 52px to stay well below 15% sticky height cap) */}
        <header className="lg:hidden sticky top-0 z-30 h-[52px] px-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between gap-2 no-print">
          <button
            type="button"
            onClick={() => setMobileSwitcherOpen(true)}
            className="min-h-[44px] flex items-center gap-1.5 text-left min-w-0 pr-2"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#0F3D5E] leading-none">
                NiryatSetu
              </p>
              <p className="text-xs font-medium text-slate-700 truncate max-w-[190px] mt-0.5">
                {activeEntityName}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
          </button>

          {canCreateOrders ? (
            <button
              type="button"
              onClick={() => setNewOrderOpen(true)}
              className="min-h-[40px] inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0F3D5E] text-xs font-semibold text-white whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Order</span>
            </button>
          ) : (
            <span className="text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
              {ROLE_META[activeRole].label}
            </span>
          )}
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6 pb-24 lg:pb-10 max-w-[1320px] w-full mx-auto">
          {activeTab === 'overview' && (
            <DashboardOverview
              entities={visibleEntities}
              activeEntityId={activeEntityId}
              onSelectEntity={setActiveEntityId}
              orders={visibleOrders}
              catalog={INITIAL_CATALOG}
              fxRates={fxRates}
              activeRole={activeRole}
              teamMatrix={teamMatrix}
              onNavigate={setActiveTab}
              onOpenNewOrder={() => setNewOrderOpen(true)}
              onSelectOrderForDocs={(orderId) => {
                setSelectedOrderId(orderId);
                setActiveTab('documents');
              }}
              onShareWhatsApp={(title, message, phone) =>
                setShareModal({ open: true, title, message, phone })
              }
              onRefreshFx={handleRefreshFx}
            />
          )}

          {activeTab === 'documents' && (
            <DocsAndInvoicing
              entities={visibleEntities}
              activeEntityId={activeEntityId}
              orders={visibleOrders}
              selectedOrderId={selectedOrderId}
              onSelectOrder={setSelectedOrderId}
              activeRole={activeRole}
              teamMatrix={teamMatrix}
              onOpenNewOrder={() => setNewOrderOpen(true)}
              onShareWhatsApp={(title, message, phone) =>
                setShareModal({ open: true, title, message, phone })
              }
            />
          )}

          {activeTab === 'compliance' && (
            <ComplianceAndFinance
              entities={visibleEntities}
              activeEntityId={activeEntityId}
              orders={visibleOrders}
              fxRates={fxRates}
              activeRole={activeRole}
              teamMatrix={teamMatrix}
              onReconcileFirc={handleReconcileFirc}
              onRenewLut={handleRenewLut}
              onAdvanceIcegate={handleAdvanceIcegate}
            />
          )}

          {activeTab === 'shipments' && (
            <ShipmentsAndLogistics
              entities={visibleEntities}
              activeEntityId={activeEntityId}
              orders={visibleOrders}
              freightQuotes={freightQuotes}
              activeRole={activeRole}
              teamMatrix={teamMatrix}
              onAdvanceShipment={handleAdvanceShipment}
              onSelectFreightQuote={handleSelectFreightQuote}
              onShareWhatsApp={(title, message, phone) =>
                setShareModal({ open: true, title, message, phone })
              }
            />
          )}

          {activeTab === 'entities' && (
            <EntitiesAndTeam
              entities={visibleEntities}
              activeEntityId={activeEntityId}
              onSelectEntity={setActiveEntityId}
              onAddEntity={handleAddEntity}
              teamMatrix={teamMatrix}
              activeRole={activeRole}
              onTogglePermission={handleTogglePermission}
            />
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Tab Bar (58px, Thumb Ergonomics) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe no-print"
        aria-label="Mobile Bottom Navigation"
      >
        <div className="grid grid-cols-5 h-[58px] items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-[#0F3D5E]' : 'text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Entity & Role Bottom Sheet Drawer */}
      {mobileSwitcherOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end bg-slate-900/50 backdrop-blur-xs no-print"
          role="dialog"
          aria-modal="true"
          aria-label="Switch Export Entity or Role"
        >
          <div className="w-full bg-white rounded-t-3xl border-t border-slate-200 p-5 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto" />
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Switch Entity / Role
              </h2>
              <button
                type="button"
                onClick={() => setMobileSwitcherOpen(false)}
                aria-label="Close switcher"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">
                Select Export Firm (IEC / GSTIN)
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveEntityId('all');
                  setMobileSwitcherOpen(false);
                }}
                className={`w-full min-h-[44px] text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                  activeEntityId === 'all'
                    ? 'bg-[#0F3D5E] text-white'
                    : 'border border-slate-200 text-slate-800'
                }`}
              >
                All Entities (Consolidated)
              </button>
              {visibleEntities.map((ent) => (
                <button
                  key={ent.id}
                  type="button"
                  onClick={() => {
                    setActiveEntityId(ent.id);
                    setMobileSwitcherOpen(false);
                  }}
                  className={`w-full min-h-[48px] text-left px-3.5 py-2.5 rounded-xl ${
                    activeEntityId === ent.id
                      ? 'bg-[#0F3D5E] text-white'
                      : 'border border-slate-200 text-slate-800'
                  }`}
                >
                  <p className="text-sm font-semibold">{ent.shortName}</p>
                  <p
                    className={`text-xs font-mono ${
                      activeEntityId === ent.id
                        ? 'text-slate-200'
                        : 'text-slate-500'
                    }`}
                  >
                    IEC {ent.iec} · GSTIN {ent.gstin}
                  </p>
                </button>
              ))}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">
                  Role View (RBAC Preview)
                </span>
                <select
                  value={activeRole}
                  onChange={(e) => {
                    setActiveRole(e.target.value as UserRoleKey);
                    setMobileSwitcherOpen(false);
                  }}
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900"
                >
                  {(Object.keys(ROLE_META) as UserRoleKey[]).map((key) => (
                    <option key={key} value={key}>
                      {ROLE_META[key].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* New Export Order Modal */}
      <NewOrderModal
        open={newOrderOpen}
        onClose={() => setNewOrderOpen(false)}
        entities={visibleEntities}
        activeEntityId={activeEntityId}
        catalog={INITIAL_CATALOG}
        fxRates={fxRates}
        onCreateOrder={handleCreateOrder}
      />

      {/* WhatsApp Business Share Sheet */}
      <WhatsAppShareSheet
        open={shareModal.open}
        onClose={() => setShareModal((s) => ({ ...s, open: false }))}
        title={shareModal.title}
        recipientPhone={shareModal.phone}
        message={shareModal.message}
      />
    </div>
  );
}
