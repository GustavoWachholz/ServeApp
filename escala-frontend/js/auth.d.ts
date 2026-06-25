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

    /**
     * Exibe um modal de confirmação e retorna uma Promise<boolean>.
     * Resolve com true se o usuário confirmar, false se cancelar ou fechar.
     */
    function confirmar(opcoes?: {
        titulo?: string;
        mensagem?: string;
        textoBotaoConfirmar?: string;
        perigoso?: boolean;
    }): Promise<boolean>;

    /** Oculta o overlay de carregamento. */
    function esconderLoading(): void;

    /** Escapa caracteres HTML especiais para uso seguro em innerHTML. */
    function esc(str: string | null | undefined): string;

    /** Inicializa sidebar, tema e outros elementos de layout. */
    function inicializar(): void;
}
