export interface Batch {
  id: number;
  batch_name: string;
  serial_number: number;
  admin_name: string;
  username: string;
  max_students: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: number;
  student_name: string;
  batch_id: number;
  finger_1: string | null;
  finger_2: string | null;
  finger_3: string | null;
  finger_4: string | null;
  finger_5: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}