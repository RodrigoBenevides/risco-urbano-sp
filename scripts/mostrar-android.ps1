param([string]$Serial = $env:ANDROID_SERIAL)

$ErrorActionPreference = 'Stop'
$kit = $env:ANDROID_HOME
if (!$kit -or !(Test-Path -LiteralPath (Join-Path $kit 'espelhamento'))) {
    $kit = 'B:\GS2-Android-Tools'
}
$espelho = Get-Command scrcpy.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source
if (!$espelho) {
    $espelho = Get-ChildItem -Path "$kit\espelhamento\scrcpy-win64-*\scrcpy.exe" -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (!$espelho) { throw 'Instale scrcpy ou use a janela do Android Emulator. Veja docs/android-windows.md.' }
$adbDoKit = Join-Path $kit 'platform-tools\adb.exe'
if (Test-Path -LiteralPath $adbDoKit) { $env:ADB = $adbDoKit }
$opcoes = @('--no-audio', '--window-title', 'Risco Urbano SP')
if ($Serial) { $opcoes += @('-s', $Serial) }
& $espelho @opcoes
exit $LASTEXITCODE
