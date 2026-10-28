package expo.modules.modofocoblocker

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings

/**
 * Funções para verificar e pedir as duas permissões especiais do bloqueio.
 *
 * Elas não aparecem naquele pop-up comum de "Permitir / Negar". O usuário precisa
 * ativar manualmente numa tela das Configurações, por isso temos funções para abrir essas telas.
 */
object PermissionHelper {

  /**
   * Verifica se o usuário liberou o "Acesso ao uso" (PACKAGE_USAGE_STATS).
   *
   * Essa permissão é controlada pelo AppOpsManager, e não pelo sistema normal de permissões.
   */
  fun hasUsagePermission(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager

    // Pergunta ao sistema qual é o "modo" dessa operação para o nosso app.
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName
      )
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName
      )
    }

    // MODE_DEFAULT significa "siga a permissão do manifest"; nesse caso conferimos ela diretamente.
    return if (mode == AppOpsManager.MODE_DEFAULT) {
      context.checkCallingOrSelfPermission(android.Manifest.permission.PACKAGE_USAGE_STATS) ==
        PackageManager.PERMISSION_GRANTED
    } else {
      mode == AppOpsManager.MODE_ALLOWED
    }
  }

  /** Abre a tela "Acesso ao uso" das Configurações. */
  fun openUsageSettings(context: Context) {
    val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
      // NEW_TASK é obrigatório quando abrimos uma tela a partir de um Context que não é uma Activity.
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }

  /** Verifica se o app pode desenhar por cima dos outros (SYSTEM_ALERT_WINDOW). */
  fun hasOverlayPermission(context: Context): Boolean = Settings.canDrawOverlays(context)

  /** Abre a tela "Sobrepor a outros apps" já no nosso app (graças ao "package:" na URI). */
  fun openOverlaySettings(context: Context) {
    val intent = Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:${context.packageName}")
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }
}
