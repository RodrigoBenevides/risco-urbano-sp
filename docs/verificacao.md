# Verificação da entrega

Ensaios locais em Windows 11, Java 21 e Node 24. O Android do ensaio é um dispositivo virtual AOSP API 33 x86_64. Os resultados dependem desta máquina, da carga concorrente e da versão do aplicativo.

## Execução seguindo o README

Um clone local limpo da revisão `335dbe759a8710a43b1809c7fcf02cdbc078fb53` passou pelo Maven Wrapper (`clean verify`, 29/29), `npm ci`, TypeScript, ESLint, Jest (21/21 em cinco suítes), checagem de compatibilidade do Expo e exportação do bundle Android Hermes. O npm auditou 966 pacotes e retornou zero vulnerabilidades nessa verificação. A exportação é uma evidência de empacotamento do JavaScript. A evidência de execução no sistema Android vem do ensaio no AVD.

Os seis comandos do emissor foram repetidos com o JAR do clone em uma porta isolada. A leitura de 4 cm criou o alerta 1, a de 22 cm manteve o mesmo ID e elevou a pontuação de 3 para 7. O relato 8 permaneceu ligado ao alerta 3 após parar e reiniciar a JVM. Seu reenvio retornou HTTP 200 com os mesmos IDs. O Git do clone permaneceu limpo no início e no fim. [Respostas do ensaio do clone](evidencias/api/ensaio-clone.json)

## API e dados

| Requisito | Implementação no projeto | Evidência observada |
| --- | --- | --- |
| Integrar sensores, registros comunitários e dados públicos | Entradas REST, importação NOAA/IBGE na inicialização e transação de persistência | Duas datas oficiais geraram quatro observações históricas. Reimportar preservou a contagem. O emissor e o formulário móvel gravam registros identificáveis. |
| Informar origem e confiança, priorizar alertas | Fonte, instante, confiança e motivo em cada observação. Regra de impacto, atualidade e confirmação em `Prioridade.java` | Na API, duas leituras de 4 e 22 cm compartilharam o alerta 1 e alteraram sua prioridade de baixa (3 pontos) para alta (7 pontos). O histórico oficial retorna sem vínculo a alerta atual. |
| Garantir persistência e repetição segura | H2 em arquivo com sincronização em disco, Flyway, trava da transação e índice único | O teste encerra uma JVM logo após o HTTP 201, inicia outra sobre o mesmo banco e confere o mesmo ID. O teste concorrente envia oito requisições com uma chave e verifica uma única gravação. |
| Proteger os dados pessoais | Campos comunitários estruturados, JSON limitado, SQL parametrizado, API no loopback e escrita de simulação restrita ao perfil local | Suíte HTTP verifica rejeição de campos extras, entradas incorretas e tamanho de carga. O perfil padrão não oferece a rota de simulação. |
| Medir escala de leitura | Índices, seleção da última observação por fonte, filtros e página de até 50 | Com 1.000 episódios artificiais em H2 em memória, 10 leitores × 5 consultas HTTP e três aquecimentos, 50/50 respostas foram corretas. P50 de 97,27 ms, p95 de 144,84 ms e máximo de 151,99 ms. A métrica termina ao receber o corpo da resposta. |

A suíte do backend no commit `59aa52b` passou em **29 testes**. A medição de carga exercitou concorrência de leitura local. A gravação e a recuperação após falha foram verificadas separadamente em arquivo. [Amostras de carga](evidencias/api/carga.csv) · [Plano de consulta do H2](evidencias/api/plano-h2.txt)

## Indicador de qualidade dos alertas

Antes da execução, os casos foram rotulados na tabela que alimenta o teste parametrizado. Há limites das três categorias, sinal antigo, releitura do mesmo sensor, divergência entre sensores, ausência de confirmação e queda da lâmina de água. O teste confere prioridade, pontuação e atividade do episódio.

| Resultado para a classe alta | Contagem |
| --- | ---: |
| Verdadeiros positivos | 8 |
| Falsos positivos | 0 |
| Falsos negativos | 0 |
| Verdadeiros negativos | 13 |

Houve concordância em **21/21 casos**. Precisão e revocação para a prioridade alta foram ambas de **8/8 (100%)** nesta rubrica. A amostra avalia as regras da simulação acadêmica. A capacidade de antecipar ocorrências reais precisaria ser estudada com uma série de eventos observados e rótulos independentes. [Casos de entrada](../backend/src/test/resources/casos-prioridade.csv) · [Classes esperadas e obtidas](evidencias/api/classificacoes.csv)

## Revisão complementar no navegador

Um bundle web do app Expo consultou uma API local sobre banco de ensaio independente. No Chrome, o roteiro verificou filtros com e sem resultado, ID e pontuação no detalhe, histórico com 33,02 mm, validação da duração, revisão e envio de relato de 65 minutos em Moema e abertura do alerta correspondente. Em seguida, a automação interrompeu as consultas HTTP para verificar o estado de desconexão e restabeleceu o acesso. O ensaio Android usa a interrupção do processo real da API.

O navegador não registrou erros de JavaScript durante esse fluxo. As larguras de 320, 390 e 768 px não produziram rolagem horizontal da página. Na amostra de textos do painel, lista, histórico e formulário, a menor relação de contraste, calculada a partir das cores renderizadas dos textos e fundos, foi de 5,45:1. Foram revisadas capturas de painel, detalhe e desconexão.

