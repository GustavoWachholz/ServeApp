import { Link } from 'react-router-dom';

export function PrivacidadePage() {
  return (
    <>
      <style>{`
        .priv-body { font-family: 'Inter','Segoe UI',system-ui,sans-serif; background:#f8f9fa; color:#1f2937; line-height:1.7; min-height:100vh; }
        .priv-header { background:#004b87; color:#fff; padding:1.25rem 2rem; display:flex; align-items:center; gap:1rem; }
        .priv-header h1 { font-size:1.2rem; font-weight:600; }
        .priv-header span { font-size:0.85rem; opacity:0.75; }
        .priv-main { max-width:780px; margin:2.5rem auto; background:#fff; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,.07); padding:2.5rem 3rem; }
        .priv-main h2 { font-size:1.5rem; font-weight:700; color:#004b87; margin-bottom:0.4rem; }
        .priv-versao { font-size:0.8rem; color:#6b7280; margin-bottom:2rem; }
        .priv-main h3 { font-size:1rem; font-weight:600; color:#1f2937; margin:1.75rem 0 0.5rem; }
        .priv-main p { font-size:0.92rem; color:#374151; margin-bottom:0.75rem; }
        .priv-main ul { padding-left:1.4rem; margin-bottom:0.75rem; }
        .priv-main li { font-size:0.92rem; color:#374151; margin-bottom:0.3rem; }
        .priv-destaque { background:#eff6ff; border-left:4px solid #004b87; border-radius:0 6px 6px 0; padding:0.75rem 1rem; margin:1rem 0; }
        .priv-footer { text-align:center; font-size:0.8rem; color:#9ca3af; padding:2rem; }
        @media(max-width:600px) { .priv-main { margin:1rem; padding:1.5rem; } }
      `}</style>
      <div className="priv-body">
        <header className="priv-header">
          <div>
            <h1>Política de Privacidade</h1>
            <span>Serve — Sistema de Gestão de Escalas</span>
          </div>
        </header>
        <main className="priv-main">
          <h2>Política de Privacidade</h2>
          <p className="priv-versao">Versão 1.0 · Última atualização: junho de 2025</p>

          <div className="priv-destaque">
            <p>Esta política descreve como o sistema <strong>Serve</strong> coleta, usa e protege os dados pessoais dos seus usuários, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).</p>
          </div>

          <h3>1. Dados Coletados</h3>
          <p>Coletamos os seguintes dados pessoais:</p>
          <ul>
            <li>Nome completo</li>
            <li>E-mail</li>
            <li>Telefone</li>
            <li>Data de nascimento</li>
            <li>Gênero</li>
            <li>Foto de perfil (opcional, armazenada apenas na sessão)</li>
          </ul>

          <h3>2. Finalidade do Tratamento</h3>
          <p>Os dados são usados exclusivamente para:</p>
          <ul>
            <li>Gerenciamento de escalas de voluntários</li>
            <li>Autenticação e controle de acesso</li>
            <li>Comunicação interna entre membros</li>
          </ul>

          <h3>3. Armazenamento e Segurança</h3>
          <p>As informações são armazenadas em banco de dados seguro com acesso restrito. Senhas são protegidas com hash BCrypt. Tokens de sessão expiram automaticamente após 8 horas.</p>
          <p>A foto de perfil é armazenada apenas na sessão do navegador (sessionStorage) e não persiste entre abas — em conformidade com a LGPD.</p>

          <h3>4. Seus Direitos (LGPD Art. 18)</h3>
          <ul>
            <li>Acessar seus dados pessoais</li>
            <li>Corrigir dados incompletos ou desatualizados</li>
            <li>Solicitar a exclusão da sua conta e anonimização dos dados</li>
            <li>Revogar o consentimento a qualquer momento</li>
          </ul>

          <h3>5. Exclusão de Conta</h3>
          <p>Você pode solicitar a exclusão da sua conta diretamente pela tela "Meu Perfil". Ao excluir, seus dados pessoais são anonimizados e o acesso é removido imediatamente.</p>

          <h3>6. Contato</h3>
          <p>Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, entre em contato com o administrador do sistema.</p>
        </main>
        <footer className="priv-footer">
          <p>© {new Date().getFullYear()} Serve. Todos os direitos reservados.</p>
          <p style={{ marginTop: '0.5rem' }}>
            <Link to="/login" style={{ color: '#6b7280' }}>← Voltar ao login</Link>
          </p>
        </footer>
      </div>
    </>
  );
}
