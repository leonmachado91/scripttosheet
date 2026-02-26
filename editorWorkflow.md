O trabalho consiste na edição de documentarios e videos curtos pras redes sociais. Geralmente o material que os editores recebem é um Google Doc contendo o roteiro e curadoria.

O roteiro é o corpo do texto, geralmente escrito com tom de narração e separado em capitulos devido ao tamanho dos documentários (40min - 1h30min).

O narrador lê o corpo do texto da forma que ele ta lá.

Já a curadoria que são as ideias que o roteirista pensou pra cada trecho do roteiro, ficam em formato de comentários linkados aos trechos em que eles devem aparecer. Nos comentarios o roteirista coloca as instruções visuais, links de imagens, videos (com minutagem de inicio e fim) e materias que devem ser usados quando narrado o trecho correspondente, bem como instruções em texto de como deve ser exibido, ideias e tudo mais.

O editor trabalha decupando a narração feita em video e depois fica com o roteiro aberto pra consulta, criando cena por cena de acordo com os comentarios. Ou seja, cada comentario vira uma cena do documentário que é exibida junto ao trecho correspondente. Exemplo de trecho:

## Roteiro:

> Isso era a fábrica farmacêutica Al-Shifa, em Cartum, capital do Sudão. Era o maior complexo do tipo no país, empregando mais de 300 pessoas e produzindo remédios essenciais para humanos e animais. Mas em 20 de agosto de 1998, tudo mudou. Em um instante, a fábrica foi reduzida a escombros.

## Comentário

> Pegar o trecho inicial do vídeo abaixo onde mostra os medicamentos "girando":   
>   
> [https://www.instagram.com/reel/DNlTM2NiAji/](https://www.instagram.com/reel/DNlTM2NiAji/)

O Google Doc do roteiro geralmente fica publico pra consulta dos envolvidos.

Dois editores trabalham nele, o designer trabalha nos layouts de cada cena, lendo o roteiro e os comentarios e criando a parte visual, montando as cenas. O segundo editor recolhe as cenas pra transformar em videos, animando com tecnocas de motion design, AI ou tambem montagem simples.

Esses 2 editores precisam está alinhados, o editor dos layouts entrega as cenas com nomeclatura correspondente aos comentarios e as vezes junta varios comentarios em apenas 1 cena, ele transfere via .psd pro outro editor que abre no after pra animar.

Conforme as cenas sao feitas, é ideal que atualizemos os status de cada cena, mas isso nao é intuitivo no Google Docs, sendo necessario as vezes a conversao pra outro app que facilite esse processo e é aqui que surge a necessidade de converter o Doc pra Sheet.

\---

## Google App Script

É possível usar esse recurso do google pra fazer essa conversão, a ideia é criar uma planilha de cenas pra facilitar o workflow dos editores, convertendo o Google Doc consolidade para uma tabela com as informações ja contidas nela e adições essenciais pra o trabalho do editor e a colaboração.

<table><tbody><tr><td>Ordem</td><td>Roteiro</td><td>Comentário</td><td>Status</td><td>OBS</td></tr><tr><td>1</td><td>Isso era a fábrica farmacêutica Al-Shifa, em Cartum, capital do Sudão. Era o maior complexo do tipo no país, empregando mais de 300 pessoas e produzindo remédios essenciais para humanos e animais. Mas em 20 de agosto de 1998, tudo mudou. Em um instante, a fábrica foi reduzida a escombros.</td><td>Pegar o trecho inicial do vídeo abaixo onde mostra os medicamentos "girando":&nbsp;<br><br><a href="https://www.google.com/url?q=https://www.instagram.com/reel/DNlTM2NiAji/&amp;sa=D&amp;source=docs&amp;ust=1772035498152715&amp;usg=AOvVaw3aTYTmPW8M_jDsWXYNOIxp">https://www.instagram.com/reel/DNlTM2NiAji/</a></td><td>Layout</td><td>&nbsp;</td></tr><tr><td>2</td><td>O ataque foi executado pelos Estados Unidos. A justificativa do governo do presidente Bill Clinton foi uma velha conhecida: a fábrica estaria secretamente produzindo o agente neurotóxico VX, uma arma química mortal, e teria ligações com a Al-Qaeda e Osama bin Laden. O bombardeio foi parte da Operação 'Infinite Reach', uma retaliação aos atentados terroristas contra as embaixadas americanas no Quênia e na Tanzânia, ocorridos apenas 13 dias antes.</td><td>tilizar imagens dos mísseis atingindo o complexo:<br><br><a href="https://www.google.com/url?q=https://www.instagram.com/reel/DNlTM2NiAji/&amp;sa=D&amp;source=docs&amp;ust=1772035498154972&amp;usg=AOvVaw01uJF3nT2_LrXLiD6oUbDp">https://www.instagram.com/reel/DNlTM2NiAji/</a><br><br>Após, utilizar as seguintes manchetes:<br><br><a href="https://www.google.com/url?q=https://web.archive.org/web/20220220192728/https://www.focus.de/magazin/archiv/usa-zerstoerten-pharmafirma-sudan_id_1907963.html&amp;sa=D&amp;source=docs&amp;ust=1772035498155043&amp;usg=AOvVaw1OHKxdAPxDSyGmbB6CmwUX">https://web.archive.org/web/20220220192728/https://www.focus.de/magazin/archiv/usa-zerstoerten-pharmafirma-sudan_id_1907963.html</a><br><br><a href="https://www.google.com/url?q=http://news.bbc.co.uk/2/hi/155526.stm&amp;sa=D&amp;source=docs&amp;ust=1772035498155071&amp;usg=AOvVaw11vp2cWcR9VneJuAV2O1lu">http://news.bbc.co.uk/2/hi/155526.stm</a></td><td>Animação</td><td>&nbsp;</td></tr></tbody></table>

A ideia é usar a API do Drive pra coletar todas as informações necessarias do doc e organiza-las de forma correta na planilha. Cada comentário do Google Doc se transforma em 1 linha na tabela, na coluna Roteiro é inserido o trecho que o comentario marca, mesmo que seja um trecho longo com varios paragrafos e tal, se ha 2 comentarios no mesmo trecho, o script deve conseguir cortar o inicio e fim perfeito que cada comentario marca no texto.

Esse script será criado e jogado no meu drive e será rodado de forma externa através do link de deploy que chama ele.

## Gestão em um webapp

Tudo isso será gerido através de um aplicativo que vamos criar que é um front-end que exibe a planilha correspondente.

### Indice

Existe uma planilha mae que é o indice, ela contem uma lista de projetos que sao cada video que a equipe trabalhou ou está trabalhando. O app exibe isso na sidebar e é possivel criar um novo através dele.

Ao criar um novo o editor insere o link do Doc no app e ativa o script que cria a Shotlist com as cenas e após concluido exibe na tabela do app.

\---

O app é capaz de consultar a planilha e fazer todas as modificações, criar novas linhas, excluir, modificar, tudo através do app script do google. Assim falicita muitas etapas de autenticação e tal e o processo se torna bem simples.