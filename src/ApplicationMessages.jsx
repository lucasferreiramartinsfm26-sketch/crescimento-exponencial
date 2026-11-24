import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function ApplicationMessages({ applicationId }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    const { data: auth } = await supabase.auth.getUser();
    setUserId(auth?.user?.id || '');
    const { data, error: queryError } = await supabase.from('application_messages')
      .select('id,sender_id,body,created_at')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });
    if (queryError) setError('Não foi possível carregar as mensagens. ' + queryError.message);
    else setMessages(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [applicationId]);

  async function send(event) {
    event.preventDefault();
    const message = body.trim();
    if (!message || !userId) return;
    setSending(true);
    setError('');
    const { error: insertError } = await supabase.from('application_messages').insert({
      application_id: applicationId,
      sender_id: userId,
      body: message
    });
    if (insertError) setError('Não foi possível enviar a mensagem. ' + insertError.message);
    else {
      setBody('');
      await load();
    }
    setSending(false);
  }

  return <div className="application-chat">
    <div className="application-chat-heading"><strong>Mensagens</strong><button type="button" className="logout-button" onClick={load} disabled={loading}>Atualizar</button></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <div className="application-chat-list">
      {loading ? <p className="empty">Carregando mensagens...</p> : messages.length ? messages.map(message => <article key={message.id} className={'application-chat-message' + (message.sender_id === userId ? ' mine' : '')}>
        <small>{message.sender_id === userId ? 'Você' : 'Participante'} • {new Date(message.created_at).toLocaleString('pt-BR')}</small>
        <p>{message.body}</p>
      </article>) : <p className="empty">Nenhuma mensagem ainda. Inicie a conversa.</p>}
    </div>
    <form className="application-chat-form" onSubmit={send}>
      <textarea value={body} onChange={event => setBody(event.target.value)} rows="2" maxLength="3000" placeholder="Escreva sua mensagem..." required />
      <button type="submit" disabled={sending || !body.trim()}>{sending ? 'Enviando...' : 'Enviar mensagem'}</button>
    </form>
  </div>;
}
