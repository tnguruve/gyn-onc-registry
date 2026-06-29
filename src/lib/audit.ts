import { prisma } from "@/lib/db";

type AuditParams = {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
};

export async function logAudit(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? undefined,
        userEmail: params.userEmail ?? undefined,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details,
        ipAddress: params.ipAddress,
      },
    });
  } catch {
    // Don't block clinical workflows if audit write fails (e.g. stale session after DB reset).
  }
}

export function getClientIp(request: Request): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined
  );
}
