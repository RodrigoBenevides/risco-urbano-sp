# Risco Urbano SP

Aplicativo de monitoramento de alagamentos, calor urbano e interrupções de energia em quatro bairros de São Paulo. O morador consulta os alertas por bairro e registra uma ocorrência. No detalhe, o agente local consegue verificar de onde veio cada informação e por que ela recebeu aquela prioridade.

Projeto da Global Solution 2026.2 de **Advanced Programming And Mobile Dev**, Engenharia da Computação, FIAP.

[Painel no Android](docs/evidencias/android/painel-apresentacao.png) · [Android já preparado neste computador](docs/android-windows.md) · [Roteiro da apresentação](docs/apresentacao.md) · [Guia de arquitetura e regras](docs/arquitetura.md)

## Vídeo de demonstração

A gravação mostra o alerta de alagamento subir de prioridade no Android, o registro comunitário, o histórico de Congonhas e a recuperação do aplicativo após a queda da API. São 3min23s, com legendas em português e sem áudio. [Baixar a demonstração em MP4 (28,4 MB)](https://github.com/RodrigoBenevides/risco-urbano-sp/releases/download/demonstracao-v1/Demonstracao_Risco_Urbano_SP.mp4)

## Integrantes

| Nome completo | RM |
| --- | --- |
| Caio Tadeu da Silva Faraleski | 558795 |
| Rodrigo Caruzzo Benevides | 554665 |
| Eduardo do Nascimento Souza | 558819 |

## Executar no Windows

Use Java 21, Node.js 24 e npm. O backend inclui o Maven Wrapper. Na primeira preparação, é preciso acesso à internet para obter as dependências e o Expo Go compatível. Os dados públicos usados pelo aplicativo já acompanham o repositório.

**1. Inicie a API.** Em um terminal na raiz do projeto:

```powershell
cd backend
.\mvnw.cmd clean verify
java -jar target/risco-urbano-1.0.0.jar --spring.profiles.active=demo
```

Deixe esse terminal aberto. O perfil `demo` habilita a entrada de sensores simulados. A API escuta em `127.0.0.1:8080`. Iniciá-la sempre a partir de `backend` reutiliza o arquivo de banco em `backend/data`. Em Linux ou macOS, o wrapper correspondente é `./mvnw`.

Na máquina preparada para a demonstração, a API também pode estar em segundo plano. A partir da raiz, use `.\scripts\api-apresentacao.ps1 status` para consultar a instância preparada. O mesmo script aceita `iniciar` e `parar` e mantém o mesmo banco entre as duas ações.

**2. Inicie o aplicativo.** Abra um Android Emulator com Expo Go da série 57. Use outro terminal na raiz:

```powershell
cd mobile
npm ci
$env:EXPO_OFFLINE = '1'
npm start -- --localhost --no-dev
```

Com o Android conectado ao `adb`, encaminhe a porta do Metro para o aparelho e abra o projeto pelo Expo Go. Para a API o Android Emulator usa `10.0.2.2:8080`, endereço especial que alcança o loopback do computador. A URL está configurada por plataforma. [Rede do Android Emulator](https://developer.android.com/studio/run/emulator-networking-address)

```powershell
adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8081
```

Em **aparelho físico por USB**, aceite a depuração no telefone, execute também `adb reverse tcp:8080 tcp:8080`, defina `$env:EXPO_PUBLIC_API_URL='http://127.0.0.1:8080'` no terminal do mobile e reinicie o Metro. Há um exemplo em `mobile/.env.example`. O telefone precisa ter uma versão do Expo Go que aceite o SDK do projeto. [Expo Go 57.0.9 para Android](https://github.com/expo/expo-go-releases/releases/download/Expo-Go-57.0.9/Expo-Go-57.0.9.apk)

**3. Envie uma leitura.** Na raiz do projeto, em um terceiro terminal:

```powershell
node scripts/demo.mjs saude
node scripts/demo.mjs agua 4
node scripts/demo.mjs agua 22
node scripts/demo.mjs calor 35
node scripts/demo.mjs lista
node scripts/demo.mjs historico
```

O emissor imprime os IDs da observação e do alerta. As leituras de água são em centímetros na Vila Mariana. O exemplo de calor compara 35 °C na Saúde com uma referência simulada de 30 °C no mesmo instante. É possível mudar o servidor do emissor com a variável `API_URL`.

## O que observar na demonstração

O painel consulta a API ao abrir, ao retornar ao primeiro plano e três segundos após concluir cada ciclo de consulta. Uma requisição tem timeout de dois segundos. O app mantém uma cópia local com a hora da última atualização. Ao parar apenas a JVM, o painel sinaliza a queda e os dados anteriores continuam disponíveis. Reiniciar a API com o mesmo arquivo H2 permite retomar o acompanhamento automaticamente.

O primeiro carregamento estabelece a referência para as notificações. A entrada de um alerta em prioridade alta produz um aviso no aplicativo. Com permissão concedida, o Android também recebe uma notificação local que abre o detalhe. Com o aplicativo em segundo plano ou encerrado, a consulta periódica fica suspensa. Esta versão foi projetada para acompanhamento com a tela do app aberta.

A gravidade mede o impacto, de 1 a 3. A prioridade combina esse impacto com atualidade e confirmação independente. A confiança descreve a procedência de cada observação. Assim, um relato isolado de falta de energia há 65 minutos tem impacto 3, confiança baixa e prioridade média. Os limiares, a pontuação e o escopo da simulação estão no [guia para a defesa](docs/arquitetura.md).

## Contrato da API

| Operação | Uso |
| --- | --- |
| `GET /actuator/health` | Verificar se a API está pronta. |
| `GET /api/alertas` | Consultar alertas ativos por prioridade, com filtros opcionais `bairro`, `tipo`, `prioridade`, `page` e `size`. |
| `GET /api/alertas/{id}` | Obter o detalhe com as evidências do episódio e os motivos da classificação. |
| `GET /api/resumo` | Consultar totais com o mesmo recorte de atividade do painel. |
| `GET /api/observacoes?origem=PUBLICA` | Consultar as medições históricas importadas. |
| `POST /api/relatos` | Gravar ocorrência comunitária com `chave` UUID, `tipo`, `bairro` e, para energia, `duracaoMinutos`. |
| `POST /api/demo/sensores` | Enviar uma leitura simulada a partir do computador da API, com o perfil `demo` ativo. |

As gravações retornam HTTP 201 e os IDs de observação e alerta. Repetir a mesma chave com o mesmo conteúdo retorna HTTP 200 e os mesmos IDs. Reutilizá-la com outro conteúdo retorna 409. A API limita cada página a 50 registros e os corpos JSON a 8 KiB. A configuração de exemplo do app fica em `mobile/.env.example`. O backend aceita `RISCO_DB_URL`, `RISCO_DB_USER` e `RISCO_DB_PASSWORD` no ambiente do processo.

## Organização

| Local | Responsabilidade |
| --- | --- |
| `backend/` | API REST Spring Boot, persistência H2 em arquivo, migração Flyway, importação de dados públicos e cálculo dos alertas. |
| `mobile/` | Aplicativo React Native e Expo. O cliente HTTP, a sincronização e as telas usam um único contrato de dados. |
| `dados/` | Recorte oficial de Congonhas, município de São Paulo e manifesto com proveniência, conversões e hashes. |
| `scripts/` | Emissão de dados para a demonstração e coleta de indicadores. |
| `docs/` | Roteiro da apresentação, explicações de arquitetura e resultados verificados. |

## Fontes

- **NOAA.** Duas datas de 2025 da estação de Congonhas. O recorte preserva os atributos originais. Em 01/02, 1,30 polegada equivale a 33,02 mm de precipitação diária. Em 17/02, 84,4 °F equivalem a aproximadamente 29,1 °C de temperatura média diária. As observações ficam no histórico e conservam a data da medição. [Arquivo original](https://www.ncei.noaa.gov/data/global-summary-of-the-day/access/2025/83780099999.csv)
- **IBGE.** O código 3550308 identifica o município de São Paulo. É contexto geográfico para o recorte meteorológico. [Registro de localidades](https://servicodados.ibge.gov.br/api/v1/localidades/municipios/3550308)
- **Sensores simulados.** O perfil de demonstração aceita medidas recentes com unidade e identificação da fonte. Cenários de alagamento e calor são identificados como simulação.
- **Comunidade.** O aplicativo registra tipo de ocorrência e bairro. Para energia, registra a duração estimada. Não são pedidos nome, GPS, endereço exato ou fotografia.

## Testes

```powershell
# Na pasta backend
.\mvnw.cmd verify
# Na pasta mobile, após npm ci
npm run typecheck
npm run lint
npm test
```

O Maven gera os relatórios de testes em `backend/target/surefire-reports/` e os resultados de carga em `backend/target/indicadores/`. A comparação de prioridade usa os 21 casos previamente rotulados do arquivo `backend/src/test/resources/casos-prioridade.csv`. O teste de reinício executa duas JVMs sobre o mesmo arquivo H2.

## Se algo mudar durante o ensaio

| Sintoma | Verificação |
| --- | --- |
| O Expo Go abre, mas o painel continua desconectado | Execute `node scripts/demo.mjs saude` na raiz. Se houver resposta, confira a URL usada pelo Android e qualquer variável `EXPO_PUBLIC_API_URL` deixada no terminal. Reinicie o Metro após trocar a URL. |
| O app está conectado, mas ainda não há alertas | O histórico oficial é de 2025. Envie `node scripts/demo.mjs agua 4` e aguarde o próximo ciclo de consulta. |
| O alerta apareceu sem notificação do sistema | Nas preferências do sino, confira a permissão. Para testar a transição, espere o app mostrar 4 cm e então envie 22 cm. A primeira carga e os ciclos seguintes de um alerta que já está alto não geram outro aviso. |
| A API voltou com dados diferentes | Confira diretório de execução e valor de `RISCO_DB_URL`. Reinicie o mesmo JAR sobre o mesmo arquivo usado antes da queda. |

Os procedimentos e medições realizados estão no [registro de verificação](docs/verificacao.md).
