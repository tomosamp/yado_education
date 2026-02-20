import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import type * as React from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  containerClassName?: string
}

export function PasswordInput({
  className,
  containerClassName,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className={cn('relative', containerClassName)}>
      <Input
        {...props}
        type={isVisible ? 'text' : 'password'}
        className={cn('pr-10', className)}
      />
      <button
        type="button"
        className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-r-md text-slate-500 transition-colors hover:text-slate-700"
        onClick={() => {
          setIsVisible((previous) => !previous)
        }}
        aria-label={isVisible ? 'パスワードを非表示' : 'パスワードを表示'}
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
