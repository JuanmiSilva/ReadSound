package com.example.proyecto

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

object RSoundRepository {

    private const val FILE_NAME = "rsounds.json"

    fun guardar(context: Context, rsounds: List<RSound>) {
        val array = JSONArray()

        rsounds.forEach { r ->
            val obj = JSONObject()

            obj.put("titulo", r.titulo)
            obj.put("path", r.path)
            obj.put("autor", r.autor)
            obj.put("coverPath", r.coverPath ?: "")

            // 🆕 PROGRESO
            obj.put("progreso", r.progreso)
            obj.put("href", r.href)
            obj.put("progressionCapitulo", r.progressionCapitulo)

            array.put(obj)
        }

        File(context.filesDir, FILE_NAME).writeText(array.toString())
    }

    fun cargar(context: Context): MutableList<RSound> {
        val file = File(context.filesDir, FILE_NAME)
        if (!file.exists()) return mutableListOf()

        val array = JSONArray(file.readText())
        val lista = mutableListOf<RSound>()

        for (i in 0 until array.length()) {
            val obj = array.getJSONObject(i)

            val coverPath = obj.getString("coverPath").takeIf { it.isNotEmpty() }

            lista.add(
                RSound(
                    titulo = obj.getString("titulo"),
                    path = obj.getString("path"),
                    autor = obj.optString("autor", ""),
                    coverPath = coverPath,

                    // 🆕 PROGRESO
                    progreso = obj.optDouble("progreso", 0.0),
                    href = obj.optString("href", ""),
                    progressionCapitulo = obj.optDouble("progressionCapitulo", 0.0)
                )
            )
        }

        return lista
    }

    fun guardarProgreso(
        context: Context,
        path: String,
        progresion: Double,
        href: String,
        progressionCapitulo: Double
    ) {
        val lista = cargar(context)

        val item = lista.find { it.path == path } ?: return

        item.progreso = progresion
        item.href = href
        item.progressionCapitulo = progressionCapitulo

        guardar(context, lista)
    }

}