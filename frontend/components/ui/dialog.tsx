"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Dialog({ open, onOpenChange, children }: any) {
  return open ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => onOpenChange(false)}
    >
      {children}
    </div>
  ) : null;
}

export function DialogContent({ className, children }: any) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-lg p-6 w-[90%] max-w-lg",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ children }: any) {
  return <div className="mb-4">{children}</div>;
}

export function DialogTitle({ children }: any) {
  return <h2 className="text-xl font-semibold">{children}</h2>;
}

export function DialogFooter({ children }: any) {
  return <div className="flex justify-end gap-3 mt-4">{children}</div>;
}

export function DialogTrigger({ children, onClick }: any) {
  return <div onClick={onClick}>{children}</div>;
}
