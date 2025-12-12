import React from 'react';
import WarehouseAnalytics from '@/features/products/components/WarehouseAnalytics';
import WarehouseQuickActions from '@/features/products/components/WarehouseQuickActions';
import useWarehouseManagement from '@/features/products/hooks/useWarehouseManagement';
import {
  WarehouseFilter,
  WarehouseFormModal,
  WarehouseGrid,
  WarehouseTable
} from '@/features/products/components/warehouse-management';

const WarehouseManagementPage: React.FC = () => {
  const {
    warehouses,
    sortedWarehouses,
    searchTerm,
    layout,
    modal,
    searchInputRef,
    importInputRef,
    handleSearchChange,
    handleLayoutToggle,
    handleAddWarehouseClick,
    handleEditWarehouse,
    handleDeleteWarehouse,
    handleViewWarehouse,
    handleImportWarehouses,
    handleExportWarehouses,
    handleImportFileChange,
    handlePrintWarehouses,
    handleSearchFocus,
    handleSaveWarehouse,
    closeModal
  } = useWarehouseManagement();

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <WarehouseAnalytics warehouses={warehouses} />
        <WarehouseQuickActions
          onAddWarehouse={handleAddWarehouseClick}
          onImportWarehouses={handleImportWarehouses}
          onExportWarehouses={handleExportWarehouses}
          onPrintWarehouses={handlePrintWarehouses}
          onSearchWarehouses={handleSearchFocus}
        />
        <input
          ref={importInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleImportFileChange}
          className="hidden"
        />
      </div>

      <WarehouseFilter
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onLayoutToggle={handleLayoutToggle}
        layout={layout}
        searchInputRef={searchInputRef}
      />

      {layout === 'table' ? (
        <WarehouseTable
          warehouses={sortedWarehouses}
          onEdit={handleEditWarehouse}
          onDelete={handleDeleteWarehouse}
          onView={handleViewWarehouse}
        />
      ) : (
        <WarehouseGrid
          warehouses={sortedWarehouses}
          onEdit={handleEditWarehouse}
          onDelete={handleDeleteWarehouse}
        />
      )}

      <WarehouseFormModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onSave={handleSaveWarehouse}
        warehouseToEdit={modal.data}
      />
    </div>
  );
};

export default WarehouseManagementPage;

