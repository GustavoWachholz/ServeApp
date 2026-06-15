# DESIGN.md — Padrão Visual do Frontend (Serve)

Documento de referência para manter consistência visual entre todas as telas do sistema.
Última atualização: 2026-06-12

---

## 1. Fonte e Base

- **Fonte:** Inter (Google Fonts) — pesos 400, 500, 600, 700
- **Ícones:** Font Awesome 6.4 (`fas`, `far`, `fab`)
- **CSS global:** `css/dashboard.css` — todas as páginas carregam este arquivo
- **CSS de login:** `css/login.css` — exclusivo de `login.html`

---

## 2. Variáveis CSS (tokens de design)

Definidas em `:root` no `dashboard.css`. Mudam automaticamente no tema escuro (classe `dark` em `<html>`).

| Variável | Uso |
|---|---|
| `--bg-main` | Fundo da página |
| `--bg-card` | Fundo de cards, inputs, modais |
| `--bg-sidebar` | Fundo da sidebar |
| `--border-color` | Bordas de containers, inputs e separadores |
| `--text-color` | Texto principal |
| `--text-muted` | Texto secundário / placeholders / labels |
| `--primary-color` | Cor de destaque (padrão `#004b87`, customizável pelo admin) |
| `--primary-text` | Texto em elementos com cor primária |
| `--secondary-color` | Hover/active da cor primária |

---

## 3. Layout Geral

```
┌─────────────────────────────────────────────────┐
│  .app-container  (display: flex)                │
│  ┌──────────┐  ┌───────────────────────────────┐│
│  │ .sidebar │  │ .main-content                 ││
│  │  ~260px  │  │  .main-header (logo-title)    ││
│  │ recolhív.│  │  .dashboard-section (conteúdo)││
│  └──────────┘  └───────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

- **Shell (`app.html`):** sidebar permanente + `<iframe id="page-frame">` com as páginas internas
- **Standalone:** cada página também funciona sozinha (abre direto no browser)
- **Sidebar recolhida:** classe `.sidebar-collapsed` em `<html>` → largura ~80px, só ícones

---

## 4. Sidebar

### Estrutura
```html
<aside class="sidebar">
  <button id="sidebar-toggle" class="sidebar-toggle">…</button>
  <div class="sidebar-logo">
    <img class="logo-full" …>   <!-- visível quando expandida -->
    <img class="logo-mini" …>   <!-- visível quando recolhida -->
  </div>
  <div class="user-profile"> … </div>
  <nav class="sidebar-nav">
    <ul>
      <li><a href="index.html">…</a></li>
      <li class="nav-group [open]">        <!-- accordion "Cadastros" -->
        <button class="nav-group-toggle">…</button>
        <ul class="nav-submenu">
          <li class="nav-admin-only [active]"><a href="…">…</a></li>
        </ul>
      </li>
    </ul>
  </nav>
  <div class="sidebar-footer">
    <div id="settings-menu" class="settings-popover">…</div>
    <button id="settings-btn" class="sidebar-btn">…</button>
    <button id="logout-btn"   class="sidebar-btn">…</button>
  </div>
</aside>
```

### Regras
- Item ativo: `<li class="active">` na `<li>` que contém o `<a>` da página atual
- Itens de admin: `<li class="nav-admin-only">` — visíveis apenas se `Auth.isAdmin()`
- Accordion persistido em `localStorage` com chave `serve_nav_open_{groupId}`
- Estado recolhido persistido em `localStorage` com chave `serve_sidebar_collapsed`
- Toggle de sidebar: chama `Auth.alternarSidebar()` de `auth.js`

---

## 5. Cabeçalho de Página

```html
<header class="main-header">
  <h1 class="logo-title"><span>Serve</span></h1>
