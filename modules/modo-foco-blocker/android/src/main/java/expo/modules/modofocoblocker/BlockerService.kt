package expo.modules.modofocoblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import android.view.ContextThemeWrapper

/**
 * Serviço que fica rodando durante a sessão de foco, mesmo com o app fechado.
 *
 * É um "Foreground Service": o Android exige que ele mostre uma notificação fixa,
 * para o usuário saber que há algo rodando. Em troca, o sistema evita matá-lo.
 *
 * A cada 1 segundo ele:
 *  1. confere se a sessão já acabou (se sim, se encerra sozinho);
 *  2. descobre qual app está na tela;
 *  3. se for um app bloqueado, mostra o overlay; se não for, esconde.
 */
class BlockerService : Service() {

  companion object {
    /** Tag dos logs. Para ver no PC: adb logcat -s ModoFoco */
    const val TAG = "ModoFoco"

    private const val CHANNEL_ID = "modo_foco_sessao"
    private const val NOTIFICATION_ID = 1001
    private const val CHECK_INTERVAL_MS = 1000L
    private const val UNLOCK_DURATION_MS = 60_000L

    /** Indica se o serviço está rodando agora (usado pelo isBlocking() do JS). */
    @Volatile
    var isRunning = false
      private set

    /** Inicia o serviço. Os dados da sessão já devem estar salvos no BlockerPrefs. */
    fun start(context: Context) {
      val intent = Intent(context, BlockerService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, BlockerService::class.java))
    }
  }

  // Handler da thread principal: usamos para agendar a verificação a cada segundo
  // e porque o overlay (uma View) só pode ser mexido na thread principal.
  private val handler = Handler(Looper.getMainLooper())

  private lateinit var detector: ForegroundAppDetector
  private lateinit var overlay: OverlayController
  private lateinit var powerManager: PowerManager

  // Guardamos o último valor para só atualizar a notificação / escrever log quando mudar.
  private var lastMinutesShown = -1L
  private var lastPackageLogged: String? = null

  /** A verificação que roda a cada segundo. Ela se reagenda no final. */
  private val checkLoop = object : Runnable {
    override fun run() {
      checkForegroundApp()
      if (isRunning) handler.postDelayed(this, CHECK_INTERVAL_MS)
    }
  }

  override fun onCreate() {
    super.onCreate()
    detector = ForegroundAppDetector(this)
    powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager

    // Um Service não tem tema visual; o ContextThemeWrapper dá aos botões do overlay o visual padrão do sistema.
    val themedContext = ContextThemeWrapper(this, android.R.style.Theme_DeviceDefault)
    overlay = OverlayController(
      themedContext,
      onBackToFocus = ::backToFocus,
      onUnlockOneMinute = ::unlockOneMinute
    )
    createNotificationChannel()
  }

  /**
   * Chamado toda vez que alguém chama start(). Também é chamado quando o Android
   * recria o serviço depois de matá-lo (por causa do START_STICKY abaixo).
   */
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // Se não há sessão válida (ex.: o Android recriou o serviço depois do fim), não fazemos nada.
    if (!BlockerPrefs.isSessionActive(this)) {
      Log.d(TAG, "Nenhuma sessão ativa; encerrando o serviço")
      stopSelf()
      return START_NOT_STICKY
    }

    try {
      startForegroundWithType(buildNotification(minutesLeft()))
    } catch (e: Exception) {
      // O Android 12+ pode recusar iniciar um foreground service em segundo plano.
      Log.e(TAG, "Não foi possível iniciar em primeiro plano", e)
      stopSelf()
      return START_NOT_STICKY
    }

    if (!isRunning) {
      isRunning = true
      Log.d(TAG, "Sessão iniciada. Apps bloqueados: ${BlockerPrefs.getPackages(this)}")
      handler.post(checkLoop)
    }

    // START_STICKY: se o sistema matar o serviço por falta de memória, ele tenta recriá-lo depois.
    return START_STICKY
  }

  override fun onDestroy() {
    isRunning = false
    handler.removeCallbacks(checkLoop)
    overlay.hide()
    Log.d(TAG, "Serviço destruído")
    super.onDestroy()
  }

  // Não usamos "bind" (conexão direta com o serviço); a comunicação é pelo BlockerPrefs.
  override fun onBind(intent: Intent?): IBinder? = null

  // ---------------------------------------------------------------------------------------------
  // Verificação a cada segundo
  // ---------------------------------------------------------------------------------------------

  private fun checkForegroundApp() {
    val now = System.currentTimeMillis()

    // 1. A sessão acabou? Então limpamos tudo e o serviço se encerra (a notificação some junto).
    if (!BlockerPrefs.isSessionActive(this, now)) {
      Log.d(TAG, "Sessão terminou; liberando os apps")
      BlockerPrefs.clear(this)
      overlay.hide()
      isRunning = false
      stopSelf()
      return
    }

    // Atualiza "faltam X min" na notificação só quando o número muda.
    val minutes = minutesLeft(now)
    if (minutes != lastMinutesShown) {
      lastMinutesShown = minutes
      notificationManager().notify(NOTIFICATION_ID, buildNotification(minutes))
    }

    // Com a tela desligada não há o que bloquear; economizamos bateria pulando a consulta.
    if (!powerManager.isInteractive) return

    // 2. Qual app está na frente?
    val foreground = detector.currentForegroundPackage()
    if (foreground != lastPackageLogged) {
      Log.d(TAG, "App em primeiro plano: $foreground")
      lastPackageLogged = foreground
    }

    // 3. Ele está na lista e o usuário não pediu um desbloqueio temporário?
    val isBlockedApp = foreground != null && foreground in BlockerPrefs.getPackages(this)
    val isTemporarilyUnlocked = now < BlockerPrefs.getUnlockUntil(this)

    if (isBlockedApp && !isTemporarilyUnlocked) {
      if (!overlay.isShowing) Log.d(TAG, "Bloqueando $foreground")
      overlay.show(minutes)
    } else {
      overlay.hide()
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Ações dos botões do overlay
  // ---------------------------------------------------------------------------------------------

  /** "Voltar ao foco": abre o Modo Foco e tira o overlay da tela. */
  private fun backToFocus() {
    Log.d(TAG, "Usuário tocou em Voltar ao foco")
    // Abrimos o app ANTES de remover o overlay: o Android só deixa um serviço abrir uma tela
    // quando o app tem uma janela visível (o overlay) ou a permissão de sobreposição.
    packageManager.getLaunchIntentForPackage(packageName)?.let { launch ->
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      startActivity(launch)
    }
    overlay.hide()
  }

  /** "Desbloquear por 1 minuto": guarda até quando está liberado e tira o overlay. */
  private fun unlockOneMinute() {
    Log.d(TAG, "Usuário desbloqueou por 1 minuto")
    BlockerPrefs.setUnlockUntil(this, System.currentTimeMillis() + UNLOCK_DURATION_MS)
    overlay.hide()
  }

  // ---------------------------------------------------------------------------------------------
  // Notificação fixa
  // ---------------------------------------------------------------------------------------------

  /** Minutos restantes, arredondando para cima (faltando 30 s, mostra "1 min"). */
  private fun minutesLeft(now: Long = System.currentTimeMillis()): Long {
    val msLeft = (BlockerPrefs.getEndsAt(this) - now).coerceAtLeast(0L)
    return (msLeft + 59_999L) / 60_000L
  }

  private fun notificationManager() =
    getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  /** No Android 8+ toda notificação precisa de um "canal" (o usuário pode configurar cada canal). */
  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Sessão de foco",
        NotificationManager.IMPORTANCE_LOW // LOW: sem som, só o ícone na barra
      )
      notificationManager().createNotificationChannel(channel)
    }
  }

  private fun buildNotification(minutes: Long): Notification {
    // Tocar na notificação abre o Modo Foco.
    val openApp = packageManager.getLaunchIntentForPackage(packageName)?.let { launch ->
      PendingIntent.getActivity(
        this, 0, launch,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      )
    }

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }

    return builder
      .setContentTitle("Modo Foco ativo")
      .setContentText("Faltam $minutes min")
      .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
      .setOngoing(true) // não dá para arrastar para o lado e dispensar
      .setContentIntent(openApp)
      .build()
  }

  /**
   * No Android 14+ é obrigatório informar o tipo do foreground service.
   * Usamos "specialUse", que precisa ser declarado igual no AndroidManifest.
   */
  private fun startForegroundWithType(notification: Notification) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }
}
