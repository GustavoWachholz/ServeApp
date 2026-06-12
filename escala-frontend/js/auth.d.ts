declare namespace Auth {
    /** Token JWT armazenado em sessionStorage (chave "serve_session"). */
    function getToken(): string | null;

    /** Retorna true se o usuário logado tem papel ADMIN. */
    function isAdmin(): boolean;

    /** Redireciona para login.html se não houver token válido. */
    function requireLogin(): void;

    /**
     * Exibe um toast na tela.
     * @param msg   Texto da mensagem.
     * @param tipo  "success" | "error" | "warning" | "info" (padrão "info").
     */
    function toast(msg: string, tipo?: 'success' | 'error' | 'warning' | 'info'): void;

    /** Oculta o overlay de carregamento. */
    function esconderLoading(): void;

    /** Inicializa sidebar, tema e outros elementos de layout. */
    function inicializar(): void;
}
