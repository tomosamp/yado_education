export function LoadingScreen({ message = '読み込み中...' }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-slate-100">
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  )
}
