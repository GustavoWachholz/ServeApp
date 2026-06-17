# Serve. 🟠
> Uma geração que adora, ama e **Serve.**

O **Serve.** é um sistema web de gestão de escalas para igrejas e ministérios, focado em simplicidade, elegância e automação. Disponível em produção em **[serveapp.com.br](https://serveapp.com.br)**.

---

## 🚀 Funcionalidades

### Agenda e Escalas
- **Calendário Interativo**: Visualização mensal com FullCalendar; escalas coloridas por classificação.
- **Fluxo em Duas Etapas**: Criação do evento na Agenda e definição da equipe na tela de Escala.
- **Indicador de Pendência**: Escalas sem equipe definida aparecem com ⏳; completas com ✓.
- **Exportação de Imagem**: Geração de `.png` personalizado com logo, cores e layout da Igreja para compartilhamento no WhatsApp/redes sociais (`html2canvas`).
- **Regras de Acúmulo**: Voluntários com ministério `ESPECIFICO` só podem ser escalados onde têm vínculo; ministérios `ACUMULO` permitem participação simultânea.

### Cadastros
- **Servos**: CRUD completo de voluntários com ministérios vinculados, gênero, data de nascimento e contato.
- **Áreas**: Cadastro de ministérios/áreas de atuação com cor configurável.
- **Ministérios**: Classificações de funções por escala com cor, tipo e ordenação configuráveis.

### Dashboard
- **Próximos Compromissos**: Escalas dos próximos dias com status de equipe.
- **Aniversariantes**: Servos que fazem aniversário no mês.
- **Quadro de Avisos**: Avisos criados pelo admin com validade configurable.

### Relatórios
- **Frequência de Escalação**: Participação de cada voluntário em um intervalo de datas, com exportação CSV.

### Usuários e Segurança
- **Autenticação JWT**: Token stateless (HMAC-SHA256), sessão persistida em `localStorage` — sobrevive a reinicializações do navegador e do servidor.
- **Controle de Acesso Granular**: Permissões por tela e por ação (acessar/criar/editar/excluir) por usuário.
- **Gestão de Usuários**: Admin gerencia contas, permissões e vínculo com Servos.
- **Trilha de Auditoria**: Registro completo de logins, criações, edições, exclusões e alterações de permissão/senha.
- **Rate Limiting**: Proteção contra brute force no login (10 tentativas / 60 s por IP).

### Perfil e Personalização
- **Meu Perfil**: Edição de dados pessoais, upload de foto, troca de senha e exclusão/anonimização de conta.
- **Tema Claro/Escuro** e **Cor Primária** configuráveis por usuário.
- **Nome e Dados da Igreja** editáveis pelo admin (nome, contato, redes sociais).

### UX e Acessibilidade
- **Experiência Mobile**: Bottom navigation bar (Menu / Agenda / Home / Ministérios / Perfil) em telas ≤768px; sidebar lateral em desktop.
- **Listas Compactas**: Tabelas de CRUD adaptadas para mobile sem scroll horizontal.
- **Modais Customizados**: Confirmações e alertas com modais nativos do sistema — sem `alert()`/`confirm()` do navegador.
- **Conformidade LGPD**: Consentimento no cadastro, Política de Privacidade, exclusão/anonimização (Art. 18) e avatar gerado localmente (sem envio de dados externos).

---

## 🛠️ Tecnologias

### Backend
| Tecnologia | Versão | Uso |
|---|---|---|
| Java | 25 | Linguagem principal |
| Spring Boot | 4.0.6 | Framework web e REST |
| Hibernate / Spring Data JPA | 7 | ORM e persistência |
| MySQL | 8 | Banco de dados relacional |
| JWT (JJWT — HMAC-SHA256) | — | Autenticação stateless |
| Maven | — | Gerenciamento de dependências |

### Frontend
| Tecnologia | Uso |
|---|---|
| HTML5 / CSS3 / JavaScript (Vanilla) | Interface e lógica de negócio |
| TypeScript (`agenda.ts`) | Tipagem da tela de Agenda |
| FullCalendar | Calendário interativo |
| html2canvas | Exportação de imagem da escala |
| Font Awesome | Ícones |

### Infraestrutura (Produção)
| Componente | Detalhe |
|---|---|
| Servidor | AWS EC2 (Ubuntu) |
| Banco | AWS RDS (MySQL 8) |
| Proxy / TLS | nginx + Certbot (Let's Encrypt) |
| Domínio | serveapp.com.br |

---

## ⚙️ Instalação Local

### Pré-requisitos
- **Java 25** e **Maven**
- **MySQL 8** rodando localmente (banco `servants`)

### 1. Backend
```bat
# Na raiz do projeto, iniciar via script (aplica timezone e valida porta):
start.bat

# Ou manualmente:
cd escala-backend
mvnw.cmd spring-boot:run -Dspring-boot.run.jvmArguments="-Duser.timezone=America/Sao_Paulo"
```

A API sobe em `http://localhost:8080`. O `DataInitializer` cria automaticamente um admin padrão e dados de demonstração na primeira execução.

### 2. Frontend
1. Abra a pasta `escala-frontend` no VS Code.
2. Inicie o **Live Server** (extensão VS Code) apontando para `login.html`.
3. Acesse `http://127.0.0.1:5500`.

> Para deploy em produção (EC2 / RDS / nginx / TLS): ver [`DEPLOY.md`](DEPLOY.md).

---

## 🎨 Identidade Visual

| Token | Valor | Significado |
|---|---|---|
| Azul Institucional | `#004b87` | Confiança e solidez |
| Laranja/Dourado | `#E69F00` | Energia e dinamismo |
| Tipografia | Inter, sans-serif | Clareza e modernidade |

---

## 👤 Autor

**Gustavo Wachholz Muller**  
*Analista de Suporte Técnico & Estudante de Programação* — Blumenau, SC, Brasil.
