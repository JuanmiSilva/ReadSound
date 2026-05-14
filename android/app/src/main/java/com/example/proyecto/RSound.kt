package com.example.proyecto

data class RSound(
    val titulo: String,
    val path: String,
    val autor: String = "",
    val coverPath: String?,
    var progreso: Double = 0.0,
    var href: String = "",
    var progressionCapitulo: Double = 0.0
)