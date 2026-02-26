# Backend — gerenciador.gs

O arquivo `gerenciador.gs` é o coração do ScriptToSheet. Ele roda como um **Google Apps Script Web App**, funcionando como uma API REST completa que o frontend consome via HTTP.

---

## Arquitetura

O Apps Script não tem roteamento nativo. A solução é um **roteador centralizado** na função `doPost()`:

```
Frontend → POST https://script.google.com/macros/s/{deploy-id}/exec
         → body: { action: "nomeDaFuncao", params: { ... } }
         → doPost() → switch(action) → função correspondente → JSON
```

### Por que POST e não GET?

O Apps Script redireciona automaticamente requisições GET (para CORS preflight), mas aceita POST diretamente. O frontend envia o `Content-Type: text/plain;charset=utf-8` (em vez de `application/json`) pra evitar o preflight do CORS, que o Apps Script não suporta nativamente.

---

## Configuração inicial

No início do arquivo, há duas constantes que **precisam ser preenchidas antes do deploy**:

```javascript
var ID_PLANILHA_INDICE = 'SEU_ID_AQUI';  // Planilha que serve como índice de projetos
var ID_PASTA_DRIVE = 'SEU_ID_AQUI';       // Pasta onde as shotlists serão criadas
```

### Como obter os IDs

**ID da Planilha:**
- Abra a planilha mãe no Google Sheets
- Copie o ID da URL: `https://docs.google.com/spreadsheets/d/**{ID_AQUI}**/edit`

**ID da Pasta:**
- Abra a pasta no Google Drive
- Copie o ID da URL: `https://drive.google.com/drive/folders/**{ID_AQUI}**`

---

## Deploy como Web App

1. No editor do Apps Script, vá em **Implantar → Nova implantação**
2. Tipo: **Web App**
3. Executar como: **Eu (sua conta Google)**
4. Quem tem acesso: **Qualquer pessoa** (necessário para o frontend acessar sem autenticação)
5. Copie a URL gerada e adicione ao `.env` do frontend:

```
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/{deploy-id}/exec
```

> ⚠️ Após qualquer alteração no código, é necessário criar um **novo deploy** (ou atualizar o existente). O URL muda a cada novo deploy — atualize o `.env` do frontend.

---

## Estrutura da Planilha Índice

A planilha `ID_PLANILHA_INDICE` controla o índice de projetos. Ela deve ter uma aba chamada `Índice` com o seguinte formato:

| Coluna A | Coluna B | Coluna C | Coluna D |
|----------|----------|----------|----------|
| Nome | URL do Doc | ID da Shotlist | Data |

Cada linha = um projeto. O número da linha (via `getLastRow()`) é usado como ID único do projeto para operações de exclusão e atualização.

---

## Estrutura da Shotlist (aba de cenas)

Cada projeto tem uma **aba própria** na planilha, com o seguinte esquema de colunas:

| Coluna A | B | C | D | E | F... |
|----------|---|---|---|---|------|
| Ordem | Roteiro | Comentário | Tag | Status | OBS | [Colunas extras dinâmicas] |

- **Ordem**: número da cena (1, 2, 3...)
- **Roteiro**: trecho do roteiro marcado no Google Docs
- **Comentário**: texto do comentário inserido pelo editor/roteirista
- **Tag**: etiquetas para classificação (separadas por vírgula)
- **Status**: `Aberto`, `Layout`, `Animação`, `Concluído` ou `Cancelado`
- **OBS**: campo de notas internas
- **Colunas F+**: colunas adicionais inseridas manualmente pelo usuário

---

## Funções da API

### `listarProjetos()`
Lê a aba `Índice` e retorna todos os projetos registrados.

**Retorno:**
```json
[
  { "nome": "Bombardeio", "docUrl": "...", "sheetId": "...", "data": "2025-01-01", "linha": 2 }
]
```

### `criarProjeto(nome, docUrl)`
1. Cria uma nova planilha Google Sheets na pasta `ID_PASTA_DRIVE`
2. Chama `extrairCenasParaPlanilha()` pra popular a planilha com as cenas do Doc
3. Registra o projeto na aba `Índice`

**Retorno:**
```json
{ "nome": "...", "sheetId": "...", "sheetUrl": "..." }
```

### `importarProjeto(nome, sheetUrl)`
Importa uma planilha que já existe no Drive (não cria uma nova, não extrai do Docs). Só registra no índice.

### `excluirProjeto(linha)`
Remove a entrada da aba `Índice` pela linha informada. **Não exclui a planilha do Drive.**

### `atualizarNomeProjeto(linha, novoNome)`
Atualiza a coluna A da linha correspondente no índice.

### `listarCenas(sheetId)`
Lê a aba de cenas de uma planilha e retorna todas as cenas + nomes das colunas extras.

**Retorno:**
```json
{
  "cenas": [...],
  "extraColumns": ["Cor Grading", "VFX"]
}
```

### `atualizarCena(sheetId, linha, campos)`
Atualiza campos de uma cena específica. O parâmetro `campos` é um objeto com os campos a atualizar:
```json
{ "status": "Concluído", "tag": "guerra, bombardeio" }
```
Suporta também `extras` para atualizar colunas dinâmicas:
```json
{ "extras": { "Cor Grading": "Fria", "VFX": "Explosão" } }
```

### `adicionarCena(sheetId, cena)`
Adiciona uma linha nova ao final da shotlist.

### `excluirCena(sheetId, linha)`
Remove a linha pelo número da linha na planilha.

---

## Tratamento de Erros

Toda função retorna um objeto com `erro` em caso de falha:

```json
{ "erro": "Planilha não encontrada." }
```

O frontend verifica esse campo antes de processar a resposta (ver `api.ts`).

---

## Segurança e Limitações

- O Web App é público (qualquer pessoa com a URL pode chamar). **Não há autenticação**.
- O Google Apps Script tem limites de execução: 6 minutos por chamada, 90 minutos por dia (conta gratuita).
- Não use o mesmo deploy URL em produção e desenvolvimento — crie deploys separados.
