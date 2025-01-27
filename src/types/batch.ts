import { UseFormReturn } from "react-hook-form";
import { ChangeEvent } from "react";

export interface Batch {
  id: number;
  batch_name: string;
  serial_number: number;
  admin_name: string;
  username: string;
  max_students: number;
  is_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BatchFormData {
  batch_name: string;
  serial_number: number;
  admin_name: string;
  username: string;
  max_students: number;
}

export interface BatchTableProps {
  currentBatches: Batch[];
  onEdit: (batch: Batch) => void;
  onStatusChange: (batch: Batch) => void;
}

export interface BatchFormProps {
  form: UseFormReturn<BatchFormData>;
  onSubmit: (values: BatchFormData) => Promise<void>;
  isEditing: boolean;
}

export interface BatchSearchProps {
  searchTerm: string;
  onSearch: (event: ChangeEvent<HTMLInputElement>) => void;
}

export interface BatchPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}