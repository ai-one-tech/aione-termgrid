package org.aione.termgrid

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile

class TermGridFileEditorProvider : FileEditorProvider, DumbAware {

    override fun accept(project: Project, file: VirtualFile): Boolean {
        return file.name.endsWith(".tg")
    }

    override fun createEditor(project: Project, file: VirtualFile): FileEditor {
        return TermGridFileEditor(project, file)
    }

    override fun getEditorTypeId(): String {
        return "aioneTermGrid.editor"
    }

    override fun getPolicy(): FileEditorPolicy {
        // HIDE_DEFAULT_EDITOR will hide standard text/YAML editor for *.tg files
        return FileEditorPolicy.HIDE_DEFAULT_EDITOR
    }
}
