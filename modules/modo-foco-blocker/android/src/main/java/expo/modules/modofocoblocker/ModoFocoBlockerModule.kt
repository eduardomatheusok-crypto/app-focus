package expo.modules.modofocoblocker

import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Ponte entre o JavaScript e o Kotlin.
 *
 * Cada Function(...) aqui vira uma função que o TypeScript consegue chamar.
 * Esta classe só repassa as chamadas para os helpers, para que ela fique pequena e fácil de ler.
 */
class ModoFocoBlockerModule : Module() {

  // Context do app Android. Se ainda não existir, lançamos um erro que aparece no JS.
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    // Nome usado no requireNativeModule('ModoFocoBlocker') do lado TypeScript.
    Name("ModoFocoBlocker")

    // ---------- Permissões ----------
    Function("hasUsagePermission") {
      PermissionHelper.hasUsagePermission(context)
    }

    Function("openUsageSettings") {
      PermissionHelper.openUsageSettings(context)
    }

    Function("hasOverlayPermission") {
      PermissionHelper.hasOverlayPermission(context)
    }

    Function("openOverlaySettings") {
      PermissionHelper.openOverlaySettings(context)
    }

    // ---------- Lista de apps ----------
    // AsyncFunction roda fora da thread do JS, então carregar dezenas de ícones não trava a interface.
    // No TypeScript ela vira uma Promise.
    AsyncFunction("getLaunchableApps") {
      AppListHelper.getLaunchableApps(context)
    }

    // ---------- Sessão de bloqueio ----------
    // endsAt chega como Double porque números do JS são sempre de ponto flutuante.
    Function("startBlocking") { packages: List<String>, endsAt: Double ->
      // Primeiro salvamos em disco; o serviço lê dali (inclusive se for recriado pelo sistema).
      BlockerPrefs.saveSession(context, packages, endsAt.toLong())
      BlockerService.start(context)
    }

    Function("stopBlocking") {
      // Apagar as prefs primeiro garante que, mesmo se o serviço for recriado, ele não volte a bloquear.
      BlockerPrefs.clear(context)
      BlockerService.stop(context)
    }

    Function("isBlocking") {
      BlockerService.isRunning
    }
  }
}
