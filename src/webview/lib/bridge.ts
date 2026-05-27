import { WebviewMessage, ExtensionMessage } from '../../shared/types';

export interface HostBridge {
  postMessage(message: WebviewMessage): void;
  onMessage(callback: (message: ExtensionMessage) => void): () => void;
}

class VSCodeBridge implements HostBridge {
  private getVscode() {
    return (window as any).vscode;
  }

  postMessage(message: WebviewMessage) {
    const vscode = this.getVscode();
    if (vscode && typeof vscode.postMessage === 'function') {
      vscode.postMessage(message);
    } else {
      console.warn('[VSCodeBridge] VS Code API not initialized or postMessage unavailable.');
    }
  }

  onMessage(callback: (message: ExtensionMessage) => void) {
    const handler = (event: MessageEvent) => {
      // VS Code messages arrive as a window MessageEvent with event.data as the payload
      if (event.data) {
        callback(event.data as ExtensionMessage);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }
}

class JetBrainsBridge implements HostBridge {
  private messageQueue: WebviewMessage[] = [];
  private isReady = false;

  constructor() {
    // Poll to check if window.cefQuery has been injected by Java JBCef
    const checkInterval = setInterval(() => {
      if (typeof (window as any).cefQuery === 'function') {
        clearInterval(checkInterval);
        this.isReady = true;
        // Flush all queued messages
        this.messageQueue.forEach((msg) => this.postMessage(msg));
        this.messageQueue = [];
      }
    }, 30);
    // Safety timeout to prevent infinite polling in non-IntelliJ browser contexts
    setTimeout(() => clearInterval(checkInterval), 6000);
  }

  postMessage(message: WebviewMessage) {
    if (this.isReady && typeof (window as any).cefQuery === 'function') {
      (window as any).cefQuery({
        request: JSON.stringify(message),
        onSuccess: () => {},
        onFailure: (code: number, msg: string) => {
          console.error(`[JetBrainsBridge] CEF Query failed: ${code} - ${msg}`);
        }
      });
    } else {
      this.messageQueue.push(message);
    }
  }

  onMessage(callback: (message: ExtensionMessage) => void) {
    // JetBrains pushes messages down by calling a global window function
    (window as any).postMessageFromJava = (msgString: any) => {
      try {
        const message = typeof msgString === "string" ? JSON.parse(msgString) : msgString;
        callback(message);
      } catch (err) {
        console.error('[JetBrainsBridge] Failed to parse message from Java:', err);
      }
    };
    return () => {
      delete (window as any).postMessageFromJava;
    };
  }
}

let cachedBridge: HostBridge | null = null;

export const getHostBridge = (): HostBridge => {
  if (cachedBridge) return cachedBridge;

  // Detect environment
  // In VS Code, window.acquireVsCodeApi is defined, or window.vscode is already cached
  if (typeof (window as any).acquireVsCodeApi === 'function' || (window as any).vscode) {
    cachedBridge = new VSCodeBridge();
  } else {
    // Fallback/Default to JetBrains Bridge (uses window.cefQuery)
    cachedBridge = new JetBrainsBridge();
  }

  return cachedBridge;
};
