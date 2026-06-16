/**
 * shell.js — Roteamento do shell (app.html).
 *
 * A sidebar fica fixa no documento pai; cada tela é carregada dentro do
 * {@code <iframe id="content-frame">}. A navegação troca apenas o conteúdo do
 * iframe — a sidebar nunca recarrega, garantindo um menu lateral 100% estático.
 *
 * O estado de navegação é refletido no hash da URL (ex.: {@code app.html#agenda}),
 * de modo que recarregar a página, usar um link direto ou os botões voltar/avançar
 * do navegador preservam/restauram a tela aberta.
 */
(function () {
    const frame = document.getElementById('content-frame');
    if (!frame) return;

    /** Mapeia o arquivo da página → chave usada no hash da URL. */
    const ARQUIVO_PARA_HASH = {
        'index.html': 'home',
        'agenda.html': 'agenda',
        'voluntarios.html': 'servos',
        'ministerios.html': 'areas',
        'configuracao-escala.html': 'ministerios',
        'usuarios.html': 'usuarios',
        'perfil.html': 'perfil',
        'auditoria.html': 'auditoria'
    };

    /** Mapeia o hash da URL → arquivo da página. */
    const HASH_PARA_ARQUIVO = Object.keys(ARQUIVO_PARA_HASH).reduce((acc, arq) => {
        acc[ARQUIVO_PARA_HASH[arq]] = arq;
        return acc;
    }, {});

    const PAGINA_PADRAO = 'index.html';
    const links = Array.from(document.querySelectorAll('.sidebar a[data-page], .bottom-nav [data-page]'));

    /**
     * Resolve o arquivo da página a partir do hash atual da URL.
     *
     * @returns {string} nome do arquivo da página (cai no padrão se o hash for inválido).
     */
    function paginaDoHash() {
        const h = (location.hash || '').replace(/^#/, '');
        return HASH_PARA_ARQUIVO[h] || PAGINA_PADRAO;
    }

    /**
     * Aplica o estado de navegação: carrega a página no iframe (se ainda não estiver),
     * marca o item ativo e abre o grupo "Cadastros" quando a página pertence a ele.
     *
     * @param {string} arquivo arquivo da página a exibir.
     * @returns {void}
     */
    function aplicar(arquivo) {
        if (frame.getAttribute('src') !== arquivo) frame.setAttribute('src', arquivo);
        links.forEach(a => {
            const li = a.closest('li');
            if (li) li.classList.toggle('active', a.dataset.page === arquivo);
            if (a.closest('.bottom-nav')) a.classList.toggle('active', a.dataset.page === arquivo);
        });
        document.querySelectorAll('.nav-group').forEach(g => {
            if (g.querySelector(`a[data-page="${arquivo}"]`)) g.classList.add('open');
        });
    }

    // Cliques no menu apenas atualizam o hash; o hashchange (abaixo) faz a navegação,
    // o que mantém o histórico do navegador (voltar/avançar) consistente.
    links.forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const destino = '#' + (ARQUIVO_PARA_HASH[a.dataset.page] || 'home');
            if (location.hash === destino) aplicar(a.dataset.page); // mesmo hash: aplica direto
            else location.hash = destino;                           // dispara hashchange
        });
    });

    // Itens sem destino (ex.: Relatórios) apenas previnem a navegação
    document.querySelectorAll('.sidebar a[data-noop]').forEach(a => {
        a.addEventListener('click', (e) => e.preventDefault());
    });

    // Voltar/avançar do navegador ou link direto com hash
    window.addEventListener('hashchange', () => aplicar(paginaDoHash()));

    // Carga inicial
    aplicar(paginaDoHash());
})();
