import { useCallback, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

const statusLabels = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  suspended: 'Suspensa',
  closed: 'Encerrada',
  open: 'Aberta',
  reviewing: 'Em análise',
  resolved: 'Resolvida',
  dismissed: 'Descartada'
};

export default function AdminPanel() {
  const [section, setSection] = useState('empresas');
  const [companies, setCompanies] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    const [companyResult, opportunityResult, reportResult] = await Promise.all([
      supabase.from('company_profiles').select('id,name,email,website,description,status,created_at').order('created_at', { ascending: false }),
      supabase.from('opportunities').select('id,title,description,compensation,deadline,status,created_at,company_profiles(name)').order('created_at', { ascending: false }),
      supabase.from('opportunity_reports').select('id,reason,details,status,created_at,opportunity_id').order('created_at', { ascending: false })
    ]);
    const firstError = companyResult.error || opportunityResult.error || reportResult.error;
    if (firstError) setError('Não foi possível carregar todos os dados: ' + firstError.message);
    setCompanies(companyResult.data || []);
    setOpportunities(opportunityResult.data || []);
    setReports(reportResult.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function changeStatus(table, id, status, setter, rows) {
    setBusyId(id);
    setError('');
    setMessage('');
    const patch = table === 'opportunity_reports' ? { status } : { status, updated_at: new Date().toISOString() };
    const { error: updateError } = await supabase.from(table).update(patch).eq('id', id);
    if (updateError) setError('Não foi possível atualizar: ' + updateError.message);
    else {
      setter(rows.map(row => row.id === id ? { ...row, status } : row));
      setMessage('Status atualizado com sucesso.');
    }
    setBusyId('');
  }

  const pendingCompanies = companies.filter(item => item.status === 'pending').length;
  const pendingOpportunities = opportunities.filter(item => item.status === 'pending').length;
  const openReports = reports.filter(item => item.status === 'open' || item.status === 'reviewing').length;

  return <section className="admin-page">
    <div className="section-heading"><div><h2>Painel administrativo</h2><p>Gerencie empresas, oportunidades e denúncias da plataforma.</p></div><button className="logout-button" onClick={loadData} disabled={loading}>Atualizar dados</button></div>
    <div className="stats admin-stats">
      <article className="stat-card"><div className="stat-icon blue">▣</div><span>Empresas pendentes</span><strong>{pendingCompanies}</strong></article>
      <article className="stat-card"><div className="stat-icon green">↗</div><span>Oportunidades pendentes</span><strong>{pendingOpportunities}</strong></article>
      <article className="stat-card"><div className="stat-icon violet">⚑</div><span>Denúncias abertas</span><strong>{openReports}</strong></article>
    </div>
    <div className="admin-tabs">
      <button className={section === 'empresas' ? 'active' : ''} onClick={() => setSection('empresas')}>Empresas ({companies.length})</button>
      <button className={section === 'oportunidades' ? 'active' : ''} onClick={() => setSection('oportunidades')}>Oportunidades ({opportunities.length})</button>
      <button className={section === 'denuncias' ? 'active' : ''} onClick={() => setSection('denuncias')}>Denúncias ({reports.length})</button>
    </div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {message && <p className="admin-success" role="status">{message}</p>}
    {loading ? <div className="panel"><p className="empty">Carregando informações administrativas...</p></div> :
      section === 'empresas' ? <div className="panel admin-list">
        <div className="panel-heading"><div><h3>Cadastro de empresas</h3><p>Revise e aprove empresas antes de liberar publicações.</p></div></div>
        {companies.length ? companies.map(company => <article className="admin-record" key={company.id}>
          <div className="admin-record-main"><strong>{company.name}</strong><span>{company.email}</span>{company.website && <a href={company.website} target="_blank" rel="noreferrer">{company.website}</a>}<small>{company.description || 'Sem descrição'} • {new Date(company.created_at).toLocaleDateString('pt-BR')}</small></div>
          <span className={'admin-status status-' + company.status}>{statusLabels[company.status] || company.status}</span>
          <div className="admin-actions">
            <button disabled={busyId === company.id} onClick={() => changeStatus('company_profiles', company.id, 'approved', setCompanies, companies)}>Aprovar</button>
            <button className="danger" disabled={busyId === company.id} onClick={() => changeStatus('company_profiles', company.id, 'rejected', setCompanies, companies)}>Rejeitar</button>
            <button className="muted" disabled={busyId === company.id} onClick={() => changeStatus('company_profiles', company.id, 'suspended', setCompanies, companies)}>Suspender</button>
          </div>
        </article>) : <p className="empty">Nenhuma empresa cadastrada até agora.</p>}
      </div> : section === 'oportunidades' ? <div className="panel admin-list">
        <div className="panel-heading"><div><h3>Oportunidades publicadas</h3><p>Somente oportunidades aprovadas ficam visíveis aos usuários.</p></div></div>
        {opportunities.length ? opportunities.map(item => <article className="admin-record" key={item.id}>
          <div className="admin-record-main"><strong>{item.title}</strong><span>{item.company_profiles?.name || 'Empresa não identificada'} • {item.compensation || 'Remuneração não informada'}</span><small>{item.description}</small>{item.deadline && <small>Prazo: {new Date(item.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}</small>}</div>
          <span className={'admin-status status-' + item.status}>{statusLabels[item.status] || item.status}</span>
          <div className="admin-actions">
            <button disabled={busyId === item.id} onClick={() => changeStatus('opportunities', item.id, 'approved', setOpportunities, opportunities)}>Aprovar</button>
            <button className="danger" disabled={busyId === item.id} onClick={() => changeStatus('opportunities', item.id, 'rejected', setOpportunities, opportunities)}>Rejeitar</button>
            <button className="muted" disabled={busyId === item.id} onClick={() => changeStatus('opportunities', item.id, 'suspended', setOpportunities, opportunities)}>Suspender</button>
          </div>
        </article>) : <p className="empty">Nenhuma oportunidade cadastrada.</p>}
      </div> : <div className="panel admin-list">
        <div className="panel-heading"><div><h3>Denúncias recebidas</h3><p>Analise os relatos enviados pelos usuários.</p></div></div>
        {reports.length ? reports.map(report => <article className="admin-record" key={report.id}>
          <div className="admin-record-main"><strong>{report.reason}</strong><span>{report.details || 'Sem detalhes adicionais'}</span><small>Recebida em {new Date(report.created_at).toLocaleString('pt-BR')}</small></div>
          <span className={'admin-status status-' + report.status}>{statusLabels[report.status] || report.status}</span>
          <div className="admin-actions">
            <button disabled={busyId === report.id} onClick={() => changeStatus('opportunity_reports', report.id, 'reviewing', setReports, reports)}>Em análise</button>
            <button disabled={busyId === report.id} onClick={() => changeStatus('opportunity_reports', report.id, 'resolved', setReports, reports)}>Resolver</button>
            <button className="muted" disabled={busyId === report.id} onClick={() => changeStatus('opportunity_reports', report.id, 'dismissed', setReports, reports)}>Descartar</button>
          </div>
        </article>) : <p className="empty">Nenhuma denúncia recebida.</p>}
      </div>}
  </section>;
}
