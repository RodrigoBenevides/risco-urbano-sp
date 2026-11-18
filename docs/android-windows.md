# Android no computador preparado

Neste computador, o SDK, o Expo Go e o AVD da demonstração ficam em `B:\GS2-Android-Tools`. O provisionamento foi isolado dos outros projetos. O teste `emulator -accel-check` confirmou WHPX utilizável e a imagem AOSP Android 13 (API 33, x86_64) iniciou com 1.536 MiB de memória e dois núcleos. A API 33 é a versão do Android executado no emulador. O Expo SDK e a versão de compilação de um APK próprio têm funções diferentes.

No PowerShell, prepare somente a sessão que usará no ensaio:

```powershell
$env:ANDROID_HOME = 'B:\GS2-Android-Tools'
$env:ANDROID_AVD_HOME = Join-Path $env:ANDROID_HOME 'avd'
$env:ANDROID_USER_HOME = Join-Path $env:ANDROID_HOME 'user'
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:Path"
adb devices -l
```

Se `emulator-5564` já aparecer como `device`, use-o. Se estiver desligado, abra o Android em uma janela, numa sessão com as variáveis acima:

```powershell
& "$env:ANDROID_HOME\emulator\emulator.exe" -avd GS2_API33 -port 5564 -no-snapshot -no-audio -gpu swiftshader_indirect -memory 1536 -cores 2
```

Com o Android iniciado e o Metro do README em execução:

```powershell
adb -s emulator-5564 reverse tcp:8081 tcp:8081
adb -s emulator-5564 shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8081
```

O ensaio automatizado usa o mesmo AVD sem janela. Para projetá-lo e controlá-lo pelo mouse nessa situação, o computador preparado também contém o scrcpy portátil. Mantenha a mesma sessão PowerShell configurada:

```powershell
.\scripts\mostrar-android.ps1 -Serial emulator-5564
```

Em outro computador, instale Android Studio com Android Emulator e Platform Tools, crie um dispositivo virtual Android compatível, instale nele o Expo Go 57.0.9 e use os comandos do README. Para instalar o APK oficial previamente baixado, use `adb install -r CAMINHO_DO_APK`. No emulador, o app acessa a API do computador em `10.0.2.2:8080`. Em aparelho físico USB, use o encaminhamento das duas portas descrito no README. [Android Emulator](https://developer.android.com/studio/run/emulator) · [Cliente Expo Go 57.0.9](https://github.com/expo/expo-go-releases/releases/tag/Expo-Go-57.0.9) · [scrcpy para Windows](https://github.com/Genymobile/scrcpy/blob/master/doc/windows.md)
