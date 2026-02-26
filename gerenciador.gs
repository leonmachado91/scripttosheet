/**
 * GERENCIADOR DE PROJETOS — ScriptToSheet
 * ====================================================
 * Backend que gerencia o índice de projetos e operações CRUD nas shotlists.
 * Cada função é exposta ao frontend via google.script.run.
 *
 * CONFIGURAÇÃO:
 * Preencha os 2 IDs abaixo antes de usar.
 */

// ============================================================
// CONFIG — Preencha com seus IDs
// ============================================================
var ID_PLANILHA_INDICE = '1lhe7RHNWB01EGcpoD9NnOUxqedRAozRBYZQDcks2LbY';  // ID da planilha mãe (índice de projetos)
var ID_PASTA_DRIVE = '1y-Ur_c56j-Et0MZsoJS0J-4I5CxzLCmi';      // ID da pasta no Drive onde as shotlists serão criadas

// ============================================================
// WEB APP — API REST (doGet/doPost)
// ============================================================

/**
 * doGet: suporta CORS preflight e health check.
 * O Google Apps Script redireciona automaticamente para o deploy URL,
 * o que resolve o preflight do CORS para o navegador.
 */
function doGet(e) {
  // Health check / CORS preflight
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * doPost: Roteador principal da API.
 * Recebe JSON: { action: "nomeDaFuncao", params: { ... } }
 * Retorna JSON com o resultado ou { erro: "mensagem" }
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var params = body.params || {};
    var resultado;

    switch (action) {
      case 'listarProjetos':
        resultado = listarProjetos();
        break;
      case 'criarProjeto':
        resultado = criarProjeto(params.nome, params.docUrl);
        break;
      case 'excluirProjeto':
        resultado = excluirProjeto(params.linha);
        break;
      case 'importarProjeto':
        resultado = importarProjeto(params.nome, params.sheetUrl);
        break;
      case 'atualizarNomeProjeto':
        resultado = atualizarNomeProjeto(params.linha, params.novoNome);
        break;
      case 'listarCenas':
        resultado = listarCenas(params.sheetId);
        break;
      case 'atualizarCena':
        resultado = atualizarCena(params.sheetId, params.linha, params.campos);
        break;
      case 'adicionarCena':
        resultado = adicionarCena(params.sheetId, params.cena);
        break;
      case 'excluirCena':
        resultado = excluirCena(params.sheetId, params.linha);
        break;
      case 'buscarPreviewLink':
        resultado = buscarPreviewLink_(params.url);
        break;
      default:
        resultado = { erro: 'Ação desconhecida: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ erro: err.message || String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Busca og:title, og:image e og:description de uma URL externa.
 * Retorna { title, image, description } ou null em caso de erro.
 */
function buscarPreviewLink_(url) {
  if (!url) return null;
  try {
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ScriptToSheet/1.0)' },
      validateHttpsCertificates: false
    });

    var statusCode = response.getResponseCode();
    if (statusCode < 200 || statusCode >= 400) return null;

    var html = response.getContentText();
    if (!html) return null;

    // Extrair og:title
    var titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
                  || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
                  || html.match(/<title[^>]*>([^<]+)<\/title>/i);
    var title = titleMatch ? titleMatch[1].trim() : '';

    // Extrair og:image
    var imageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                  || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    var image = imageMatch ? imageMatch[1].trim() : '';

    // Extrair og:description
    var descMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
                 || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)
                 || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    var description = descMatch ? descMatch[1].trim() : '';

    if (!title && !image && !description) return null;

    return { title: title, image: image, description: description };
  } catch (e) {
    Logger.log('buscarPreviewLink_ erro: ' + e.message);
    return null;
  }
}

// ============================================================
// PROJETOS — CRUD no Índice
// ============================================================

/**
 * Lista todos os projetos do índice.
 * Retorna: [{ nome, docUrl, sheetId, data, linha }]
 */
function listarProjetos() {
  var aba = getAbaIndice_();
  var dados = aba.getDataRange().getValues();
  var projetos = [];

  // Pula o header (linha 1)
  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    if (!row[0] && !row[1]) continue; // pula linhas vazias

    projetos.push({
      nome: row[0] || '',
      docUrl: row[1] || '',
      sheetId: row[2] || '',
      data: row[3] ? Utilities.formatDate(new Date(row[3]), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '',
      linha: i + 1 // posição real na planilha (1-indexed, incluindo header)
    });
  }

  return projetos;
}

