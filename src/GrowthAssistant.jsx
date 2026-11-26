import { useEffect, useRef, useState } from 'react';
import { supabase } from './lib/supabase';

const suggestions = [
  'Me ajude a organizar minhas tarefas de hoje.',
  'Monte um orçamento mensal para eu controlar meus gastos.',
  'Crie um plano para eu alcançar uma meta em 90 dias.',
  'Monte uma rotina de estudos para mim.',
  'Como posso me preparar para uma oportunidade de emprego?'
];

export default function GrowthAssistant({ tasks = [], displayName = '' }) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: `Olá, ${displayName || 'vamos crescer'}! Sou a Crescimento IA. Posso ajudar com tarefas, metas, estudos, carreira e organização financeira. O que vamos planejar hoje?` }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, loading]);

  async function sendMessage(text = input) {
    const content = text.trim();
    if (!content || loading) return;
    const nextMessages = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);
    try {
      const safeTasks = tasks.slice(0, 80).map(task => ({
        title: String(task.title || '').slice(0, 160),
        category: task.category === 'Meta' ? 'Meta' : 'Tarefa',
        done: Boolean(task.done),
        priority: task.priority || 'Média',
        due_date: task.due_date || null,
        progress: Number(task.progress || 0)
      }));
      const { data, error: functionError } = await supabase.functions.invoke('growth-assistant', {
        body: { messages: nextMessages.slice(-12), tasks: safeTasks }
      });
      if (functionError) throw functionError;
      if (!data?.reply) throw new Error(data?.error || 'A assistente não retornou uma resposta. Tente novamente.');
      setMessages(current => [...current, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err?.message?.includes('Failed to send a request') || err?.message?.includes('fetch')
        ? 'A conexão com a assistente ainda não está ativa. A função segura precisa ser publicada no Supabase e receber a chave do provedor de IA.'
        : (err?.message || 'Não foi possível obter uma resposta agora.'));
    } finally {
      setLoading(false);
    }
  }

  return <section className="assistant-page">
    <div className="assistant-hero">
      <div className="assistant-orb">✦</div>
      <div><span className="assistant-kicker">SUA COMPANHEIRA DE EVOLUÇÃO</span><h2>Crescimento IA</h2><p>Ideias, planos e orientação prática para transformar intenção em ação.</p></div>
      <span className="assistant-status"><i/> Assistente</span>
    </div>
    <div className="assistant-layout">
      <aside className="assistant-tools panel">
        <div className="panel-heading"><div><h3>O que podemos fazer?</h3><p>Toque em um assunto para começar.</p></div></div>
        {[
          ['✓','Tarefas e produtividade','Organizar o dia e definir prioridades.'],
          ['◎','Metas pessoais','Dividir objetivos em pequenas etapas.'],
          ['＄','Finanças pessoais','Orçamento, despesas e economia.'],
          ['▤','Estudos e aprendizado','Criar rotinas e planos de estudo.'],
          ['↗','Carreira e oportunidades','Currículo, entrevistas e planejamento.']
        ].map(([icon,title,desc]) => <button type="button" className="assistant-topic" key={title} onClick={() => sendMessage('Quero ajuda com ' + title.toLocaleLowerCase('pt-BR') + '. Faça algumas perguntas para montar um plano prático para mim.')} disabled={loading}><span>{icon}</span><b>{title}<small>{desc}</small></b><i>›</i></button>)}
        <div className="assistant-context"><strong>Seu planejamento</strong><span>{tasks.filter(t => !t.done).length} tarefas e metas pendentes</span><span>{tasks.filter(t => t.done).length} concluídas</span><small>Somente os títulos, prazos e estados das suas tarefas são enviados quando você conversa com a assistente.</small></div>
      </aside>
      <div className="assistant-chat panel">
        <div className="assistant-chat-head"><div className="assistant-avatar">✦</div><div><strong>Crescimento IA</strong><small>Assistente de planejamento pessoal</small></div><span className="assistant-online">● Online quando conectada</span></div>
        <div className="assistant-messages" aria-live="polite">
          {messages.map((message,index) => <div key={index} className={'assistant-message ' + message.role}><span>{message.role === 'assistant' ? 'Crescimento IA' : 'Você'}</span><p>{message.content}</p></div>)}
          {loading && <div className="assistant-message assistant"><span>Crescimento IA</span><p className="assistant-typing">Estou preparando uma resposta...</p></div>}
          <div ref={endRef}/>
        </div>
        {messages.length === 1 && <div className="assistant-suggestions">{suggestions.map(suggestion => <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)} disabled={loading}>{suggestion}</button>)}</div>}
        {error && <p className="assistant-error" role="alert">{error}</p>}
        <form className="assistant-composer" onSubmit={event => { event.preventDefault(); sendMessage(); }}>
          <textarea value={input} onChange={event => setInput(event.target.value)} placeholder="Escreva sua pergunta ou o que deseja organizar..." rows="2" maxLength="2000" aria-label="Mensagem para a Crescimento IA"/>
          <button type="submit" disabled={loading || !input.trim()} aria-label="Enviar mensagem">{loading ? '…' : 'Enviar ↑'}</button>
        </form>
        <small className="assistant-disclaimer">A IA pode cometer erros. Não envie senhas, dados bancários ou informações pessoais sensíveis. Orientações financeiras são educativas e não substituem um profissional.</small>
      </div>
    </div>
  </section>;
}
