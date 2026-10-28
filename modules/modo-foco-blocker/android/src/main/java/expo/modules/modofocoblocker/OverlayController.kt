package expo.modules.modofocoblocker

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Mostra e esconde a tela de bloqueio que fica POR CIMA do app bloqueado.
 *
 * Ela não é uma Activity: é uma View adicionada direto no WindowManager (o "gerenciador de janelas"
 * do Android) com o tipo TYPE_APPLICATION_OVERLAY. Por isso precisa da permissão
 * "Sobrepor a outros apps" (SYSTEM_ALERT_WINDOW).
 *
 * A tela é montada em código (sem XML) para ficar tudo num lugar só e fácil de explicar.
 * Todas as funções devem ser chamadas na thread principal (a thread da interface).
 */
class OverlayController(
  private val context: Context,
  /** Chamado quando o usuário toca em "Voltar ao foco". */
  private val onBackToFocus: () -> Unit,
  /** Chamado quando o usuário toca em "Desbloquear por 1 minuto". */
  private val onUnlockOneMinute: () -> Unit
) {

  companion object {
    // Tempo que o botão de desbloqueio fica desativado, para a pessoa pensar duas vezes.
    private const val UNLOCK_DELAY_SECONDS = 5
  }

  private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
  private val handler = Handler(Looper.getMainLooper())

  // Referências para a View atual. Ficam null quando o overlay está escondido.
  private var rootView: View? = null
  private var minutesText: TextView? = null
  private var unlockButton: Button? = null
  private var unlockSecondsLeft = 0

  val isShowing: Boolean
    get() = rootView != null

  /**
   * Mostra o overlay com quantos minutos faltam. Se ele já estiver na tela, só atualiza o texto.
   */
  fun show(minutesLeft: Long) {
    if (isShowing) {
      minutesText?.text = minutesLabel(minutesLeft)
      return
    }

    val view = buildView(minutesLeft)

    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      // Tipo de janela que fica por cima dos outros apps (Android 8+).
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      // Ocupa a tela toda, inclusive atrás da barra de status.
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT
    )

    try {
      windowManager.addView(view, params)
      rootView = view
      startUnlockCountdown()
    } catch (e: Exception) {
      // Acontece, por exemplo, se o usuário tirou a permissão de sobreposição no meio da sessão.
      Log.e(BlockerService.TAG, "Não foi possível mostrar o overlay", e)
    }
  }

  /** Remove o overlay da tela (se estiver aparecendo). */
  fun hide() {
    val view = rootView ?: return
    handler.removeCallbacksAndMessages(null) // cancela a contagem do botão de desbloqueio
    try {
      windowManager.removeView(view)
    } catch (e: Exception) {
      Log.e(BlockerService.TAG, "Erro ao remover o overlay", e)
    }
    rootView = null
    minutesText = null
    unlockButton = null
  }

  // ---------------------------------------------------------------------------------------------
  // Montagem da tela
  // ---------------------------------------------------------------------------------------------

  private fun buildView(minutesLeft: Long): View {
    val title = TextView(context).apply {
      text = "Você está em foco."
      setTextColor(Color.WHITE)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 28f)
      gravity = Gravity.CENTER
    }

    val minutes = TextView(context).apply {
      text = minutesLabel(minutesLeft)
      setTextColor(Color.parseColor("#CCE4FF"))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
      gravity = Gravity.CENTER
    }
    minutesText = minutes

    val backButton = Button(context).apply {
      text = "Voltar ao foco"
      setOnClickListener { onBackToFocus() }
    }

    // Começa desativado; a contagem regressiva (startUnlockCountdown) ativa depois de 5 s.
    val unlock = Button(context).apply {
      isEnabled = false
      setOnClickListener { onUnlockOneMinute() }
    }
    unlockButton = unlock

    return LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#F2102A43")) // azul escuro quase opaco
      val padding = dp(32)
      setPadding(padding, padding, padding, padding)

      // O clique "vazio" no fundo não faz nada, mas impede que o toque passe para o app de baixo.
      isClickable = true

      addView(title, wrap())
      addView(minutes, wrap(topMargin = dp(12)))
      addView(backButton, wrap(topMargin = dp(40)))
      addView(unlock, wrap(topMargin = dp(16)))
    }
  }

  /**
   * Atualiza o botão de desbloqueio a cada segundo: "(5)", "(4)"... até ficar ativo.
   * Esse atraso existe para que desbloquear seja uma decisão consciente, sem ser punitivo.
   */
  private fun startUnlockCountdown() {
    unlockSecondsLeft = UNLOCK_DELAY_SECONDS
    val tick = object : Runnable {
      override fun run() {
        val button = unlockButton ?: return
        if (unlockSecondsLeft > 0) {
          button.text = "Desbloquear por 1 minuto ($unlockSecondsLeft)"
          button.isEnabled = false
          unlockSecondsLeft--
          handler.postDelayed(this, 1000)
        } else {
          button.text = "Desbloquear por 1 minuto"
          button.isEnabled = true
        }
      }
    }
    handler.post(tick)
  }

  private fun minutesLabel(minutes: Long): String =
    if (minutes == 1L) "Falta 1 minuto" else "Faltam $minutes minutos"

  /** Converte dp (unidade independente da densidade da tela) em pixels. */
  private fun dp(value: Int): Int =
    TypedValue.applyDimension(
      TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), context.resources.displayMetrics
    ).toInt()

  private fun wrap(topMargin: Int = 0) = LinearLayout.LayoutParams(
    LinearLayout.LayoutParams.MATCH_PARENT,
    LinearLayout.LayoutParams.WRAP_CONTENT
  ).apply { this.topMargin = topMargin }
}
