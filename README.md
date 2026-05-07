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

---

## 🛠️ Tecnologias Utilizadas

### Backend
- **Java 17 / Spring Boot**: Núcleo da aplicação e APIs REST.
- **Spring Data JPA**: Persistência de dados.
- **PostgreSQL**: Banco de dados relacional.
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
1. Importe o projeto `escala-backend` no IntelliJ IDEA.
2. Certifique-se de que o PostgreSQL está rodando e as credenciais no `application.properties` estão corretas.
3. Execute a classe `EscalaApplication`.
4. A API estará disponível em: `http://localhost:8080`.

### 2. Frontend
1. Abra a pasta `escala-frontend` no VS Code.
2. Utilize a extensão **Live Server** para rodar o arquivo `login.html` ou `agenda.html`.
3. O frontend rodará em: `http://127.0.0.1:5500`.

---

## 🎨 Identidade Visual

- **Azul Institucional**: `#004b87` (Confiança e Solidez)
- **Laranja/Dourado**: `#E69F00` (Energia e Dinamismo)
- **Frase de Impacto**: "Uma geração que adora, ama e Serve."

---

## 👤 Autor

**Gustavo Wachholz Muller** *Analista de Suporte Técnico & Estudante de Programação* Blumenau, SC, Brasil.
