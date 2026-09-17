import type { ReactNode } from "react";

import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Shared empty/no-data state used across pages wherever a list or resource
 * has no data to show (FR-011). Renders inside a `Card` for visual
 * consistency with the rest of the shared UI kit.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        {icon ? (
          <div className="text-muted-foreground flex size-12 items-center justify-center rounded-full bg-muted">
            {icon}
          </div>
        ) : null}
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="mt-2">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
