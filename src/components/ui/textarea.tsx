import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'flex min-h-28 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-base text-foreground shadow-sm transition-colors duration-200 placeholder:text-muted-foreground hover:border-slate-300 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-24 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}
