export interface NotificationMetadata {
  requestId?: number;
  requesterName?: string;
  employeeId?: string;
  submittedAt?: string | Date;
  status?: string;
  [key: string]: unknown;
}

export interface AppNotification {
  id: number;
  userId?: number;
  senderId?: number | null;
  message: string;
  type?: string;
  entityId?: number | null;
  metadata?: NotificationMetadata;
  createdAt: number | string | Date;
  read: boolean;
}