</header>
```

- O texto dentro de `<span>` é preenchido dinamicamente por `auth.js` com o nome da igreja (API `GET /api/igreja`)

---

## 6. Padrão de Listagem (tabela)

**Todas as telas de CRUD** (Servos, Áreas, Ministérios) usam este padrão:

```html
<section class="dashboard-section">

  <!-- 6.1 Cabeçalho da seção -->
  <div class="section-header">
    <h2>TÍTULO DA SEÇÃO</h2>
    <button class="btn-primary" id="btn-new-item">
      <i class="fas fa-plus"></i> Novo Item
    </button>
  </div>

  <!-- 6.2 Toolbar: pesquisa + ações -->
  <div class="toolbar" style="margin-bottom:.75rem;">
    <div class="search-wrapper">
      <i class="fas fa-search search-icon"></i>
      <input type="text" id="search-input" placeholder="Pesquisar…" autocomplete="off">
    </div>
    <button type="button" id="btn-export" class="btn-sort" title="Exportar CSV">
      <i class="fas fa-download" style="margin-right:.3rem;font-size:.75rem;"></i>Exportar CSV
    </button>
  </div>

  <!-- 6.3 Container da tabela -->
  <div class="list-table-container">
    <table>
      <thead>
        <tr>
          <th>Coluna 1</th>
          <th>Coluna 2</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody id="items-list">
        <!-- Dinâmico via JS -->
      </tbody>
    </table>
  </div>

</section>
```

### Classes envolvidas (todas em `dashboard.css`)

| Classe | Descrição |
|---|---|
| `.section-header` | `display:flex; justify-content:space-between; align-items:center` |
| `.section-header h2` | `0.8rem`, `text-transform:uppercase`, `letter-spacing:0.12rem`, cor `--text-muted` |
| `.toolbar` | `display:flex; gap:1rem; flex-wrap:wrap` |
| `.search-wrapper` | Container relativo com ícone absoluto à esquerda |
| `.search-wrapper input` | Input com padding para acomodar o ícone; `border-radius:8px` |
| `.btn-sort` | Botão secundário de toolbar (outline); `.active` ativa cor primária |
| `.list-table-container` | Card branco `border-radius:12px`, `overflow:hidden` |
| `.list-table-container table` | `width:100%; border-collapse:collapse; text-align:left` |
| `.list-table-container th` | `0.75rem`, uppercase, `--text-muted`, border-bottom |
| `.list-table-container td` | `0.9rem`, border-bottom, `padding:1.2rem 1.5rem` |
| `.list-table-container tr:hover td` | Background sutil `rgba(124,124,138,0.05)` |
| `.actions-cell` | `display:flex; gap:0.8rem` dentro de `<td>` |

#### Botões de ação na linha (padrão único)
Todas as telas de listagem (Usuários, Servos, Áreas, Ministérios) usam **botões rotulados** (ícone + texto) no estilo `.btn-sort`, **não** ícone-só. O conjunto padrão por linha é **Exibir** + **Excluir**:
O rótulo fica em `<span class="btn-label">` e o botão sempre traz `title` (tooltip), para o colapso responsivo:
```html
<td class="actions-cell">
  <button class="btn-sort btn-view" data-id="${id}" title="Exibir"><i class="fas fa-eye"></i><span class="btn-label">Exibir</span></button>
  <button class="btn-sort btn-sort-danger btn-delete-row" data-id="${id}" title="Excluir"><i class="fas fa-trash"></i><span class="btn-label">Excluir</span></button>
</td>
```
- **Exibir** abre o modal de detalhes (onde a edição acontece, gated por `Auth.podeEditar`).
- **Excluir** dispara a confirmação de exclusão; renderizado apenas se `Auth.podeExcluir(tela)`.
- `.btn-sort-danger` — variante vermelha (`#ef4444`) do `.btn-sort`, mesma forma/altura.
- `.list-table-container .btn-sort i` recebe `margin-right:0.4rem; font-size:0.8rem` (respiro do ícone).
- A tela Usuários usa o mesmo estilo com um único botão **Gerenciar** (`<i class="fas fa-sliders"></i><span class="btn-label">Gerenciar</span>`).

##### Colapso responsivo (ícone-só em tabela estreita)
`.list-table-container` define `container-type: inline-size`; uma **container query** colapsa os botões quando a tabela fica estreita:
```css
@container (max-width: 560px) {
  .list-table-container .btn-sort .btn-label { display: none; }
  .list-table-container .btn-sort { padding: 0.5rem 0.6rem; }
  .list-table-container .btn-sort i { margin-right: 0; }
}
```
Nesse estado o botão vira somente-ícone (o `title` mantém a dica). **Importante:** `.btn-sort` usa `transition: border-color, color, background-color` (e **não** `transition: all`) — animar `padding`/largura impede o `@container` de aplicar o padding compacto.

