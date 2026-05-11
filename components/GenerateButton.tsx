'use client'

interface GenerateButtonProps {
  disabled?: boolean
  generating?: boolean
  label?: string
  onClick: () => void
}

export function GenerateButton({
  disabled,
  generating,
  label = '生成',
  onClick,
}: GenerateButtonProps) {
  return (
    <button type="button" disabled={disabled || generating} onClick={onClick}>
      {generating ? '生成中...' : label}
    </button>
  )
}
