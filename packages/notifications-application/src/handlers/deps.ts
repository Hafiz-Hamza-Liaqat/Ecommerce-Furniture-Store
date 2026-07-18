import type {
  NotificationPreferenceRepository,
  NotificationRepository,
} from "@afh/notifications";
import type { SecurityAuditService } from "@afh/identity";

export type NotificationsHandlerDeps = {
  readonly notifications: NotificationRepository;
  readonly preferences: NotificationPreferenceRepository;
  readonly audit: SecurityAuditService;
};
