package org.aione.termgrid.terminal

import com.google.gson.Gson
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.pty4j.PtyProcess
import com.pty4j.PtyProcessBuilder
import com.pty4j.WinSize
import java.io.File
import java.io.InputStreamReader
import java.io.OutputStream
import java.nio.charset.StandardCharsets
import java.util.concurrent.ConcurrentHashMap
import kotlin.concurrent.thread

class JetBrainsPtyManager(
    private val project: Project,
    private val broadcast: (String) -> Unit
) {
    private val gson = Gson()
    private val processes = ConcurrentHashMap<String, PtyInstance>()

    class PtyInstance(
        val id: String,
        val process: PtyProcess,
        var status: String,
        val buffer: StringBuilder = StringBuilder()
    )

    fun getStatus(cellId: String): String {
        val instance = processes[cellId]
        if (instance == null) return "stopped"
        if (!instance.process.isAlive) return "stopped"
        return instance.status
    }

    fun hasActiveTerminals(): Boolean {
        return processes.isNotEmpty()
    }

    fun getBuffer(cellId: String): String {
        return processes[cellId]?.buffer?.toString() ?: ""
    }

    @Suppress("UNCHECKED_CAST")
    fun startCell(cell: Map<String, Any>) {
        val cellId = cell["id"] as? String ?: return
        if (processes.containsKey(cellId)) {
            stopCell(cellId)
        }

        try {
            updateStatus(cellId, "pending")

            val shellCmd = getDefaultShell()
            val projectRoot = project.basePath ?: System.getProperty("user.home")
            
            // Resolve working directory (cwd)
            var cwd = cell["cwd"] as? String ?: "."
            if (cwd == "." || cwd.isEmpty()) {
                cwd = projectRoot
            } else if (!File(cwd).isAbsolute) {
                cwd = File(projectRoot, cwd).absolutePath
            }
            if (!File(cwd).exists()) {
                cwd = projectRoot
            }

            // Resolve environment variables
            val mergedEnv = HashMap(System.getenv())
            
            // 1. Env files
            val envFiles = cell["envFiles"] as? List<String>
            if (envFiles != null) {
                for (fileRelPath in envFiles) {
                    val file = if (File(fileRelPath).isAbsolute) File(fileRelPath) else File(projectRoot, fileRelPath)
                    if (file.exists()) {
                        file.readLines(StandardCharsets.UTF_8).forEach { line ->
                            val trimmed = line.trim()
                            if (trimmed.isNotEmpty() && !trimmed.startsWith("#")) {
                                val eqIdx = trimmed.indexOf('=')
                                if (eqIdx > 0) {
                                    val k = trimmed.substring(0, eqIdx).trim()
                                    val v = trimmed.substring(eqIdx + 1).trim()
                                    if (k.isNotEmpty()) {
                                        mergedEnv[k] = v
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 2. Inline environment variables
            val inlineEnv = cell["env"] as? Map<String, String>
            if (inlineEnv != null) {
                mergedEnv.putAll(inlineEnv)
            }

            // Spawn the PTY process
            val builder = PtyProcessBuilder()
                .setCommand(arrayOf(shellCmd.first, *shellCmd.second))
                .setEnvironment(mergedEnv)
                .setDirectory(cwd)
                .setConsole(true)
            
            val process = builder.start()

            val instance = PtyInstance(cellId, process, "running")
            processes[cellId] = instance
            updateStatus(cellId, "running")

            // Start background reader thread
            thread(name = "TermGrid-Reader-$cellId") {
                val reader = InputStreamReader(process.inputStream, StandardCharsets.UTF_8)
                val buffer = CharArray(1024)
                try {
                    var readChars = 0
                    while (process.isAlive && reader.read(buffer).also { readChars = it } != -1) {
                        val chunk = String(buffer, 0, readChars)
                        instance.buffer.append(chunk)
                        
                        // Limit buffer size to 200k characters
                        if (instance.buffer.length > 200_000) {
                            instance.buffer.delete(0, instance.buffer.length - 200_000)
                        }

                        // Broadcast terminal data back to JS
                        val dataMsg = mapOf(
                            "type" to "terminal:data",
                            "payload" to mapOf(
                                "cellId" to cellId,
                                "data" to chunk
                            )
                        )
                        broadcast(gson.toJson(dataMsg))
                    }
                } catch (e: Exception) {
                    // Ignore reading errors when terminal exits
                } finally {
                    try {
                        val exitCode = process.exitValue()
                        processes.remove(cellId)
                        updateStatus(cellId, "stopped")
                        
                        val exitMsg = mapOf(
                            "type" to "terminal:exited",
                            "payload" to mapOf(
                                "cellId" to cellId,
                                "code" to exitCode
                            )
                        )
                        broadcast(gson.toJson(exitMsg))
                    } catch (e: Exception) {
                        processes.remove(cellId)
                        updateStatus(cellId, "stopped")
                    }
                }
            }

            // Type the initial command after shell initialization delay
            val commandRaw = cell["command"]
            val initialCommand = resolveCommandText(commandRaw)
            if (initialCommand.isNotEmpty()) {
                val delay = (cell["delay"] as? Number)?.toLong() ?: 2000L
                ApplicationManager.getApplication().executeOnPooledThread {
                    try {
                        Thread.sleep(delay)
                        val active = processes[cellId]
                        if (active != null && active.process.isAlive) {
                            val outputStream: OutputStream = active.process.outputStream
                            outputStream.write(("$initialCommand\r\n").toByteArray(StandardCharsets.UTF_8))
                            outputStream.flush()
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }

        } catch (e: Exception) {
            e.printStackTrace()
            updateStatus(cellId, "error")
        }
    }

    private fun resolveCommandText(commandRaw: Any?): String {
        if (commandRaw == null) return ""
        if (commandRaw is String) return commandRaw
        if (commandRaw is Map<*, *>) {
            val osKey = when {
                System.getProperty("os.name").lowercase().contains("win") -> "win32"
                System.getProperty("os.name").lowercase().contains("mac") -> "darwin"
                else -> "linux"
            }
            return listOf(osKey, "default")
                .asSequence()
                .mapNotNull { commandRaw[it] as? String }
                .firstOrNull { it.isNotBlank() }
                ?: ""
        }
        return ""
    }

    fun stopCell(cellId: String) {
        val instance = processes.remove(cellId) ?: return
        try {
            if (instance.process.isAlive) {
                instance.process.destroyForcibly()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        updateStatus(cellId, "stopped")
    }

    fun restartCell(cell: Map<String, Any>) {
        val cellId = cell["id"] as? String ?: return
        stopCell(cellId)
        Thread.sleep(100)
        startCell(cell)
    }

    fun restartAll(cells: List<Map<String, Any>>) {
        // Stop all active processes first
        for (cell in cells) {
            val cellId = cell["id"] as? String ?: continue
            stopCell(cellId)
        }
        Thread.sleep(300)
        
        // Start all cells in order
        for (cell in cells) {
            startCell(cell)
            // Small gap to prevent starting multiple shells simultaneously hitting CPU
            Thread.sleep(200)
        }
    }

    fun sendInput(cellId: String, data: String) {
        val instance = processes[cellId] ?: return
        if (instance.process.isAlive) {
            try {
                instance.process.outputStream.write(data.toByteArray(StandardCharsets.UTF_8))
                instance.process.outputStream.flush()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun resize(cellId: String, cols: Int, rows: Int) {
        val instance = processes[cellId] ?: return
        if (instance.process.isAlive) {
            try {
                instance.process.winSize = WinSize(cols, rows)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun updateStatus(cellId: String, status: String) {
        processes[cellId]?.let { it.status = status }
        val statusMsg = mapOf(
            "type" to "terminal:status",
            "payload" to mapOf(
                "cellId" to cellId,
                "status" to status
            )
        )
        broadcast(gson.toJson(statusMsg))
    }

    private fun getDefaultShell(): Pair<String, Array<String>> {
        val os = System.getProperty("os.name").lowercase()
        return if (os.contains("win")) {
            "powershell.exe" to emptyArray()
        } else {
            val shell = System.getenv("SHELL") ?: "/bin/zsh"
            shell to arrayOf("-l", "-i")
        }
    }

    fun dispose() {
        processes.keys.forEach { stopCell(it) }
        processes.clear()
    }
}
