package com.example.proyecto

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class RSoundAdapter(
    private val items: MutableList<RSound>,
    private val onClick: (RSound) -> Unit
) : RecyclerView.Adapter<RSoundAdapter.ViewHolder>() {

    private var filteredItems: MutableList<RSound> = items.toMutableList()
    private var currentQuery: String = ""

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val txtTitle: TextView = view.findViewById(R.id.txtTitle)
        val txtRelaciones: TextView = view.findViewById(R.id.txtRelaciones)
        val imgCover: android.widget.ImageView = view.findViewById(R.id.imgCover)
        val progressBar = view.findViewById<ProgressBar>(R.id.progressBar)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_rsound, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = filteredItems[position]
        holder.txtTitle.text = item.titulo
        holder.txtRelaciones.text = item.autor
        holder.progressBar.max = 100
        holder.progressBar.progress = (item.progreso * 100).toInt()

        if (item.coverPath != null) {
            holder.imgCover.setImageBitmap(
                android.graphics.BitmapFactory.decodeFile(item.coverPath)
            )
        } else {
            holder.imgCover.setImageResource(android.R.drawable.ic_menu_gallery)
        }

        holder.itemView.setOnClickListener { onClick(item) }
    }

    override fun getItemCount() = filteredItems.size

    /** Llamar después de modificar `items` externamente (ej: onResume) */
    fun refreshData() {
        filter(currentQuery)
    }

    /** Filtra por título o autor */
    fun filter(query: String) {
        currentQuery = query
        filteredItems = if (query.isBlank()) {
            items.toMutableList()
        } else {
            items.filter {
                it.titulo.contains(query, ignoreCase = true) ||
                        it.autor.contains(query, ignoreCase = true)
            }.toMutableList()
        }
        notifyDataSetChanged()
    }

    /** Mueve el ítem al principio */
    fun moverAlPrincipio(rsound: RSound) {
        val index = items.indexOf(rsound)
        if (index > 0) {
            items.removeAt(index)
            items.add(0, rsound)
        }
        val filteredIndex = filteredItems.indexOf(rsound)
        if (filteredIndex > 0) {
            filteredItems.removeAt(filteredIndex)
            filteredItems.add(0, rsound)
            notifyItemMoved(filteredIndex, 0)
        }
    }
}