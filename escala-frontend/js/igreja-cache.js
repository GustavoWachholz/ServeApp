/**
 * igreja-cache.js
 * Módulo compartilhado para carregar os dados institucionais da igreja (nome,
 * contato, redes sociais e endereço) do backend, com cache por carregamento de
 * página (Promise singleton).
 *
 * Exposto em {@code window.IgrejaCache} para ser acessível de scripts comuns e módulos ES.
 *
 * @namespace IgrejaCache
 */
window.IgrejaCache = (() => {
    /** URL da API de configuração da igreja. */
    const API_URL = 'http://localhost:8080/api/igreja';
    /** Promise cacheada do carregamento (null até o primeiro fetch ou após invalidar). */
    let _promise = null;

    /**
     * Carrega (e cacheia) os dados da igreja do backend.
     *
     * @memberof IgrejaCache
     * @returns {Promise<Object|null>} objeto com os dados da igreja, ou {@code null} em erro.
     */
    function carregar() {
        if (_promise) return _promise;
        _promise = fetch(API_URL)
            .then(res => {
                if (!res.ok) throw new Error('Falha ao carregar dados da igreja');
                return res.json();
            })
            .catch(err => {
                console.error('[IgrejaCache]', err);
                _promise = null; // permite retry
                return null;
            });
        return _promise;
    }

    /**
     * Invalida o cache, forçando novo fetch na próxima chamada de {@link carregar}.
     *
     * @memberof IgrejaCache
     * @returns {void}
     */
    function invalidar() {
        _promise = null;
    }

    return { carregar, invalidar };
})();
