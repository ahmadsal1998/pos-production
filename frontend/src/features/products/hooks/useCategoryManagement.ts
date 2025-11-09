import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AR_LABELS } from '@/shared/constants';
import { Category } from '@/shared/types';
import { ApiError, categoriesApi } from '@/lib/api/client';

export type CategoryStatus = 'Active' | 'Inactive';
export type ModalType = 'add' | 'edit';
export type LayoutType = 'table' | 'grid';
export type SortType = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc';
export type StatusFilter = 'all' | 'active' | 'inactive';

export type CategoryDraft = Omit<Category, 'id' | 'createdAt' | 'productCount'>;

export interface ModalState {
  isOpen: boolean;
  type: ModalType;
  data: Category | null;
}

const DEFAULT_MODAL_STATE: ModalState = {
  isOpen: false,
  type: 'add',
  data: null
};

const SORTERS: Record<SortType, (a: Category, b: Category) => number> = {
  'name-asc': (a, b) => a.nameAr.localeCompare(b.nameAr),
  'name-desc': (a, b) => b.nameAr.localeCompare(a.nameAr),
  'date-asc': (a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  'date-desc': (a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
};

const STATUS_FILTER: StatusFilter = 'all';
const DEFAULT_SORT: SortType = 'date-desc';

type BackendCategory = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
};

const mapBackendCategory = (category: BackendCategory): Category => ({
  id: category.id,
  nameAr: category.name,
  description: category.description ?? '',
  parentId: null,
  status: 'Active',
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
  productCount: 0,
  imageUrl: category.imageUrl,
});

const useCategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [layout, setLayout] = useState<LayoutType>('table');
  const [modal, setModal] = useState<ModalState>(DEFAULT_MODAL_STATE);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await categoriesApi.getCategories();
      const payload = response.data.categories ?? [];
      const normalized = payload.map(mapBackendCategory);
      setCategories(normalized);
    } catch (error) {
      console.error('Failed to load categories', error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openModal = useCallback(
    (type: ModalType, data: Category | null = null) => {
      setModal({ isOpen: true, type, data });
    },
    []
  );

  const closeModal = useCallback(() => {
    setModal(DEFAULT_MODAL_STATE);
  }, []);

  const handleSaveCategory = useCallback(
    async (draft: CategoryDraft & { id?: string }) => {
      if (modal.type === 'add') {
        try {
          const payload = {
            name: draft.nameAr.trim(),
            description: draft.description?.trim() || undefined,
          };

          const response = await categoriesApi.createCategory(payload);
          const createdCategory = response.data.category as BackendCategory | undefined;

          if (createdCategory) {
            const normalized = mapBackendCategory(createdCategory);
            setCategories((previous) => {
              const withoutDuplicate = previous.filter((category) => category.id !== normalized.id);
              return [normalized, ...withoutDuplicate];
            });
          }

          closeModal();
        } catch (error) {
          const apiError = error as ApiError;
          console.error('Failed to create category', apiError);
          window.alert(apiError?.message ?? 'تعذر إنشاء الفئة. يرجى المحاولة مرة أخرى.');
          throw error;
        }

        return;
      }

      if (!draft.id) {
        return;
      }

      setCategories((previousCategories) =>
        previousCategories.map((category) =>
          category.id === draft.id
            ? {
                ...category,
                ...draft,
              }
            : category
        )
      );

      closeModal();
    },
    [closeModal, modal.type]
  );

  const handleDeleteCategory = useCallback(
    (categoryId: string) => {
      const hasChildren = categories.some(
        (category) => category.parentId === categoryId
      );

      if (hasChildren) {
        window.alert(AR_LABELS.confirmDeleteWithChildren);
        return;
      }

      const category = categories.find((item) => item.id === categoryId);
      const requiresConfirmation =
        category && category.productCount > 0
          ? AR_LABELS.confirmDeleteWithProducts
          : AR_LABELS.confirmDeleteMessage;

      if (!window.confirm(requiresConfirmation)) {
        return;
      }

      setCategories((previous) =>
        previous.filter((item) => item.id !== categoryId)
      );
    },
    [categories]
  );

  const handleViewCategory = useCallback((category: Category) => {
    window.alert(`View details for ${category.nameAr}`);
  }, []);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(event.target.value);
    },
    []
  );

  const handleLayoutToggle = useCallback(() => {
    setLayout((previous) => (previous === 'table' ? 'grid' : 'table'));
  }, []);

  const handleAddCategoryClick = useCallback(() => {
    openModal('add');
  }, [openModal]);

  const handleEditCategory = useCallback(
    (category: Category) => {
      openModal('edit', category);
    },
    [openModal]
  );

  const handleImportCategories = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await categoriesApi.importCategories(formData);
        const payload = response.data;

        if (payload?.categories) {
          setCategories(
            payload.categories.map(mapBackendCategory)
          );
        } else {
          await fetchCategories();
        }

        const summary = payload?.summary;
        const successMessage =
          summary && typeof summary.created === 'number' && typeof summary.updated === 'number'
            ? `تم استيراد الفئات بنجاح.\nمضافة: ${summary.created}\nمحدّثة: ${summary.updated}${
                summary.failed ? `\nفشل: ${summary.failed}` : ''
              }`
            : 'تم استيراد الفئات بنجاح';

        window.alert(successMessage);
      } catch (error) {
        const apiError = error as ApiError;
        console.error('Failed to import categories', apiError);
        window.alert(apiError?.message ?? 'تعذر استيراد الفئات. يرجى المحاولة مرة أخرى.');
      } finally {
        event.target.value = '';
      }
    },
    [fetchCategories]
  );

  const handleExportCategories = useCallback(async () => {
    try {
      const blob = await categoriesApi.exportCategories();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      link.href = downloadUrl;
      link.setAttribute('download', `categories-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Failed to export categories', apiError);
      window.alert(apiError?.message ?? 'تعذر تصدير الفئات. يرجى المحاولة مرة أخرى.');
    }
  }, []);

  const handlePrintCategories = useCallback(() => {
    window.alert('وظيفة طباعة الباركود قيد التطوير');
  }, []);

  const handleSearchFocus = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesSearch = normalizedSearch
        ? category.nameAr.toLowerCase().includes(normalizedSearch)
        : true;

      const matchesStatus =
        STATUS_FILTER === 'all'
          ? true
          : category.status.toLowerCase() === STATUS_FILTER;

      return matchesSearch && matchesStatus;
    });
  }, [categories, searchTerm]);

  const sortedCategories = useMemo(() => {
    const sorted = [...filteredCategories];
    sorted.sort(SORTERS[DEFAULT_SORT]);
    return sorted;
  }, [filteredCategories]);

  const rootCategories = useMemo(
    () => sortedCategories.filter((category) => category.parentId === null),
    [sortedCategories]
  );

  return {
    categories,
    sortedCategories,
    rootCategories,
    searchTerm,
    layout,
    modal,
    searchInputRef,
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
    importInputRef,
    closeModal
  };
};

export default useCategoryManagement;

