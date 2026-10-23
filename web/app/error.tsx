"use client";

import { CloudOffIcon, RotateCwIcon } from "lucide-react";
import { useEffect } from "react";

import { EmptyState } from "@/components/finance";
import { Button } from "@/components/ui/button";

// Catches failures loading the (app) layout's data, e.g. core being unreachable.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <EmptyState
        icon={CloudOffIcon}
        title="No pudimos cargar tus datos"
        action={
          <Button onClick={retry}>
            <RotateCwIcon /> Reintentar
          </Button>
        }
      >
        Revisa tu conexión e inténtalo de nuevo en un momento.
      </EmptyState>
    </main>
  );
}
