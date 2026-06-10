/**
 * classificacoes-cache.js
 * Módulo compartilhado para carregar as classificações dinâmicas do backend
 * (na UI, "Ministérios"). Mantém um cache por carregamento de página via uma
 * Promise singleton, evitando múltiplos fetches entre telas.
 *
 * Exposto em {@code window.ClassificacoesCache} para ser acessível tanto de scripts
 * comuns quanto de módulos ES (ex.: agenda.js).
 *
 * @namespace ClassificacoesCache
 */
window.ClassificacoesCache = (() => {
    /** URL da API de configurações de escala. */
    const API_URL = 'http://localhost:8080/api/configuracao-escala';
    /** Promise cacheada do carregamento (null até o primeiro fetch ou após invalidar). */
    let _promise = null;

    /**
     * Carrega (e cacheia) as classificações do backend, mapeando cada item para
     * {@code { key, label, titulo, cor }}. Reusa a Promise em chamadas subsequentes.
     *
     * @memberof ClassificacoesCache
     * @returns {Promise<Array<{key:string,label:string,titulo:string,cor:string}>>}
     *          lista de classificações; resolve para {@code []} em caso de erro (com retry liberado).
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

    /**
     * Invalida o cache, forçando um novo fetch na próxima chamada de
     * {@link carregarClassificacoes}. Útil após criar/editar/excluir uma classificação.
     *
     * @memberof ClassificacoesCache
     * @returns {void}
     */
    function invalidar() {
        _promise = null;
    }

    return { carregarClassificacoes, invalidar };
})();
