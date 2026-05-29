import { X } from "lucide-react";
import type { ReactNode } from "react";

type ModalProps = {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
};

export function Modal({ children, isOpen, onClose, title }: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-stone-950/45 p-3 sm:p-4">
      <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl sm:max-h-[calc(100vh-2rem)]">
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
          <h2 className="text-base font-bold text-stone-950">{title}</h2>
          <button
            type="button"
            aria-label={`Close ${title}`}
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  );
}
