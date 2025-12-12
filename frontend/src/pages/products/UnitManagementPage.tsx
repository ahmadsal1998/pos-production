import React from 'react';
import UnitAnalytics from '@/features/products/components/UnitAnalytics';
import UnitQuickActions from '@/features/products/components/UnitQuickActions';
import useUnitManagement from '@/features/products/hooks/useUnitManagement';
import {
  UnitFilter,
  UnitFormModal,
  UnitGrid,
  UnitTable
} from '@/features/products/components/unit-management';

const UnitManagementPage: React.FC = () => {
  const {
    units,
    sortedUnits,
    searchTerm,
    layout,
    modal,
    searchInputRef,
    importInputRef,
    handleSearchChange,
    handleLayoutToggle,
    handleAddUnitClick,
    handleEditUnit,
    handleDeleteUnit,
    handleImportUnits,
    handleExportUnits,
    handleImportFileChange,
    handlePrintUnits,
    handleSearchFocus,
    handleSaveUnit,
    closeModal,
    EMPTY_UNIT
  } = useUnitManagement();

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <UnitAnalytics units={units} />
        <UnitQuickActions
          onAddUnit={handleAddUnitClick}
          onImportUnits={handleImportUnits}
          onExportUnits={handleExportUnits}
          onPrintUnits={handlePrintUnits}
          onSearchUnits={handleSearchFocus}
        />
        <input
          ref={importInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleImportFileChange}
          className="hidden"
        />
      </div>

      <UnitFilter
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onLayoutToggle={handleLayoutToggle}
        layout={layout}
        searchInputRef={searchInputRef}
      />

      {layout === 'table' ? (
        <UnitTable
          units={sortedUnits}
          onEdit={handleEditUnit}
          onDelete={handleDeleteUnit}
        />
      ) : (
        <UnitGrid
          units={sortedUnits}
          onEdit={handleEditUnit}
          onDelete={handleDeleteUnit}
        />
      )}

      <UnitFormModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onSave={handleSaveUnit}
        unitToEdit={modal.data}
        emptyUnit={EMPTY_UNIT}
      />
    </div>
  );
};

export default UnitManagementPage;

