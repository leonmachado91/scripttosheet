/**
 * CONVERSOR DE ROTEIRO (DOC) PARA SHOTLIST (SHEET)
 * ====================================================
 * VERSÃO COMPLETA — TEXTO INTEGRAL + COMENTÁRIOS + RECUPERAÇÃO DE TRUNCAMENTO
 *
 * Inclui TODOS os parágrafos do documento na tabela:
 * - Parágrafos cobertos por comentário: exibem o comentário na coluna correspondente
 * - Parágrafos sem comentário (títulos, transições): comentário fica vazio
 * Tudo na ordem exata do documento.
 *
 * COLUNAS: Ordem | Roteiro | Comentário | Tag | Status | OBS
 *
 * INSTRUÇÕES:
 * 1. Habilite o serviço "Drive API".
 * 2. Cole este código em Code.gs.
 * 3. Execute EXECUTAR.
 */

var DOC_ID = '1j9YSGLmDRCTejIPgKRe9n6nmxCeKjIJGFqKGEmeew1o';

function EXECUTAR() {
  Logger.log('=== INÍCIO ===');

  // 1. Puxar parágrafos do documento
  var doc = DocumentApp.openById(DOC_ID);
  var body = doc.getBody();
  var textoDoc = body.getText().replace(/\u000b/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  var paragrafos = extrairParagrafos(body);
  Logger.log('Parágrafos no documento: ' + paragrafos.length);

  // 2. Puxar comentários da Drive API
  var comentarios = buscarComentarios(DOC_ID);
  var ativos = comentarios.filter(function(c) {
    return !c.resolved && c.quotedFileContent && c.quotedFileContent.value;
  });
  Logger.log('Comentários ativos: ' + ativos.length);

  // 3. Decodificar e localizar cada comentário no texto
  var cenasComentadas = ativos.map(function(c) {
    var textoAPI = decodificar(c.quotedFileContent.value);
    var textoCompleto = recuperarTruncamento(textoAPI, textoDoc);
    return {
      textoRoteiro: textoCompleto,
      textoComentario: c.content || '',
      criadoEm: new Date(c.createdTime).getTime()
    };
  });

  // 4. Mapear quais parágrafos são cobertos por comentários
  var linhasFinais = montarTabelaIntercalada(paragrafos, cenasComentadas, textoDoc);
  Logger.log('Linhas na tabela final: ' + linhasFinais.length);

  // 5. Criar planilha
  var nome = DriveApp.getFileById(DOC_ID).getName();
  var planilha = SpreadsheetApp.create('Shotlist — ' + nome);
  escreverNaPlanilha(planilha, linhasFinais);

  Logger.log('=== CONCLUÍDO ===');
  Logger.log(planilha.getUrl());
}


// =================================================================
// EXTRAÇÃO DE PARÁGRAFOS
// =================================================================

/**
 * Extrai todos os parágrafos do documento com seu texto e posição.
 * Ignora parágrafos vazios (só whitespace).
 */
function extrairParagrafos(body) {
  var resultado = [];
  var numFilhos = body.getNumChildren();
  var posicaoAcumulada = 0;

  for (var i = 0; i < numFilhos; i++) {
    var elemento = body.getChild(i);

    if (elemento.getType() === DocumentApp.ElementType.PARAGRAPH) {
      var texto = elemento.asText().getText().trim();
      if (texto.length > 0) {
        resultado.push({
          texto: texto,
          posicao: posicaoAcumulada
        });
      }
    } else if (elemento.getType() === DocumentApp.ElementType.LIST_ITEM) {
      var textoLista = elemento.asText().getText().trim();
      if (textoLista.length > 0) {
        resultado.push({
          texto: textoLista,
          posicao: posicaoAcumulada
        });
      }
    }

    // Acumula a posição baseada no texto do elemento + 1 (pela quebra de linha)
    var textoElemento = elemento.asText ? elemento.asText().getText() : '';
    posicaoAcumulada += textoElemento.length + 1;
  }

  return resultado;
}


// =================================================================
// INTERCALAÇÃO: PARÁGRAFOS + COMENTÁRIOS
// =================================================================

/**
 * Monta a tabela final intercalando parágrafos soltos e comentários.
 *
 * Lógica:
 * 1. Para cada comentário, descobre quais parágrafos ele cobre
 * 2. Marca esses parágrafos como "consumidos"
 * 3. Percorre todos os parágrafos na ordem:
 *    - Se consumido: insere o comentário (apenas na primeira aparição)
 *    - Se livre: insere o parágrafo com comentário vazio
 */
function montarTabelaIntercalada(paragrafos, cenasComentadas, textoDoc) {
  // Normalizado para busca
  var textoNorm = textoDoc.replace(/\s+/g, ' ');

  // Mapear cada comentário aos parágrafos que ele cobre
  var consumidos = {}; // índice do parágrafo → índice do comentário
  var comentarioInfo = []; // dados finais do comentário com posição

  for (var c = 0; c < cenasComentadas.length; c++) {
    var cena = cenasComentadas[c];
    var cenaNorm = cena.textoRoteiro.replace(/\s+/g, ' ');
    var posNoDoc = textoNorm.indexOf(cenaNorm.substring(0, Math.min(60, cenaNorm.length)));

    comentarioInfo.push({
      textoRoteiro: cena.textoRoteiro,
      textoComentario: cena.textoComentario,
      posNoDoc: posNoDoc !== -1 ? posNoDoc : 999999
    });

    // Verificar quais parágrafos estão contidos dentro desse comentário
    for (var p = 0; p < paragrafos.length; p++) {
      var parNorm = paragrafos[p].texto.replace(/\s+/g, ' ');
      // Um parágrafo é "coberto" se seu texto inteiro aparece dentro do texto do comentário
      if (cenaNorm.indexOf(parNorm) !== -1 || cenaNorm.indexOf(parNorm.substring(0, 40)) !== -1) {
        if (!consumidos[p]) {
          consumidos[p] = c; // marca com o índice do comentário
        }
      }
    }
  }

  // Montar a tabela final na ordem dos parágrafos
  var linhas = [];
  var comentariosJaInseridos = {};

  for (var i = 0; i < paragrafos.length; i++) {
    if (consumidos[i] !== undefined) {
      var idxComentario = consumidos[i];

      // Inserir o comentário apenas uma vez (no primeiro parágrafo que ele cobre)
      if (!comentariosJaInseridos[idxComentario]) {
        comentariosJaInseridos[idxComentario] = true;
        linhas.push({
          roteiro: comentarioInfo[idxComentario].textoRoteiro,
          comentario: comentarioInfo[idxComentario].textoComentario
        });
      }
      // Se já inserido, pula (o parágrafo já faz parte do bloco do comentário)

    } else {
      // Parágrafo solto (título, transição, etc.) — sem comentário
      linhas.push({
        roteiro: paragrafos[i].texto,
        comentario: ''
      });
    }
  }

  return linhas;
}


// =================================================================
// RECUPERAÇÃO DE TRUNCAMENTO
// =================================================================

function recuperarTruncamento(textoAPI, textoDoc) {
  if (!textoAPI || textoAPI.length < 30) return textoAPI;

  var pedacoFinal = textoAPI.substring(Math.max(0, textoAPI.length - 40));
  var posicaoFinal = textoDoc.indexOf(pedacoFinal);
  if (posicaoFinal === -1) {
    pedacoFinal = textoAPI.substring(Math.max(0, textoAPI.length - 20));
    posicaoFinal = textoDoc.indexOf(pedacoFinal);
    if (posicaoFinal === -1) return textoAPI;
  }

  var fimDoTextoAPI = posicaoFinal + pedacoFinal.length;
  if (fimDoTextoAPI >= textoDoc.length) return textoAPI;

  var proximoChar = textoDoc.charAt(fimDoTextoAPI);
  if (proximoChar === '\n') return textoAPI;

  var fimParagrafo = textoDoc.indexOf('\n', fimDoTextoAPI);
  if (fimParagrafo === -1) fimParagrafo = textoDoc.length;

  return textoAPI + textoDoc.substring(fimDoTextoAPI, fimParagrafo);
}


// =================================================================
// UTILITÁRIOS
// =================================================================

function buscarComentarios(docId) {
  var todos = [];
  var pageToken = null;
  do {
    var p = { fields: 'comments(id,content,quotedFileContent,resolved,createdTime,author(displayName)),nextPageToken', pageSize: 100 };
    if (pageToken) p.pageToken = pageToken;
    var r = Drive.Comments.list(docId, p);
    todos = todos.concat(r.comments || []);
    pageToken = r.nextPageToken || null;
  } while (pageToken);
  return todos;
}

function decodificar(texto) {
  if (!texto) return '';
  var r = texto.replace(/&#(\d+);/g, function(_, d) { return String.fromCharCode(+d); });
  r = r.replace(/&#x([0-9a-fA-F]+);/g, function(_, h) { return String.fromCharCode(parseInt(h, 16)); });
  var m = {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '};
  r = r.replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, function(x) { return m[x.toLowerCase()] || x; });
  r = r.replace(/\u000b/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Limpeza de prefixos estruturais
  r = r.replace(/^NARRA\S*O\s*:\s*/i, '');
  r = r.replace(/^"+/, '').replace(/"+$/, '');
  r = r.replace(/^\u201c/, '').replace(/\u201d$/, '');

  return r.trim();
}

function escreverNaPlanilha(planilha, linhas) {
  var aba = planilha.getSheets()[0];
  aba.setName('Cenas');

  // Cabeçalho: Ordem | Roteiro | Comentário | Tag | Status | OBS
  var h = ['Ordem', 'Roteiro', 'Comentário', 'Tag', 'Status', 'OBS'];
  aba.getRange(1, 1, 1, h.length).setValues([h])
     .setFontWeight('bold').setBackground('#333333').setFontColor('#FFFFFF');
  aba.setFrozenRows(1);
  aba.setColumnWidth(1, 70);
  aba.setColumnWidth(2, 500);
  aba.setColumnWidth(3, 500);
  aba.setColumnWidth(4, 120);
  aba.setColumnWidth(5, 110);
  aba.setColumnWidth(6, 200);

  // Dados
  var dados = linhas.map(function(l, i) {
    return [i + 1, l.roteiro, l.comentario, '', 'Aberto', ''];
  });

  if (dados.length > 0) {
    aba.getRange(2, 1, dados.length, h.length).setValues(dados);
    aba.getRange(2, 2, dados.length, 2).setWrap(true).setVerticalAlignment('top');
    aba.getRange(2, 1, dados.length, 1).setHorizontalAlignment('center').setVerticalAlignment('middle');
    aba.getRange(2, 5, dados.length, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Aberto', 'Layout', 'Animação', 'Concluído', 'Cancelado'], true).build()
    );
  }
}
