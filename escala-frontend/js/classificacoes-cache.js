/**
 * classificacoes-cache.js
 * Módulo compartilhado para carregar as classificações dinâmicas do backend.
 * Cache por carregamento de página (singleton Promise).
 */

window.ClassificacoesCache = (() => {
    const API_URL = 'http://localhost:8080/api/configuracao-escala';
    let _promise = null;

    /**
     * Retorna uma Promise que resolve para um array de objetos:
     * [{ key, label, titulo, cor }, ...]
     *
     * O resultado é cacheado na sessão de página (não refaz fetch).
     */
    function carregarClassificacoes() {
        if (_promise) return _promise;

        _promise = fetch(API_URL)
            .then(res => {
                if (!res.ok) throw new Error('Falha ao carregar classificações');
                return res.json();
            })
            .then(lista => lista.map(c => ({
                key:   c.classificacao,
                label: c.nome    || c.classificacao,
                titulo: c.titulo || c.nome || c.classificacao,
                cor:   c.cor     || '#004b87'
            })))
            .catch(err => {
                console.error('[ClassificacoesCache]', err);
                _promise = null; // permite retry se houve erro
                return [];
            });

        return _promise;
    }

    /** Invalida o cache (útil após criar/editar/deletar uma classificação). */
    function invalidar() {
        _promise = null;
    }

    return { carregarClassificacoes, invalidar };
})();
