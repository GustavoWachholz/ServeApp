/**
 * App.js - Lógica inicial para Cadastro de Voluntários
 */

const API_URL = 'http://localhost:8080/api/voluntarios';

/**
 * Função genérica para buscar voluntários via API
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

// Inicialização ao carregar o DOM
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
