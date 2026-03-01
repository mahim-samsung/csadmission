import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-100 bg-white p-6 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn("mb-4 flex items-start justify-between", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h3 className={cn("text-lg font-semibold text-gray-900", className)}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn("text-sm text-gray-600", className)}>{children}</div>;
}

export function CardFooter({ children, className }: CardProps) {
  return (
    <div className={cn("mt-4 flex items-center gap-2 border-t border-gray-50 pt-4", className)}>
      {children}
    </div>
  );
}
