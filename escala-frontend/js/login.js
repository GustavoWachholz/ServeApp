/**
 * Login.js - Lógica de Autenticação para Serve
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            // 1. Previne o comportamento padrão (reload da página)
            event.preventDefault();

            // 2. Coleta os valores de Email e Senha
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const loginData = {
                email: email,
                senha: password
            };

            console.log('Tentando realizar login para:', email);

            try {
                // 3. Faz a requisição POST para a API de Autenticação
                const response = await fetch('http://localhost:8080/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(loginData)
                });

                // 4. Tratamento da resposta
                if (response.ok) {
                    const usuario = await response.json();
                    localStorage.setItem('userId', usuario.id);
                    localStorage.setItem('userName', usuario.nome || usuario.email);
                    console.log('Login realizado com sucesso! Redirecionando...');
                    window.location.href = 'index.html';
                } else if (response.status === 401) {
                    // Status 401 - Unauthorized
                    alert('Credenciais inválidas! Por favor, verifique seu e-mail e senha.');
                } else {
                    // Outros erros (500, 404, etc)
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Erro na autenticação:', response.status, errorData);
                    alert('Ocorreu um erro no servidor. Tente novamente mais tarde.');
                }

            } catch (error) {
                // Erro de rede ou conexão
                console.error('Falha na conexão com a API:', error);
                alert('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
            }
        });
    }
});
