import React from 'react';
import {
  AR_LABELS,
  GridViewIcon,
  SearchIcon,
  TableViewIcon
} from '@/shared/constants';
import { LayoutType } from '@/features/products/hooks/useUnitManagement';

interface UnitFilterProps {
  searchTerm: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLayoutToggle: () => void;
  layout: LayoutType;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

const UnitFilter: React.FC<UnitFilterProps> = ({
  searchTerm,
  onSearchChange,
  onLayoutToggle,
  layout,
  searchInputRef
}) => (
  <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
      <div className="relative w-full md:w-1/3">
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="البحث عن الوحدة..."
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-right text-gray-900 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        />
        <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
      </div>

      <div className="flex w-full flex-wrap justify-end gap-2 md:w-auto">
        <button
          type="button"
          onClick={onLayoutToggle}
          className="rounded-md border bg-gray-100 p-2 text-gray-700 shadow-sm hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          {layout === 'table' ? <GridViewIcon /> : <TableViewIcon />}
        </button>
      </div>
    </div>
  </div>
);

export default UnitFilter;

