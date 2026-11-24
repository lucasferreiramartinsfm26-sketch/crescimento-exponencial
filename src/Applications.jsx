import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

const labels = { pending: 'Nova', reviewing: 'Em análise', approved: 'Aprovada', rejected: 'Não selecionada' };

export function CandidateApplicationForm({ opportunity, onClose }) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', resume_url: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (user) setForm(current => ({
        ...current,
        full_name: user.user_metadata?.name || '',
        email: user.email || ''
      }));
    });
  }, []);

  function change(event) {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) {
      setError('Entre na sua conta para se candidatar.');
      setSaving(false);
      return;
    }
    const { error: insertError } = await supabase.from('opportunity_applications').insert({
      opportunity_id: opportunity.id,
      candidate_id: user.id,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      resume_url: form.resume_url.trim() || null,
      message: form.message.trim() || null
    });
    if (insertError) {
      setError(insertError.code === '23505'
        ? 'Você já se candidatou a esta oportunidade.'
        : 'Não foi possível enviar sua candidatura. ' + insertError.message);
    } else {
      setSuccess('Candidatura enviada com sucesso! A empresa poderá analisar seus dados.');
      setForm(current => ({ ...current, phone: '', resume_url: '', message: '' }));
    }
    setSaving(false);
  }

  return <section className="panel application-form-panel">
    <div className="panel-heading"><div><h3>Candidatar-se: {opportunity.title}</h3><p>Preencha seus dados para enviar sua candidatura à empresa.</p></div></div>
    <form className="company-form" onSubmit={submit}>
      <label>Nome completo<input name="full_name" value={form.full_name} onChange={change} minLength="2" maxLength="160" required /></label>
      <label>E-mail<input name="email" type="email" value={form.email} onChange={change} required /></label>
      <label>Telefone<input name="phone" type="tel" value={form.phone} onChange={change} placeholder="(00) 00000-0000" /></label>
      <label>Link do currículo (opcional)<input name="resume_url" type="url" value={form.resume_url} onChange={change} placeholder="https://..." /></label>
      <label className="company-description">Apresentação (opcional)<textarea name="message" value={form.message} onChange={change} rows="4" maxLength="1500" placeholder="Conte brevemente sobre sua experiência e interesse." /></label>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {success && <p className="admin-success" role="status">{success}</p>}
      <div className="application-form-actions">
        <button type="submit" disabled={saving || !!success}>{saving ? 'Enviando...' : 'Enviar candidatura'}</button>
        <button type="button" className="logout-button" onClick={onClose}>Fechar</button>
      </div>
    </form>
  </section>;
}

export function MyApplications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      setError('Entre na sua conta para acompanhar suas candidaturas.');
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await supabase.from('opportunity_applications')
      .select('id,full_name,email,created_at,status,opportunities(title,company_profiles(name))')
      .order('created_at', { ascending: false });
    if (queryError) setError('Não foi possível carregar suas candidaturas. ' + queryError.message);
    else setItems(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return <section className="panel applications-list-panel">
    <div className="panel-heading"><div><h3>Minhas candidaturas</h3><p>Acompanhe o andamento das oportunidades às quais você se candidatou.</p></div><button type="button" className="logout-button" onClick={load} disabled={loading}>Atualizar</button></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {loading ? <p className="empty">Carregando candidaturas...</p> : items.length ? items.map(item => <article className="admin-record" key={item.id}>
      <div className="admin-record-main"><strong>{item.opportunities?.title || 'Oportunidade'}</strong><span>{item.opportunities?.company_profiles?.name || 'Empresa'}</span><small>Enviada em {new Date(item.created_at).toLocaleDateString('pt-BR')}</small></div>
      <span className={'admin-status status-' + item.status}>{labels[item.status] || item.status}</span>
    </article>) : <p className="empty">Você ainda não enviou candidaturas.</p>}
  </section>;
}

export function CompanyApplications({ opportunities = [] }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');

  async function load() {
    const ids = opportunities.map(item => item.id);
    if (!ids.length) { setItems([]); return; }
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase.from('opportunity_applications')
      .select('id,opportunity_id,full_name,email,phone,resume_url,message,status,created_at')
      .in('opportunity_id', ids)
      .order('created_at', { ascending: false });
    if (queryError) setError('Não foi possível carregar os candidatos. ' + queryError.message);
    else setItems(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [opportunities.map(item => item.id).join(',')]);

  async function changeStatus(item, status) {
    setSavingId(item.id);
    setError('');
    const { error: updateError } = await supabase.from('opportunity_applications')
      .update({ status, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (updateError) setError('Não foi possível atualizar a candidatura. ' + updateError.message);
    else setItems(current => current.map(row => row.id === item.id ? { ...row, status } : row));
    setSavingId('');
  }

  const titles = Object.fromEntries(opportunities.map(item => [item.id, item.title]));
  return <section className="panel company-list-panel applications-list-panel" style={{ marginTop: 18 }}>
    <div className="panel-heading"><div><h3>Candidatos às minhas oportunidades</h3><p>Visualize os dados e atualize o andamento de cada candidatura.</p></div><button type="button" className="logout-button" onClick={load} disabled={loading}>Atualizar</button></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {loading ? <p className="empty">Carregando candidatos...</p> : items.length ? items.map(item => <article className="admin-record applicant-record" key={item.id}>
      <div className="admin-record-main"><strong>{item.full_name}</strong><span>{titles[item.opportunity_id] || 'Oportunidade'}</span><a href={'mailto:' + item.email}>{item.email}</a>{item.phone && <small>{item.phone}</small>}{item.resume_url && <a href={item.resume_url} target="_blank" rel="noreferrer">Abrir currículo</a>}{item.message && <p className="applicant-message">{item.message}</p>}<small>Recebida em {new Date(item.created_at).toLocaleDateString('pt-BR')}</small></div>
      <span className={'admin-status status-' + item.status}>{labels[item.status] || item.status}</span>
      <div className="admin-actions application-status-actions">
        <button type="button" className="muted" disabled={savingId === item.id} onClick={() => changeStatus(item, 'reviewing')}>Em análise</button>
        <button type="button" disabled={savingId === item.id} onClick={() => changeStatus(item, 'approved')}>Aprovar</button>
        <button type="button" className="danger" disabled={savingId === item.id} onClick={() => changeStatus(item, 'rejected')}>Rejeitar</button>
      </div>
    </article>) : <p className="empty">Ainda não há candidatos para suas oportunidades.</p>}
  </section>;
}
