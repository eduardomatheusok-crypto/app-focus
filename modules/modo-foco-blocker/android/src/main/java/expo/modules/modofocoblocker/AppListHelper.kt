package expo.modules.modofocoblocker

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.os.Build
import android.provider.Settings
import android.util.Base64
import java.io.ByteArrayOutputStream

/**
 * Lista os apps que o usuário pode escolher para bloquear.
 *
 * Usamos só os apps que aparecem na gaveta de apps (MAIN + LAUNCHER). Para o Android 11+
 * deixar a gente ver esses apps, declaramos um <queries> no AndroidManifest do módulo
 * (sem precisar da permissão QUERY_ALL_PACKAGES, que o Google Play restringe).
 */
object AppListHelper {

  // Tamanho do ícone em pixels. Pequeno de propósito: a lista inteira viaja para o JS em base64.
  private const val ICON_SIZE_PX = 96

  /** Retorna uma lista de mapas { packageName, label, icon }, que o Expo converte em objetos JS. */
  fun getLaunchableApps(context: Context): List<Map<String, String>> {
    val pm = context.packageManager

    // Pacotes que nunca podem ser bloqueados: o próprio Modo Foco, os launchers e as Configurações.
    // Se o launcher fosse bloqueado, o usuário não conseguiria nem voltar para a tela inicial.
    val excluded = mutableSetOf(context.packageName)
    excluded += packagesFor(pm, Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME))
    excluded += packagesFor(pm, Intent(Settings.ACTION_SETTINGS))
    excluded += "com.android.settings"

    val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)

    return queryActivities(pm, launcherIntent)
      // Um app pode ter mais de um ícone na gaveta; mantemos só um por pacote.
      .distinctBy { it.activityInfo.packageName }
      .filter { it.activityInfo.packageName !in excluded }
      .map { info ->
        mapOf(
          "packageName" to info.activityInfo.packageName,
          "label" to info.loadLabel(pm).toString(),
          "icon" to drawableToBase64(info.loadIcon(pm))
        )
      }
      .sortedBy { it["label"]!!.lowercase() }
  }

  /** Nomes de pacote dos apps que respondem a um Intent (ex.: todos os launchers instalados). */
  private fun packagesFor(pm: PackageManager, intent: Intent): Set<String> =
    queryActivities(pm, intent).map { it.activityInfo.packageName }.toSet()

  /** queryIntentActivities mudou de assinatura no Android 13; aqui tratamos as duas versões. */
  private fun queryActivities(pm: PackageManager, intent: Intent): List<ResolveInfo> =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      pm.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0L))
    } else {
      @Suppress("DEPRECATION")
      pm.queryIntentActivities(intent, 0)
    }

  /**
   * Desenha o ícone (que pode ser vetorial ou "adaptativo") num Bitmap,
   * comprime em PNG e codifica em base64 para mandar ao JS como texto.
   */
  private fun drawableToBase64(drawable: Drawable): String {
    val bitmap = Bitmap.createBitmap(ICON_SIZE_PX, ICON_SIZE_PX, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, ICON_SIZE_PX, ICON_SIZE_PX)
    drawable.draw(canvas)

    val output = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
    bitmap.recycle()
    return Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
  }
}
