package expo.modules.modofocoblocker

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context

/**
 * Descobre qual app está em primeiro plano (na tela) usando o UsageStatsManager.
 *
 * Ideia: o Android registra um evento toda vez que uma tela (Activity) de um app aparece.
 * Esse evento se chama ACTIVITY_RESUMED. Se pegarmos o ÚLTIMO desses eventos,
 * sabemos qual app o usuário abriu por último, ou seja, o que está na frente agora.
 *
 * Precisa da permissão "Acesso ao uso" (PACKAGE_USAGE_STATS).
 */
class ForegroundAppDetector(context: Context) {

  private val usageStatsManager =
    context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

  // Lembramos o último app visto. Se o usuário ficar parado no mesmo app,
  // não chegam eventos novos, mas ele continua sendo o app da frente.
  private var lastPackage: String? = null

  /** Retorna o nome do pacote do app na tela (ex.: "com.instagram.android"), ou null se não souber. */
  fun currentForegroundPackage(): String? {
    val now = System.currentTimeMillis()

    // Na primeira chamada olhamos os últimos 5 minutos para descobrir o app atual.
    // Depois, como verificamos a cada segundo, uma janela de 10 segundos já basta.
    val windowMs = if (lastPackage == null) 5 * 60_000L else 10_000L
    val events = usageStatsManager.queryEvents(now - windowMs, now)

    // Percorremos os eventos (eles vêm em ordem de tempo) e ficamos com o último ACTIVITY_RESUMED.
    // Reaproveitamos o mesmo objeto Event em todas as voltas para não criar lixo na memória.
    val event = UsageEvents.Event()
    var latest: String? = null
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      // ACTIVITY_RESUMED tem o mesmo valor (1) do antigo MOVE_TO_FOREGROUND,
      // então também funciona em versões do Android anteriores à 10.
      if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
        latest = event.packageName
      }
    }

    if (latest != null) lastPackage = latest
    return lastPackage
  }
}