/**
 * Cria um novo projeto: insere no índice + extrai cenas do Doc → gera Shotlist.
 * @param {string} nome - Nome do projeto
 * @param {string} docUrl - URL do Google Doc com o roteiro
 * @returns {{ nome, sheetId, sheetUrl }}
 */
function criarProjeto(nome, docUrl) {
  // 1. Extrair o ID do documento da URL
  var docId = extrairIdDaUrl_(docUrl);
  if (!docId) throw new Error('URL do documento inválida.');

  // 2. Extrair cenas usando o motor existente
  var cenas = extrairCenasCompletas(docId);

  // 3. Criar a planilha da shotlist dentro da pasta do projeto
  var novaPlanilha = SpreadsheetApp.create('Shotlist — ' + nome);
  var novoId = novaPlanilha.getId();

  // Mover pra pasta correta
  if (ID_PASTA_DRIVE) {
    var arquivo = DriveApp.getFileById(novoId);
    var pasta = DriveApp.getFolderById(ID_PASTA_DRIVE);
    pasta.addFile(arquivo);
    // Remove da raiz do Drive
    DriveApp.getRootFolder().removeFile(arquivo);
  }

  // 4. Escrever as cenas na shotlist
  escreverShotlist_(novaPlanilha, cenas);

  // 5. Inserir no índice
  var aba = getAbaIndice_();
  aba.appendRow([nome, docUrl, novoId, new Date()]);

  return {
    nome: nome,
    sheetId: novoId,
    sheetUrl: novaPlanilha.getUrl()
  };
}

/**
 * Importa uma planilha existente como projeto (sem extração do Doc).
 * @param {string} nome - Nome do projeto
 * @param {string} sheetUrl - URL da Google Sheets existente
 * @returns {{ nome, sheetId, sheetUrl }}
 */
function importarProjeto(nome, sheetUrl) {
  var sheetId = extrairIdDaUrl_(sheetUrl);
  if (!sheetId) throw new Error('URL da planilha inválida.');

  // Validar que a planilha existe e é acessível
  var planilha;
  try {
    planilha = SpreadsheetApp.openById(sheetId);
  } catch (e) {
    throw new Error('Não foi possível acessar a planilha. Verifique as permissões.');
  }

  // Registrar no índice
  var aba = getAbaIndice_();
  aba.appendRow([nome, sheetUrl, sheetId, new Date()]);

  return {
    nome: nome,
    sheetId: sheetId,
    sheetUrl: planilha.getUrl()
  };
}

/**
 * Exclui um projeto: remove do índice e deleta a planilha da shotlist.
 * @param {number} linha - Número da linha no índice (1-indexed)
 */
function excluirProjeto(linha) {
  var aba = getAbaIndice_();
  var dados = aba.getRange(linha, 1, 1, 4).getValues()[0];
  var sheetId = dados[2];

  // Deletar a planilha da shotlist
  if (sheetId) {
    try {
      DriveApp.getFileById(sheetId).setTrashed(true);
    } catch (e) {
      Logger.log('Shotlist não encontrada pra deletar: ' + sheetId);
    }
  }

  // Remover linha do índice
  aba.deleteRow(linha);
  return { sucesso: true };
}

/**
 * Atualiza o nome de um projeto no índice.
 * @param {number} linha - Número da linha
 * @param {string} novoNome - Novo nome
 */
function atualizarNomeProjeto(linha, novoNome) {
  var aba = getAbaIndice_();
  aba.getRange(linha, 1).setValue(novoNome);
  return { sucesso: true };
}

// ============================================================
// CENAS — CRUD na Shotlist (detecção dinâmica de colunas)
// ============================================================

/**
 * Mapa de aliases para campos conhecidos (case/accent insensitive).
 * Cada chave é o nome interno, cada valor é uma lista de nomes aceitáveis.
 */
var CAMPO_ALIASES = {
  ordem:      ['ordem', 'order', '#', 'nº', 'cena', 'scene'],
  roteiro:    ['roteiro', 'script', 'texto', 'text'],
  comentario: ['comentario', 'comentário', 'comment', 'comments', 'direção', 'direcao'],
  tag:        ['tag', 'tags', 'labels', 'categorias'],
  status:     ['status', 'estado', 'state'],
  obs:        ['obs', 'observação', 'observacao', 'notes', 'notas', 'nota']
};

