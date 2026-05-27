package org.aione.termgrid

import java.util.concurrent.ConcurrentHashMap

object TermGridEditorRegistry {
    private val activeEditors = ConcurrentHashMap<String, TermGridFileEditor>()

    fun register(filePath: String, editor: TermGridFileEditor) {
        activeEditors[filePath] = editor
    }

    fun unregister(filePath: String) {
        activeEditors.remove(filePath)
    }

    fun getEditor(filePath: String): TermGridFileEditor? {
        return activeEditors[filePath]
    }
    
    fun getActivePaths(): Set<String> {
        return activeEditors.keys
    }
}
