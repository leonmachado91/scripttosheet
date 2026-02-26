/**
 * INVESTIGAÇÃO: EXPORTAÇÃO HTML DO GOOGLE DOCS
 * ====================================================
 * Este script exporta o documento como HTML (da mesma forma que o Google faz
 * ao você baixar como "Página Web") e procura como os comentários são 
 * representados no HTML para encontrar o texto COMPLETO coberto por cada um.
 *
 * INSTRUÇÕES:
 * 1. Cole este código.
 * 2. Execute INVESTIGAR_HTML.
 * 3. Copie TODO o log e envie.
 */

var DOC_ID = '1j9YSGLmDRCTejIPgKRe9n6nmxCeKjIJGFqKGEmeew1o';

function INVESTIGAR_HTML() {
  Logger.log('=== INVESTIGAÇÃO HTML ===\n');

  // 1. Exportar o documento como HTML
  var url = 'https://docs.google.com/feeds/download/documents/export/Export?id=' + DOC_ID + '&exportFormat=html';
  var response = UrlFetchApp.fetch(url, {
    headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() }
  });
  var html = response.getContentText();
  Logger.log('HTML obtido. Tamanho total: ' + html.length + ' caracteres.\n');

  // 2. Procurar todas as referências de comentários no HTML
  // O Google Docs exportado coloca links do tipo <a href="#cmnt1">[a]</a> no corpo
  // e o texto do comentário no rodapé com <a href="#cmnt_ref1">[a]</a>
  
  // Vamos encontrar TODOS os padrões "cmnt" no HTML
  var padraoCmnt = /cmnt[\w_]*/g;
  var matches = html.match(padraoCmnt);
  if (matches) {
    // Remove duplicatas
    var unicos = [];
    var visto = {};
    for (var i = 0; i < matches.length; i++) {
      if (!visto[matches[i]]) {
        unicos.push(matches[i]);
        visto[matches[i]] = true;
      }
    }
    Logger.log('IDs de comentário encontrados no HTML: ' + unicos.join(', '));
    Logger.log('Total de IDs únicos: ' + unicos.length + '\n');
  } else {
    Logger.log('NENHUM padrão "cmnt" encontrado no HTML.\n');
  }

  // 3. Extrair o trecho do HTML ao redor de cada referência de comentário
  // Isso nos mostra EXATAMENTE como o Google marca o início e fim do texto comentado
  var refs = html.match(/<a[^>]*cmnt[^>]*>[\s\S]*?<\/a>/g);
  if (refs) {
    Logger.log('Tags <a> com referência a comentários encontradas: ' + refs.length);
    for (var j = 0; j < refs.length; j++) {
      Logger.log('  Tag ' + (j+1) + ': ' + refs[j]);
    }
    Logger.log('');
  }

  // 4. Extrair o HTML ao redor de cada "cmnt_ref" (a marca no CORPO do texto)
  // Mostra o contexto de 200 chars antes e depois da referência
  var indiceCmntRef = -1;
  var contadorRef = 0;
  while (true) {
    indiceCmntRef = html.indexOf('cmnt_ref', indiceCmntRef + 1);
    if (indiceCmntRef === -1) break;
    contadorRef++;
    
    var inicio = Math.max(0, indiceCmntRef - 300);
    var fim = Math.min(html.length, indiceCmntRef + 300);
    var contexto = html.substring(inicio, fim);
    
    Logger.log('--- CONTEXTO cmnt_ref #' + contadorRef + ' (posição ' + indiceCmntRef + ') ---');
    Logger.log(contexto);
    Logger.log('');
  }
  
  if (contadorRef === 0) {
    Logger.log('Nenhum "cmnt_ref" encontrado no corpo do HTML.');
  }

  // 5. Também procurar o rodapé de comentários (onde o Google coloca o texto dos comentários)
  var indiceCmntFooter = html.indexOf('<div><p><a href="#cmnt_ref');
  if (indiceCmntFooter === -1) {
    indiceCmntFooter = html.indexOf('cmnt1');  // Fallback
  }
  if (indiceCmntFooter !== -1) {
    Logger.log('--- RODAPÉ DE COMENTÁRIOS (primeiros 2000 chars) ---');
    Logger.log(html.substring(indiceCmntFooter, Math.min(html.length, indiceCmntFooter + 2000)));
  } else {
    Logger.log('Rodapé de comentários não encontrado no formato esperado.');
  }

  // 6. Se o HTML for menor que 50000, salvar numa planilha pra inspeção visual
  if (html.length < 50000) {
    var ss = SpreadsheetApp.create('HTML_Debug_' + DOC_ID.substring(0, 8));
    var sheet = ss.getSheets()[0];
    // Quebra o HTML em chunks de 50000 chars (limite de célula do Sheets)
    var chunks = html.match(/[\s\S]{1,45000}/g) || [];
    for (var k = 0; k < chunks.length; k++) {
      sheet.getRange(k + 1, 1).setValue(chunks[k]);
    }
    Logger.log('\nHTML completo salvo na planilha para inspeção: ' + ss.getUrl());
  }

  Logger.log('\n=== FIM DA INVESTIGAÇÃO ===');
}