/**
 * Lê a linha de cabeçalho e retorna um mapa de colunas.
 * @param {Array} headerRow - Array de valores do header
 * @returns {{ known: {campo: colIndex}, extras: [{name, colIndex}] }}
 */
function mapearColunas_(headerRow) {
  var known = {};
  var extras = [];

  for (var col = 0; col < headerRow.length; col++) {
    var titulo = String(headerRow[col] || '').trim();
    if (!titulo) continue;

    var tituloNorm = titulo.toLowerCase()
      .replace(/[áàâã]/g, 'a')
      .replace(/[éèê]/g, 'e')
      .replace(/[íìî]/g, 'i')
      .replace(/[óòôõ]/g, 'o')
      .replace(/[úùû]/g, 'u')
      .replace(/[ç]/g, 'c');

    var matched = false;
    for (var campo in CAMPO_ALIASES) {
      var aliases = CAMPO_ALIASES[campo];
      for (var a = 0; a < aliases.length; a++) {
        if (tituloNorm === aliases[a]) {
          known[campo] = col;
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched) {
      extras.push({ name: titulo, colIndex: col });
    }
  }

  return { known: known, extras: extras };
}

/**
 * Lista todas as cenas de um projeto (detecção por cabeçalho).
 * @param {string} sheetId - ID da planilha da shotlist
 * @returns {Object} { cenas: [...], extraColumns: [nome1, nome2, ...] }
 */
function listarCenas(sheetId) {
  var planilha = SpreadsheetApp.openById(sheetId);
  var aba = planilha.getSheets()[0];
  var dados = aba.getDataRange().getValues();
  if (dados.length === 0) return { cenas: [], extraColumns: [] };

  var mapa = mapearColunas_(dados[0]);
  var k = mapa.known;
  var cenas = [];

  for (var i = 1; i < dados.length; i++) {
    var row = dados[i];
    // Pular linhas completamente vazias
    var vazia = true;
    for (var c = 0; c < row.length; c++) { if (row[c]) { vazia = false; break; } }
    if (vazia) continue;

    var cena = {
      ordem: k.ordem !== undefined ? row[k.ordem] : i,
      roteiro: k.roteiro !== undefined ? (row[k.roteiro] || '') : '',
      comentario: k.comentario !== undefined ? (row[k.comentario] || '') : '',
      tag: k.tag !== undefined ? (row[k.tag] || '') : '',
      status: k.status !== undefined ? (row[k.status] || 'Aberto') : 'Aberto',
      obs: k.obs !== undefined ? (row[k.obs] || '') : '',
      linha: i + 1,
      extras: {}
    };

    for (var e = 0; e < mapa.extras.length; e++) {
      var extra = mapa.extras[e];
      cena.extras[extra.name] = row[extra.colIndex] || '';
    }

    cenas.push(cena);
  }

  return {
    cenas: cenas,
    extraColumns: mapa.extras.map(function(e) { return e.name; })
  };
}

/**
 * Atualiza campos de uma cena (detecção por cabeçalho).
 */
function atualizarCena(sheetId, linha, campos) {
  var planilha = SpreadsheetApp.openById(sheetId);
  var aba = planilha.getSheets()[0];
  var header = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var mapa = mapearColunas_(header);
  var k = mapa.known;

  // Campos conhecidos
  if (campos.roteiro !== undefined && k.roteiro !== undefined) aba.getRange(linha, k.roteiro + 1).setValue(campos.roteiro);
  if (campos.comentario !== undefined && k.comentario !== undefined) aba.getRange(linha, k.comentario + 1).setValue(campos.comentario);
  if (campos.tag !== undefined && k.tag !== undefined) aba.getRange(linha, k.tag + 1).setValue(campos.tag);
  if (campos.status !== undefined && k.status !== undefined) aba.getRange(linha, k.status + 1).setValue(campos.status);
  if (campos.obs !== undefined && k.obs !== undefined) aba.getRange(linha, k.obs + 1).setValue(campos.obs);

  // Campos extras
  if (campos.extras) {
    for (var e = 0; e < mapa.extras.length; e++) {
      var ex = mapa.extras[e];
      if (campos.extras[ex.name] !== undefined) {
        aba.getRange(linha, ex.colIndex + 1).setValue(campos.extras[ex.name]);
      }
    }
  }

  return { sucesso: true };
}

/**
 * Adiciona uma nova cena na shotlist (detecção por cabeçalho).
 */
function adicionarCena(sheetId, cena) {
  var planilha = SpreadsheetApp.openById(sheetId);
  var aba = planilha.getSheets()[0];
  var header = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var mapa = mapearColunas_(header);
  var k = mapa.known;
  var ultimaLinha = aba.getLastRow();
  var novaOrdem = ultimaLinha;

  var novaRow = new Array(header.length).join('.').split('.'); // array of empty strings
  if (k.ordem !== undefined) novaRow[k.ordem] = novaOrdem;
  if (k.roteiro !== undefined) novaRow[k.roteiro] = cena.roteiro || '';
  if (k.comentario !== undefined) novaRow[k.comentario] = cena.comentario || '';
  if (k.tag !== undefined) novaRow[k.tag] = cena.tag || '';
  if (k.status !== undefined) novaRow[k.status] = cena.status || 'Aberto';
  if (k.obs !== undefined) novaRow[k.obs] = cena.obs || '';

  aba.appendRow(novaRow);

  // Aplicar data validation no Status se existir
  if (k.status !== undefined) {
    aba.getRange(ultimaLinha + 1, k.status + 1).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(['Aberto', 'Layout', 'Animação', 'Concluído', 'Cancelado'], true)
        .build()
    );
  }

  return { sucesso: true, ordem: novaOrdem };
}

/**
 * Exclui uma cena e reordena as restantes.
 */
function excluirCena(sheetId, linha) {
  var planilha = SpreadsheetApp.openById(sheetId);
  var aba = planilha.getSheets()[0];
  var header = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var mapa = mapearColunas_(header);
  var k = mapa.known;

  aba.deleteRow(linha);

  // Reordenar a coluna Ordem se existir
  if (k.ordem !== undefined) {
    var totalLinhas = aba.getLastRow() - 1;
    if (totalLinhas > 0) {
      var ordens = [];
      for (var i = 0; i < totalLinhas; i++) {
        ordens.push([i + 1]);
      }
      aba.getRange(2, k.ordem + 1, totalLinhas, 1).setValues(ordens);
    }
  }

  return { sucesso: true };
}


// ============================================================
// MOTOR DE EXTRAÇÃO (refatorado do extrator_teste_standalone.gs)
// ============================================================

/**
 * Extrai todas as cenas de um Google Doc (comentários + texto integral).
 * @param {string} docId
 * @returns {Array} [{ roteiro, comentario }]
 */
function extrairCenasCompletas(docId) {
  var doc = DocumentApp.openById(docId);
  var body = doc.getBody();
  var textoDoc = body.getText().replace(/\u000b/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  var paragrafos = extrairParagrafos_(body);

  var comentarios = buscarComentarios_(docId);
  var ativos = comentarios.filter(function(c) {
    return !c.resolved && c.quotedFileContent && c.quotedFileContent.value;
  });

  var cenasComentadas = ativos.map(function(c) {
    var textoAPI = decodificar_(c.quotedFileContent.value);
    var textoCompleto = recuperarTruncamento_(textoAPI, textoDoc);
    return {
      textoRoteiro: textoCompleto,
      textoComentario: c.content || '',
      criadoEm: new Date(c.createdTime).getTime()
    };
  });

  return montarTabelaIntercalada_(paragrafos, cenasComentadas, textoDoc);
}


// ============================================================
// FUNÇÕES INTERNAS (privadas, sufixo _)
// ============================================================

function getAbaIndice_() {
  var planilha = SpreadsheetApp.openById(ID_PLANILHA_INDICE);
  return planilha.getSheets()[0];
}

function extrairIdDaUrl_(url) {
  var match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function extrairParagrafos_(body) {
  var resultado = [];
  var numFilhos = body.getNumChildren();
  var posicaoAcumulada = 0;

  for (var i = 0; i < numFilhos; i++) {
    var elemento = body.getChild(i);
    if (elemento.getType() === DocumentApp.ElementType.PARAGRAPH ||
        elemento.getType() === DocumentApp.ElementType.LIST_ITEM) {
      var texto = elemento.asText().getText().trim();
      if (texto.length > 0) {
        resultado.push({ texto: texto, posicao: posicaoAcumulada });
      }
    }
    var textoElemento = elemento.asText ? elemento.asText().getText() : '';
    posicaoAcumulada += textoElemento.length + 1;
  }
  return resultado;
}

function montarTabelaIntercalada_(paragrafos, cenasComentadas, textoDoc) {
  var textoNorm = textoDoc.replace(/\s+/g, ' ');
  var consumidos = {};
  var comentarioInfo = [];

  for (var c = 0; c < cenasComentadas.length; c++) {
    var cena = cenasComentadas[c];
    var cenaNorm = cena.textoRoteiro.replace(/\s+/g, ' ');
    var posNoDoc = textoNorm.indexOf(cenaNorm.substring(0, Math.min(60, cenaNorm.length)));

    comentarioInfo.push({
      textoRoteiro: cena.textoRoteiro,
      textoComentario: cena.textoComentario,
      posNoDoc: posNoDoc !== -1 ? posNoDoc : 999999
    });

    for (var p = 0; p < paragrafos.length; p++) {
      var parNorm = paragrafos[p].texto.replace(/\s+/g, ' ');
      if (cenaNorm.indexOf(parNorm) !== -1 || cenaNorm.indexOf(parNorm.substring(0, 40)) !== -1) {
        if (!consumidos[p]) consumidos[p] = c;
      }
    }
  }

  var linhas = [];
  var jaInseridos = {};

  for (var i = 0; i < paragrafos.length; i++) {
    if (consumidos[i] !== undefined) {
      var idx = consumidos[i];
      if (!jaInseridos[idx]) {
        jaInseridos[idx] = true;
        linhas.push({
          roteiro: comentarioInfo[idx].textoRoteiro,
          comentario: comentarioInfo[idx].textoComentario
        });
      }
    } else {
      linhas.push({ roteiro: paragrafos[i].texto, comentario: '' });
    }
  }
  return linhas;
}

function recuperarTruncamento_(textoAPI, textoDoc) {
  if (!textoAPI || textoAPI.length < 30) return textoAPI;
  var pedacoFinal = textoAPI.substring(Math.max(0, textoAPI.length - 40));
  var posicaoFinal = textoDoc.indexOf(pedacoFinal);
  if (posicaoFinal === -1) {
    pedacoFinal = textoAPI.substring(Math.max(0, textoAPI.length - 20));
    posicaoFinal = textoDoc.indexOf(pedacoFinal);
    if (posicaoFinal === -1) return textoAPI;
  }
  var fim = posicaoFinal + pedacoFinal.length;
  if (fim >= textoDoc.length) return textoAPI;
  if (textoDoc.charAt(fim) === '\n') return textoAPI;
  var fimParagrafo = textoDoc.indexOf('\n', fim);
  if (fimParagrafo === -1) fimParagrafo = textoDoc.length;
  return textoAPI + textoDoc.substring(fim, fimParagrafo);
}

function buscarComentarios_(docId) {
  var todos = [];
  var pageToken = null;
  do {
    var p = {
      fields: 'comments(id,content,quotedFileContent,resolved,createdTime,author(displayName)),nextPageToken',
      pageSize: 100
    };
    if (pageToken) p.pageToken = pageToken;
    var r = Drive.Comments.list(docId, p);
    todos = todos.concat(r.comments || []);
    pageToken = r.nextPageToken || null;
  } while (pageToken);
  return todos;
}

function decodificar_(texto) {
  if (!texto) return '';
  var r = texto.replace(/&#(\d+);/g, function(_, d) { return String.fromCharCode(+d); });
  r = r.replace(/&#x([0-9a-fA-F]+);/g, function(_, h) { return String.fromCharCode(parseInt(h, 16)); });
  var m = {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '};
  r = r.replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, function(x) { return m[x.toLowerCase()] || x; });
  r = r.replace(/\u000b/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  r = r.replace(/^NARRA\S*O\s*:\s*/i, '');
  r = r.replace(/^"+/, '').replace(/"+$/, '');
  r = r.replace(/^\u201c/, '').replace(/\u201d$/, '');
  return r.trim();
}

function escreverShotlist_(planilha, cenas) {
  var aba = planilha.getSheets()[0];
  aba.setName('Cenas');

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

  var dados = cenas.map(function(c, i) {
    return [i + 1, c.roteiro, c.comentario, '', 'Aberto', ''];
  });

  if (dados.length > 0) {
    aba.getRange(2, 1, dados.length, h.length).setValues(dados);
    aba.getRange(2, 2, dados.length, 2).setWrap(true).setVerticalAlignment('top');
    aba.getRange(2, 1, dados.length, 1).setHorizontalAlignment('center').setVerticalAlignment('middle');
    aba.getRange(2, 5, dados.length, 1).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(['Aberto', 'Layout', 'Animação', 'Concluído', 'Cancelado'], true)
        .build()
    );
  }
}
