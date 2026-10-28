package expo.modules.modofocoblocker

import android.content.Context
import android.content.SharedPreferences

/**
 * Guarda os dados da sessão de foco no SharedPreferences (um arquivinho chave-valor do Android).
 *
 * Por que não deixar só na memória? Porque o Android pode matar e recriar o serviço,
 * e o app JS pode ser fechado. Salvando em disco, o serviço sempre sabe:
 * quais apps bloquear, quando a sessão termina e se há um desbloqueio temporário ativo.
 */
object BlockerPrefs {

  private const val FILE = "modo_foco_blocker"
  private const val KEY_PACKAGES = "packages"
  private const val KEY_ENDS_AT = "endsAt"
  private const val KEY_UNLOCK_UNTIL = "unlockUntil"

  private fun prefs(context: Context): SharedPreferences =
    context.getSharedPreferences(FILE, Context.MODE_PRIVATE)

  /** Salva uma nova sessão. Também zera qualquer desbloqueio que tenha sobrado da sessão anterior. */
  fun saveSession(context: Context, packages: List<String>, endsAt: Long) {
    prefs(context).edit()
      .putStringSet(KEY_PACKAGES, packages.toSet())
      .putLong(KEY_ENDS_AT, endsAt)
      .putLong(KEY_UNLOCK_UNTIL, 0L)
      .apply()
  }

  /** Apaga tudo: usado quando a sessão termina ou é encerrada pelo usuário. */
  fun clear(context: Context) {
    prefs(context).edit().clear().apply()
  }

  // Copiamos o Set porque o Android não permite modificar o Set devolvido pelo getStringSet.
  fun getPackages(context: Context): Set<String> =
    prefs(context).getStringSet(KEY_PACKAGES, emptySet())?.toSet() ?: emptySet()

  /** Horário de término em milissegundos desde 1970 (o mesmo formato do Date.now() do JS). */
  fun getEndsAt(context: Context): Long = prefs(context).getLong(KEY_ENDS_AT, 0L)

  /** A sessão está valendo se o horário de término ainda não passou. */
  fun isSessionActive(context: Context, now: Long = System.currentTimeMillis()): Boolean =
    getEndsAt(context) > now

  /** Até quando o usuário desbloqueou temporariamente (botão "Desbloquear por 1 minuto"). */
  fun getUnlockUntil(context: Context): Long = prefs(context).getLong(KEY_UNLOCK_UNTIL, 0L)

  fun setUnlockUntil(context: Context, until: Long) {
    prefs(context).edit().putLong(KEY_UNLOCK_UNTIL, until).apply()
  }
}
