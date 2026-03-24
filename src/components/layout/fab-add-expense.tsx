"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { AddExpenseDialog } from "@/components/shared/add-expense-dialog";

export function FabAddExpense() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={`fab-add ${pathname === "/transactions" ? "is-hidden" : ""}`} onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}>
        <Plus />
      </button>
      <AddExpenseDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
