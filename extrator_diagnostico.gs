/**
 * SCRIPT DIAGNÓSTICO DE COMENTÁRIOS DO GOOGLE DOCS
 * 
 * OBJETIVO: Coletar os dados brutos EXATOS que a API do Google Drive (v3) 
 * entrega para os comentários de um documento, permitindo análise profunda 
 * das propriedades (como quotedFileContent, anchor, etc.) antes de criar 
 * a lógica de conversão final para a planilha.
 * 
 * INSTRUÇÕES:
 * 1. Crie um novo projeto no Google Apps Script (script.google.com).
 * 2. Cole este código no arquivo Code.gs.
 * 3. Habilite o Serviço "Drive API" (no menu lateral esquerdo "Serviços" -> +).
 * 4. Substitua "COLOQUE_O_ID_DO_DOC_AQUI" pelo ID do seu documento de teste.
 * 5. Execute a função 'exportarDadosBrutosParaLog'.
 * 6. Copie o resultado do Log de Execução e envie no chat para análise.
 */

function exportarDadosBrutosParaLog() {
  // === CONFIGURAÇÃO ===
  // Pegue o ID do documento na URL: https://docs.google.com/document/d/ID_DO_DOC/edit
  var documentId = 'COLOQUE_O_ID_DO_DOC_AQUI'; 
  
  if (documentId === 'COLOQUE_O_ID_DO_DOC_AQUI') {
    Logger.log("ERRO: Você precisa colocar o ID do seu Google Doc na variável 'documentId'.");
    return;
  }

  try {
    Logger.log("Iniciando coleta na Drive API v3 para o doc: " + documentId);
    
    // Lista os comentários pegando os campos mais detalhados possíveis
    var response = Drive.Comments.list(documentId, {
      fields: "comments(id, author(displayName), content, quotedFileContent, anchor, resolved, createdTime, replies(content))",
      pageSize: 100 // Traz até 100 comentários de uma vez
    });
    
    var comentarios = response.comments;
    
    if (!comentarios || comentarios.length === 0) {
      Logger.log("Nenhum comentário encontrado no documento.");
      return;
    }
    
    Logger.log("Encontrados " + comentarios.length + " comentários.");
    Logger.log("================ DADOS BRUTOS (COPIE ABAIXO) ================\n");
    
    // Imprime o JSON formatado no log para fácil cópia
    var jsonFinal = JSON.stringify(comentarios, null, 2);
    
    // Como o log tem limite de tamanho por linha, vamos quebrar em partes se for muito grande
    var chunks = jsonFinal.match(/[\s\S]{1,5000}/g) || [];
    for (var i = 0; i < chunks.length; i++) {
        Logger.log(chunks[i]);
    }
    
    Logger.log("\n================ FIM DOS DADOS ================");
    Logger.log("Copie o JSON acima e envie no chat para analisarmos a estrutura exata!");
    
  } catch (e) {
    Logger.log("Erro ao acessar a API: " + e.toString());
    Logger.log("Verifique se você habilitou o serviço 'Drive API' no menu lateral.");
  }
}
