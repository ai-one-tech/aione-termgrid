import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border border-foreground bg-background text-foreground hover:bg-foreground/10',
        destructive:
          'border border-destructive bg-background text-destructive hover:bg-destructive/10',
        outline:
          'border border-foreground bg-background text-foreground hover:bg-foreground/10',
        secondary: 'border border-secondary bg-background text-secondary-foreground hover:bg-secondary/10',
        ghost: 'hover:bg-foreground/5',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-full px-3',
        lg: 'h-11 rounded-full px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
