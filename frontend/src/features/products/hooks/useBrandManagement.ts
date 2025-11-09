import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AR_LABELS } from '@/shared/constants';
import { Brand } from '@/shared/types';
import { ApiError, brandsApi } from '@/lib/api/client';

type ModalType = 'add' | 'edit';
type LayoutType = 'table' | 'grid';
type SortType = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc';
type StatusFilter = 'all' | 'active' | 'inactive';

type BrandDraft = {
  id?: string;
  nameAr: string;
  description?: string;
  status: 'Active' | 'Inactive';
};

const EMPTY_BRAND: BrandDraft = {
  nameAr: '',
  description: '',
  status: 'Active'
};

type BackendBrand = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

const mapBackendBrand = (brand: BackendBrand): Brand => ({
  id: brand.id,
  nameAr: brand.name,
  description: brand.description ?? '',
  status: 'Active',
  createdAt: brand.createdAt,
  productCount: 0
});

const useBrandManagement = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortType>('date-desc');
  const [layout, setLayout] = useState<LayoutType>('table');
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: ModalType;
    data: Brand | null;
  }>({ isOpen: false, type: 'add', data: null });
  const importInputRef = useRef<HTMLInputElement>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchBrands = useCallback(async () => {
    try {
      const response = await brandsApi.getBrands();
      const payload = response.data.brands ?? [];
      setBrands(payload.map(mapBackendBrand));
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Failed to load brands', apiError);
      setBrands([]);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const filteredAndSortedBrands = useMemo(() => {
    const filtered = brands.filter((brand) => {
      const matchesSearch = searchTerm
        ? brand.nameAr.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : brand.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.nameAr.localeCompare(b.nameAr, 'ar');
        case 'name-desc':
          return b.nameAr.localeCompare(a.nameAr, 'ar');
        case 'date-asc':
          return (
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
          );
        case 'date-desc':
          return (
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
          );
        default:
          return 0;
      }
    });
  }, [brands, searchTerm, statusFilter, sortBy]);

  const handleOpenModal = useCallback((type: ModalType, data: Brand | null = null) => {
    setModal({ isOpen: true, type, data });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModal({ isOpen: false, type: 'add', data: null });
  }, []);

  const handleSaveBrand = useCallback(
    async (data: BrandDraft) => {
      if (modal.type === 'add') {
        try {
          const payload = {
            name: data.nameAr.trim(),
            description: data.description?.trim() || undefined
          };

          const response = await brandsApi.createBrand(payload);
          const createdBrand = response.data.brand as BackendBrand | undefined;

          if (createdBrand) {
            const normalized = {
              ...mapBackendBrand(createdBrand),
              status: data.status,
              productCount: 0
            };
            setBrands((previous) => [normalized, ...previous]);
          } else {
            await fetchBrands();
          }

          handleCloseModal();
        } catch (error) {
          const apiError = error as ApiError;
          console.error('Failed to create brand', apiError);
          window.alert(apiError?.message ?? 'تعذر إنشاء العلامة التجارية. يرجى المحاولة مرة أخرى.');
        }
        return;
      }

      if (!data.id) {
        return;
      }

      setBrands((previous) =>
        previous.map((brand) =>
          brand.id === data.id
            ? {
                ...brand,
                nameAr: data.nameAr,
                description: data.description,
                status: data.status
              }
            : brand
        )
      );
      handleCloseModal();
    },
    [fetchBrands, handleCloseModal, modal.type]
  );

  const handleDeleteBrand = useCallback(
    (brandId: string) => {
      const brand = brands.find((item) => item.id === brandId);
      const confirmationMessage =
        brand && brand.productCount > 0
          ? AR_LABELS.confirmDeleteBrandWithProducts
          : AR_LABELS.confirmDeleteBrandMessage;

      if (!window.confirm(confirmationMessage)) {
        return;
      }

      setBrands((previous) => previous.filter((item) => item.id !== brandId));
    },
    [brands]
  );

  const handleQuickAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'add-brand':
          handleOpenModal('add');
          break;
        case 'import':
          importInputRef.current?.click();
          break;
        case 'export':
          (async () => {
            try {
              const blob = await brandsApi.exportBrands();
              const downloadUrl = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              const timestamp = new Date().toISOString().slice(0, 10);
              link.href = downloadUrl;
              link.setAttribute('download', `brands-${timestamp}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(downloadUrl);
            } catch (error) {
              const apiError = error as ApiError;
              console.error('Failed to export brands', apiError);
              window.alert(apiError?.message ?? 'تعذر تصدير العلامات التجارية. يرجى المحاولة مرة أخرى.');
            }
          })();
          break;
        case 'print':
          window.alert('وظيفة الطباعة قيد التطوير');
          break;
        case 'search':
          searchInputRef.current?.focus();
          break;
        default:
          break;
      }
    },
    [handleOpenModal]
  );

  const handleImportFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await brandsApi.importBrands(formData);
        const payload = response.data;

        if (payload?.brands) {
          setBrands(payload.brands.map(mapBackendBrand));
        } else {
          await fetchBrands();
        }

        const summary = payload?.summary;
        const successMessage =
          summary && typeof summary.created === 'number' && typeof summary.updated === 'number'
            ? `تم استيراد العلامات التجارية بنجاح.\nمضافة: ${summary.created}\nمحدّثة: ${summary.updated}${
                summary.failed ? `\nفشل: ${summary.failed}` : ''
              }`
            : 'تم استيراد العلامات التجارية بنجاح';

        window.alert(successMessage);
      } catch (error) {
        const apiError = error as ApiError;
        console.error('Failed to import brands', apiError);
        window.alert(apiError?.message ?? 'تعذر استيراد العلامات التجارية. يرجى المحاولة مرة أخرى.');
      } finally {
        event.target.value = '';
      }
    },
    [fetchBrands]
  );

  const handleStatusFilterChange = useCallback((filter: StatusFilter) => {
    setStatusFilter(filter);
  }, []);

  const handleSortChange = useCallback((sort: SortType) => {
    setSortBy(sort);
  }, []);

  const handleLayoutToggle = useCallback(() => {
    setLayout((previous) => (previous === 'table' ? 'grid' : 'table'));
  }, []);

  return {
    brands,
    filteredAndSortedBrands,
    layout,
    modal,
    searchTerm,
    statusFilter,
    sortBy,
    searchInputRef,
    handleOpenModal,
    handleCloseModal,
    handleSaveBrand,
    handleDeleteBrand,
    handleQuickAction,
    handleStatusFilterChange,
    handleSortChange,
    handleLayoutToggle,
    setSearchTerm,
    EMPTY_BRAND,
    importInputRef,
    handleImportFileChange
  };
};

export default useBrandManagement;

