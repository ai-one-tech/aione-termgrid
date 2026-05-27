package org.aione.termgrid.toolwindow

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.DefaultActionGroup
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.ui.SimpleToolWindowPanel
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.openapi.vfs.newvfs.BulkFileListener
import com.intellij.openapi.vfs.newvfs.events.VFileEvent
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.content.ContentFactory
import org.aione.termgrid.TermGridEditorRegistry
import java.awt.*
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import java.io.File
import java.nio.charset.StandardCharsets
import java.awt.image.BufferedImage
import javax.swing.*

class TermGridToolWindowFactory : ToolWindowFactory, DumbAware {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val panel = TermGridToolWindow(project)
        val content = ContentFactory.getInstance().createContent(panel, "", false)
        toolWindow.contentManager.addContent(content)
    }
}

class TermGridToolWindow(private val project: Project) : SimpleToolWindowPanel(true, true) {
    private val listPanel = JPanel()

    init {
        listPanel.layout = BoxLayout(listPanel, BoxLayout.Y_AXIS)
        val scrollPane = JBScrollPane(listPanel)
        setContent(scrollPane)

        setupToolbar()
        refreshList()

        // Listen for VFS updates (like file creation/deletion) to auto-refresh the sidebar
        val connection = project.messageBus.connect()
        connection.subscribe(VirtualFileManager.VFS_CHANGES, object : BulkFileListener {
            override fun after(events: List<VFileEvent>) {
                val hasTgChange = events.any { it.file?.name?.endsWith(".tg") == true }
                if (hasTgChange) {
                    ApplicationManager.getApplication().invokeLater {
                        refreshList()
                    }
                }
            }
        })
    }

    private fun setupToolbar() {
        val actionGroup = DefaultActionGroup()

        // 1. Create New Config Action
        actionGroup.add(object : AnAction("New TermGrid Config", "Create new TermGrid configuration", AllIcons.General.Add) {
            override fun actionPerformed(e: AnActionEvent) {
                val name = Messages.showInputDialog(project, "请输入配置文件名称:", "新建 TermGrid 配置", Messages.getQuestionIcon())
                if (!name.isNullOrEmpty()) {
                    val cleanName = name.trim().lowercase().replace(Regex("[^a-z0-9-]"), "-")
                    val termGridDir = File(project.basePath, ".term-grid")
                    if (!termGridDir.exists()) {
                        termGridDir.mkdirs()
                    }
                    val newFile = File(termGridDir, "$cleanName.tg")
                    if (!newFile.exists()) {
                        try {
                            newFile.writeText("""
                                name: $cleanName
                                layout:
                                  rows: 2
                                  cols: 2
                                cells:
                                  - id: cell-1
                                    title: Terminal 1
                                    cwd: .
                                    delay: 0
                                  - id: cell-2
                                    title: Terminal 2
                                    cwd: .
                                    delay: 0
                                  - id: cell-3
                                    title: Terminal 3
                                    cwd: .
                                    delay: 0
                                  - id: cell-4
                                    title: Terminal 4
                                    cwd: .
                                    delay: 0
                                mergedCells: []
                                language: zh
                                initialDelay: 2000
                            """.trimIndent(), StandardCharsets.UTF_8)

                            LocalFileSystem.getInstance().refreshIoFiles(listOf(newFile))
                            refreshList()
                        } catch (ex: Exception) {
                            ex.printStackTrace()
                        }
                    } else {
                        Messages.showErrorDialog(project, "该配置文件已存在", "错误")
                    }
                }
            }
        })

        // 2. Open Config Folder Action
        actionGroup.add(object : AnAction("Open Config Folder", "Open TermGrid config folder", AllIcons.Nodes.Folder) {
            override fun actionPerformed(e: AnActionEvent) {
                val basePath = project.basePath ?: return
                val termGridDir = File(basePath, ".term-grid")
                if (!termGridDir.exists()) {
                    termGridDir.mkdirs()
                }
                val virtualFile = LocalFileSystem.getInstance().refreshAndFindFileByIoFile(termGridDir)
                if (virtualFile != null) {
                    com.intellij.ide.projectView.ProjectView.getInstance(project).select(null, virtualFile, true)
                }
            }
        })

        // 3. Refresh Action
        actionGroup.add(object : AnAction("Refresh", "Refresh configurations list", AllIcons.Actions.Refresh) {
            override fun actionPerformed(e: AnActionEvent) {
                refreshList()
            }
        })

        val toolbar = ActionManager.getInstance().createActionToolbar("TermGridToolbar", actionGroup, true)
        toolbar.targetComponent = this
        setToolbar(toolbar.component)
    }

