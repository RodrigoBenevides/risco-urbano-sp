# Risco Urbano SP

Aplicativo de monitoramento de alagamentos, calor urbano e interrupções de energia em quatro bairros de São Paulo. O morador consulta os alertas por bairro e registra uma ocorrência. No detalhe, o agente local consegue verificar de onde veio cada informação e por que ela recebeu aquela prioridade.

Projeto da Global Solution 2026.2 de **Advanced Programming And Mobile Dev**, Engenharia da Computação, FIAP.

## Integrantes

A identificação acadêmica aguarda os nomes completos e RMs fornecidos pelo grupo.

## Executar no Windows

Use Java 21, Node.js 24 e npm. O backend inclui o Maven Wrapper. Na primeira preparação, é preciso acesso à internet para obter as dependências e o Expo Go compatível. Os dados públicos usados pelo aplicativo já acompanham o repositório.

**1. Inicie a API.** Em um terminal na raiz do projeto:

```powershell
cd backend
.\mvnw.cmd clean verify
java -jar target/risco-urbano-1.0.0.jar --spring.profiles.active=demo
```

Deixe esse terminal aberto. O perfil `demo` habilita a entrada de sensores simulados. A API escuta em `127.0.0.1:8080`. Iniciá-la sempre a partir de `backend` reutiliza o arquivo de banco em `backend/data`. Em Linux ou macOS, o wrapper correspondente é `./mvnw`.

**2. Inicie o aplicativo.** Abra um Android Emulator com Expo Go da série 57. Use outro terminal na raiz:

```powershell
cd mobile
npm ci
npm start -- --localhost
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
