import React, { useState } from 'react';
import { Building2, Check, Plus, Users } from 'lucide-react';
import type {
  ExportEntity,
  PermissionKey,
  TeamMemberAccess,
  UserRoleKey,
} from '../types/export';

interface EntitiesAndTeamProps {
  entities: ExportEntity[];
  activeEntityId: string;
  onSelectEntity: (id: string) => void;
  onAddEntity: (entity: ExportEntity) => void;
  teamMatrix: TeamMemberAccess[];
  activeRole: UserRoleKey;
  onTogglePermission: (
    memberId: string,
    entityId: string,
    perm: PermissionKey
  ) => void;
}

const PERMISSION_LABELS: Array<{ key: PermissionKey; label: string }> = [
  { key: 'gst_lut', label: 'GST & LUT' },
  { key: 'invoices_pi', label: 'Invoices & PI' },
  { key: 'packing_dispatch', label: 'Packing List' },
  { key: 'fema_ebrc', label: 'FEMA / e-BRC' },
  { key: 'customs_icegate', label: 'ICEGATE / CHA' },
];

export const EntitiesAndTeam: React.FC<EntitiesAndTeamProps> = ({
  entities,
  activeEntityId,
  onSelectEntity,
  onAddEntity,
  teamMatrix,
  activeRole,
  onTogglePermission,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [shortName, setShortName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [category, setCategory] = useState('Leather & Footwear');
  const [city, setCity] = useState('Kanpur');
  const [stateName, setStateName] = useState('Uttar Pradesh');
  const [iec, setIec] = useState('0624019882');
  const [gstin, setGstin] = useState('09AABCK7721E1Z5');
  const [adBank, setAdBank] = useState('Axis Bank Trade Forex');
  const [prefix, setPrefix] = useState('KLE/26-27/');

  const handleCreateEntity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortName.trim() || !iec.trim() || !gstin.trim()) return;

    const newEnt: ExportEntity = {
      id: `ent-${Date.now()}`,
      shortName: shortName.trim(),
      legalName: legalName.trim() || `${shortName.trim()} Pvt. Ltd.`,
      category,
      city,
      state: stateName,
      iec: iec.trim(),
      gstin: gstin.trim().toUpperCase(),
      pan: gstin.trim().slice(2, 12).toUpperCase(),
      adCode: '0294418',
      adBank,
      lutArn: `AD090426${Math.floor(100000 + Math.random() * 899999)}K`,
      lutValidUntil: '31 Mar 2027',
      lutDaysRemaining: 138,
      invoicePrefix: prefix.trim() || 'EXP/26-27/',
      nextInvoiceSeq: 1,
      fyTurnoverLakhs: 0,
      msmeCapLakhs: 500,
      portOfLoading: 'ICD Kanpur / Nhava Sheva (INNSA1)',
      signatory: 'Authorised Partner',
    };

    onAddEntity(newEnt);
    setShortName('');
    setLegalName('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Sister Firms / Multi-Entity Registry */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Registered Export Entities (IEC & GSTIN Vault)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Operate multiple sister firms, product categories, and MSME turnover caps under one login
            </p>
          </div>
          {activeRole === 'owner' && (
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F3D5E] text-xs font-semibold text-white hover:bg-[#0b2f49] whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'Close Form' : 'Add Sister Firm'}</span>
            </button>
          )}
        </div>

        {showAddForm && (
          <form
            onSubmit={handleCreateEntity}
            className="p-4 rounded-xl border border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                Display Short Name
              </span>
              <input
                type="text"
                required
                placeholder="e.g. Kanpur Leather Craft"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                Registered Legal Name
              </span>
              <input
                type="text"
                placeholder="Kanpur Leather Craft Exports LLP"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                Product Category
              </span>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                10-Digit IEC Code
              </span>
              <input
                type="text"
                required
                value={iec}
                onChange={(e) => setIec(e.target.value)}
                className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm font-mono"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                15-Digit GSTIN
              </span>
              <input
                type="text"
                required
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm font-mono"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                Invoice Series Prefix
              </span>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm font-mono"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700">City</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700">State</span>
              <input
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                AD Bank Branch
              </span>
              <input
                type="text"
                value={adBank}
                onChange={(e) => setAdBank(e.target.value)}
                className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#0F3D5E] text-xs font-semibold text-white"
              >
                Save & Isolate Entity Ledger
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {entities.map((ent) => {
            const isActive = activeEntityId === ent.id;
            return (
              <div
                key={ent.id}
                className={`p-4 rounded-xl border transition-colors flex flex-col justify-between gap-4 ${
                  isActive
                    ? 'border-[#0F3D5E] bg-[#0F3D5E]/5'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {ent.shortName}
                      </p>
                      <p className="text-xs text-slate-500">{ent.category}</p>
                    </div>
                    <Building2 className="w-4 h-4 text-[#0F3D5E] shrink-0" />
                  </div>

                  <div className="text-xs font-mono tabular-nums text-slate-700 space-y-1 pt-2 border-t border-slate-100">
                    <p>IEC: {ent.iec}</p>
                    <p>GSTIN: {ent.gstin}</p>
                    <p>AD Code: {ent.adCode}</p>
                    <p className="font-sans text-slate-500 truncate">
                      {ent.adBank}
                    </p>
                    <p>
                      Series: {ent.invoicePrefix}
                      {String(ent.nextInvoiceSeq).padStart(4, '0')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectEntity(isActive ? 'all' : ent.id)}
                  className={`w-full min-h-[40px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#0F3D5E] text-white'
                      : 'border border-slate-300 text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {isActive ? 'Currently Isolated (Reset to All)' : 'Switch to This Firm'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Role-Based Team & CA Access Matrix */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Role-Based Team, CA & CHA Access Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Grant granular entity permissions—e.g., CA accesses GST/BRC for Firm A while warehouse sees only packing lists for Firm B
            </p>
          </div>
          <Users className="w-5 h-5 text-[#0F3D5E] shrink-0" />
        </div>

        <div className="space-y-4">
          {teamMatrix.map((member) => (
            <div
              key={member.id}
              className="p-4 rounded-xl border border-slate-200 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {member.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {member.roleTitle} · {member.email}
                  </p>
                </div>
                {member.roleKey === activeRole && (
                  <span className="text-xs font-semibold text-[#0F3D5E]">
                    Active Persona View
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500">
                      <th className="py-2 pr-3">Entity</th>
                      {PERMISSION_LABELS.map((p) => (
                        <th key={p.key} className="py-2 px-2 text-center">
                          {p.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {entities.map((ent) => {
                      const perms = member.entityPermissions[ent.id] || [];
                      const isOwnerRow = member.roleKey === 'owner';
                      return (
                        <tr key={ent.id}>
                          <td className="py-2.5 pr-3 font-medium text-slate-800">
                            {ent.shortName}
                          </td>
                          {PERMISSION_LABELS.map((p) => {
                            const allowed = perms.includes(p.key);
                            return (
                              <td key={p.key} className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  disabled={isOwnerRow || activeRole !== 'owner'}
                                  onClick={() =>
                                    onTogglePermission(member.id, ent.id, p.key)
                                  }
                                  aria-label={`Toggle ${p.label} for ${member.name} on ${ent.shortName}`}
                                  className={`w-8 h-8 rounded-lg inline-flex items-center justify-center border transition-colors ${
                                    allowed
                                      ? 'bg-[#0F3D5E] border-[#0F3D5E] text-white'
                                      : 'bg-white border-slate-300 text-transparent hover:border-slate-400'
                                  } ${
                                    isOwnerRow || activeRole !== 'owner'
                                      ? 'opacity-70 cursor-not-allowed'
                                      : ''
                                  }`}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
