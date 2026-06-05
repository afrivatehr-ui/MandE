import { useToastStore } from '../store/toastStore'

const typeStyles = {
  success: 'border-afri-green/30 bg-afri-white text-afri-black',
  error: 'border-afri-red/40 bg-afri-white text-afri-black',
  info: 'border-afri-purple/30 bg-afri-white text-afri-black',
}
const dotStyles = {
  success: 'bg-afri-green',
  error: 'bg-afri-red',
  info: 'bg-afri-purple',
}

export default function Toaster() {
  const { toasts, remove } = useToastStore()
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-card ${typeStyles[t.type]}`}
        >
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotStyles[t.type]}`} />
          <p className="flex-1 font-body text-sm">{t.message}</p>
          <button onClick={() => remove(t.id)} className="text-afri-black/40 hover:text-afri-black" aria-label="Dismiss">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
