package com.example.proyecto

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SearchView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton
import org.json.JSONArray
import java.io.File
import java.util.zip.ZipFile

class MainActivity : AppCompatActivity() {

    private val rsounds = mutableListOf<RSound>()
    private lateinit var adapter: RSoundAdapter

    private val pickFile = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.data?.let { uri ->
                val destDir = File(filesDir, "rsounds")
                if (!destDir.exists()) destDir.mkdirs()

                val nombre = uri.lastPathSegment?.substringAfterLast("/") ?: "libro.rsound"
                val dest = File(destDir, nombre)

                contentResolver.openInputStream(uri)?.use { input ->
                    dest.outputStream().use { output ->
                        input.copyTo(output)
                    }
                }

                importarRSound(dest.absolutePath)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val recyclerView = findViewById<RecyclerView>(R.id.recyclerView)
        val emptyText = findViewById<View>(R.id.emptyText)
        val fab = findViewById<FloatingActionButton>(R.id.fab)
        val searchView = findViewById<SearchView>(R.id.searchView)

        adapter = RSoundAdapter(rsounds) { rsound ->
            // Mover al principio y guardar el nuevo orden
            adapter.moverAlPrincipio(rsound)
            RSoundRepository.guardar(this, rsounds)

            // Abrir lector
            val intent = Intent(this, ReaderActivity::class.java)
            intent.putExtra("path", rsound.path)
            startActivity(intent)
        }

        rsounds.addAll(RSoundRepository.cargar(this))
        adapter.notifyDataSetChanged()

        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter

        actualizarEmpty(emptyText)

        // Buscador
        searchView.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String?) = false
            override fun onQueryTextChange(newText: String?): Boolean {
                adapter.filter(newText.orEmpty())
                actualizarEmpty(emptyText)
                return true
            }
        })

        fab.setOnClickListener {
            val intent = Intent(Intent.ACTION_GET_CONTENT)
            intent.type = "*/*"
            pickFile.launch(intent)
        }
    }

    private fun importarRSound(path: String) {
        try {
            val zip = ZipFile(path)

            val relacionesEntry = zip.getEntry("relaciones.json")
            val json = zip.getInputStream(relacionesEntry).bufferedReader().readText()
            val array = JSONArray(json)

            val manifestEntry = zip.getEntry("manifest.json")
            val manifest = org.json.JSONObject(
                zip.getInputStream(manifestEntry).bufferedReader().readText()
            )
            val epubName = manifest.getString("epub").substringAfterLast("/")

            val destDir = File(filesDir, "rsounds_extracted/${File(path).nameWithoutExtension}")
            if (!destDir.exists()) destDir.mkdirs()

            val epubEntry = zip.getEntry("libro/$epubName")
            val epubFile = File(destDir, epubName)
            zip.getInputStream(epubEntry).use { input ->
                epubFile.outputStream().use { output -> input.copyTo(output) }
            }

            var coverPath: String? = null
            try {
                val epubZip = ZipFile(epubFile)
                val coverEntry = epubZip.entries().asSequence().firstOrNull { entry ->
                    entry.name.contains("cover", ignoreCase = true) &&
                            (entry.name.endsWith(".jpg") || entry.name.endsWith(".png") || entry.name.endsWith(".jpeg"))
                }
                if (coverEntry != null) {
                    val coverFile = File(destDir, "cover.jpg")
                    epubZip.getInputStream(coverEntry).use { input ->
                        coverFile.outputStream().use { output -> input.copyTo(output) }
                    }
                    coverPath = coverFile.absolutePath
                }
                epubZip.close()
            } catch (e: Exception) {
                e.printStackTrace()
            }

            zip.close()

            val rsound = RSound(
                titulo = File(path).nameWithoutExtension,
                path = path,
                autor = manifest.optString("autor", ""),
                coverPath = coverPath
            )

            rsounds.add(0, rsound) // Los nuevos también van arriba
            adapter.notifyItemInserted(0)
            actualizarEmpty(findViewById(R.id.emptyText))
            RSoundRepository.guardar(this, rsounds)

        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun actualizarEmpty(view: View) {
        view.visibility = if (rsounds.isEmpty()) View.VISIBLE else View.GONE
    }

    override fun onResume() {
        super.onResume()
        val nuevosDatos = RSoundRepository.cargar(this)
        rsounds.clear()
        rsounds.addAll(nuevosDatos)
        adapter.refreshData()  // ← esto en lugar de adapter.notifyDataSetChanged()
        actualizarEmpty(findViewById(R.id.emptyText))
    }
}
