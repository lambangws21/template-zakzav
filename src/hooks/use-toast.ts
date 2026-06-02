"use client";

import { toast as sonnerToast } from "sonner";

type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function toast(input: ToastInput) {
  const title = input?.title ?? "Info";
  const description = input?.description;

  if (input?.variant === "destructive") {
    return sonnerToast.error(title, { description });
  }

  return sonnerToast(title, { description });
}

export function useToast() {
  return { toast };
}
