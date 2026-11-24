import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import ApplicationMessages from './ApplicationMessages';

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
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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

  const counts = {
    all: items.length,
    pending: items.filter(item => item.status === 'pending').length,
    reviewing: items.filter(item => item.status === 'reviewing').length,
    approved: items.filter(item => item.status === 'approved').length,
    rejected: items.filter(item => item.status === 'rejected').length
  };
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');
  const filteredItems = items.filter(item => {
    const title = item.opportunities?.title || '';
    const company = item.opportunities?.company_profiles?.name || '';
    const matchesSearch = !normalizedSearch || title.toLocaleLowerCase('pt-BR').includes(normalizedSearch) || company.toLocaleLowerCase('pt-BR').includes(normalizedSearch);
    return matchesSearch && (statusFilter === 'all' || item.status === statusFilter);
  });

  return <section className="panel applications-list-panel">
    <div className="panel-heading"><div><h3>Minhas candidaturas</h3><p>Acompanhe o andamento das oportunidades às quais você se candidatou.</p></div><button type="button" className="logout-button" onClick={load} disabled={loading}>Atualizar</button></div>
    <div className="application-management-summary">
      <div><strong>{counts.all}</strong><span>Total</span></div><div><strong>{counts.pending}</strong><span>Novas</span></div><div><strong>{counts.reviewing}</strong><span>Em análise</span></div><div><strong>{counts.approved}</strong><span>Aprovadas</span></div><div><strong>{counts.rejected}</strong><span>Não selecionadas</span></div>
    </div>
    <div className="application-management-filters">
      <label>Buscar oportunidade ou empresa<input type="search" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Digite para buscar" /></label>
      <label>Filtrar por situação<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">Todas as situações</option><option value="pending">Novas</option><option value="reviewing">Em análise</option><option value="approved">Aprovadas</option><option value="rejected">Não selecionadas</option></select></label>
    </div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {loading ? <p className="empty">Carregando candidaturas...</p> : filteredItems.length ? filteredItems.map(item => <article className="admin-record" key={item.id}>
      <div className="admin-record-main"><strong>{item.opportunities?.title || 'Oportunidade'}</strong><span>{item.opportunities?.company_profiles?.name || 'Empresa'}</span><small>Enviada em {new Date(item.created_at).toLocaleDateString('pt-BR')}</small></div>
      <span className={'admin-status status-' + item.status}>{labels[item.status] || item.status}</span>
      <ApplicationMessages applicationId={item.id} />
    </article>) : items.length ? <p className="empty">Nenhuma candidatura corresponde à busca e ao filtro selecionados.</p> : <p className="empty">Você ainda não enviou candidaturas.</p>}
  </section>;
}

export function CompanyApplications({ opportunities = [] }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');
  const filteredItems = items.filter(item => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesSearch = !normalizedSearch ||
      item.full_name.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
      item.email.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
      (titles[item.opportunity_id] || '').toLocaleLowerCase('pt-BR').includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });
  const counts = {
    all: items.length,
    pending: items.filter(item => item.status === 'pending').length,
    reviewing: items.filter(item => item.status === 'reviewing').length,
    approved: items.filter(item => item.status === 'approved').length,
    rejected: items.filter(item => item.status === 'rejected').length
  };

  return <section className="panel company-list-panel applications-list-panel" style={{ marginTop: 18 }}>
    <div className="panel-heading"><div><h3>Candidatos às minhas oportunidades</h3><p>Visualize os dados e atualize o andamento de cada candidatura.</p></div><button type="button" className="logout-button" onClick={load} disabled={loading}>Atualizar</button></div>
    <div className="application-management-summary">
      <div><strong>{counts.all}</strong><span>Total</span></div>
      <div><strong>{counts.pending}</strong><span>Novas</span></div>
      <div><strong>{counts.reviewing}</strong><span>Em análise</span></div>
      <div><strong>{counts.approved}</strong><span>Aprovadas</span></div>
      <div><strong>{counts.rejected}</strong><span>Não selecionadas</span></div>
    </div>
    <div className="application-management-filters">
      <label>Buscar candidato ou oportunidade<input type="search" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Nome, e-mail ou oportunidade" /></label>
      <label>Filtrar por situação<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
        <option value="all">Todas as situações</option>
        <option value="pending">Novas</option>
        <option value="reviewing">Em análise</option>
        <option value="approved">Aprovadas</option>
        <option value="rejected">Não selecionadas</option>
      </select></label>
    </div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {loading ? <p className="empty">Carregando candidatos...</p> : filteredItems.length ? filteredItems.map(item => <article className="admin-record applicant-record" key={item.id}>
      <div className="admin-record-main"><strong>{item.full_name}</strong><span>{titles[item.opportunity_id] || 'Oportunidade'}</span><a href={'mailto:' + item.email}>{item.email}</a>{item.phone && <small>{item.phone}</small>}{item.resume_url && <a href={item.resume_url} target="_blank" rel="noreferrer">Abrir currículo</a>}{item.message && <p className="applicant-message">{item.message}</p>}<small>Recebida em {new Date(item.created_at).toLocaleDateString('pt-BR')}</small></div>
      <span className={'admin-status status-' + item.status}>{labels[item.status] || item.status}</span>
      <ApplicationMessages applicationId={item.id} />
      <div className="admin-actions application-status-actions">
        <button type="button" className="muted" disabled={savingId === item.id || item.status === 'reviewing'} onClick={() => changeStatus(item, 'reviewing')}>Em análise</button>
        <button type="button" disabled={savingId === item.id || item.status === 'approved'} onClick={() => changeStatus(item, 'approved')}>Aprovar</button>
        <button type="button" className="danger" disabled={savingId === item.id || item.status === 'rejected'} onClick={() => changeStatus(item, 'rejected')}>Rejeitar</button>
      </div>
    </article>) : items.length ? <p className="empty">Nenhuma candidatura corresponde à busca e ao filtro selecionados.</p> : <p className="empty">Ainda não há candidatos para suas oportunidades.</p>}
  </section>;
}