import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders a centred overlay straight into <body>.
 * Admin panels animate with transforms, which would otherwise trap a
 * `position: fixed` dialog inside the panel and push it off screen.
 */
export function ModalPortal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="theme-admin-light fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-background/80 p-4 text-foreground backdrop-blur-sm"
    >
      <div onClick={(e) => e.stopPropagation()} className="mx-auto my-auto w-full max-w-5xl">
        {children}
      </div>
    </div>,
    document.body,
  );
}
