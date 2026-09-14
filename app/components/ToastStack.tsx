export interface ToastItem { id: number; message: string; type: 'success' | 'error' | 'info' }
export default function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-11/12 max-w-sm pointer-events-none">
    {toasts.map(toast => <div key={toast.id} role={toast.type === 'error' ? 'alert' : 'status'}
      className={`w-full px-4 py-3 rounded-xl text-xs font-semibold shadow-xl border ${toast.type === 'error' ? 'bg-orange-950 border-orange-700 text-orange-100' : 'bg-white border-stone-300 text-stone-800'}`}>
      {toast.message}
    </div>)}
  </div>;
}