### Skeleton loading (durante fetch)
Inserir `<tr class="skeleton-row">` no `tbody` enquanto carrega:
```html
<tr class="skeleton-row">
  <td><span class="skeleton" style="width:60%;"></span></td>
  <td><span class="skeleton" style="width:50%;"></span></td>
  <td><span class="skeleton" style="width:60px;"></span></td>
</tr>
```
`.skeleton-row td` — `padding:1rem 1.5rem; vertical-align:middle`
`.skeleton` — gradiente animado `skeleton-wave`, `height:14px; border-radius:4px`

### Estado vazio
```html
<tr>
  <td colspan="N" style="text-align:center;padding:3rem 1.5rem;color:var(--text-muted);">
    <i class="fas fa-{icon}" style="font-size:2rem;margin-bottom:.75rem;opacity:.3;display:block;"></i>
    Mensagem de estado vazio.
  </td>
</tr>
```

---

## 7. Botões

| Classe | Uso | Cor |
|---|---|---|
| `.btn-primary` | Ação principal (Salvar, Novo, Gerar) | `--primary-color` fundo, texto branco |
| `.btn-secondary` | Cancelar, Fechar | Borda com cor neutra |
| `.btn-danger` | Excluir | Vermelho `#ef4444` |
| `.btn-sort` | Toolbar (ordenar, exportar, filtros) | Outline neutro; hover/active usa `--primary-color` |
| `.btn-icon` | Ação inline em tabela (ícone só) | Transparente; cor `--text-muted` |

---

## 8. Modais

### Padrão (Servos e Áreas)

```html
<div id="item-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h2 id="modal-title">Título</h2>
      <span class="close-modal">&times;</span>
    </div>
    <!-- Modo visualização -->
    <div id="view-mode"> … </div>
    <!-- Modo edição -->
    <form id="item-form" style="display:none;"> … </form>
  </div>
</div>
```

- Abrir: `modal.classList.add('show-modal')`
- Fechar: `.close-modal`, clique no backdrop, botão `.cancel-modal`
- `.modal-footer`: `display:flex; justify-content:space-between; align-items:center`
- `.footer-right`: agrupa botões secundário + primário à direita

### Padrão alternativo (Ministérios / configuracao-escala)

```html
<div class="modal-overlay" id="modal-id">
  <div class="modal-box [modal-wide]">
    <div class="modal-title">Título</div>
    …
    <div class="modal-footer"> … </div>
  </div>
</div>
```

- Abrir: `modal.classList.add('show-modal')`
- `.modal-box` → `max-width:540px`; `.modal-box.modal-wide` → `max-width:760px`

### Modal de confirmação de exclusão (padrão uniforme)
```html
<div id="confirm-modal" class="modal" style="backdrop-filter:blur(4px);">
  <div class="modal-content" style="max-width:400px;text-align:center;">
    <i class="fas fa-exclamation-circle" style="font-size:3.5rem;color:#ef4444;"></i>
    <h2>Confirmar Exclusão</h2>
    <p>…<strong id="confirm-item-name"></strong>…</p>
    <div style="display:flex;gap:1rem;justify-content:center;">
      <button class="btn-secondary" id="btn-confirm-cancel" style="flex:1;">Não, manter</button>
      <button class="btn-danger"    id="btn-confirm-delete" style="flex:1;">Sim, excluir</button>
    </div>
  </div>
</div>
```

---

## 9. Formulários

```html
<div class="form-group">
  <label for="campo">Rótulo</label>
  <input type="text" id="campo" placeholder="…">
  <!-- Erro inline (adicionado por JS ao falhar validação): -->
  <span id="campo-erro" class="field-error-msg">Campo é obrigatório.</span>
</div>
```

| Classe | Descrição |
|---|---|
| `.form-group` | `margin-bottom:1rem` |
| `label` | `0.8rem`, `font-weight:600`, `margin-bottom:0.4rem` |
| `input, select, textarea` | `width:100%`, `padding:0.75rem`, `border-radius:6px`, transição de foco |
| `.field-invalid` | `border-color:#ef4444 !important` (aplicado por JS no submit inválido) |
| `.field-error-msg` | `color:#ef4444; font-size:0.78rem; margin-top:0.25rem; display:block` |

