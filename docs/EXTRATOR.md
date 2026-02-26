# Extrator de Cenas — appscript_backend.gs

O arquivo `appscript_backend.gs` implementa a lógica de extração de cenas a partir dos **comentários do Google Docs**. É o módulo responsável por transformar o roteiro em uma shotlist.

---

## O Problema que ele resolve

O Google Docs permite que usuários adicionem **comentários** a trechos específicos do texto. No fluxo de produção do ScriptToSheet, editores e roteiristas usam esses comentários para indicar ideias, sugestões de animação, referências de imagem, etc.

O problema é que a API do Google retorna esses comentários com:
1. **Entidades HTML** no texto (`&#231;` em vez de `ç`, `&#227;` em vez de `ã`)
2. **Vertical Tab (`\u000b`)** no lugar de quebras de linha (o jeito como o Docs representa `Shift+Enter`)
3. **Timestamp** de criação — não a posição no texto, então os comentários chegam fora de ordem cronológica de leitura

O extrator resolve cada um desses problemas.

---

## Função principal: `extrairCenasParaPlanilha(docUrl, planilhaId, nomeAba)`

Ponto de entrada. Orquestra todo o fluxo:

```
1. capturarIdDaUrl(docUrl)          → valida e extrai o ID do documento
2. puxarComentariosBrutosEVarrer()  → chama a Drive API e extrai cenas brutas
3. ordenarCenasPeloDocumento()      → ordena na ordem real do texto
4. registrarNaSheet()               → escreve na planilha de destino
```

**Parâmetros:**
- `docUrl`: URL completa do Google Docs (ex: `https://docs.google.com/document/d/abc123/edit`) ou só o ID
- `planilhaId`: ID da planilha mãe onde a aba será criada
- `nomeAba`: (opcional) nome da aba. Se omitido, usa o nome do documento

---

## `puxarComentariosBrutosEVarrer(docId)`

Chama a **Drive API v3** para buscar os comentários do documento:

```javascript
Drive.Comments.list(docId, {
  fields: "comments(id, content, quotedFileContent, resolved, createdTime, author(displayName))",
  pageSize: 100
})
```

### Campos utilizados

| Campo | Uso |
|-------|-----|
| `content` | Texto do comentário (o que o roteirista digitou) |
| `quotedFileContent.value` | Trecho do roteiro que foi marcado |
| `resolved` | Se `true`, o comentário é ignorado (cena já resolvida) |
| `createdTime` | Usado como critério de desempate na ordenação |

### Filtros aplicados

- **Comentários resolvidos** (`c.resolved === true`) são ignorados — eles representam tarefas concluídas
- **Comentários sem texto selecionado** (`!c.quotedFileContent`) são ignorados — são comentários gerais do documento, sem cena associada

---

## `limpadorDeEntidadesHTML(texto)`

Resolve os problemas de encoding da API do Google:

### Passo 1: Entidades numéricas decimais
```javascript
texto.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
// &#231; → ç   &#227; → ã   &#199; → Ç
```

### Passo 2: Entidades numéricas hexadecimais
```javascript
texto.replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
// &#xe9; → é
```

### Passo 3: Entidades nominais comuns
```javascript
{ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }
```

### Passo 4: Vertical Tab → Newline
```javascript
texto.replace(/\u000b/g, '\n')
// O Docs usa Vertical Tab para Shift+Enter (quebra de linha suave)
```

---

## `ordenarCenasPeloDocumento(cenas, docId)`

A Drive API retorna comentários do **mais novo para o mais velho**. Para que as cenas apareçam na ordem de leitura natural do roteiro, é necessário ordenar pela posição no texto.

**Algoritmo:**
1. Lê o corpo inteiro do documento: `DocumentApp.openById(docId).getBody().getText()`
2. Normaliza espaços em branco (`\s+` → `' '`) tanto no texto do doc quanto no texto de cada cena
3. Usa `indexOf()` para encontrar a posição de cada trecho no texto
4. Ordena pelo índice encontrado

**Critério de desempate:**
- Se dois comentários marcam o mesmo trecho (posição igual), ordena por `createdTime` (quem comentou primeiro aparece primeiro)

```javascript
cenas.sort((a, b) => {
  if (a.posicaoCronologica === b.posicaoCronologica) {
    return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
  }
  return a.posicaoCronologica - b.posicaoCronologica;
});
```

---

## `registrarNaSheet(cenas, planilhaId, nomeAba)`

Escreve as cenas na planilha de destino:

1. **Cria a aba** se não existir, com o cabeçalho padrão: `Ordem | Roteiro | Comentário | Status | OBS`
2. **Formata o cabeçalho**: negrito + fundo cinza + colunas de roteiro/comentário com 400px
3. **Detecta a última linha** pra não sobrescrever cenas já existentes (incrementa em vez de reescrever)
4. **Escreve em batch** (um `setValues()` só para todas as cenas) — muito mais rápido que linha a linha
5. **Aplica validação de dados** na coluna Status: `Layout`, `Animação`, `Concluído`

### Status padrão ao criar
Toda cena nova é criada com status `"Layout"` — representando que ainda precisa de decisão de edição.

---

## `capturarIdDaUrl(url)`

Extrai o ID do documento de diferentes formatos de URL:

- URL completa: `https://docs.google.com/document/d/{ID}/edit` → extrai com regex `/\/d\/(.*?)(\/|$)/`
- ID direto: se a string não contém `/` e tem mais de 20 chars, assume que já é o ID

---

## Outros scripts auxiliares

### `extrator_diagnostico.gs`
Versão de diagnóstico que loga detalhes de cada comentário encontrado (encoding, campos, etc.) — usado para debug quando a extração apresenta problemas de encoding ou comentários faltando.

### `extrator_teste_standalone.gs`
Versão standalone que pode ser executada diretamente no editor do Apps Script sem precisar de parâmetros — útil para testar a extração de um documento específico sem passar pelo frontend.

### `investigar_html.gs`
Script que expõe o HTML bruto retornado pela API do Docs, para investigar problemas de encoding e estrutura de dados em documentos específicos.