## Aplicativo e apresentação

No emulador Android 13, o ensaio mediu **20 observações novas detectadas em 20 envios**. Do retorno do POST à leitura do identificador na interface, a mediana foi **3,025 s**, o p95 foi **3,101 s** e o máximo foi **3,110 s**. As amostras são sequenciais e incluem a própria sondagem da árvore Android. [Amostras e durações das sondagens](evidencias/android/atualizacao.json)

O app recuperou a conexão automaticamente em **3/3 reinícios reais**. Após a API responder à verificação de saúde, a detecção na interface levou 4,406 s, 3,108 s e 2,495 s. Em todos os ciclos, os IDs das observações permaneceram iguais. Os limites superiores para a exibição da queda pela árvore Android foram 4,200 s, 4,440 s e 6,933 s. A terceira leitura ultrapassou a meta interna de 6 s por esse método. [Registro dos três ciclos](evidencias/android/ciclos.json)

Em três novos ciclos, uma captura dos pixels do banner pelo ADB detectou a mudança de cor em 2,411 s, 2,648 s e 2,645 s após a parada. O retorno após saúde UP levou 1,388 s, 1,416 s e 1,717 s. A leitura posterior do rótulo confirmou o significado de cada cor. A diferença entre os métodos mostra o custo de aguardar uma árvore de acessibilidade completa.

O ensaio técnico de facilidade de uso concluiu **3/3 tarefas** no dispositivo: abrir o alerta de prioridade alta a partir do aviso em 3,012 s e um toque, consultar uma observação oficial em 6,138 s e um toque, e registrar falta de energia em 17,559 s, com quatro toques, uma rolagem, digitação e retorno do teclado. Os tempos incluem ações e inspeções por ADB. A amostra é um ensaio automatizado do fluxo. Não foram recrutados moradores para um estudo de usabilidade. [Tarefas cronometradas](evidencias/android/tarefas.json)

| Requisito | Onde está | Como conferir |
| --- | --- | --- |
| Painel, lista e navegação | `Painel.tsx`, `Lista.tsx` e `App.tsx` | Abrir um alerta do painel e localizar o mesmo ID na API. Combinar bairro, tipo e prioridade até obter um filtro vazio e desfazê-lo. |
| Fonte e confiança visíveis | Cartão de evidência em `ui.tsx`, tela `Arquivo.tsx` e detalhe | No alerta simulado, ler o motivo da confiança média. No histórico, consultar estação, data do período e informação oficial de Congonhas. |
| Registro comunitário | Formulário e revisão em `Relato.tsx`, armazenamento do rascunho e chave UUID | Digitar a duração com o teclado Android, revisar e enviar. A confirmação associa IDs de observação e alerta. |
| Notificação e abertura do alerta | `notificacoes.ts` e memória de prioridades em `monitor.ts` | O ensaio com permissão recusada gerou aviso interno. Com permissão concedida, a notificação local do alerta 66 apareceu na bandeja. Tocar nela abriu o mesmo alerta no Android. [Bandeja do sistema](evidencias/android/04-notificacao-android.png) |
| Desconexão e disponibilidade | `monitor.ts`, `storage.ts`, rótulo de conexão e hora da última atualização | Na abertura sem servidor nem cache, o app indicou a falta de dados. Após a primeira carga, parar a API conservou a navegação e os dados recebidos. [Abertura sem cache](evidencias/android/01-inicio-sem-cache.png) · [Servidor desconectado](evidencias/android/03-desconectado.png) |
| Código no mesmo repositório, evolução e defesa | `backend/`, `mobile/`, README, guia oral e histórico Git | No clone, usar as instruções do README e repetir o [roteiro](apresentacao.md). O histórico contém incrementos reais de código, dados, teste e revisão no aparelho. |

**App em segundo plano e encerrado.** Durante seis segundos após uma nova leitura em cada condição, o Android não recebeu notificação do novo ID. Ao retornar do HOME e ao reabrir após encerramento forçado, o aplicativo restabeleceu a consulta, identificou a alta e permitiu abrir os alertas 97 e 98. A bandeja recebe notificações locais após uma consulta feita pelo app. Não existe push remoto para um processo encerrado. [Ensaio de ciclo de vida](evidencias/android/ciclo-de-vida.json) · [Permissão e toque na bandeja](evidencias/android/notificacoes.json)

### Como repetir a medição de atualização

Use um banco de demonstração, mantenha o app em primeiro plano e abra o detalhe do alagamento na Vila Mariana. Role até que a evidência mais recente, com o número da observação, esteja na área visível. A partir da raiz, com Python 3 e ADB disponíveis:

```powershell
python scripts/medir-android.py --adb B:\GS2-Android-Tools\platform-tools\adb.exe --serial emulator-5564 --amostras 20 --saida .execucao\atualizacao-repetida.json
```

Cada POST traz uma observação nova. O script inicia um relógio monotônico após ler o recibo e para ao encontrar exatamente aquela observação na hierarquia de acessibilidade Android. O resultado inclui o custo da coleta ADB, IDs, duração das sondagens e tentativas sem leitura. Percentis são calculados sobre observações detectadas, com contagem de perdas à parte. O valor medido é um limite superior para a primeira exibição do dado. Para reproduzir o ensaio de qualidade e carga, execute o Maven Wrapper pelo README. Para a avaliação de uso, siga as tarefas no Android e registre tempo e ações até a confirmação na tela.
