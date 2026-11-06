import { useEffect, useId, useRef, type ReactNode } from "react";

/** Native dialog: the browser handles focus trapping, Escape, and the inert page behind it. */
export function Modal({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-labelledby={titleId}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-neutral-200 bg-white p-0 text-neutral-950 shadow-xl backdrop:bg-neutral-950/30"
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // a click on the dialog element itself lands on the backdrop
        if (event.target === ref.current) onClose();
      }}
    >
      {open ? (
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold" id={titleId}>
                {title}
              </h2>
              {description ? <p className="mt-1 text-[13px] leading-5 text-neutral-600">{description}</p> : null}
            </div>
            <button
              aria-label="Close"
              className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-md text-neutral-500 outline-none hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-fuchsia-600"
              type="button"
              onClick={onClose}
            >
              <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 16 16">
                <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
