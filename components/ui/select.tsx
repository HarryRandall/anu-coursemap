"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type SelectOption<T extends string | number> = {
  value: T;
  label: ReactNode;
};

type SelectProps<T extends string | number> = {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  placeholder?: string;
  "aria-label"?: string;
};

/**
 * Custom dropdown that replaces the native <select>. The menu is rendered in a
 * portal at a computed position so it is never clipped by overflow-hidden cards.
 */
export function Select<T extends string | number>({
  value,
  onChange,
  options,
  disabled,
  className,
  menuClassName,
  placeholder = "Select…",
  "aria-label": ariaLabel,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [active, setActive] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  const close = useCallback(() => setOpen(false), []);

  const place = useCallback(() => {
    if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect());
  }, []);

  const openMenu = () => {
    if (disabled) return;
    place();
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
    setOpen(true);
  };

  useEffect(() => {
    if (open) menuRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => close();
    const onResize = () => close();
    const onPointer = (event: MouseEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        close();
      }
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    document.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, close]);

  const commit = (option: SelectOption<T>) => {
    onChange(option.value);
    close();
    buttonRef.current?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openMenu();
          }
        }}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg bg-white px-3 text-left text-[13px] text-zinc-900 shadow-xs ring-1 ring-inset ring-zinc-200 transition hover:ring-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:pointer-events-none disabled:opacity-50 data-[open=true]:ring-brand-400",
          className,
        )}
        data-open={open}
      >
        <span className={cn("truncate", !selected && "text-zinc-400")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          className={cn("shrink-0 text-zinc-400 transition", open && "rotate-180")}
        />
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                close();
                buttonRef.current?.focus();
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => Math.min(options.length - 1, index + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(0, index - 1));
              } else if (event.key === "Enter") {
                event.preventDefault();
                if (options[active]) commit(options[active]);
              }
            }}
            style={(() => {
              const width = Math.max(rect.width, 160);
              return {
                position: "fixed" as const,
                top: rect.bottom + 6,
                left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
                width,
                maxHeight: `min(18rem, ${Math.max(120, window.innerHeight - rect.bottom - 24)}px)`,
              };
            })()}
            className={cn(
              "z-[120] overflow-y-auto rounded-xl bg-white p-1 shadow-lg ring-1 ring-zinc-200 animate-modal-in",
              menuClassName,
            )}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => commit(option)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition",
                    index === active ? "bg-zinc-100 text-zinc-900" : "text-zinc-700 hover:bg-zinc-50",
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check size={14} className="shrink-0 text-brand-600" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
