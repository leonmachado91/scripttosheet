# Frontend — Arquitetura React

O frontend do ScriptToSheet é uma aplicação React + TypeScript construída com Vite, usando Tailwind CSS com um design system customizado baseado na paleta Gruvbox.

---

## Stack tecnológico

| Tecnologia | Uso |
|------------|-----|
| React 18 | UI declarativa com hooks |
| TypeScript | Tipagem estática |
| Vite | Build tool e dev server |
| Tailwind CSS | Estilização utilitária |
| Zustand | Estado global (stores) |
| TanStack Query (React Query) | Data fetching e cache |
| Lucide React | Ícones |

---

## Design System — Paleta Gruvbox

O projeto usa a paleta de cores [Gruvbox](https://github.com/morhetz/gruvbox), implementada como tokens CSS no `index.css`:

| Token | Cor | Uso |
|-------|-----|-----|
| `gruv-bg-hard` | `#1d2021` | Background mais escuro (root) |
| `gruv-bg` | `#282828` | Background principal |
| `gruv-bg-soft` | `#32302f` | Background secundário, bordas |
| `gruv-fg` | `#ebdbb2` | Texto principal |
| `gruv-fg0` | `#fbf1c7` | Texto destaque |
| `gruv-fg4` | `#a89984` | Texto secundário |
| `gruv-gray` | `#928374` | Texto terciário, placeholders |
| `gruv-yellow` | `#d79921` | Accent principal (amarelo) |
| `gruv-red` | `#cc241d` | Alerta, deletar |
| `gruv-green` | `#98971a` | Sucesso, confirmar |
| `gruv-blue` | `#458588` | Links, ações neutras |

---

## Estrutura de arquivos

```
app/src/
├── types/index.ts              → Definição dos tipos principais
├── services/api.ts             → Camada de comunicação com o backend
├── stores/
│   ├── useCenaStore.ts         → Estado das cenas e filtros
│   └── useProjetoStore.ts      → Estado dos projetos e navegação
├── components/
│   ├── cena/
│   │   ├── CenaTable.tsx       → Tabela principal com todas as cenas
│   │   ├── CenaTableRow.tsx    → Linha individual da tabela (com edição inline)
│   │   ├── CenaDetalhePanel.tsx → Painel flutuante de detalhes
│   │   └── StatusBadge.tsx     → Badge visual de status
│   ├── layout/
│   │   ├── Header.tsx          → Barra superior (breadcrumb, busca)
│   │   ├── Sidebar.tsx         → Lista de projetos (navegação lateral)
│   │   └── Toolbar.tsx         → Barra de ferramentas (filtros, visualização)
│   └── projeto/
│       └── NovoProjetoModal.tsx → Modal de criação/importação de projeto
└── App.tsx                     → Componente raiz
```

---

## Tipos principais (`types/index.ts`)

### `Projeto`
```typescript
interface Projeto {
  nome: string;      // Nome do projeto
  docUrl: string;    // URL do Google Docs original
  sheetId: string;   // ID da planilha no Google Sheets
  data: string;      // Data de criação (ISO string)
  linha: number;     // Linha no índice da planilha mãe (ID único)
}
```

### `Cena`
```typescript
interface Cena {
  ordem: number;             // Número sequencial da cena (1, 2, 3...)
  roteiro: string;           // Trecho do roteiro marcado no Docs
  comentario: string;        // Comentário do editor
  tag: string;               // Tags separadas por vírgula
  status: StatusType;        // Estado da cena
  obs: string;               // Observações internas (campo livre)
  linha: number;             // Linha na planilha (ID único)
  extras: Record<string, string>; // Colunas dinâmicas extras
}
```

### `StatusType`
```typescript
type StatusType = 'Aberto' | 'Layout' | 'Animação' | 'Concluído' | 'Cancelado';
```

### `ListarCenasResponse`
```typescript
interface ListarCenasResponse {
  cenas: Cena[];
  extraColumns: string[]; // Nomes das colunas dinâmicas da planilha
}
```

---

## Estado Global (Zustand)

### `useProjetoStore`

Gerencia a lista de projetos e a navigação:

| State | Tipo | Descrição |
|-------|------|-----------|
| `projetos` | `Projeto[]` | Todos os projetos carregados |
| `projetoAtual` | `Projeto \| null` | Projeto selecionado ativamente |
| `sidebarCollapsed` | `boolean` | Estado de colapso da sidebar |
| `searchQuery` | `string` | Busca global na tabela de cenas |

| Action | Descrição |
|--------|-----------|
| `setProjetos(projetos)` | Substitui a lista inteira |
| `setProjetoAtual(projeto)` | Seleciona/deseleciona um projeto |
| `addProjeto(projeto)` | Adiciona um projeto à lista (otimistic update) |
| `removeProjeto(linha)` | Remove pelo ID linha (limpa `projetoAtual` se for o mesmo) |
| `updateProjeto(linha, updates)` | Atualiza campos de um projeto específico |
| `toggleSidebar()` | Alterna o estado de colapso da sidebar |
| `setSearchQuery(q)` | Atualiza a busca textual |

### `useCenaStore`

Gerencia as cenas do projeto atual e os filtros da tabela:

| State | Tipo | Descrição |
|-------|------|-----------|
| `cenas` | `Cena[]` | Lista de cenas do projeto atual |
| `extraColumns` | `string[]` | Nomes das colunas extras detectadas na planilha |
| `filters` | `FilterRule[]` | Filtros ativos na tabela |
| `cenaAberta` | `Cena \| null` | Cena exibida no painel de detalhes |

| Action | Descrição |
|--------|-----------|
| `setCenas(cenas)` | Atualiza lista e fecha o painel aberto |
| `setExtraColumns(cols)` | Atualiza as colunas dinâmicas detectadas |
| `updateCena(linha, updates)` | Atualiza uma cena na lista **e** no painel se estiver aberto |
| `setCenaAberta(cena)` | Abre/fecha o painel de detalhes |
| `addFilter()` | Adiciona um novo filtro vazio |
| `updateFilter(id, updates)` | Atualiza um filtro pelo ID |
| `removeFilter(id)` | Remove um filtro |
| `clearFilters()` | Limpa todos os filtros |

### `FilterRule`
```typescript
interface FilterRule {
  id: string;
  column: string;
  operator: 'contains' | 'not_contains' | 'equals' | 'not_equals' | 'is_empty' | 'is_not_empty';
  value: string;
}
```

---

## Componentes

### `App.tsx`

Componente raiz. Responsável por:
- Fazer o fetch inicial da lista de projetos via React Query
- Sincronizar os projetos no `useProjetoStore`
- Renderizar o layout principal: `Sidebar` + `Header` + (`Toolbar` + `CenaTable`) ou tela de boas-vindas
- Sempre renderizar `CenaDetalhePanel` (ele gerencia sua própria visibilidade)

### `Sidebar.tsx`

Barra lateral de navegação com a lista de projetos. Permite:
- Selecionar um projeto para trabalhar
- Criar um novo projeto (abre `NovoProjetoModal`)
- Colapsar/expandir a barra lateral

### `Header.tsx`

Barra superior mostrando o breadcrumb (`Projetos / Nome do Projeto`) e a busca textual global (que opera via `useProjetoStore.setSearchQuery`).

### `Toolbar.tsx`

Barra de ferramentas abaixo do header. Contém:

**Seletor de visualização** (apenas "Tabela" ativo; "Lista" e "Kanban" são placeholders para versões futuras)

**Sistema de filtros** — painel dropdown com regras AND:
- Coluna → Operador → Valor
- Suporte a todas as colunas fixas + colunas extras dinâmicas
- Para colunas com ≤ 20 valores únicos, mostra um `<select>` com os valores existentes no projeto (além do campo de texto livre)
- Filtros ficam destacados em amarelo quando ativos, com contador de filtros

**Contador de cenas** — mostra o total de cenas do projeto.

### `CenaTable.tsx`

Tabela principal. Recursos:

**Redimensionamento de colunas via drag:**
- `handleResizeStart()` registra os event listeners de `mousemove`/`mouseup`
- Atualiza variáveis CSS (`--col-{nome}`) diretamente no `tableContainerRef`
- A largura da tabela é calculada com `CSS calc()` somando todas as variáveis, então a tabela cresce automaticamente durante o drag sem afetar as outras colunas

**Coluna CSS Variables:**
```
--col-ordem, --col-roteiro, --col-comentario, --col-tag, --col-status, --col-{extra...}, --col-spacer
```

**Ordenação:** clique no cabeçalho alterna `asc` → `desc` → sem ordenação

**Paginação:** 50 linhas por página, com botões Anterior/Próximo. Usa `safePage` (cálculo derivado) que limita automaticamente a página válida quando filtros reduzem o total de resultados.

**Expand/Collapse de linhas:** cada linha pode ser expandida pra mostrar o conteúdo completo dos campos truncados.

**Estado de edição inline:** `editingCell: { linha, field, isExtra }` controla qual célula está em modo de edição.

**Estado de edição de status:** `editingStatus: number | null` controla qual linha tem o dropdown de status aberto.

### `CenaTableRow.tsx`

Componente de uma linha. Renderiza todas as células e gerencia a edição inline:

**Edição inline de texto:**
- Botão de lápis em cada célula aciona `handleStartEdit()`, que hidrata `editValue` com o valor atual e chama `onStartEdit(cena, field, e, isExtra)` no pai
- O campo `<textarea>` auto-cresce via `scrollHeight`
- Salvar: `Ctrl+Enter` ou botão ✓ → chama `onConfirmEdit()`
- Cancelar: `Escape` ou botão ✗

**Edição de status:**
- Dropdown com todos os status disponíveis
- Salva imediatamente ao selecionar

**Tag rendering:** divide o campo `tag` por vírgulas e renderiza `<TagBadge>` para cada uma.

**Overflow condicional:** quando uma célula está em edição, `overflow: 'visible'` é aplicado pra que os botões de confirmar/cancelar não sejam cortados.

**`useEffect` de foco:** quando `editingCell` muda, o foco vai automaticamente para o `<textarea>` ou `<input>` da célula em edição.

### `CenaDetalhePanel.tsx`

Painel flutuante que aparece ao clicar no título "Cena X" ou no ícone de chevron da tabela. Mostra os detalhes completos de uma cena e permite edição.

**Modos:**
- Painel lateral (`right-3`, `w-[420px]`)
- Tela cheia (`inset-8`, `max-w-[800px]`)

**Campos editáveis no painel:**
- **Status**: dropdown com todos os status
- **Tags**: editor de tags com autoComplete (sugestões a partir das tags existentes no projeto)
- **Roteiro, Comentário, OBS**: textarea com edição inline. Clique no lápis → edição → confirmar/cancelar ou Escape
- **Colunas extras**: renderizadas dinamicamente com o mesmo padrão de edição

**Ciclo de save:**
- Campos de texto salvam individualmente ao confirmar (`api.atualizarCena`)
- Status e tags são salvos juntos clicando no botão "Salvar"
- Modal de confirmação aparece ao tentar fechar com alterações não salvas

**`isDirty()`:** detecta se status ou tags mudaram comparando com o valor atual em `cenaAberta`.

### `StatusBadge.tsx` e `TagBadge`

Componentes de apresentação:
- `StatusBadge`: badge colorido para cada status (cada status tem cor específica)
- `TagBadge`: badge cinza com texto em lowercase pra tags

### `NovoProjetoModal.tsx`

Modal com duas abas:
1. **Criar projeto**: aceita nome + URL do Google Docs → chama `api.criarProjeto()`
2. **Importar projeto**: aceita nome + URL de uma planilha existente → chama `api.importarProjeto()`

---

## Camada de API (`services/api.ts`)

Todas as requisições passam pela função genérica `callApi<T>()`:

```typescript
async function callApi<T>(action: string, params = {}): Promise<T> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, params }),
    redirect: 'follow',
  });
  const data = await response.json();
  if (data?.erro) throw new Error(data.erro);
  return data as T;
}
```

**Por que `text/plain`?**
O Google Apps Script não aceita preflight de CORS. Usando `Content-Type: text/plain`, o browser trata como "simple request" e não envia preflight, tornando a requisição possível sem configurar headers no servidor.

---

## Configuração e variáveis de ambiente

Crie um arquivo `.env` na raiz da pasta `app/`:

```env
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/{deploy-id}/exec
```

Se a variável não for definida, o `api.ts` loga um warning e retorna arrays vazios sem quebrar a aplicação.

---

## Rodando localmente

```bash
cd app
pnpm install
pnpm dev
# Acesse http://localhost:5173
```

## Build para produção

```bash
pnpm build
# Saída em app/dist/
```
