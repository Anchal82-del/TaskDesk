export interface AccessRequest {
  id: number;
  userId: number;
  employeeId: string;
  requesterName: string;
  requesterEmail: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: string | Date;
  decidedBy?: string | null;
  decidedAt?: string | Date | null;
}
