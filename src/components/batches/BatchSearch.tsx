import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BatchSearchProps } from "@/types/batch";

export const BatchSearch = ({ searchTerm, onSearch }: BatchSearchProps) => {
  return (
    <div className="relative w-full md:w-64">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <Input
        placeholder="Search batches..."
        value={searchTerm}
        onChange={onSearch}
        className="pl-10"
      />
    </div>
  );
};