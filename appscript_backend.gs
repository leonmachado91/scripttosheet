/**
 * BACKEND - EDITOR WORKFLOW CONVERTER (DOC -> SHEET)
 * ====================================================
 * Este script lida impecavelmente com a extração das "cenas" desenhadas
 * nos comentários do Google Docs e as exporta para o formato Sheet.
 * 
 * RESOLUÇÃO DO PROBLEMA CRÍTICO:
 * Os dados do "quotedFileContent" vêm como HTML Entities (ex: &#231; = ç) e 
 * possuem Tabulações Verticais (\u000b) em vez de quebras de linha. Este script 
 * decodifica as entidades nativamente e limpa a string para igualar perfeitamente 
 * o texto real do roteiro, independente de duplicações ou tamanho.
 */

/**
 * Função principal a ser chamada pelo Web App ou por um botão Customizado.
 * @param {string} docUrl - URL pública/privada do arquivo Docs.
 * @param {string} planilhaId - ID da planilha mãe (onde a aba será criada).
 * @param {string} nomeAba - (Opcional) Nome da aba a ser criada.
 */
function extrairCenasParaPlanilha(docUrl, planilhaId, nomeAba) {
  try {
    // 1. Validar e capturar o ID
    var docId = capturarIdDaUrl(docUrl);
    if (!docId) return { erro: "URL do documento inválida." };

    // Se o nomeAba não for definido, usar o nome do Próprio Documento original
    if (!nomeAba) {
      nomeAba = DriveApp.getFileById(docId).getName();
    }

    // 2. Coletar os Comentários Formatados do Drive API
    var cenas = puxarComentariosBrutosEVarrer(docId);
    
    if (cenas.length === 0) {
      return { msg: "Nenhuma cena/comentário pendente encontrada neste Roteiro." };
    }

    // 3. (OPCIONAL MAS RECOMENDADO) Ordenar cenas pela ordem em que aparecem no texto
    cenas = ordenarCenasPeloDocumento(cenas, docId);

    // 4. Inserir os dados na Planilha Destino
    var resultado = registrarNaSheet(cenas, planilhaId, nomeAba);

    return { 
      sucesso: true, 
      msg: "Foram extraídas e registradas " + cenas.length + " cenas com sucesso!",
      nomeAba: nomeAba 
    };

  } catch (erro) {
    Logger.log(erro);
    return { erro: "Falha na execução: " + erro.toString() };
  }
}

/**
 * Faz a chamada central à Drive API v3 e realiza o Parsing Seguro das strings.
 */
function puxarComentariosBrutosEVarrer(docId) {
  var response = Drive.Comments.list(docId, {
    fields: "comments(id, content, quotedFileContent, resolved, createdTime, author(displayName))",
    pageSize: 100 // Traz até 100 de uma vez (pode ser paginado usando pageToken no futuro se doc gigante)
  });
  
  var comentarios = response.comments || [];
  var extraidos = [];
  
  // A API por padrão entrega do MAIS NOVO para o MAIS VELHO.
  // Vamos varrer normalmente e depois ordenaremos pela posição no texto se necessário.
  for (var i = 0; i < comentarios.length; i++) {
    var c = comentarios[i];
    
    // Filtro 1: Não processamos cenas já marcadas como "Resolvidas" no Doc.
    // Filtro 2: Ignorar comentários não atrelados a um texto (gerais do doc inteiro).
    if (c.resolved || !c.quotedFileContent) continue;
    
    // === O CORAÇÃO DA SOLUÇÃO ===
    // O Google retorna o texto HTML Encoded e com caracteres bizarros (Vertical Tab - \u000b)
    var textoCodificado = c.quotedFileContent.value;
    var trechoRoteiroDecodificado = limpadorDeEntidadesHTML(textoCodificado);
    
    extraidos.push({
      roteiro: trechoRoteiroDecodificado.trim(),
      comentario: (c.content || "").trim(), // Texto digitado pelo layout/roteirista no comentário
      id: c.id,
      criadoEm: c.createdTime // Se tiver mesma posição (ex: sobrepostos), usamos data.
    });
  }
  
  return extraidos;
}

/**
 * Conversor responsável por pegar os dados da API (\&#231;, \u000b) e converter
 * em strings reais do roteiro.
 */
function limpadorDeEntidadesHTML(texto) {
  if (!texto) return "";
  
  // 1. Substitui Entidades HTML por caracteres reais (ex: &#199; -> Ç, &#227; -> ã)
  var textoLimpo = texto.replace(/&#(\d+);/g, function(match, dec) {
    return String.fromCharCode(dec);
  });
  
  // Hexadecimais
  textoLimpo = textoLimpo.replace(/&#x([0-9a-f]+);/gi, function(match, hex) {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // Códigos nominais mais comuns (caso a API do Docs jogue um &quot;)
  var entidades = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  };
  textoLimpo = textoLimpo.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, function(match) {
    return entidades[match];
  });
  
  // 2. Tratamento de Espaçamentos / Quebras
  // O Docs muitas vezes representa a quebra de linha Shift+Enter como Vertical Tab (\u000b).
  textoLimpo = textoLimpo.replace(/\u000b/g, '\n'); 

  return textoLimpo;
}

