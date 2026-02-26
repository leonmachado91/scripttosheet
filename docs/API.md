# API Reference — gerenciador.gs

Todos os endpoints são acessados via **POST** para a mesma URL (o deploy do Apps Script). O corpo da requisição sempre segue o formato:

```json
{
  "action": "nomeDaFuncao",
  "params": { /* parâmetros específicos da ação */ }
}
```

A resposta é sempre JSON. Em caso de erro, retorna `{ "erro": "mensagem" }`.

---

## URL Base

```
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/{deploy-id}/exec
```

---

## Projetos

### `listarProjetos`

Lista todos os projetos registrados na planilha índice.

**Request:**
```json
{ "action": "listarProjetos", "params": {} }
```

**Response:**
```json
[
  {
    "nome": "Bombardeio",
    "docUrl": "https://docs.google.com/document/d/abc/edit",
    "sheetId": "1ABCD1234...",
    "data": "2025-01-15",
    "linha": 2
  }
]
```

---

### `criarProjeto`

Cria uma nova planilha no Drive, extrai as cenas do Google Docs e registra o projeto no índice.

**Request:**
```json
{
  "action": "criarProjeto",
  "params": {
    "nome": "Meu Projeto",
    "docUrl": "https://docs.google.com/document/d/abc123/edit"
  }
}
```

**Response:**
```json
{
  "nome": "Meu Projeto",
  "sheetId": "1XYZ...",
  "sheetUrl": "https://docs.google.com/spreadsheets/d/1XYZ.../edit"
}
```

**Erros possíveis:**
- `"URL do documento inválida."` — docUrl malformada
- `"Nenhuma cena/comentário pendente encontrada neste Roteiro."` — doc sem comentários não resolvidos

---

### `importarProjeto`

Importa uma planilha existente (sem extrair do Docs, sem criar nova planilha).

**Request:**
```json
{
  "action": "importarProjeto",
  "params": {
    "nome": "Projeto Legado",
    "sheetUrl": "https://docs.google.com/spreadsheets/d/1ABC.../edit"
  }
}
```

**Response:**
```json
{
  "nome": "Projeto Legado",
  "sheetId": "1ABC...",
  "sheetUrl": "https://docs.google.com/spreadsheets/d/1ABC.../edit"
}
```

---

### `excluirProjeto`

Remove a entrada do projeto da planilha índice. **Não exclui a planilha do Google Sheets.**

**Request:**
```json
{
  "action": "excluirProjeto",
  "params": { "linha": 2 }
}
```

**Response:**
```json
{ "sucesso": true }
```

---

### `atualizarNomeProjeto`

Atualiza o nome de um projeto no índice.

**Request:**
```json
{
  "action": "atualizarNomeProjeto",
  "params": { "linha": 2, "novoNome": "Novo Nome" }
}
```

**Response:**
```json
{ "sucesso": true }
```

---

## Cenas

### `listarCenas`

Lê a shotlist de um projeto. Detecta automaticamente colunas extras além das padrão.

**Request:**
```json
{
  "action": "listarCenas",
  "params": { "sheetId": "1ABCD1234..." }
}
```

**Response:**
```json
{
  "cenas": [
    {
      "ordem": 1,
      "roteiro": "O bombardeio da Al-Shifa no Sudão...",
      "comentario": "Utilizar imagens de arquivo. Cobrir com música.",
      "tag": "guerra, sudão",
      "status": "Aberto",
      "obs": "",
      "linha": 2,
      "extras": {
        "Cor Grading": "Fria",
        "VFX": ""
      }
    }
  ],
  "extraColumns": ["Cor Grading", "VFX"]
}
```

**Sobre `linha`:** é o número real da linha na planilha (incluindo o cabeçalho). A linha 2 corresponde à primeira cena (linha 1 = cabeçalho).

**Sobre `extras`:** objeto com os valores de todas as colunas além das padrão `(Ordem, Roteiro, Comentário, Tag, Status, OBS)`. O backend detecta automaticamente quantas colunas extras existem e as inclui.

---

### `atualizarCena`

Atualiza um ou mais campos de uma cena. Só os campos presentes em `campos` são modificados.

**Request — campos padrão:**
```json
{
  "action": "atualizarCena",
  "params": {
    "sheetId": "1ABCD...",
    "linha": 2,
    "campos": {
      "status": "Concluído",
      "tag": "guerra, sudão",
      "comentario": "Novo comentário atualizado"
    }
  }
}
```

**Request — colunas extras:**
```json
{
  "action": "atualizarCena",
  "params": {
    "sheetId": "1ABCD...",
    "linha": 2,
    "campos": {
      "extras": {
        "Cor Grading": "Quente",
        "VFX": "Explosão"
      }
    }
  }
}
```

**Response:**
```json
{ "sucesso": true }
```

---

### `adicionarCena`

Adiciona uma nova cena no final da shotlist.

**Request:**
```json
{
  "action": "adicionarCena",
  "params": {
    "sheetId": "1ABCD...",
    "cena": {
      "roteiro": "Nova cena",
      "comentario": "Referência aqui",
      "tag": "",
      "status": "Aberto",
      "obs": ""
    }
  }
}
```

**Response:**
```json
{ "sucesso": true, "ordem": 12 }
```

---

### `excluirCena`

Remove uma cena da planilha pela linha.

**Request:**
```json
{
  "action": "excluirCena",
  "params": {
    "sheetId": "1ABCD...",
    "linha": 5
  }
}
```

**Response:**
```json
{ "sucesso": true }
```

---

## Formato de erro

Qualquer ação pode retornar um erro:

```json
{ "erro": "Descrição do problema" }
```

O cliente (`api.ts`) lança um `Error` com essa mensagem, que o React Query captura e disponibiliza via `error.message`.

---

## Health Check (GET)

A URL do Web App também aceita GET e retorna um JSON simples para confirmar que está no ar:

```
GET https://script.google.com/macros/s/{deploy-id}/exec
→ { "status": "ok" }
```

Útil para verificar se o deploy está ativo antes de fazer chamadas.
