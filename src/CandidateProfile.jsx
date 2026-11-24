import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

const emptyProfile = { name: '', profession: '', phone: '', city: '', website: '', linkedin: '', about: '' };

export default function CandidateProfile() {
  const [form, setForm] = useState(emptyProfile);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError) setError('Não foi possível carregar seu perfil. ' + loadError.message);
      const user = data?.user;
      if (user) {
        const metadata = user.user_metadata || {};
        setEmail(user.email || '');
        setForm({
          name: metadata.name || '',
          profession: metadata.profession || '',
          phone: metadata.phone || '',
          city: metadata.city || '',
          website: metadata.website || '',
          linkedin: metadata.linkedin || '',
          about: metadata.about || ''
        });
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  function update(event) {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
    const { error: saveError } = await supabase.auth.updateUser({ data: payload });
    if (saveError) setError('Não foi possível salvar seu perfil. ' + saveError.message);
    else setMessage('Perfil atualizado com sucesso!');
    setSaving(false);
  }

  if (loading) return <section className="panel profile-panel"><p className="empty">Carregando seu perfil...</p></section>;

  return <section className="profile-page">
    <div className="section-heading"><div><h2>Meu perfil profissional</h2><p>Apresente suas informações para empresas e mantenha seus dados atualizados.</p></div></div>
    <div className="panel profile-panel">
      <div className="profile-summary">
        <div className="profile-avatar">{(form.name || email || 'U').trim().slice(0, 1).toUpperCase()}</div>
        <div><strong>{form.name || 'Seu nome'}</strong><span>{form.profession || 'Adicione sua área profissional'}</span><small>{email}</small></div>
      </div>
      <form className="company-form profile-form" onSubmit={save}>
        <label>Nome completo<input name="name" value={form.name} onChange={update} maxLength="120" required placeholder="Seu nome completo" /></label>
        <label>Área profissional<input name="profession" value={form.profession} onChange={update} maxLength="120" placeholder="Ex.: Assistente administrativo" /></label>
        <label>Telefone<input name="phone" type="tel" value={form.phone} onChange={update} maxLength="30" placeholder="(00) 00000-0000" /></label>
        <label>Cidade/Estado<input name="city" value={form.city} onChange={update} maxLength="120" placeholder="Ex.: Goiânia - GO" /></label>
        <label>Site ou portfólio<input name="website" type="url" value={form.website} onChange={update} maxLength="300" placeholder="https://..." /></label>
        <label>LinkedIn<input name="linkedin" type="url" value={form.linkedin} onChange={update} maxLength="300" placeholder="https://www.linkedin.com/in/..." /></label>
        <label className="profile-about">Resumo profissional<textarea name="about" value={form.about} onChange={update} rows="5" maxLength="1200" placeholder="Conte sobre suas experiências, habilidades e objetivos profissionais." /></label>
        <div className="profile-actions"><button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar meu perfil'}</button><span>Seus dados ficam associados à sua conta.</span></div>
      </form>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {message && <p className="admin-success" role="status">{message}</p>}
    </div>
  </section>;
}