### Chips de classificação
```html
<div class="classif-grid">
  <label class="classif-chip [checked]" style="color:{cor};border-color:{cor};background:{cor}20;">
    <input type="checkbox" style="display:none;">
    Nome
  </label>
</div>
```
- `.classif-chip:not(.checked)` → `opacity:0.45; filter:grayscale(0.3)`
- `.classif-chip.checked` → `opacity:1`

---

## 10. Chips e Tags

| Elemento | Uso | Estilo |
|---|---|---|
| `.ministry-tag` | Tag de área em voluntários | `border-radius:4px; background:rgba(0,75,135,0.1); color:--primary-text` |
| `.classif-chip` | Seletor de ministério (checkbox visual) | `border-radius:20px; border:1.5px solid {cor}` |
| `.classif-key` | Chave técnica (monospace) | `font-family:monospace; background:--bg-main; border-radius:4px` |
| `.color-dot` | Bolinha colorida em tabelas | `14px; border-radius:50%; display:inline-block` |
| `.tipo-badge` | Badge Geral/Específico em grids | `0.62rem; border-radius:10px; border:1px solid {cor}` |

---

## 11. Feedback ao Usuário

- **Toasts:** sempre via `Auth.toast(msg, tipo)` — nunca usar `alert()`
  - tipos: `'success'`, `'error'`, `'warning'`, `'info'`
- **Botão em carregamento:** desabilitar + trocar texto (`'Salvando…'`, `'Excluindo…'`)
- **Skeleton:** mostrar linhas `.skeleton-row` durante fetch de lista
- **Estado vazio:** `<td colspan="N">` centralizado com ícone opaco + mensagem

---

## 12. Tema Escuro

- Ativado pela classe `dark` em `<html>`
- Persistido em `localStorage` com chave `serve_theme`
- Toggle: `#theme-toggle` (switch no popover de Configurações da sidebar)
- Gerenciado inteiramente por `auth.js` → `Auth.restaurarTema()`

---

## 13. Cor Primária Customizável

- Armazenada em `localStorage` com chave `serve_primary_color`
- Aplicada como `--primary-color` via `document.documentElement.style.setProperty`
- Input: `#color-picker` no popover de Configurações
- Gerenciado por `auth.js` → `Auth.restaurarTema()`

---

## 14. Loading Overlay

```html
<div id="loading-overlay">
  <div class="loading-spinner"></div>
  <p>Carregando…</p>
</div>
```
- Visível por padrão; removido por `Auth.esconderLoading()` no final do `DOMContentLoaded`

---

## 15. Modo Embedded (iframe no shell)

- Quando a página é carregada dentro de `app.html`, a classe `.embedded` é injetada em `<body>` pelo `auth.js`
- `.embedded .sidebar`, `.embedded .main-header` → `display:none` (sidebar e header do shell já fazem esse papel)
- Não duplicar sidebar ou header quando em modo embedded

---

## 16. Responsividade

- Sidebar recolhe automaticamente em `@media (max-width:992px)` (classe `.sidebar-collapsed` via CSS)
- Manualmente recolhível em qualquer resolução via botão `#sidebar-toggle`
- `.toolbar` e `.filter-bar` têm `flex-wrap:wrap` — empilham em telas estreitas

---

## 17. Adicionando uma Nova Página de Listagem

Checklist para criar uma nova tela no padrão do sistema:

1. Copiar estrutura de `ministerios.html` como base
2. Atualizar o item `active` na sidebar (`<li class="nav-admin-only active">`)
3. Adicionar o link da nova página em **todas** as outras páginas e em `app.html` (`data-page="nova-pagina.html"`)
4. Usar `.list-table-container` para a tabela
5. Incluir toolbar com `.search-wrapper` + `.btn-sort` "Exportar CSV"
6. Seguir o padrão de modal `.modal` + `.modal-content` + `.modal-header`
7. Validação de campos obrigatórios via `.field-invalid` + `.field-error-msg` no submit handler
8. Skeleton loading durante o fetch inicial
9. Estado vazio em `<td colspan="N">` quando a lista estiver vazia
10. Feedback via `Auth.toast()` — nunca `alert()`
