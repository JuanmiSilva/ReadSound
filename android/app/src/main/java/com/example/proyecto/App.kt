package com.example.proyecto

import android.app.Application
import org.readium.r2.shared.util.asset.AssetRetriever
import org.readium.r2.shared.util.http.DefaultHttpClient
import org.readium.r2.streamer.PublicationOpener
import org.readium.r2.streamer.parser.DefaultPublicationParser

class App : Application() {

    lateinit var assetRetriever: AssetRetriever
        private set

    lateinit var publicationOpener: PublicationOpener
        private set

    override fun onCreate() {
        super.onCreate()
        val httpClient = DefaultHttpClient()
        assetRetriever = AssetRetriever(
            contentResolver = contentResolver,
            httpClient = httpClient
        )
        publicationOpener = PublicationOpener(
            publicationParser = DefaultPublicationParser(
                context = this,
                httpClient = httpClient,
                assetRetriever = assetRetriever,
                pdfFactory = null
            )
        )
    }
}