/**
 * Identifica em que posição do roteiro a cena acontece.
 * Fundamental para que as Cenas fiquem do ínicio ao fim na ordem cronológica de leitura do vídeo
 * independente de que dia/hora o roteirista as comentou.
 */
function ordenarCenasPeloDocumento(cenas, docId) {
  // Puxar o texto gigante e sem formatação nativo pra achar os recortes
  var doc = DocumentApp.openById(docId);
  var txtCorpo = doc.getBody().getText(); 
  
  // Pra nossa busca por index funcionar com perfeição, removemos white spaces estranhos.
  // Já que só queremos achar a posição, criamos uma string unificada (txtAlvo)
  var txtAlvo = txtCorpo.replace(/\s+/g, ' ');

  cenas.forEach(function(cena) {
    var txtCenaNormalizada = cena.roteiro.replace(/\s+/g, ' ');
    var index = txtAlvo.indexOf(txtCenaNormalizada);
    cena.posicaoCronologica = index;
  });

  // Tendo a posição cronológica de cada trecho marcada no texto:
  cenas.sort(function(a, b) {
    if (a.posicaoCronologica === b.posicaoCronologica) {
      // Se duas cenas marcam o MESMO texo, quem comentou primeiro vem primeiro
      return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
    }
    return a.posicaoCronologica - b.posicaoCronologica;
  });

  return cenas;
}

/**
 * Cria a aba na planilha mãe e joga o array lá dentro formatado.
 */
function registrarNaSheet(cenas, planilhaId, nomeAbaCorrigido) {
  var planilha = SpreadsheetApp.openById(planilhaId);
  var aba = planilha.getSheetByName(nomeAbaCorrigido);
  
  // Se a aba não existe, cria ela e formata o Cabeçalho
  if (!aba) {
    aba = planilha.insertSheet(nomeAbaCorrigido);
    
    // Cabeçalho Oficial ("Ordem | Roteiro | Comentário | Status | OBS")
    aba.appendRow(["Ordem", "Roteiro", "Comentário", "Status", "OBS"]);
    
    // Opcional: Formatação visual do cabeçalho
    aba.getRange("A1:E1").setFontWeight("bold").setBackground("#d9d9d9");
    aba.setColumnWidth(2, 400); // Roteiro mais largo
    aba.setColumnWidth(3, 400); // Comentário mais largo
  } else {
    // SE PREFERIR APAGAR O QUE TINHA ANTES E RECARREGAR TUDO:
    // aba.clear(); ... (precisamos definir se ele sempre recria ou apenas anexa cenas novas)
  }

  // Prepara os dados pro Google inserir "em BATCH" (muito mais rápido que linha a linha)
  var dadosTabela = [];
  var regraStatus = SpreadsheetApp.newDataValidation()
                    .requireValueInList(['Layout', 'Animação', 'Concluído'], true)
                    .build();

  // A última linha usada é a nossa referência de "Ordem" pra não sobrescrever se existir
  var ultimaOrdem = aba.getLastRow() > 1 ? (aba.getLastRow() - 1) : 0;

  for (var i = 0; i < cenas.length; i++) {
    ultimaOrdem++;
    var cena = cenas[i];
    dadosTabela.push([
      ultimaOrdem,            // A: Ordem
      cena.roteiro,           // B: Trecho Perfeito do Docs
      cena.comentario,        // C: As ideias do Roteirista (Links, Sugestões)
      "Layout",               // D: Status Padrao Inícial
      ""                      // E: OBS Padrão Vazia
    ]);
  }
  
  // Escreve do primeiro vazio pra baixo (ex: joga as 30 cenas em 1 execução só)
  if (dadosTabela.length > 0) {
    var range = aba.getRange(aba.getLastRow() + 1, 1, dadosTabela.length, dadosTabela[0].length);
    range.setValues(dadosTabela);
    
    // Inserir Formatação de Status
    aba.getRange(aba.getLastRow() - dadosTabela.length + 1, 4, dadosTabela.length, 1)
       .setDataValidation(regraStatus);
  }

  return true;
}

/** Utilitario: Função que puxa ID padrão (suporta links compartilhados ou IDs puros) */
function capturarIdDaUrl(url) {
  var match = url.match(/\/d\/(.*?)(\/|$)/);
  if (match) {
    return match[1];
  }
  // Fallback: se o cara digitou direto o ID em vez do link
  if (url.length > 20 && url.indexOf('/') === -1) {
    return url;
  }
  return null;
}
