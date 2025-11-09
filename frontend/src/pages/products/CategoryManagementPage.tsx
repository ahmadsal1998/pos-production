import React from 'react';
import CategoryAnalytics from '@/features/products/components/CategoryAnalytics';
import CategoryQuickActions from '@/features/products/components/CategoryQuickActions';
import useCategoryManagement from '@/features/products/hooks/useCategoryManagement';
import {
  CategoryFilter,
  CategoryFormModal,
  CategoryGrid,
  CategoryTable
} from '@/features/products/components/category-management';

const CategoryManagementPage: React.FC = () => {
  const {
    categories,
    sortedCategories,
    rootCategories,
    searchTerm,
    layout,
    modal,
    searchInputRef,
    importInputRef,
    handleSearchChange,
    handleLayoutToggle,
    handleAddCategoryClick,
    handleEditCategory,
    handleDeleteCategory,
    handleViewCategory,
    handleImportCategories,
    handleExportCategories,
    handleImportFileChange,
    handlePrintCategories,
    handleSearchFocus,
    handleSaveCategory,
    closeModal
  } = useCategoryManagement();

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <CategoryAnalytics />
        <CategoryQuickActions
          onAddCategory={handleAddCategoryClick}
          onImportCategories={handleImportCategories}
          onExportCategories={handleExportCategories}
          onPrintCategories={handlePrintCategories}
          onSearchCategories={handleSearchFocus}
        />
        <input
          ref={importInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleImportFileChange}
          className="hidden"
        />
      </div>

      <CategoryFilter
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onLayoutToggle={handleLayoutToggle}
        layout={layout}
        searchInputRef={searchInputRef}
      />

      {layout === 'table' ? (
        <CategoryTable
          categories={sortedCategories}
          rootCategories={rootCategories}
          onEdit={handleEditCategory}
          onDelete={handleDeleteCategory}
          onView={handleViewCategory}
        />
      ) : (
        <CategoryGrid
          categories={sortedCategories}
          allCategories={categories}
          onEdit={handleEditCategory}
          onDelete={handleDeleteCategory}
        />
      )}

      <CategoryFormModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onSave={handleSaveCategory}
        categoryToEdit={modal.data}
        allCategories={categories}
      />
    </div>
  );
};

export default CategoryManagementPage;
