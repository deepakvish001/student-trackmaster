
export interface Batch {
  id: string;
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
  id: string;
  student_name: string;
  batch_id: string | null;
  finger_1: string | null;
  finger_2: string | null;
  finger_3: string | null;
  finger_4: string | null;
  finger_5: string | null;
  finger_1_image?: string | null;
  finger_2_image?: string | null;
  finger_3_image?: string | null;
  finger_4_image?: string | null;
  finger_5_image?: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  batches?: {
    batch_name: string;
  };
}
