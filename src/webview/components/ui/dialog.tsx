import * as React from "react"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

const Dialog = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { open?: boolean; onOpenChange?: (open: boolean) => void }
>(({ className, children, open, onOpenChange, ...props }, ref) => {
  if (!open) return null

  return (
    <div data-testid="dialog" className="fixed inset-0 z-50 flex items-center justify-center" ref={ref} {...props}>
      <div
        className="fixed inset-0 bg-black/80"
        onClick={() => onOpenChange?.(false)}
      />
      {/* 
         We use a context or just pass the onOpenChange to children if we were using a more complex system,
         but for now we'll just handle the close button in DialogContent by expecting it to be passed 
         or by using a simpler approach. 
         Actually, let's just make DialogContent take onOpenChange too for simplicity in this refactor.
      */}
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { onOpenChange })
        }
        return child
      })}
    </div>
  )
})
Dialog.displayName = "Dialog"

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { onOpenChange?: (open: boolean) => void }
>(({ className, children, onOpenChange, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border shadow-lg duration-200 sm:rounded-lg p-6",
      className
    )}
    style={{
      backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
      borderColor: 'var(--vscode-panel-border, #3c3c3c)',
      color: 'var(--vscode-editor-foreground, #cccccc)',
    }}
    {...props}
  >
    {children}
    <button
      onClick={() => onOpenChange?.(false)}
      className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
  </div>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }
