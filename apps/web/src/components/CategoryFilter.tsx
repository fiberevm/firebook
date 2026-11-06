import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { CategoryInfo } from "../lib/categories";
import { formatUsdCompact } from "../lib/format";
import { CheckIcon, ChevronUpDownIcon } from "./ui/icons";

const itemClass =
  "group flex h-8 cursor-default select-none items-center gap-2 rounded px-2 text-[13px] text-neutral-800 outline-none data-[highlighted]:bg-neutral-100";

/** Multi-select dropdown that toggles categories on and off. Stays open while toggling. */
export function CategoryFilter({ categories, hidden, onChange }: { categories: CategoryInfo[]; hidden: Set<string>; onChange: (hidden: Set<string>) => void }) {
  const visible = categories.filter((c) => !hidden.has(c.key)).length;
  const summary =
    categories.length === 0
      ? "No categories"
      : visible === categories.length
        ? "All categories"
        : visible === 0
          ? "No categories"
          : `${visible} of ${categories.length} categories`;

  const toggle = (key: string, on: boolean) => {
    const next = new Set(hidden);
    if (on) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        disabled={categories.length === 0}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-300 bg-white pl-2.5 pr-1.5 text-xs font-medium text-neutral-800 shadow-[0_1px_2px_rgba(15,23,42,0.06)] outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-fuchsia-600 disabled:cursor-not-allowed disabled:text-neutral-400 data-[state=open]:bg-neutral-50"
      >
        {summary}
        <ChevronUpDownIcon className="size-3.5 text-neutral-500" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] w-64 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
        >
          <div className="flex items-center justify-between px-2 pb-1 pt-1.5">
            <DropdownMenu.Label className="text-xs font-medium text-neutral-500">Categories</DropdownMenu.Label>
            <div className="flex gap-2 text-xs">
              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  onChange(new Set());
                }}
                className="cursor-default rounded font-medium text-[#1968ad] outline-none data-[highlighted]:underline"
              >
                All
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  onChange(new Set(categories.map((c) => c.key)));
                }}
                className="cursor-default rounded font-medium text-[#1968ad] outline-none data-[highlighted]:underline"
              >
                None
              </DropdownMenu.Item>
            </div>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-neutral-200" />
          {categories.map((c) => (
            <DropdownMenu.CheckboxItem
              key={c.key}
              checked={!hidden.has(c.key)}
              onCheckedChange={(on) => toggle(c.key, on)}
              // keep the menu open so several categories can be toggled in a row
              onSelect={(e) => e.preventDefault()}
              className={itemClass}
            >
              <span className="grid size-4 shrink-0 place-items-center rounded border border-neutral-300 bg-white group-data-[state=checked]:border-neutral-900 group-data-[state=checked]:bg-neutral-900">
                <DropdownMenu.ItemIndicator>
                  <CheckIcon className="size-3 text-white" />
                </DropdownMenu.ItemIndicator>
              </span>
              <span className="size-2 shrink-0 rounded-sm" style={{ background: c.color }} />
              <span className={`min-w-0 flex-1 truncate ${c.key.startsWith("__") ? "italic text-neutral-500" : ""}`}>{c.label}</span>
              <span className="text-xs tabular-nums text-neutral-400">{formatUsdCompact(c.total)}</span>
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
