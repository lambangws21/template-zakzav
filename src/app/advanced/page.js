"use client";

import { useRouter } from "next/navigation";
import AdvancedWorkspace from "@/components/workspace/AdvancedWorkspace";

export default function AdvancedPage() {
  const router = useRouter();
  return <AdvancedWorkspace onOpenSimpleUi={() => router.push("/simple")} />;
}
