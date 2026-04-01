import type { ReactNode } from "react";

type AdminGuardProps = {
  children: ReactNode;
};

export default function AdminGuard({ children }: AdminGuardProps) {
  // No authentication required - simply render children
  return <>{children}</>;
}
