/**
 * App.js — Script inicial (legado) de teste de conexão com a API de voluntários (servos).
 * Mantido como exemplo/protótipo; a tela real de voluntários usa js/voluntarios.js.
 */

/** URL base da API de voluntários (servos). */
const API_URL = '/api/servos';

/**
 * Busca a lista de voluntários (servos) na API e a registra no console.
 *
 * @async
 * @returns {Promise<Array<Object>|undefined>} os dados retornados pela API, ou
 *          {@code undefined} em caso de falha (o erro é apenas logado).
 */
async function fetchVoluntarios() {
    console.log('Iniciando busca de voluntários...');
    
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Dados recebidos com sucesso:', data);
        
        // No futuro, aqui chamaremos uma função para popular a tabela
        // updateTable(data);
        
        return data;
    } catch (error) {
        console.error('Falha ao conectar com a API:', error.message);
    }
}

/**
 * Inicialização ao carregar o DOM: dispara o teste de conexão e registra um
 * listener de submit (apenas demonstrativo) no formulário de voluntário.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Aplicação inicializada.');
    
    // Executa o teste de conexão solicitado
    fetchVoluntarios();

    // Listener para o formulário (exemplo de prevenção de reload)
    const form = document.getElementById('volunteer-form');
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            console.log('Formulário enviado. Implemente a lógica de POST aqui.');
            
            const formData = new FormData(form);
            const volunteer = {
                nome: formData.get('nome'),
                telefone: formData.get('telefone')
            };
            
            console.log('Dados capturados:', volunteer);
        });
    }
});
