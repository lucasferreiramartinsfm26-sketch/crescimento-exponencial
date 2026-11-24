import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase';
import { CandidateApplicationForm, MyApplications } from './Applications';

function categoryOf(item) {
  const text = [item.title, item.description, item.requirements].join(' ').toLocaleLowerCase('pt-BR');
  if (/est[aá]gio|estagi[aá]ri/.test(text)) return 'Estágio';
  if (/freelanc|aut[oô]nom|por projeto|pj\b/.test(text)) return 'Freelance';
  if (/emprego|clt|carteira assinada|sal[aá]rio|assistente|analista|vendedor|auxiliar|gerente|motorista|recepcionista/.test(text)) return 'Emprego';
  return 'Outras';
}

function dateLabel(value) {
  if (!value) return 'Prazo não informado';
  return new Date(value + 'T00:00:00').toLocaleDateString('pt-BR');
}

function localDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Opportunities() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [selected, setSelected] = useState(null);
  const [applying, setApplying] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('Informações falsas ou enganosas');
  const [reportDetails, setReportDetails] = useState('');
  const [sendingReport, setSendingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState('');
  const [favoriteError, setFavoriteError] = useState('');

  async function loadOpportunities() {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase
      .from('opportunities')
      .select('id,title,description,requirements,compensation,payment_method,application_url,deadline,created_at,company_id,company_profiles(name)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    if (loadError) {
      setError('Não foi possível carregar as oportunidades. ' + loadError.message);
      setItems([]);
    } else {
      const today = localDateISO();
      setItems((data || []).filter(item => !item.deadline || item.deadline >= today));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadOpportunities();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setFavoriteIds(Array.isArray(data?.user?.user_metadata?.favorite_opportunities) ? data.user.user_metadata.favorite_opportunities.filter(id => typeof id === 'string') : []);
    });
    return () => { active = false; };
  }, []);

  async function toggleFavorite(item) {
    setFavoriteBusy(item.id);
    setFavoriteError('');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData?.user;
    if (authError || !user) {
      setFavoriteError('Entre na sua conta para salvar oportunidades favoritas.');
      setFavoriteBusy('');
      return;
    }
    const current = Array.isArray(user.user_metadata?.favorite_opportunities) ? user.user_metadata.favorite_opportunities.filter(id => typeof id === 'string') : [];
    const next = current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id];
    const { error: saveError } = await supabase.auth.updateUser({ data: { favorite_opportunities: next } });
    if (saveError) setFavoriteError('Não foi possível atualizar seus favoritos. ' + saveError.message);
    else setFavoriteIds(next);
    setFavoriteBusy('');
  }

  async function submitReport(event) {
    event.preventDefault();
    if (!selected) return;
    setSendingReport(true);
    setError('');
    setReportMessage('');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      setError('Entre novamente na sua conta para enviar uma denúncia.');
      setSendingReport(false);
      return;
    }
    const { error: insertError } = await supabase.from('opportunity_reports').insert({
      reporter_id: authData.user.id,
      opportunity_id: selected.id,
      reason: reportReason,
      details: reportDetails.trim(),
      status: 'open'
    });
    if (insertError) setError('Não foi possível enviar a denúncia. ' + insertError.message);
    else {
      setReportMessage('Denúncia enviada. Nossa equipe irá analisar.');
      setReporting(false);
      setReportDetails('');
    }
    setSendingReport(false);
  }

  const visibleItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return items.filter(item => {
      const matchesCategory = category === 'Todas' || categoryOf(item) === category;
      const company = item.company_profiles?.name || '';
      const searchable = [item.title, item.description, item.requirements, company, item.compensation].join(' ').toLocaleLowerCase('pt-BR');
      return matchesCategory && searchable.includes(term) && (!favoritesOnly || favoriteIds.includes(item.id));
    });
  }, [items, search, category, favoritesOnly, favoriteIds]);

  return <section className="opportunities-page">
    <div className="section-heading">
      <div><h2>Oportunidades</h2><p>Encontre oportunidades publicadas por empresas aprovadas.</p></div>
      <button type="button" className="logout-button" onClick={loadOpportunities} disabled={loading}>Atualizar</button>
    </div>
    <div className="panel opportunities-tools">
      <label className="opportunity-search">Buscar oportunidade
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Digite o título, empresa ou palavra-chave..." />
      </label>
      <label className="opportunity-category">Categoria
        <select value={category} onChange={event => setCategory(event.target.value)}>
          {['Todas', 'Emprego', 'Estágio', 'Freelance', 'Outras'].map(value => <option key={value}>{value}</option>)}
        </select>
      </label>
    </div>
    <div className="opportunity-favorites-filter"><button type="button" className={favoritesOnly ? 'active' : ''} onClick={() => setFavoritesOnly(value => !value)}>★ {favoritesOnly ? 'Ver todas' : 'Minhas favoritas'} ({favoriteIds.length})</button></div>
    {favoriteError && <p className="admin-error" role="alert">{favoriteError}</p>}
    {error && <p className="admin-error" role="alert">{error}</p>}
    {loading ? <div className="panel"><p className="empty">Carregando oportunidades...</p></div> :
      visibleItems.length ? <div className="opportunity-grid">
        {visibleItems.map(item => <article className="panel opportunity-card" key={item.id}>
          <div className="opportunity-card-top"><span className="opportunity-category-tag">{categoryOf(item)}</span><small>{new Date(item.created_at).toLocaleDateString('pt-BR')}</small></div>
          <h3>{item.title}</h3>
          <p className="opportunity-company">{item.company_profiles?.name || 'Empresa parceira'}</p>
          <p className="opportunity-description">{item.description}</p>
          <div className="opportunity-meta">
            <span><b>Remuneração</b>{item.compensation || 'A combinar'}</span>
            <span><b>Prazo</b>{dateLabel(item.deadline)}</span>
          </div>
          <div className="opportunity-card-actions"><button type="button" className="opportunity-details-button" onClick={() => setSelected(item)}>Ver detalhes</button><button type="button" className={favoriteIds.includes(item.id) ? 'favorite-button saved' : 'favorite-button'} onClick={() => toggleFavorite(item)} disabled={favoriteBusy === item.id}>{favoriteBusy === item.id ? '...' : favoriteIds.includes(item.id) ? '★ Favorita' : '☆ Favoritar'}</button></div>
        </article>)}
      </div> : <div className="panel"><p className="empty">{items.length ? 'Nenhuma oportunidade corresponde à sua busca.' : 'Ainda não há oportunidades aprovadas disponíveis. Volte em breve!'}</p></div>}
    {selected && <div className="opportunity-detail-backdrop" role="presentation" onClick={event => { if (event.target === event.currentTarget) setSelected(null); }}>
      <section className="panel opportunity-detail" role="dialog" aria-modal="true" aria-labelledby="opportunity-detail-title">
        <div className="opportunity-detail-heading"><div><span className="opportunity-category-tag">{categoryOf(selected)}</span><h2 id="opportunity-detail-title">{selected.title}</h2><p>{selected.company_profiles?.name || 'Empresa parceira'}</p></div><button type="button" className="logout-button" onClick={() => setSelected(null)}>Fechar</button></div>
        <h3>Descrição</h3><p>{selected.description}</p>
        <h3>Requisitos</h3><p>{selected.requirements || 'Não informados.'}</p>
        <div className="opportunity-meta">
          <span><b>Remuneração</b>{selected.compensation || 'A combinar'}</span>
          <span><b>Pagamento</b>{selected.payment_method || 'Não informado'}</span>
          <span><b>Prazo para candidatura</b>{dateLabel(selected.deadline)}</span>
        </div>
        <button type="button" className={favoriteIds.includes(selected.id) ? 'favorite-button saved' : 'favorite-button'} onClick={() => toggleFavorite(selected)} disabled={favoriteBusy === selected.id}>{favoriteIds.includes(selected.id) ? '★ Remover dos favoritos' : '☆ Salvar nos favoritos'}</button>
        <button type="button" className="opportunity-apply-button" onClick={() => setApplying(true)}>Candidatar-se pelo aplicativo</button>
        {selected.application_url && <a className="opportunity-apply-button" href={selected.application_url} target="_blank" rel="noreferrer">Abrir link externo da empresa</a>}
        {applying && <CandidateApplicationForm opportunity={selected} onClose={() => setApplying(false)} />}
        <div style={{ marginTop: 18, borderTop: '1px solid #e8edf2', paddingTop: 14 }}>
          {reportMessage && <p className="admin-success" role="status">{reportMessage}</p>}
          {!reporting ? <button type="button" className="logout-button" onClick={() => { setReporting(true); setReportMessage(''); }}>Denunciar oportunidade</button> : <form onSubmit={submitReport} style={{ display: 'grid', gap: 10 }}>
            <h3>Denunciar oportunidade</h3>
            <label style={{ display: 'grid', gap: 6 }}>Motivo
              <select value={reportReason} onChange={event => setReportReason(event.target.value)} required>
                {['Informações falsas ou enganosas', 'Suspeita de golpe ou fraude', 'Cobrança indevida', 'Conteúdo inadequado', 'Outro motivo'].map(reason => <option key={reason}>{reason}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>Detalhes (opcional)
              <textarea value={reportDetails} onChange={event => setReportDetails(event.target.value)} rows="3" maxLength="1000" placeholder="Explique o que aconteceu." />
            </label>
            {error && <p className="admin-error" role="alert">{error}</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="submit" disabled={sendingReport}>{sendingReport ? 'Enviando...' : 'Enviar denúncia'}</button>
              <button type="button" className="logout-button" onClick={() => setReporting(false)} disabled={sendingReport}>Cancelar</button>
            </div>
          </form>}
        </div>
      </section>
    </div>}
    <MyApplications />
  </section>;
}