    private fun refreshList() {
        listPanel.removeAll()
        val basePath = project.basePath ?: return
        val termGridDir = File(basePath, ".term-grid")
        if (!termGridDir.exists()) {
            termGridDir.mkdirs()
        }
        val files = termGridDir.listFiles { _, name -> name.endsWith(".tg") } ?: emptyArray()

        for (file in files) {
            val row = JPanel(BorderLayout(5, 5))
            row.border = BorderFactory.createEmptyBorder(5, 10, 5, 10)
            row.alignmentX = Component.LEFT_ALIGNMENT

            val nameLabel = JLabel(file.nameWithoutExtension)
            nameLabel.toolTipText = file.absolutePath
            
            val openFileListener = object : MouseAdapter() {
                override fun mouseClicked(e: MouseEvent) {
                    if (e.clickCount == 1) {
                        val virtualFile = LocalFileSystem.getInstance().findFileByIoFile(file)
                        if (virtualFile != null) {
                            com.intellij.openapi.fileEditor.FileEditorManager.getInstance(project).openFile(virtualFile, true)
                            val manager = com.intellij.openapi.fileEditor.FileEditorManager.getInstance(project) as? com.intellij.openapi.fileEditor.ex.FileEditorManagerEx
                            manager?.currentWindow?.setFilePinned(virtualFile, true)
                        }
                    }
                }
            }
            
            row.cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
            row.addMouseListener(openFileListener)

            // Check running status in registry
            val virtualFile = LocalFileSystem.getInstance().findFileByIoFile(file)
            val editor = virtualFile?.let { TermGridEditorRegistry.getEditor(it.path) }
            val isRunning = editor?.getPtyManager()?.hasActiveTerminals() ?: false

            val statusLabel = JLabel()
            statusLabel.cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
            statusLabel.addMouseListener(openFileListener)
            if (isRunning) {
                statusLabel.text = "Running "
                statusLabel.foreground = Color(39, 168, 85)
            } else {
                statusLabel.text = "Stopped "
                statusLabel.foreground = Color.GRAY
            }

            nameLabel.cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
            nameLabel.addMouseListener(openFileListener)

            val labelPanel = JPanel(FlowLayout(FlowLayout.LEFT, 5, 0))
            labelPanel.cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
            labelPanel.addMouseListener(openFileListener)
            labelPanel.add(statusLabel)
            labelPanel.add(nameLabel)
            row.add(labelPanel, BorderLayout.CENTER)

            // Inline Play & Stop buttons
            val actionsPanel = JPanel(FlowLayout(FlowLayout.RIGHT, 10, 0))
            actionsPanel.isOpaque = false
            
            val playBtn = JButton(TintedIcon(AllIcons.Actions.Restart, Color(39, 168, 85)))
            playBtn.toolTipText = "Restart All Terminals"
            playBtn.margin = Insets(0, 0, 0, 0)
            playBtn.isBorderPainted = false
            playBtn.isContentAreaFilled = false
            playBtn.isOpaque = false
            playBtn.isFocusable = false
            playBtn.preferredSize = Dimension(22, 22)
            playBtn.minimumSize = Dimension(22, 22)
            playBtn.maximumSize = Dimension(22, 22)
            playBtn.cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
            playBtn.addActionListener {
                val currentEditor = virtualFile?.let { TermGridEditorRegistry.getEditor(it.path) }
                if (currentEditor == null) {
                    Messages.showWarningDialog(project, "请先在 TermGrid 编辑器中打开此配置文件", "提示")
                } else {
                    val cells = currentEditor.getAllCells()
                    currentEditor.getPtyManager().restartAll(cells)
                    refreshList()
                }
            }

            val stopBtn = JButton(AllIcons.Actions.Suspend)
            stopBtn.toolTipText = "Stop All Terminals"
            stopBtn.margin = Insets(0, 0, 0, 0)
            stopBtn.isBorderPainted = false
            stopBtn.isContentAreaFilled = false
            stopBtn.isOpaque = false
            stopBtn.isFocusable = false
            stopBtn.preferredSize = Dimension(22, 22)
            stopBtn.minimumSize = Dimension(22, 22)
            stopBtn.maximumSize = Dimension(22, 22)
            stopBtn.cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
            stopBtn.addActionListener {
                val currentEditor = virtualFile?.let { TermGridEditorRegistry.getEditor(it.path) }
                if (currentEditor == null) {
                    Messages.showWarningDialog(project, "请先在 TermGrid 编辑器中打开此配置文件", "提示")
                } else {
                    currentEditor.getPtyManager().dispose()
                    refreshList()
                }
            }

            actionsPanel.add(playBtn)
            actionsPanel.add(stopBtn)
            row.add(actionsPanel, BorderLayout.EAST)

            row.maximumSize = Dimension(Integer.MAX_VALUE, 40)
            listPanel.add(row)
            
            // Add a tiny vertical separator
            listPanel.add(Box.createRigidArea(Dimension(0, 2)))
        }

        listPanel.revalidate()
        listPanel.repaint()
    }
}

class TintedIcon(private val source: Icon, private val color: Color) : Icon {
    override fun paintIcon(c: Component?, g: Graphics, x: Int, y: Int) {
        val w = iconWidth
        val h = iconHeight
        if (w <= 0 || h <= 0) return
        val image = BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB)
        val ig = image.createGraphics()
        source.paintIcon(c, ig, 0, 0)
        ig.composite = AlphaComposite.SrcAtop
        ig.color = color
        ig.fillRect(0, 0, w, h)
        ig.dispose()
        g.drawImage(image, x, y, null)
    }
    override fun getIconWidth() = source.iconWidth
    override fun getIconHeight() = source.iconHeight
}
