# Serve. 🟠
> Uma geração que adora, ama e **Serve.**

O **Serve.** é um sistema de gestão de escalas para igrejas e ministérios, focado em simplicidade, elegância e automação. O projeto permite o agendamento de eventos, a alocação de voluntários em 9 ministérios distintos e a geração automática de imagens para compartilhamento (WhatsApp/Redes Sociais).

---

## 🚀 Funcionalidades

- **Calendário Interativo**: Visualização mensal das escalas utilizando FullCalendar.
- **Fluxo em Duas Etapas**: Separação entre agendamento de data (Agenda) e definição de equipe (Escala).
- **Indicador de Pendência**: Escalas sem voluntários definidos são marcadas visualmente com um ícone de ampulheta (⏳).
- **Gestão de 9 Ministérios**:
  1. Abertura
  2. Recepção
  3. Integração
  4. Louvor
  5. Mesa
  6. Mídia
  7. Intercessão
  8. Oferta/Dízimo
  9. Conferência Dízimo
- **Automação de Imagem**: Geração de arquivo `.png` personalizado baseado em um template institucional, utilizando `html2canvas` e injeção de Base64 para evitar erros de CORS.
- **Regras de Negócio Inteligentes**: Bloqueio de duplicidade de voluntários em ministérios principais, com exceções permitidas para funções específicas.
- **Autenticação e Permissões**: Login JWT, controle granular de acesso por tela/ação (acessar/criar/editar/excluir) e tela de gestão de usuários (admin).
- **Trilha de Auditoria**: Registro de logins, criações, edições, exclusões e alterações de permissão/senha, com filtros por módulo, ação, usuário e período.
- **Experiência Mobile**: Navegação inferior (bottom-nav) e listas compactas em telas pequenas; visualização completa no desktop.
- **Personalização**: Tema claro/escuro e cor primária configuráveis por usuário; nome e dados da igreja editáveis pelo admin.
- **Conformidade LGPD**: Consentimento no cadastro, Política de Privacidade, exclusão/anonimização de conta e avatar de iniciais gerado localmente.

---

## 🛠️ Tecnologias Utilizadas

### Backend
- **Java 25 / Spring Boot 4.0.6**: Núcleo da aplicação e APIs REST.
- **Spring Data JPA / Hibernate 7**: Persistência de dados.
- **MySQL 8**: Banco de dados relacional.
- **JWT (HMAC-SHA256)**: Autenticação stateless.
- **Maven**: Gerenciamento de dependências.

### Frontend
- **HTML5 & CSS3**: Interface minimalista seguindo a identidade visual (Azul `#004b87` e Laranja `#E69F00`).
- **JavaScript (Vanilla)**: Lógica de interface e integração com API.
- **FullCalendar**: Biblioteca para renderização do calendário.
- **html2canvas**: Biblioteca para conversão de HTML em imagem.

---

## 📋 Regras de Negócio (Escalabilidade)

Para garantir a fluidez dos cultos, o sistema aplica as seguintes validações:
- **Ministério Principal**: Um voluntário só pode estar em um ministério principal por evento (ex: não pode estar no Louvor e na Mídia simultaneamente).
- **Exceções de Acúmulo**: As funções **Abertura, Intercessão, Oferta/Dízimo e Conferência Dízimo** podem ser realizadas por qualquer pessoa, mesmo que ela já possua um ministério principal naquela escala.

---

## ⚙️ Instalação e Execução

### 1. Backend
1. Certifique-se de que o **MySQL 8** está rodando (banco `servants`) e as credenciais no `application.properties` estão corretas.
2. Inicie pelo `start.bat` na raiz (verifica porta/MySQL e aplica o timezone `America/Sao_Paulo`), ou rode a classe `EscalaApplication` com `-Duser.timezone=America/Sao_Paulo`.
3. A API estará disponível em: `http://localhost:8080`.

> Deploy em produção (EC2 + RDS + nginx/TLS): ver `DEPLOY.md`.

### 2. Frontend
1. Abra a pasta `escala-frontend` no VS Code.
2. Utilize a extensão **Live Server** para rodar o arquivo `login.html`.
3. O frontend rodará em: `http://127.0.0.1:5500`.

---

## 🎨 Identidade Visual

- **Azul Institucional**: `#004b87` (Confiança e Solidez)
- **Laranja/Dourado**: `#E69F00` (Energia e Dinamismo)
- **Frase de Impacto**: "Uma geração que adora, ama e Serve."

---

## 👤 Autor

**Gustavo Wachholz Muller** *Analista de Suporte Técnico & Estudante de Programação* Blumenau, SC, Brasil.
