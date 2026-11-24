import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

const statusLabels = { pending: 'Em análise', approved: 'Aprovada', rejected: 'Rejeitada', suspended: 'Suspensa' };

export default function CompanyPortal() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', cnpj: '', email: '', phone: '', website: '', description: '' });

  async function loadCompanies() {
    setLoading(true);
    const { data, error: loadError } = await supabase.from('company_profiles')
      .select('id,name,cnpj,email,phone,website,description,status,created_at')
      .order('created_at', { ascending: false });
    if (loadError) setError('Não foi possível carregar seus cadastros. ' + loadError.message);
    else setCompanies(data || []);
    setLoading(false);
  }

  useEffect(() => { loadCompanies(); }, []);

  function updateField(event) {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
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
    const { error: insertError } = await supabase.from('company_profiles').insert(payload);
    if (insertError) setError('Não foi possível enviar o cadastro. ' + insertError.message);
    else {
      setForm({ name: '', cnpj: '', email: '', phone: '', website: '', description: '' });
      setMessage('Cadastro enviado! Nossa equipe irá analisar as informações.');
      await loadCompanies();
    }
    setSaving(false);
  }

  return <section className="company-page">
    <div className="section-heading"><div><h2>Área da empresa</h2><p>Cadastre sua empresa para publicar oportunidades na plataforma.</p></div></div>
    <div className="company-layout">
      <section className="panel company-form-panel">
        <div className="panel-heading"><div><h3>Cadastrar empresa</h3><p>O cadastro passa por aprovação antes de liberar publicações.</p></div></div>
        <form className="company-form" onSubmit={submit}>
          <label>Nome da empresa<input name="name" value={form.name} onChange={updateField} minLength={2} maxLength={160} placeholder="Razão social ou nome fantasia" required /></label>
          <label>CNPJ<input name="cnpj" value={form.cnpj} onChange={updateField} inputMode="numeric" maxLength={18} placeholder="00.000.000/0000-00" required /></label>
          <label>E-mail de contato<input name="email" type="email" value={form.email} onChange={updateField} placeholder="contato@empresa.com.br" required /></label>
          <label>Telefone<input name="phone" type="tel" value={form.phone} onChange={updateField} placeholder="(00) 00000-0000" required /></label>
          <label>Site (opcional)<input name="website" type="url" value={form.website} onChange={updateField} placeholder="https://www.empresa.com.br" /></label>
          <label className="company-description">Sobre a empresa<textarea name="description" value={form.description} onChange={updateField} rows="4" maxLength="1200" placeholder="Conte brevemente sobre a empresa e suas atividades." required /></label>
          <button type="submit" disabled={saving}>{saving ? 'Enviando cadastro...' : 'Enviar para aprovação'}</button>
        </form>
        {error && <p className="admin-error" role="alert">{error}</p>}
        {message && <p className="admin-success" role="status">{message}</p>}
      </section>
      <section className="panel company-list-panel">
        <div className="panel-heading"><div><h3>Meus cadastros</h3><p>Acompanhe a análise das suas empresas.</p></div><button type="button" className="logout-button" onClick={loadCompanies} disabled={loading}>Atualizar</button></div>
        {loading ? <p className="empty">Carregando...</p> : companies.length ? companies.map(company => <article className="admin-record" key={company.id}>
          <div className="admin-record-main"><strong>{company.name}</strong><span>{company.cnpj || 'CNPJ não informado'} • {company.email}</span><small>{company.phone || ''}</small><small>Enviado em {new Date(company.created_at).toLocaleDateString('pt-BR')}</small></div>
          <span className={'admin-status status-' + company.status}>{statusLabels[company.status] || company.status}</span>
          {company.status === 'approved' && <p className="company-approved-note">Empresa aprovada. A publicação de oportunidades será liberada na próxima etapa.</p>}
          {company.status === 'rejected' && <p className="company-rejected-note">Cadastro não aprovado. Entre em contato com o suporte para orientações.</p>}
        </article>) : <p className="empty">Você ainda não cadastrou uma empresa.</p>}
      </section>
    </div>
  </section>;
}
