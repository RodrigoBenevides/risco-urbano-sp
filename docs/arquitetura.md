# Guia para a defesa oral

## Como uma medida chega à tela?

O controlador em `Api.java` recebe o JSON. `Entradas` verifica bairro, tipo, unidade, faixa de medida e horário. `Monitoramento` abre a transação. `Observacoes` usa SQL parametrizado para associar a observação ao episódio de risco e persistir os dois IDs. Depois do retorno da transação, o emissor recebe um recibo. Na próxima consulta, o painel obtém a classificação calculada por `Prioridade`. No Android, `api.ts` verifica o formato do retorno e `monitor.ts` atualiza as telas e a cópia local.

Uma **observação** representa um registro com fonte e horário. Um **alerta** agrupa observações de um episódio do mesmo tipo, bairro e contexto. Os IDs representam coisas diferentes. Por exemplo, duas medições consecutivas do mesmo sensor podem compartilhar o alerta e ter IDs de observação distintos. Cenários simulados e relatos sobre a cidade têm contextos próprios.

## Como explicar uma prioridade em voz alta?

**Gravidade** é o impacto estimado, de 1 a 3. **Confiança** diz o quanto a origem sustenta aquela observação. **Prioridade** define a posição no painel naquele momento. As três aparecem separadamente no detalhe.

| Evidência | Impacto 1 | Impacto 2 | Impacto 3 |
| --- | --- | --- | --- |
| Água sobre a via | Abaixo de 5 cm | De 5 a menos de 20 cm | 20 cm ou mais |
| Temperatura urbana menos referência | Abaixo de 2 °C | De 2 a menos de 4 °C | 4 °C ou mais |
| Duração relatada da falta de energia | Abaixo de 15 min | De 15 a menos de 60 min | 60 min ou mais |

A pontuação vale **duas vezes o impacto**, mais **um ponto de atualidade** nos primeiros 30 minutos e **um ponto de confirmação** quando outro sensor independente sustenta pelo menos aquele impacto no mesmo contexto e dentro de 30 minutos. A última leitura de cada fonte prevalece. De 2 a 4 pontos a prioridade é baixa, de 5 a 6 é média e de 7 a 8 é alta. Um relato comunitário isolado tem teto de prioridade média. O relógio do servidor retira o episódio do painel ativo depois de duas horas sem nova evidência.

Exemplo: 22 cm recém-medidos pelo sensor simulado A geram impacto 3, confiança média e 7 pontos, portanto prioridade alta. Uma falta de energia relatada há 65 minutos também alcança 7 pontos se o relato acabou de ser recebido, mas a fonte isolada tem confiança baixa e o teto deixa a prioridade média. As faixas foram definidas para a demonstração acadêmica. A tabela de 21 cenários em `backend/src/test/resources/casos-prioridade.csv` permite defender o resultado nos limites das faixas.

## Qual é o papel das fontes públicas?

`ImportacaoPublica` confere a localidade do IBGE e lê o recorte da NOAA distribuído no JAR. Os campos meteorológicos se referem a dias de 2025. O histórico conserva o valor convertido, a descrição da unidade original, o atributo de qualidade aplicável, a fonte e a data observada. A importação usa chaves estáveis e pode rodar novamente no startup. Esses registros não criam alertas atuais. Para um sinal de ilha de calor, o simulador usa duas temperaturas com diferença temporal de até cinco minutos.

## O que acontece se o celular repetir o envio?

O app gera uma chave UUID por envio. A API usa uma restrição de unicidade e verifica a assinatura do conteúdo dentro da transação. Mesma chave e mesmo conteúdo retornam o recibo original. Reutilizar a chave com conteúdo diferente retorna conflito. Esse comportamento cobre o caso em que a gravação termina e a resposta se perde no caminho. A preferência por uma trava curta no banco simplifica a consistência do trabalho acadêmico e limita a concorrência de gravação.

## Como o app percebe a queda?

Em primeiro plano, o controlador agenda a próxima consulta três segundos após terminar a anterior. Cada requisição tem timeout de dois segundos. Falha de transporte, resposta de serviço inválida e erro HTTP têm estados próprios. A cópia do último painel mantém os últimos dados e seu horário. A volta da API aciona a atualização no próximo ciclo. A primeira carga estabelece a referência das prioridades. O app guarda a memória de alertas altos para evitar repetir os mesmos avisos após reconectar.

## Até onde essa arquitetura atende?

Flyway versiona o esquema. O H2 persiste em arquivo com uma JVM escritora. Índices reduzem o recorte candidato e a consulta do painel seleciona a última observação por fonte. O serviço calcula a prioridade no instante da leitura e ordena os candidatos em memória antes de paginar. O histórico público é paginado no banco. O detalhe traz o histórico do episódio. Um episódio com muitas leituras pode exigir paginação específica do detalhe em uma expansão.

O ensaio com 1.000 grupos artificiais mede leitura concorrente local. Para múltiplas instâncias de escrita, seria necessário adotar um banco compartilhado, rever a estratégia de agrupamento e medir novamente. A demonstração usa loopback, uma rota de simulação habilitada pelo perfil `demo`, limites de corpo JSON, consultas parametrizadas e campos comunitários estruturados. A API não coleta identidade ou endereço preciso dos moradores. Uma implantação pública precisaria incluir controles operacionais de autenticação, acesso e transporte.
