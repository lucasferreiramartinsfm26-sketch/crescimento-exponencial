import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase';
import CompanyNotifications from './CompanyNotifications';
import { CompanyApplications } from './Applications';

const statusLabels = { pending: 'Em análise', approved: 'Aprovada', rejected: 'Rejeitada', suspended: 'Suspensa', closed: 'Encerrada' };

const emptyOpportunity = {
  company_id: '',
  title: '',
  description: '',
  requirements: '',
  compensation: '',
  payment_method: '',
  application_url: '',
  deadline: ''
};

export default function CompanyPortal() {
  const [companies, setCompanies] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [form, setForm] = useState({ name: '', cnpj: '', email: '', phone: '', website: '', description: '' });
  const [opportunityForm, setOpportunityForm] = useState(emptyOpportunity);

  const approvedCompanies = useMemo(() => companies.filter(company => company.status === 'approved'), [companies]);

  async function loadCompanies() {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase.from('company_profiles')
      .select('id,name,cnpj,email,phone,website,description,status,created_at')
      .order('created_at', { ascending: false });
    if (loadError) {
      setError('Não foi possível carregar seus cadastros. ' + loadError.message);
      setCompanies([]);
      setOpportunities([]);
    } else {
      const rows = data || [];
      setCompanies(rows);
      const approved = rows.filter(company => company.status === 'approved');
      if (approved.length) {
        const { data: opportunityRows, error: opportunityError } = await supabase.from('opportunities')
          .select('id,company_id,title,description,compensation,payment_method,deadline,status,created_at')
          .in('company_id', approved.map(company => company.id))
          .order('created_at', { ascending: false });
        if (opportunityError) setError('Não foi possível carregar suas oportunidades. ' + opportunityError.message);
        else setOpportunities(opportunityRows || []);
      } else {
        setOpportunities([]);
      }
    }
    setLoading(false);
  }

  useEffect(() => { loadCompanies(); }, []);

  function updateField(event) {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updateOpportunityField(event) {
    setOpportunityForm(current => ({ ...current, [event.target.name]: event.target.value }));
  }

  function startCompanyEdit(company) {
    setEditingCompanyId(company.id);
    setForm({ name: company.name || '', cnpj: company.cnpj || '', email: company.email || '', phone: company.phone || '', website: company.website || '', description: company.description || '' });
    setError('');
    setMessage('Editando cadastro pendente. Salve as alterações ou cancele.');
  }

  function cancelCompanyEdit() {
    setEditingCompanyId(null);
    setForm({ name: '', cnpj: '', email: '', phone: '', website: '', description: '' });
    setError('');
    setMessage('');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      setError('Sua sessão expirou. Entre novamente.');
      setSaving(false);
      return;
    }
    const payload = {
      owner_id: user.id,
      name: form.name.trim(),
      cnpj: form.cnpj.replace(/\\D/g, ''),
      email: form.email.trim(),
      phone: form.phone.trim(),
      website: form.website.trim() || null,
      description: form.description.trim(),
      status: 'pending'
    };
    const result = editingCompanyId
      ? await supabase.from('company_profiles').update({ name: payload.name, cnpj: payload.cnpj, email: payload.email, phone: payload.phone, website: payload.website, description: payload.description }).eq('id', editingCompanyId).eq('status', 'pending')
      : await supabase.from('company_profiles').insert(payload);
    if (result.error) setError('Não foi possível salvar o cadastro. ' + result.error.message);
    else {
      const wasEditing = Boolean(editingCompanyId);
      setEditingCompanyId(null);
      setForm({ name: '', cnpj: '', email: '', phone: '', website: '', description: '' });
      setMessage(wasEditing ? 'Cadastro atualizado com sucesso.' : 'Cadastro enviado! Nossa equipe irá analisar as informações.');
      await loadCompanies();
    }
    setSaving(false);
  }

  async function submitOpportunity(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    const selectedCompanyId = approvedCompanies.some(company => company.id === opportunityForm.company_id)
      ? opportunityForm.company_id
      : approvedCompanies[0]?.id;
    if (!selectedCompanyId) {
      setError('Selecione uma empresa aprovada antes de publicar.');
      setSaving(false);
      return;
    }
    const payload = {
      company_id: selectedCompanyId,
      title: opportunityForm.title.trim(),
      description: opportunityForm.description.trim(),
      requirements: opportunityForm.requirements.trim(),
      compensation: opportunityForm.compensation.trim(),
      payment_method: opportunityForm.payment_method.trim(),
      application_url: opportunityForm.application_url.trim() || null,
      deadline: opportunityForm.deadline || null,
      status: 'pending'
    };
    const { error: insertError } = await supabase.from('opportunities').insert(payload);
    if (insertError) setError('Não foi possível enviar a oportunidade. ' + insertError.message);
    else {
      setOpportunityForm({ ...emptyOpportunity, company_id: selectedCompanyId });
      setMessage('Oportunidade enviada para aprovação!');
      await loadCompanies();
    }
    setSaving(false);
  }

  return <section className="company-page">
    <CompanyNotifications />
    <div className="section-heading"><div><h2>Área da empresa</h2><p>Cadastre sua empresa e acompanhe suas oportunidades.</p></div></div>
    <div className="company-layout">
      <section className="panel company-form-panel">
        <div className="panel-heading"><div><h3>{editingCompanyId ? 'Editar cadastro da empresa' : 'Cadastrar empresa'}</h3><p>Cadastros pendentes podem ser corrigidos antes da aprovação.</p></div></div>
        <form className="company-form" onSubmit={submit}>
          <label>Nome da empresa<input name="name" value={form.name} onChange={updateField} minLength="2" maxLength="160" placeholder="Razão social ou nome fantasia" required /></label>
          <label>CNPJ<input name="cnpj" value={form.cnpj} onChange={updateField} inputMode="numeric" maxLength="18" placeholder="00.000.000/0000-00" required /></label>
          <label>E-mail de contato<input name="email" type="email" value={form.email} onChange={updateField} placeholder="contato@empresa.com.br" required /></label>
          <label>Telefone<input name="phone" type="tel" value={form.phone} onChange={updateField} placeholder="(00) 00000-0000" required /></label>
          <label>Site (opcional)<input name="website" type="url" value={form.website} onChange={updateField} placeholder="https://www.empresa.com.br" /></label>
          <label className="company-description">Sobre a empresa<textarea name="description" value={form.description} onChange={updateField} rows="4" maxLength="1200" placeholder="Conte brevemente sobre a empresa e suas atividades." required /></label>
          <button type="submit" disabled={saving}>{saving ? 'Salvando...' : editingCompanyId ? 'Salvar alterações' : 'Enviar para aprovação'}</button>{editingCompanyId && <button type="button" className="logout-button" onClick={cancelCompanyEdit} disabled={saving}>Cancelar edição</button>}
        </form>
      </section>
      <section className="panel company-list-panel">
        <div className="panel-heading"><div><h3>Meus cadastros</h3><p>Acompanhe a análise das suas empresas.</p></div><button type="button" className="logout-button" onClick={loadCompanies} disabled={loading}>Atualizar</button></div>
        {loading ? <p className="empty">Carregando...</p> : companies.length ? companies.map(company => <article className="admin-record" key={company.id}>
          <div className="admin-record-main"><strong>{company.name}</strong><span>{company.cnpj || 'CNPJ não informado'} • {company.email}</span><small>{company.phone || ''}</small><small>Enviado em {new Date(company.created_at).toLocaleDateString('pt-BR')}</small></div>
          <span className={'admin-status status-' + company.status}>{statusLabels[company.status] || company.status}</span>
          {company.status === 'pending' && <button type="button" className="logout-button" onClick={() => startCompanyEdit(company)}>Editar cadastro</button>}
          {company.status === 'approved' && <p className="company-approved-note">Empresa aprovada. Você já pode cadastrar oportunidades.</p>}
          {company.status === 'rejected' && <p className="company-rejected-note">Cadastro não aprovado. Entre em contato com o suporte para orientações.</p>}
          {company.status === 'suspended' && <p className="company-rejected-note">Cadastro suspenso. Entre em contato com o suporte para orientações.</p>}
        </article>) : <p className="empty">Você ainda não cadastrou uma empresa.</p>}
      </section>
    </div>

    <section className="panel company-form-panel" style={{ marginTop: 18 }}>
      <div className="panel-heading"><div><h3>Publicar oportunidade</h3><p>Somente empresas aprovadas podem enviar oportunidades. Todas passam por análise.</p></div></div>
      {loading ? <p className="empty">Carregando empresas...</p> : approvedCompanies.length ? <form className="company-form" onSubmit={submitOpportunity}>
        <label>Empresa<select name="company_id" value={approvedCompanies.some(company => company.id === opportunityForm.company_id) ? opportunityForm.company_id : approvedCompanies[0].id} onChange={updateOpportunityField} required>{approvedCompanies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
        <label>Título da oportunidade<input name="title" value={opportunityForm.title} onChange={updateOpportunityField} minLength="3" maxLength="180" placeholder="Ex.: Assistente administrativo" required /></label>
        <label>Descrição<textarea name="description" value={opportunityForm.description} onChange={updateOpportunityField} rows="4" placeholder="Descreva as atividades e responsabilidades." required /></label>
        <label>Requisitos<textarea name="requirements" value={opportunityForm.requirements} onChange={updateOpportunityField} rows="3" placeholder="Informe os requisitos necessários." /></label>
        <label>Remuneração ou benefício<input name="compensation" value={opportunityForm.compensation} onChange={updateOpportunityField} placeholder="Ex.: R$ 2.500,00 ou a combinar" /></label>
        <label>Forma de pagamento (opcional)<input name="payment_method" value={opportunityForm.payment_method} onChange={updateOpportunityField} placeholder="Ex.: Mensal, por projeto" /></label>
        <label>Link para candidatura (opcional)<input name="application_url" type="url" value={opportunityForm.application_url} onChange={updateOpportunityField} placeholder="https://..." /></label>
        <label>Prazo para candidatura (opcional)<input name="deadline" type="date" value={opportunityForm.deadline} onChange={updateOpportunityField} /></label>
        <button type="submit" disabled={saving}>{saving ? 'Enviando...' : 'Enviar oportunidade para aprovação'}</button>
      </form> : <p className="empty">Após a aprovação de uma empresa, o formulário para publicar oportunidades será liberado aqui.</p>}
    </section>

    <section className="panel company-list-panel" style={{ marginTop: 18 }}>
      <div className="panel-heading"><div><h3>Minhas oportunidades</h3><p>Acompanhe a análise e a situação das publicações enviadas.</p></div></div>
      {loading ? <p className="empty">Carregando oportunidades...</p> : opportunities.length ? opportunities.map(item => <article className="admin-record" key={item.id}>
        <div className="admin-record-main"><strong>{item.title}</strong><span>{companies.find(company => company.id === item.company_id)?.name || 'Empresa'}</span><small>{item.compensation || 'Remuneração não informada'}</small><small>Enviada em {new Date(item.created_at).toLocaleDateString('pt-BR')}{item.deadline ? ' • Prazo: ' + new Date(item.deadline + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</small></div>
        <span className={'admin-status status-' + item.status}>{statusLabels[item.status] || item.status}</span>
      </article>) : <p className="empty">Você ainda não enviou oportunidades.</p>}
    </section>
    <CompanyApplications opportunities={opportunities} />
    {error && <p className="admin-error" role="alert">{error}</p>}
    {message && <p className="admin-success" role="status">{message}</p>}
  </section>;
}
