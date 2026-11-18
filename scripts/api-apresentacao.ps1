param(
    [ValidateSet('iniciar', 'parar', 'status')]
    [string]$Acao = 'status',
    [ValidateRange(1, 65535)]
    [int]$Porta = 8080
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $raiz 'backend'
$execucao = Join-Path $raiz '.execucao'
$arquivo = Join-Path $execucao "apresentacao-$Porta.json"
$url = "http://127.0.0.1:$Porta/actuator/health"
[void][IO.Directory]::CreateDirectory($execucao)

# Serializa os comandos para que duas janelas não iniciem duas JVMs sobre o mesmo banco.
$trava = [IO.File]::Open((Join-Path $execucao "apresentacao-$Porta.lock"), 'OpenOrCreate', 'ReadWrite', 'None')
try {
    $processo = $null
    if (Test-Path -LiteralPath $arquivo) {
        $sessao = Get-Content -LiteralPath $arquivo -Raw | ConvertFrom-Json
        $candidato = Get-CimInstance Win32_Process -Filter "ProcessId=$([int]$sessao.processo)"
        if ($candidato.Name -eq 'java.exe' -and $candidato.CommandLine.Contains("-Driscourbano.sessao=$($sessao.marca)")) {
            $processo = $candidato
        }
    }
    if ($Acao -eq 'parar') {
        if ($processo) {
            $java = Get-Process -Id $processo.ProcessId
            $java.Kill()
            if (!$java.WaitForExit(8000)) { throw 'A JVM ainda está encerrando.' }
            Write-Output 'API da apresentação interrompida. O banco permanece em disco.'
        } else { Write-Output 'A API controlada por este script já está parada.' }
        return
    }
    if ($processo) {
        $saude = Invoke-RestMethod -Uri $url -TimeoutSec 3
        Write-Output "API $($saude.status) na porta $Porta. PID $($processo.ProcessId)."
        return
    }
    if ($Acao -eq 'status') { Write-Output 'A API controlada por este script está parada.'; return }
    if (Get-NetTCPConnection -LocalPort $Porta -State Listen -ErrorAction SilentlyContinue) {
        throw "A porta $Porta já está em uso. Se iniciou a API em um terminal, pare-a nesse terminal antes de usar este controle."
    }
    if (!(Test-Path -LiteralPath (Join-Path $backend 'target/risco-urbano-1.0.0.jar'))) {
        throw 'Compile a API em backend com .\mvnw.cmd clean verify.'
    }
    $marca = [guid]::NewGuid().ToString('N')
    $parametros = @("-Driscourbano.sessao=$marca", '-Xmx384m', '-jar', 'target/risco-urbano-1.0.0.jar',
        '--spring.profiles.active=demo', '--server.address=127.0.0.1', "--server.port=$Porta",
        "--spring.datasource.url=jdbc:h2:file:./data/apresentacao-$Porta")
    $java = Start-Process -FilePath (Get-Command java.exe).Source -ArgumentList $parametros -WindowStyle Hidden -WorkingDirectory $backend -PassThru -RedirectStandardOutput (Join-Path $execucao "apresentacao-$Porta.out.log") -RedirectStandardError (Join-Path $execucao "apresentacao-$Porta.err.log")
    @{ processo = $java.Id; marca = $marca } | ConvertTo-Json | Set-Content -LiteralPath $arquivo
    $prazo = [datetime]::UtcNow.AddSeconds(60)
    do {
        if ($java.HasExited) { throw "A JVM encerrou. Consulte os logs de apresentação em $execucao." }
        $saude = $null
        try { $saude = Invoke-RestMethod -Uri $url -TimeoutSec 2 }
        catch { Write-Verbose "Aguardando a inicialização do serviço em $url." }
        if ($saude.status -eq 'UP') {
            Write-Output "API pronta em $url. Banco backend/data/apresentacao-$Porta."
            return
        }
        Start-Sleep -Milliseconds 350
    } while ([datetime]::UtcNow -lt $prazo)
    throw "A API ainda não respondeu. Consulte os logs de apresentação em $execucao."
} finally { $trava.Dispose() }
