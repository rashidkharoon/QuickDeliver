import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  text: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export default function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          let Icon = Info;
          let bgColor = 'bg-stone-900 border-stone-800 text-stone-200';
          let iconColor = 'text-blue-500';

          if (toast.type === 'success') {
            Icon = CheckCircle2;
            bgColor = 'bg-stone-900 border-emerald-950 text-stone-100';
            iconColor = 'text-emerald-500';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            bgColor = 'bg-stone-900 border-amber-950 text-stone-100';
            iconColor = 'text-amber-500';
          } else if (toast.type === 'error') {
            Icon = XCircle;
            bgColor = 'bg-stone-900 border-rose-950 text-stone-100';
            iconColor = 'text-rose-500';
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start gap-3 p-4 rounded-xl border ${bgColor} shadow-2xl`}
            >
              <div className={`mt-0.5 ${iconColor}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1 text-sm font-medium leading-relaxed">
                {toast.text}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-stone-500 hover:text-stone-300 transition-colors p-0.5 rounded-lg"
                aria-label="Close notification"
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
