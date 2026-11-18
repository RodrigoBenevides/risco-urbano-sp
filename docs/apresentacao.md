# Demonstração da Global Solution

Reserve dois terminais para a API e o Metro, mais um para o emissor. Tenha o Android já conectado e as dependências preparadas. Antes de apresentar, faça uma passagem completa com um banco exclusivo de ensaio. Para recomeçar, escolha outro arquivo de demonstração em `RISCO_DB_URL` antes de iniciar a JVM, por exemplo `jdbc:h2:file:./data/ensaio-turma-2`. Use o mesmo arquivo ao parar e ligar a API durante essa passagem.

**No Windows já preparado**, a API também pode ser controlada em segundo plano. Depois de compilar o JAR, execute os comandos abaixo separadamente a partir da raiz, no momento correspondente da apresentação. O script inicia sua própria JVM na porta 8080 e reutiliza o banco `backend/data/apresentacao-8080` em cada retorno. Se o backend já estiver aberto em primeiro plano, use Ctrl+C naquele terminal antes de mudar para este modo.

```powershell
.\scripts\api-apresentacao.ps1 iniciar
.\scripts\api-apresentacao.ps1 status
# Na etapa de desconexão
.\scripts\api-apresentacao.ps1 parar
# Na etapa de recuperação
.\scripts\api-apresentacao.ps1 iniciar
```

| Passo | O que fazer | O que mostrar |
| --- | --- | --- |
| 1 | Iniciar API e app pelo README. Abrir o painel e permitir notificações, se desejado. Rodar `node scripts/demo.mjs saude`. | Saúde da API e estado do painel. A primeira carga estabelece a referência para notificações. |
| 2 | Enviar `node scripts/demo.mjs agua 4`. Aguardar sua aparição e abrir o alerta. | Mesmo ID do alerta no terminal e no Android. Diferenciar a observação individual do alerta que a reúne. |
| 3 | Enviar `node scripts/demo.mjs agua 22` enquanto o app está aberto e aguardar a sincronização. | Escalada da prioridade, fonte simulada, confiança e atualização automática. Abrir a notificação correspondente quando permitida. |
| 4 | Abrir o formulário e enviar falta de energia em Moema com duração de 65 minutos. Consultar a lista e o detalhe. | Relato registrado pelo app com menor confiança, bairro e justificativa da prioridade. |
| 5 | Abrir o histórico de Congonhas. | Data de 2025, unidade, procedência NOAA e contexto municipal do IBGE. |
| 6 | Pressionar Ctrl+C **somente no terminal da API** ou usar a ação `parar` do controle de apresentação. Continuar navegando no Android. | Mensagem de desconexão e hora da última atualização, dados anteriores disponíveis, app respondendo. |
| 7 | Reiniciar o mesmo JAR com o perfil `demo`, no mesmo diretório e banco. Aguardar o retorno automático. Enviar `node scripts/demo.mjs calor 35`. | Mesmo ID persistido, nenhuma repetição da alta já avisada e informação nova após a volta do serviço. |

Para reproduzir o ensaio com a permissão de notificações recusada, mantenha o app aberto e provoque outra transição para alta em um banco novo de demonstração. Verifique o aviso dentro do aplicativo. As evidências da validação registram qual comportamento foi observado em cada ambiente.
