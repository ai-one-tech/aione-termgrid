plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.22"
    id("org.jetbrains.intellij.platform") version "2.0.0"
}

group = "org.aione.termgrid"
version = "0.1.7"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        intellijIdeaCommunity("2023.3.4")
        instrumentationTools()
    }
    implementation("org.yaml:snakeyaml:2.2")
}

intellijPlatform {
    pluginConfiguration {
        id = "org.aione.termgrid"
        name = "TermGrid AiOne"
        version = "0.1.7"
        description = "Batch manage multiple terminals in a grid layout with support for merging cells, theme customization, and multi-language interface."
        vendor {
            name.set("AiOne")
            email.set("tech@ai-one.org")
            url.set("https://github.com/ai-one-tech/aione-termgrid")
        }
        ideaVersion {
            sinceBuild.set("233")
            untilBuild.set(provider { null as String? })
        }
    }
}

val generateIndexHtml = tasks.register("generateIndexHtml") {
    doLast {
        val htmlContent = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <link rel="stylesheet" href="assets/main.css">
              <title>AiOne TermGrid</title>
            </head>
            <body>
              <div id="root"></div>
              <script src="assets/main.js"></script>
            </body>
            </html>
        """.trimIndent()
        
        val resourcesDistDir = file("src/main/resources/dist")
        resourcesDistDir.mkdirs()
        file("src/main/resources/dist/index.html").writeText(htmlContent, Charsets.UTF_8)
        
        val rootDistDir = file("../dist")
        if (rootDistDir.exists()) {
            file("../dist/index.html").writeText(htmlContent, Charsets.UTF_8)
        }
    }
}

// Copy compiled Vite/React webview assets into resources before jar compilation
val copyWebviewAssets = tasks.register<Copy>("copyWebviewAssets") {
    dependsOn(generateIndexHtml)
    from(file("../dist"))
    into(file("src/main/resources/dist"))
}

tasks.named("processResources") {
    dependsOn(copyWebviewAssets)
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    kotlinOptions {
        jvmTarget = "17"
    }
}
