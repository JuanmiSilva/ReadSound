package com.example.proyecto

import android.media.MediaPlayer
import android.os.Bundle
import android.util.Log
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.readium.r2.navigator.epub.EpubNavigatorFactory
import org.readium.r2.navigator.epub.EpubNavigatorFragment
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.util.toUrl
import java.io.File
import java.util.zip.ZipFile
import org.readium.r2.shared.publication.services.positions
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import android.widget.FrameLayout

class ReaderActivity : AppCompatActivity() {

    private var mediaPlayer: MediaPlayer? = null
    private var relaciones: JSONArray = JSONArray()
    private var cancionActual: String? = null
    private lateinit var rsoundDir: File
    private lateinit var publication: org.readium.r2.shared.publication.Publication
    private var progresionActual: Double = 0.0
    private var hrefActual: String = ""
    private var progressionCapituloActual: Double = 0.0
    private var posicionesPorCapitulo: Map<String, List<Locator>> = emptyMap()
    private lateinit var txtProgresionLibro: TextView
    private lateinit var txtProgresionCapitulo: TextView
    private var spineMap = mutableMapOf<String, Int>()


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_reader)
        txtProgresionLibro = findViewById(R.id.txtProgresionLibro)
        txtProgresionCapitulo = findViewById(R.id.txtProgresionCapitulo)

        // Pantalla completa inmersiva
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }

        findViewById<FrameLayout>(R.id.navigatorContainer).setPadding(0, 0, 0, 0)
        val path = intent.getStringExtra("path") ?: return

        CoroutineScope(Dispatchers.Main).launch {
            abrirRSound(path)
        }
    }

    private suspend fun abrirRSound(path: String) {
        val app = application as App
        val zip = ZipFile(path)

        rsoundDir = File(filesDir, "reader_${System.currentTimeMillis()}")
        rsoundDir.mkdirs()

        zip.entries().asSequence().forEach { entry ->
            val dest = File(rsoundDir, entry.name)
            dest.parentFile?.mkdirs()
            if (!entry.isDirectory) {
                zip.getInputStream(entry).use { input ->
                    dest.outputStream().use { output -> input.copyTo(output) }
                }
            }
        }
        zip.close()

        val relacionesFile = File(rsoundDir, "relaciones.json")
        relaciones = JSONArray(relacionesFile.readText())
        spineMap = mutableMapOf()
        for (i in 0 until relaciones.length()) {
            val rel = relaciones.getJSONObject(i)
            spineMap[rel.getString("href_inicio")] = rel.getInt("spine_inicio")
            spineMap[rel.getString("href_fin")]    = rel.getInt("spine_fin")
        }

        val manifest = org.json.JSONObject(File(rsoundDir, "manifest.json").readText())
        val epubName = manifest.getString("epub").substringAfterLast("/")
        val epubFile = File(rsoundDir, "libro/$epubName")

        val epubUrl = epubFile.toUrl() ?: return
        val asset = app.assetRetriever.retrieve(epubUrl).getOrNull() ?: return
        publication = app.publicationOpener.open(asset, allowUserInteraction = false)
            .getOrNull() ?: return

        // Calcular posiciones
        val positions = publication.positions()
        android.util.Log.d("RSOUND", "Total posiciones: ${positions.size}")
        posicionesPorCapitulo = positions.groupBy { it.href.toString() }
        android.util.Log.d("RSOUND", "Capítulos con posiciones: ${posicionesPorCapitulo.size}")

        val factory = EpubNavigatorFactory(publication)
        val rsound = RSoundRepository.cargar(this)
            .find { it.path == path }

        val progreso = rsound?.let {
            Triple(it.progreso, it.href, it.progressionCapitulo)
        }

        val initialLocator = if (progreso != null) {
            val (totalProgresion, href, progressionCapitulo) = progreso
            val link = publication.readingOrder.firstOrNull {
                it.url().toString().endsWith(href.substringAfterLast("/"))
            } ?: publication.readingOrder.first()

            Locator(
                href = link.url(),
                mediaType = link.mediaType ?: org.readium.r2.shared.util.mediatype.MediaType.XHTML,
                locations = Locator.Locations(
                    progression = progressionCapitulo,
                    totalProgression = totalProgresion
                )
            )
        } else null

        val fragmentFactory = factory.createFragmentFactory(
            initialLocator = initialLocator,
            listener = null
        )

        supportFragmentManager.fragmentFactory = fragmentFactory
        supportFragmentManager.beginTransaction()
            .replace(R.id.navigatorContainer, EpubNavigatorFragment::class.java, null)
            .commit()

        supportFragmentManager.addFragmentOnAttachListener { _, fragment ->
            if (fragment is EpubNavigatorFragment) {
                CoroutineScope(Dispatchers.Main).launch {
                    fragment.currentLocator.collect { locator ->
                        comprobarRelacion(locator)
                    }
                }
            }
        }
    }

    private fun obtenerSpineIndex(href: String): Int? = spineMap[href]

    private fun comprobarRelacion(locator: Locator) {
        val totalProgresion = locator.locations.totalProgression ?: return

        progresionActual = totalProgresion
        hrefActual = locator.href.toString()
        progressionCapituloActual = locator.locations.progression ?: 0.0

        // Actualizar la ProgressBar del lector (si la tienes en activity_reader.xml):
        val porcentaje = (totalProgresion * 100).toInt()
        txtProgresionLibro.text = "$porcentaje%"

        val porcentajeCapitulo = (progressionCapituloActual * 100).toInt()
        txtProgresionCapitulo.text = "Capítulo: $porcentajeCapitulo%"

        val path = intent.getStringExtra("path") ?: return
        RSoundRepository.guardarProgreso(this, path, progresionActual, hrefActual, progressionCapituloActual)

        for (i in 0 until relaciones.length()) {
            val margen = 0.04
            val rel = relaciones.getJSONObject(i)
            val progInicio = rel.getDouble("progression_cap_inicio") + margen
            val progFin    = rel.getDouble("progression_cap_fin") + margen
            val audioPath  = File(rsoundDir, rel.getString("audio")).absolutePath
            val descripcion = rel.getString("descripcion")

            android.util.Log.d("RSOUND", "total: $totalProgresion | rango: ${progInicio} .. ${progFin}")

            if (totalProgresion >= progInicio && totalProgresion <= progFin) {
                if (cancionActual != audioPath) {
                    cancionActual = audioPath
                    reproducir(audioPath, descripcion)
                }
                return
            }
        }

        if (cancionActual != null) {
            detenerMusica()
            cancionActual = null
        }

    }
    private fun detenerMusica(){
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
        } catch (e: Exception) {}
        cancionActual = null
    }
    private fun reproducir(path: String, descripcion: String) {
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
        } catch (e: Exception) {
            // ignorar si el player estaba en mal estado
        }
        mediaPlayer = MediaPlayer().apply {
            setDataSource(path)
            prepare()
            start()
        }
        Toast.makeText(this, "♪ $descripcion", Toast.LENGTH_LONG).show()
    }

    override fun onDestroy() {
        super.onDestroy()
        val path = intent.getStringExtra("path") ?: return
        android.util.Log.d("RSOUND", "onDestroy - path: $path, progresion: $progresionActual")
        android.util.Log.d("RSOUND", "onDestroy - path: $path, progresion: $progresionActual, href: $hrefActual")
        RSoundRepository.guardarProgreso(this, path, progresionActual, hrefActual, progressionCapituloActual)
        mediaPlayer?.release()
        rsoundDir.deleteRecursively()
    }
}