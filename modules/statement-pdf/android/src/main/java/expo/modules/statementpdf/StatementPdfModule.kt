package expo.modules.statementpdf

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

class StatementPdfModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("StatementPdf")
    AsyncFunction("recognizePageLayout") { uri: String, number: Int ->
      val parsed = Uri.parse(uri)
      require(parsed.scheme == "file") { "Selezionare un PDF locale." }
      ParcelFileDescriptor.open(File(requireNotNull(parsed.path)), ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
        PdfRenderer(descriptor).use { renderer ->
          require(number in 1..renderer.pageCount) { "Pagina PDF non valida." }
          renderer.openPage(number - 1).use { page ->
            val scale = min(3.0, 2400.0 / max(page.width, page.height))
            val bitmap = Bitmap.createBitmap(max(1, (page.width * scale).toInt()),
              max(1, (page.height * scale).toInt()), Bitmap.Config.ARGB_8888)
            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
            try {
              bitmap.eraseColor(Color.WHITE)
              page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
              val result = Tasks.await(recognizer.process(InputImage.fromBitmap(bitmap, 0)))
              result.textBlocks.flatMap { it.lines }.flatMap { it.elements }.mapNotNull { element ->
                val box = element.boundingBox ?: return@mapNotNull null
                mapOf("text" to element.text, "x" to box.left.toDouble(), "y" to box.exactCenterY().toDouble(),
                  "width" to box.width().toDouble(), "height" to box.height().toDouble())
              }
            } finally {
              recognizer.close()
              bitmap.recycle()
            }
          }
        }
      }
    }
    AsyncFunction("recognizePage") { uri: String, number: Int ->
      val parsed = Uri.parse(uri)
      require(parsed.scheme == "file") { "Selezionare un PDF locale." }
      ParcelFileDescriptor.open(File(requireNotNull(parsed.path)), ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
        PdfRenderer(descriptor).use { renderer ->
          require(number in 1..renderer.pageCount) { "Pagina PDF non valida." }
          renderer.openPage(number - 1).use { page ->
            val scale = min(3.0, 2400.0 / max(page.width, page.height))
            val bitmap = Bitmap.createBitmap(
              max(1, (page.width * scale).toInt()),
              max(1, (page.height * scale).toInt()), Bitmap.Config.ARGB_8888
            )
            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
            try {
              bitmap.eraseColor(Color.WHITE)
              page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
              val result = Tasks.await(recognizer.process(InputImage.fromBitmap(bitmap, 0)))
              val rows = mutableListOf<MutableList<com.google.mlkit.vision.text.Text.Line>>()
              for (line in result.textBlocks.flatMap { it.lines }) {
                val box = line.boundingBox ?: continue
                val row = rows.firstOrNull {
                  abs(requireNotNull(it.first().boundingBox).centerY() - box.centerY()) < bitmap.height * 0.006
                }
                if (row == null) rows.add(mutableListOf(line)) else row.add(line)
              }
              rows.sortedBy { it.first().boundingBox?.centerY() }.joinToString("\n") { row ->
                row.sortedBy { it.boundingBox?.left }.joinToString(" ") { it.text }
              }
            } finally {
              recognizer.close()
              bitmap.recycle()
            }
          }
        }
      }
    }
  }
}
