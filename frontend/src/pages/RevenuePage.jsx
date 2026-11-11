import { useCallback, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, CircleDollarSign, Pencil, Plus, RefreshCw, Trash2, TrendingUp, X } from 'lucide-react';
import { api } from '../api.js';

const sources = ['Sponsorships', 'Ad revenue', 'Affiliate marketing', 'Brand collaborations', 'Subscription revenue', 'Other'];
const currencyFormat = (amount, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};
const emptyForm = () => ({ source: 'Sponsorships', amount: '', currency: 'INR', description: '', recorded_on: new Date().toISOString().slice(0, 10) });

export default function RevenuePage({ onToast }) {
  const [summary, setSummary] = useState({ totals_by_currency: [], by_source: [], daily: [] });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryResponse, recordsResponse] = await Promise.all([
        api.get('/revenue/summary?days=90'),
        api.get('/revenue/records?days=90'),
      ]);
      setSummary(summaryResponse.data);
      setRecords(recordsResponse.data.records || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not load revenue data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const currencyTotals = summary.totals_by_currency || [];
  useEffect(() => {
    if (currencyTotals.length && !currencyTotals.some((row) => row.currency === selectedCurrency)) {
      setSelectedCurrency(currencyTotals[0].currency);
    }
  }, [currencyTotals, selectedCurrency]);

  const total = currencyTotals.find((row) => row.currency === selectedCurrency) || currencyTotals[0] || { currency: 'INR', amount: 0 };
  const sourceRows = useMemo(() => (summary.by_source || []).filter((row) => row.currency === total.currency), [summary.by_source, total.currency]);
  const chartRows = useMemo(() => (summary.daily || []).filter((row) => row.currency === total.currency).map((row) => ({ ...row, label: new Date(`${row.date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) })), [summary.daily, total.currency]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  };
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  };
  const startEdit = (record) => {
    setEditingId(record.id);
    setForm({
      source: record.source,
      amount: String(record.amount),
      currency: record.currency,
      description: record.description || '',
      recorded_on: record.recorded_on,
    });
    setFormOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editingId) {
        await api.patch(`/revenue/records/${editingId}`, payload);
        onToast('Revenue entry updated.');
      } else {
        await api.post('/revenue/records', payload);
        onToast('Revenue entry added.');
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not save the revenue entry.');
    } finally {
      setSaving(false);
    }
  };

  const removeRecord = async (record) => {
    if (!window.confirm(`Remove the ${record.source} entry from ${record.recorded_on}?`)) return;
    try {
      await api.delete(`/revenue/records/${record.id}`);
      if (editingId === record.id) closeForm();
      onToast('Revenue entry removed.');
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not remove the revenue entry.');
    }
  };

  return <section className="m3-page">
    <div className="m3-heading">
      <div><div className="m2-eyebrow">MONETIZATION</div><h1>Revenue analytics</h1><p>Track the income streams that power your creator business.</p></div>
      <div className="m3-actions"><button className="secondary-button" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/>Refresh</button><button className="primary-button" onClick={openCreate}><Plus size={16}/>Add revenue</button></div>
    </div>
    {error && <div className="admin-error" role="alert"><X size={15}/>{error}</div>}
    {currencyTotals.length > 1 && <div className="revenue-currency-strip" aria-label="Revenue totals by currency">{currencyTotals.map((row) => <button key={row.currency} type="button" className={`revenue-currency-chip ${row.currency === total.currency ? 'active' : ''}`} onClick={() => setSelectedCurrency(row.currency)}><span>{row.currency}</span><strong>{currencyFormat(row.amount, row.currency)}</strong></button>)}<small>Totals are shown per currency and are never added together across currencies.</small></div>}
    {formOpen && <section className="card revenue-form-card"><div className="card-header"><div><h3><Banknote size={17}/>{editingId ? 'Edit revenue entry' : 'New revenue entry'}</h3><p>Use the income date, source, and actual amount received.</p></div><button className="icon-button" onClick={closeForm} aria-label="Close revenue form"><X size={16}/></button></div><form className="revenue-form" onSubmit={submit}><label>Revenue source<select value={form.source} onChange={(event) => updateForm('source', event.target.value)}>{sources.map((source) => <option key={source}>{source}</option>)}</select></label><label>Amount<input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} placeholder="0.00" required /></label><label>Currency<input value={form.currency} maxLength="3" onChange={(event) => updateForm('currency', event.target.value.toUpperCase())} required /></label><label>Received on<input type="date" value={form.recorded_on} onChange={(event) => updateForm('recorded_on', event.target.value)} required /></label><label className="revenue-note">Note (optional)<input value={form.description} maxLength="250" onChange={(event) => updateForm('description', event.target.value)} placeholder="e.g. October campaign settlement" /></label><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Save entry'}{editingId ? <Pencil size={16}/> : <Plus size={16}/>}</button>{editingId && <button type="button" className="secondary-button" onClick={closeForm}>Cancel</button>}</form></section>}
    <div className="revenue-kpis">
      <article className="card revenue-kpi"><span className="revenue-icon purple"><CircleDollarSign size={20}/></span><div><small>Revenue · last 90 days</small><strong>{currencyFormat(total.amount, total.currency)}</strong><em>{records.filter((record) => record.currency === total.currency).length} tracked {records.filter((record) => record.currency === total.currency).length === 1 ? 'entry' : 'entries'} in {total.currency}</em></div></article>
      <article className="card revenue-kpi"><span className="revenue-icon amber"><TrendingUp size={20}/></span><div><small>Leading source · {total.currency}</small><strong>{sourceRows[0] ? sourceRows[0].source : 'No data yet'}</strong><em>{sourceRows[0] ? currencyFormat(sourceRows[0].amount, total.currency) : 'Add your first entry'}</em></div></article>
      <article className="card revenue-kpi"><span className="revenue-icon green"><Banknote size={20}/></span><div><small>Sources tracked</small><strong>{sourceRows.length}</strong><em>{currencyTotals.length} currenc{currencyTotals.length === 1 ? 'y' : 'ies'} recorded</em></div></article>
    </div>
    <div className="revenue-layout">
      <section className="card revenue-chart-card"><div className="card-header"><div><h3>Revenue trend</h3><p>Recorded income over the last 90 days.</p></div><span className="subtle-pill">{total.currency}</span></div><div className="revenue-chart">{loading ? <div className="analytics-loading">Loading revenue…</div> : chartRows.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartRows} margin={{ top: 10, right: 4, left: -22, bottom: 0 }}><defs><linearGradient id="revenueArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7459ee" stopOpacity=".35"/><stop offset="100%" stopColor="#7459ee" stopOpacity="0"/></linearGradient></defs><CartesianGrid vertical={false} stroke="#eceaf4"/><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8a8798' }}/><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8a8798' }}/><Tooltip formatter={(value) => currencyFormat(value, total.currency)}/><Area type="monotone" dataKey="amount" stroke="#7459ee" strokeWidth={2.4} fill="url(#revenueArea)"/></AreaChart></ResponsiveContainer> : <div className="analytics-empty">No revenue entries in this period.</div>}</div></section>
      <section className="card revenue-source-card"><div className="card-header"><div><h3>Income mix</h3><p>Where your {total.currency} revenue is coming from.</p></div></div><div className="source-breakdown">{sourceRows.length ? sourceRows.map((row) => <div className="source-row" key={`${row.currency}-${row.source}`}><div><strong>{row.source}</strong><span>{currencyFormat(row.amount, row.currency)}</span></div><i><b style={{ width: `${Math.max(5, (row.amount / Math.max(total.amount, 1)) * 100)}%` }}/></i></div>) : <div className="analytics-empty">Sources will appear after you add an entry.</div>}</div></section>
    </div>
    <section className="card revenue-records"><div className="card-header"><div><h3>Revenue records</h3><p>All entries from the last 90 days.</p></div></div><div className="admin-table-wrap"><table className="admin-table revenue-table"><thead><tr><th>DATE</th><th>SOURCE</th><th>NOTE</th><th>AMOUNT</th><th aria-label="Actions" /></tr></thead><tbody>{records.length ? records.map((record) => <tr key={record.id}><td className="admin-date">{new Date(`${record.recorded_on}T00:00:00`).toLocaleDateString('en-IN')}</td><td><strong>{record.source}</strong></td><td>{record.description || '—'}</td><td className="revenue-amount">{currencyFormat(record.amount, record.currency)}</td><td><div className="revenue-row-actions"><button className="table-icon-button" onClick={() => startEdit(record)} aria-label={`Edit ${record.source} revenue entry`} title="Edit entry"><Pencil size={15}/></button><button className="table-icon-button danger" onClick={() => removeRecord(record)} aria-label={`Remove ${record.source} revenue entry`} title="Remove entry"><Trash2 size={15}/></button></div></td></tr>) : <tr><td colSpan="5" className="revenue-empty">No entries yet. Add income to start your revenue history.</td></tr>}</tbody></table></div></section>
  </section>;
}
