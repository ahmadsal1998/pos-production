import React from 'react';
import BrandAnalytics from '@/features/products/components/BrandAnalytics';
import BrandQuickActions from '@/features/products/components/BrandQuickActions';
import useBrandManagement from '@/features/products/hooks/useBrandManagement';
import {
  BrandFilter,
  BrandFormModal,
  BrandGrid,
  BrandTable
} from '@/features/products/components/brand-management';

const BrandManagementPage: React.FC = () => {
  const {
    filteredAndSortedBrands,
    layout,
    modal,
    searchTerm,
    searchInputRef,
    handleQuickAction,
    handleDeleteBrand,
    handleSaveBrand,
    handleOpenModal,
    handleCloseModal,
    handleLayoutToggle,
    setSearchTerm,
    EMPTY_BRAND,
    importInputRef,
    handleImportFileChange
  } = useBrandManagement();

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <BrandAnalytics />
        <BrandQuickActions
          onAddBrand={() => handleQuickAction('add-brand')}
          onImportBrands={() => handleQuickAction('import')}
          onExportBrands={() => handleQuickAction('export')}
          onPrintBrands={() => handleQuickAction('print')}
          onSearchBrands={() => handleQuickAction('search')}
        />
      </div>

      <BrandFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        layout={layout}
        onToggleLayout={handleLayoutToggle}
        searchInputRef={searchInputRef}
      />

      <input
        ref={importInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleImportFileChange}
        className="hidden"
      />

      {layout === 'table' ? (
        <BrandTable
          brands={filteredAndSortedBrands}
          onEdit={(brand) => handleOpenModal('edit', brand)}
          onDelete={handleDeleteBrand}
        />
      ) : (
        <BrandGrid
          brands={filteredAndSortedBrands}
          onEdit={(brand) => handleOpenModal('edit', brand)}
          onDelete={handleDeleteBrand}
        />
      )}

      <BrandFormModal
        isOpen={modal.isOpen}
        onClose={handleCloseModal}
        onSave={handleSaveBrand}
        brandToEdit={modal.data}
        emptyBrand={EMPTY_BRAND}
      />
    </div>
  );
};

export default BrandManagementPage;
