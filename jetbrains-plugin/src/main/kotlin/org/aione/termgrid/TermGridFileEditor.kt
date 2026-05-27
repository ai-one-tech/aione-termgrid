package org.aione.termgrid

import com.google.gson.Gson
import com.google.gson.JsonObject
import com.intellij.ide.ui.LafManagerListener
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.editor.colors.EditorColorsManager
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorLocation
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.progress.ProcessCanceledException
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.util.UserDataHolderBase
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.util.messages.MessageBusConnection
import com.intellij.ui.ColorUtil
import com.intellij.ui.JBColor
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefJSQuery
import org.aione.termgrid.terminal.JetBrainsPtyManager
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefDisplayHandlerAdapter
import org.cef.handler.CefLoadHandlerAdapter
import org.cef.CefSettings
import org.yaml.snakeyaml.DumperOptions
import org.yaml.snakeyaml.Yaml
import java.beans.PropertyChangeListener
import java.io.File
import java.nio.charset.StandardCharsets
import javax.swing.JComponent

class TermGridFileEditor(
    private val project: Project,
    private val file: VirtualFile
) : UserDataHolderBase(), FileEditor {

    private val browser = JBCefBrowser()
    private val jsQuery = JBCefJSQuery.create(browser as JBCefBrowserBase)
    private val ptyManager = JetBrainsPtyManager(project, ::broadcastToWebview)
    private val gson = Gson()
    private val yaml: Yaml
    private var isModifiedFlag = false
    private var tempFolder: File? = null
    @Volatile
    private var currentConfig: Map<String, Any>? = null
    private var connection: MessageBusConnection? = null
    private val componentPanel: JComponent

    init {
        val options = DumperOptions()
        options.defaultFlowStyle = DumperOptions.FlowStyle.BLOCK
        options.setPrettyFlow(true)
        yaml = Yaml(options)

        componentPanel = javax.swing.JPanel(java.awt.BorderLayout())
        componentPanel.add(browser.component, java.awt.BorderLayout.CENTER)

        setupMessageBridge()
        setupThemeListener()
        setupFileCloseListener()
        loadFrontend()
        TermGridEditorRegistry.register(file.path, this)
    }

    private fun setupFileCloseListener() {
        connection = project.messageBus.connect()
        connection?.subscribe(FileEditorManagerListener.Before.FILE_EDITOR_MANAGER, object : FileEditorManagerListener.Before {
            override fun beforeFileClosed(source: FileEditorManager, fileToClose: VirtualFile) {
                if (fileToClose == file) {
                    if (ptyManager.hasActiveTerminals()) {
                        ApplicationManager.getApplication().invokeLater {
                            Messages.showWarningDialog(project, "请先停止运行中的 Grid 实例后再关闭文件", "无法关闭文件")
                        }
                        throw ProcessCanceledException()
                    }
                }
            }
        })
    }

    override fun getFile(): VirtualFile = file
    fun getPtyManager(): JetBrainsPtyManager = ptyManager

    private fun setupMessageBridge() {
        println("[TermGridFileEditor] Setting up message bridge")
        jsQuery.addHandler { request ->
            println("[TermGridFileEditor] Received request from JS: $request")
            try {
                handleWebviewMessage(request)
            } catch (e: Exception) {
                println("[TermGridFileEditor] Error handling request: ${e.message}")
                e.printStackTrace()
            }
            null
        }

        browser.jbCefClient.addLoadHandler(object : CefLoadHandlerAdapter() {
            override fun onLoadEnd(browser: CefBrowser?, frame: CefFrame?, httpStatusCode: Int) {
                println("[TermGridFileEditor] onLoadEnd called, frame isMain: ${frame?.isMain}, httpStatusCode: $httpStatusCode")
                if (frame != null && frame.isMain) {
                    // Inject our custom cefQuery hook into the JS window context
                    val injectScript = """
                        window.cefQuery = function(queryObj) {
                            ${jsQuery.inject("queryObj.request")}
                        };
                    """.trimIndent()
                    println("[TermGridFileEditor] Injecting cefQuery script")
                    frame.executeJavaScript(injectScript, frame.url ?: "", 0)
                    updateThemeInWebview()
                }
            }
        }, browser.cefBrowser)

        browser.jbCefClient.addDisplayHandler(object : CefDisplayHandlerAdapter() {
            override fun onConsoleMessage(
                browser: CefBrowser?,
                level: CefSettings.LogSeverity?,
                message: String?,
                source: String?,
                line: Int
            ): Boolean {
                println("[TermGrid JS Console] [$level] ($source:$line): $message")
                return false
            }
        }, browser.cefBrowser)
    }

    private fun setupThemeListener() {
        val connection = ApplicationManager.getApplication().messageBus.connect(this)
        connection.subscribe(LafManagerListener.TOPIC, LafManagerListener {
            updateThemeInWebview()
        })
    }

    private fun updateThemeInWebview() {
        val isLight = JBColor.isBright()
        val themeClass = if (isLight) "jb-light" else "jb-dark"
        val bgHex = getThemeBackgroundHex()
        val fgHex = getThemeForegroundHex()

        val cssInjection = """
            console.log('[Theme] isLight: ${isLight}, bg: ${bgHex}, fg: ${fgHex}');
            document.body.className = '${themeClass}';
            document.documentElement.style.setProperty('--jb-editor-background', '${bgHex}');
            document.documentElement.style.setProperty('--jb-editor-foreground', '${fgHex}');
            document.documentElement.style.setProperty('--editor-background', '${bgHex}');
            document.documentElement.style.setProperty('--editor-foreground', '${fgHex}');
            window.dispatchEvent(new Event('tg-theme-updated'));
        """.trimIndent()
        browser.cefBrowser.executeJavaScript(cssInjection, browser.cefBrowser.url, 0)
    }

    private fun getThemeBackgroundHex(): String {
        val scheme = EditorColorsManager.getInstance().globalScheme
        return "#" + ColorUtil.toHex(scheme.defaultBackground)
    }

    private fun getThemeForegroundHex(): String {
        val scheme = EditorColorsManager.getInstance().globalScheme
        return "#" + ColorUtil.toHex(scheme.defaultForeground)
    }

    private fun loadFrontend() {
        val useLocalFrontend = java.lang.Boolean.getBoolean("termgrid.dev.frontend") ||
            System.getenv("TERMGRID_DEV_FRONTEND") == "1"
        val localPath = File(project.basePath, "dist/index.html")
        if (useLocalFrontend && localPath.exists()) {
            // Local development mode
            browser.loadURL(localPath.toURI().toURL().toExternalForm())
        } else {
            // Packaged production mode: extract assets from resources to a temp folder
            try {
                if (tempFolder == null) {
                    tempFolder = com.intellij.openapi.util.io.FileUtil.createTempDirectory("termgrid-dist", null, true)
                    extractResourceFolder("dist", tempFolder!!)
                }
                val indexFile = File(tempFolder, "index.html")
                if (indexFile.exists()) {
                    browser.loadURL(indexFile.toURI().toURL().toExternalForm())
                } else {
                    browser.loadHTML("<html><body><h3>TermGrid Frontend dist/index.html not found! Please build the webview first.</h3></body></html>")
                }
            } catch (e: Exception) {
                e.printStackTrace()
                browser.loadHTML("<html><body><h3>Error extracting/loading webview: ${e.message}</h3></body></html>")
            }
        }
        if (java.lang.Boolean.getBoolean("termgrid.devtools")) {
            browser.openDevtools()
        }
    }

    private fun extractResourceFolder(resourcePath: String, targetDir: File) {
        val files = listOf(
            "index.html",
            "assets/main.js",
            "assets/main.css"
        )
        for (relPath in files) {
            val resourceStream = javaClass.classLoader.getResourceAsStream("$resourcePath/$relPath")
            if (resourceStream != null) {
                val targetFile = File(targetDir, relPath)
                targetFile.parentFile.mkdirs()
                java.nio.file.Files.copy(resourceStream, targetFile.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING)
                resourceStream.close()
            }
        }
    }

    private fun handleWebviewMessage(request: String) {
        val message = gson.fromJson(request, JsonObject::class.java) ?: return
        val type = message.get("type")?.asString ?: return
        val payload = message.getAsJsonObject("payload") ?: JsonObject()

        when (type) {
            "webview:ready" -> {
                sendConfigLoaded()
                // Sync any active terminal states
                syncActiveTerminals()
            }
            "config:save" -> {
                val configObj = payload.getAsJsonObject("config")
                if (configObj != null) {
                    saveConfig(configObj)
                }
            }
            "config:saveAs" -> {
                val name = payload.get("name")?.asString
                val configObj = payload.getAsJsonObject("config")
                if (name != null && configObj != null) {
                    saveConfigAs(name, configObj)
                }
            }
            "terminal:start" -> {
                val cellId = payload.get("cellId")?.asString
                if (cellId != null) {
                    val cell = getCellFromConfig(cellId)
                    if (cell != null) {
                        ptyManager.startCell(cell)
                    }
                }
            }
            "terminal:stop" -> {
                val cellId = payload.get("cellId")?.asString
                if (cellId != null) {
                    ptyManager.stopCell(cellId)
                }
            }
            "terminal:restart" -> {
                val cellId = payload.get("cellId")?.asString
                if (cellId != null) {
                    val cell = getCellFromConfig(cellId)
                    if (cell != null) {
                        ptyManager.restartCell(cell)
                    }
                }
            }
            "terminal:restartAll" -> {
                val cells = getAllCells()
                ptyManager.restartAll(cells)
            }
            "terminal:input" -> {
                val cellId = payload.get("cellId")?.asString
                val data = payload.get("data")?.asString
                if (cellId != null && data != null) {
                    ptyManager.sendInput(cellId, data)
                }
            }
            "terminal:resize" -> {
                val cellId = payload.get("cellId")?.asString
                val cols = payload.get("cols")?.asInt ?: 80
                val rows = payload.get("rows")?.asInt ?: 24
                if (cellId != null) {
                    ptyManager.resize(cellId, cols, rows)
                }
            }
            "webview:reload" -> {
                loadFrontend()
            }
        }
    }

    private fun sendConfigLoaded() {
        ApplicationManager.getApplication().executeOnPooledThread {
            try {
                val content = ApplicationManager.getApplication().runReadAction<String> {
                    String(file.contentsToByteArray(), StandardCharsets.UTF_8)
                }
                val parsedYaml = try {
                    if (content.isBlank()) {
                        mapOf("name" to file.nameWithoutExtension, "cells" to emptyList<Any>())
                    } else {
                        yaml.load<Map<String, Any>>(content) ?: mapOf("name" to file.nameWithoutExtension, "cells" to emptyList<Any>())
                    }
                } catch (e: Exception) {
                    println("[TermGridFileEditor] YAML parse error: ${e.message}")
                    mapOf("name" to file.nameWithoutExtension, "cells" to emptyList<Any>())
                }
                currentConfig = parsedYaml
                sendToWebview("config:loaded", mapOf("config" to parsedYaml))
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun syncActiveTerminals() {
        ApplicationManager.getApplication().executeOnPooledThread {
            try {
                val cells = getAllCells()
                for (cell in cells) {
                    val cellId = cell["id"] as? String ?: continue
                    val status = ptyManager.getStatus(cellId)
                    if (status != "stopped") {
                        sendToWebview("terminal:status", mapOf("cellId" to cellId, "status" to status))
                        val buffer = ptyManager.getBuffer(cellId)
                        if (buffer.isNotEmpty()) {
                            sendToWebview("terminal:data", mapOf("cellId" to cellId, "data" to buffer))
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun getCellFromConfig(cellId: String): Map<String, Any>? {
        return getAllCells().find { (it["id"] as? String) == cellId }
    }

    @Suppress("UNCHECKED_CAST")
    fun getAllCells(): List<Map<String, Any>> {
        val config = currentConfig
        if (config != null) {
            return config["cells"] as? List<Map<String, Any>> ?: emptyList()
        }
        return try {
            val content = ApplicationManager.getApplication().runReadAction<String> {
                String(file.contentsToByteArray(), StandardCharsets.UTF_8)
            }
            if (content.isBlank()) return emptyList()
            val parsedYaml = try {
                yaml.load<Map<String, Any>>(content)
            } catch (e: Exception) {
                null
            }
            currentConfig = parsedYaml
            parsedYaml?.get("cells") as? List<Map<String, Any>> ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun saveConfig(configObj: JsonObject) {
        val configMap = gson.fromJson(configObj, Map::class.java) ?: return
        currentConfig = configMap as? Map<String, Any>
        WriteCommandAction.runWriteCommandAction(project) {
            try {
                val yamlString = yaml.dump(configMap)
                file.setBinaryContent(yamlString.toByteArray(StandardCharsets.UTF_8))
                isModifiedFlag = false
                sendToWebview("config:saved", mapOf("config" to configMap))
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun saveConfigAs(name: String, configObj: JsonObject) {
        val configMap = gson.fromJson(configObj, Map::class.java) as MutableMap<Any, Any>
        configMap["name"] = name
        currentConfig = configMap as? Map<String, Any>
        
        WriteCommandAction.runWriteCommandAction(project) {
            try {
                val parentDir = file.parent
                val newFileName = if (name.endsWith(".tg")) name else "$name.tg"
                
                var newFile = parentDir.findChild(newFileName)
                if (newFile == null) {
                    newFile = parentDir.createChildData(this, newFileName)
                }
                
                val yamlString = yaml.dump(configMap)
                newFile.setBinaryContent(yamlString.toByteArray(StandardCharsets.UTF_8))
                
                sendToWebview("config:savedAs", mapOf("filePath" to newFile.path))
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun sendToWebview(type: String, payload: Any) {
        broadcastToWebview(gson.toJson(mapOf("type" to type, "payload" to payload)))
    }

    private fun broadcastToWebview(messageJson: String) {
        val script = "if (window.postMessageFromJava) { window.postMessageFromJava(${gson.toJson(messageJson)}); }"
        browser.cefBrowser.executeJavaScript(script, browser.cefBrowser.url, 0)
    }

    override fun getComponent(): JComponent = componentPanel

    override fun getPreferredFocusedComponent(): JComponent? = browser.component

    override fun getName(): String = "TermGrid Editor"

    override fun setState(state: FileEditorState) {}

    override fun isModified(): Boolean = isModifiedFlag

    override fun isValid(): Boolean = file.isValid

    override fun addPropertyChangeListener(listener: PropertyChangeListener) {}

    override fun removePropertyChangeListener(listener: PropertyChangeListener) {}

    override fun getCurrentLocation(): FileEditorLocation? = null

    override fun dispose() {
        connection?.disconnect()
        TermGridEditorRegistry.unregister(file.path)
        ptyManager.dispose()
        jsQuery.dispose()
        browser.dispose()
        tempFolder?.let { com.intellij.openapi.util.io.FileUtil.delete(it) }
    }
}
