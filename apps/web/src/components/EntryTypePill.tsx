import type { ApiEntry } from "@accounting/shared";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "./ui/icons";
import { Pill } from "./ui/primitives";

export function EntryTypePill({ type }: { type: ApiEntry["type"] }) {
  return type === "income" ? (
    <Pill tone="success">
      <ArrowUpRightIcon className="size-3" /> Income
    </Pill>
  ) : (
    <Pill tone="danger">
      <ArrowDownRightIcon className="size-3" /> Expense
    </Pill>
  );
}
