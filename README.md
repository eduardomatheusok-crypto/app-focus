# Modo Foco: bloqueio de apps (Android)

Durante uma sessão de foco, o app detecta quando você abre um app da lista bloqueada e mostra uma tela por cima: **"Você está em foco. Faltam X minutos"**, com os botões **Voltar ao foco** e **Desbloquear por 1 minuto**. O segundo só fica ativo depois de 5 segundos.

O bloqueio fica no módulo nativo local [`modules/modo-foco-blocker`](modules/modo-foco-blocker), escrito em Kotlin:

| Arquivo | O que faz |
|---|---|
| `ModoFocoBlockerModule.kt` | Ponte JS ↔ Kotlin (as funções chamadas pelo TypeScript) |
| `PermissionHelper.kt` | Verifica e abre as telas de "Acesso ao uso" e "Sobrepor a outros apps" |
| `AppListHelper.kt` | Lista os apps da gaveta (sem o Modo Foco, launchers e Configurações) |
| `BlockerPrefs.kt` | Salva a sessão (apps, `endsAt`, desbloqueio) no SharedPreferences |
| `ForegroundAppDetector.kt` | Descobre o app na tela pelo último `ACTIVITY_RESUMED` do UsageStatsManager |
| `BlockerService.kt` | Foreground Service: verifica a cada 1 s e se encerra sozinho no `endsAt` |
| `OverlayController.kt` | A tela de bloqueio (View no WindowManager com `TYPE_APPLICATION_OVERLAY`) |

## Como rodar

O app usa código nativo próprio, então **não funciona no Expo Go**. É preciso um *development build*.

```bash
npm install

# Opção 1: build na nuvem (não precisa de Android SDK no PC)
npx eas-cli@latest build --profile development --platform android
# → abra no celular o link do .apk que aparece no final e instale

# Opção 2: build local (precisa de Android SDK + JDK 17 ou 21)
npx expo run:android

# Depois, com o APK instalado, suba o servidor de JavaScript:
npx expo start
```

Mudanças só em TypeScript aparecem na hora (hot reload). Mudanças no Kotlin, no `AndroidManifest.xml` ou em dependências nativas exigem **um build novo**.

## Como testar no celular

1. Abra **Permissões** e conceda **Acesso ao uso** e **Sobrepor a outros apps**. O status atualiza quando você volta para o app.
2. Abra **Escolher apps** e marque, por exemplo, o Instagram.
3. Abra **Sessão de foco**, escolha **2 min** e toque em **Iniciar foco**. Permita as notificações. A notificação "Modo Foco ativo · Faltam 2 min" aparece.
4. Abra o Instagram: o overlay deve aparecer em até ~1 segundo.
5. **Voltar ao foco** leva de volta ao Modo Foco. **Desbloquear por 1 minuto** libera o app por 60 s.
6. Depois dos 2 minutos, o Instagram abre normalmente e a notificação some, mesmo com o Modo Foco fechado.

Para ver os logs do serviço (precisa do `adb` e da depuração USB ativada):

```bash
adb logcat -s ModoFoco
```

## Limitações conhecidas

- **Fabricantes que matam serviços.** Xiaomi (MIUI/HyperOS), Samsung, Huawei, Oppo e outros podem encerrar o serviço para economizar bateria, e aí o bloqueio para. Para evitar:
  - Nas Configurações, vá em **Apps → Modo Foco → Bateria** e escolha **Sem restrições** (ou "Não otimizar").
  - **Xiaomi:** ative também o **Início automático** e, em "Economia de bateria", escolha **Sem restrições**.
  - **Samsung:** em **Bateria → Limites de uso em segundo plano**, tire o Modo Foco de "Apps em suspensão".
  - Guia por fabricante: <https://dontkillmyapp.com>
- **Atraso de até ~1 segundo.** A verificação é feita a cada segundo, então o app bloqueado pode aparecer por um instante antes do overlay.
- **Não é à prova de burla.** O usuário pode tirar as permissões nas Configurações ou forçar a parada do Modo Foco. A ideia é ajudar, não punir.
- **Só Android.** O iOS não permite este tipo de bloqueio sem a API Screen Time, que exige uma permissão especial da Apple.
- **Google Play.** Apps com `PACKAGE_USAGE_STATS`, sobreposição e foreground service do tipo `specialUse` precisam justificar o uso na revisão da loja.
