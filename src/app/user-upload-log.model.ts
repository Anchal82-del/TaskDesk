export interface UserUploadLogRecord {
  name: string;
  username: string;
  email: string;
  role: string;
  status: 'added' | 'duplicate' | 'failed';
  reason?: string;
}

export interface UserUploadLog {
  id: number;
  uploadedAt: string;
  uploadedBy: {
    id: number;
    name: string;
    username: string;
  };
  fileName: string;
  fileCount: number;
  totalRecords: number;
  addedCount: number;
  duplicateCount: number;
  status: 'completed' | 'partial' | 'duplicate_only' | 'failed';
  records: UserUploadLogRecord[];
}
