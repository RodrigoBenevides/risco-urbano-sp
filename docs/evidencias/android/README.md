# Validação do aplicativo em Android

Em 18 de novembro de 2026, o aplicativo rodou no Android 13 (API 33, AOSP x86_64), com Expo Go 57.0.9, tela de 720 × 1.280 px e densidade de 320 dpi. O emulador 37.2.13 iniciou com WHPX. O Metro serviu o bundle local e a API Spring Boot usou o perfil `demo` com H2 em arquivo exclusivo de QA. Os IDs deste relatório pertencem a esse banco.

## Atualização e reconexão

A sonda [medir-android.py](../../../scripts/medir-android.py) iniciou o relógio monotônico do Windows ao receber a resposta de cada POST. No Android, manteve aberto o detalhe do alagamento de Vila Mariana, com a primeira evidência visível. O cronômetro parou quando a árvore da interface apresentou a nova observação com ID exato e área visível positiva. O tempo inclui a leitura da árvore por ADB. As inserções foram sequenciais, no mesmo emulador, com rede local.

| Série | Observações exibidas | Mediana | p95 | Máximo |
| --- | ---: | ---: | ---: | ---: |
| [Primeira medição](atualizacao.json) | 20/20 | 3.025 ms | 3.101 ms | 3.110 ms |
| [Medição final após confirmar o botão de 48 dp](atualizacao-final.json) | 20/20 | 3.040,5 ms | 3.145 ms | 3.171 ms |

As observações #258 a #277 pertenceram ao alerta #1 na série final. Não houve timeout ou erro de leitura. A meta interna de p95 até 6 s foi atingida nas duas séries. O resultado vale para este percurso local, com um cliente em primeiro plano.

Em três ciclos, a JVM foi encerrada e reiniciada com o mesmo arquivo H2. A primeira coluna de cada método começa no término da JVM. A segunda começa quando a API volta a responder `UP`. A contraprova usou três novas quedas e seis transições visuais, sondando a cor do banner em capturas PNG e conferindo o texto correspondente em seguida.

| Ciclo | Queda pela árvore | Retorno pela árvore | Queda pela captura | Retorno pela captura |
| --- | ---: | ---: | ---: | ---: |
| 1 | 4.200 ms | 4.406 ms | 2.411 ms | 1.388 ms |
| 2 | 4.440 ms | 3.108 ms | 2.648 ms | 1.416 ms |
| 3 | 6.933 ms | 2.495 ms | 2.645 ms | 1.717 ms |

Uma detecção pela árvore excedeu a meta interna de 6 s. A contraprova teve sondas mais curtas e registrou as três quedas dentro da meta. Os seis retornos ficaram abaixo de 8 s após a API ficar pronta. Nas três execuções com comparação do banco, os cinco alertas e suas cinco observações conservaram os mesmos IDs, incluindo a reabertura do app enquanto a API estava parada. Na partida sem cache, o painel mostrou “Sem dados salvos”. [Ciclos com IDs](ciclos.json) · [Capturas cronometradas](contraprova-banner.json) · [Partida sem cache](01-inicio-sem-cache.png) · [Lista durante a queda](03-desconectado.png)

## Alertas e tarefas

Ao negar a permissão Android, o aviso interno abriu o alerta #65 de alagamento na Saúde e a lista do sistema ficou sem notificação de risco. Ao permitir a emissão, a leitura térmica em Moema gerou a notificação local `alerta-66`. O toque na cortina abriu “Alerta #66”. Em ensaios distintos, com o app em segundo plano e com o processo encerrado, foram feitas novas inserções. Após seis segundos, a bandeja continuava sem a nova notificação. Ao voltar para o app, o aviso e o detalhe exibiram os IDs #97 e #98, respectivamente. [Permissões e toque](notificacoes.json) · [Detalhe com regra e pontuação](02-alerta-alto.png) · [Notificação na bandeja](04-notificacao-android.png) · [Ciclo de vida](ciclo-de-vida.json)

O operador automatizado tocou os controles visíveis e conferiu a tela resultante por ADB. Os tempos incluem as sondagens da interface e descrevem as três tarefas técnicas no emulador. A experiência de moradores e agentes locais exigiria participantes reais.

| Tarefa concluída | Ações | Tempo até a confirmação |
| --- | --- | ---: |
| Consultar uma leitura pública | 1 toque. O histórico exibiu estação NOAA, data e município IBGE | 5.259 ms |
| Abrir o alerta pelo aviso de prioridade alta | 1 toque. O detalhe exibiu o alerta #65 | 3.012 ms |
| Registrar 75 minutos sem energia | 4 toques, 1 rolagem, entrada de “75” pelo teclado e 1 retorno do Android. A tela confirmou observação #129 e alerta #35 | 17.279 ms |

O teclado numérico apareceu no registro. Com fonte do sistema a 130%, o filtro “Falta de energia” mostrou um cartão de prioridade média e as quatro abas rotuladas permaneceram visíveis. O controle “Tentar novamente” media inicialmente 32 dp de largura. Após a correção, o botão pressionável apareceu na árvore com 96 × 96 px na densidade de 320 dpi, equivalentes a 48 × 48 dp. A verificação de contraste calculou luminância relativa das cores de texto e fundo de dez combinações da interface. O mínimo da amostra foi 6,01:1. [Tarefas cronometradas](tarefas.json) · [Contraste](contraste.json) · [Fonte ampliada e filtro](05-fonte-ampliada.png) · [Árvore e alvos de toque](fonte-e-filtros.json)

Em dois ensaios completos, o Android mostrou a água simulada passar de 1 cm (baixa, 3 pontos) para 24 cm (alta, 7 pontos). O alerta #1 continuou consultável após parar a API. Na retomada, a leitura de 22 cm apareceu com ID próprio, #161 ou #193 conforme o ensaio. O detalhe retornado pela API continha cada ID de observação uma única vez. [Sequências de apresentação](ensaios.json)

## Revisões e reprodução

O backend testado foi construído na revisão `59aa52b`. O JAR usado tinha SHA-256 `e8a14846c8d77f8c0b72eb738441d119d0a496ac4b890297971ec407b18d9e09`. A primeira série usou a interface com barra de status corrigida em `783b4c1`. A revisão `b544ad2` ampliou o controle de reconexão e serviu de base para a checagem de acessibilidade e medição finais. O APK oficial do Expo Go usado tinha SHA-256 `14c18828a3d04e43922245920bd941b978fd1c7a5aec88a0188032f0bb4972ce`.

Para reproduzir, siga o README da raiz para iniciar as duas stacks, habilite o perfil de demonstração e abra no Android o detalhe do alagamento de Vila Mariana. Role até que a primeira evidência esteja visível. Com `adb` disponível, rode a sonda da raiz do repositório.

```powershell
python scripts/medir-android.py --serial emulator-5564 --amostras 20 --saida .execucao/tempo-android.json
```

Use o serial indicado por `adb devices` no equipamento escolhido. Para repetir a queda, pare somente a JVM, aguarde o banner, reinicie com o mesmo banco e confira a leitura seguinte no detalhe.
