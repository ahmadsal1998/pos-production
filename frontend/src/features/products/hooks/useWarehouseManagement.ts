import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AR_LABELS } from '@/shared/constants';
import { Warehouse } from '@/shared/types';
import { ApiError, warehousesApi } from '@/lib/api/client';

export type WarehouseStatus = 'Active' | 'Inactive';
export type ModalType = 'add' | 'edit';
export type LayoutType = 'table' | 'grid';
export type SortType = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc';
export type StatusFilter = 'all' | 'active' | 'inactive';

export type WarehouseDraft = Omit<Warehouse, 'id' | 'createdAt' | 'productCount' | 'updatedAt'>;

export interface ModalState {
  isOpen: boolean;
  type: ModalType;
  data: Warehouse | null;
}

const DEFAULT_MODAL_STATE: ModalState = {
  isOpen: false,
  type: 'add',
  data: null
};

const SORTERS: Record<SortType, (a: Warehouse, b: Warehouse) => number> = {
  'name-asc': (a, b) => a.nameAr.localeCompare(b.nameAr),
  'name-desc': (a, b) => b.nameAr.localeCompare(a.nameAr),
  'date-asc': (a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  'date-desc': (a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
};

const STATUS_FILTER: StatusFilter = 'all';
const DEFAULT_SORT: SortType = 'date-desc';

type BackendWarehouse = {
  id: string;
  name: string;
  description?: string;
  address?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt?: string;
  productCount?: number;
};

const mapBackendWarehouse = (warehouse: BackendWarehouse): Warehouse => ({
  id: warehouse.id,
  nameAr: warehouse.name,
  description: warehouse.description ?? '',
  address: warehouse.address ?? '',
  status: warehouse.status,
  createdAt: warehouse.createdAt,
  updatedAt: warehouse.updatedAt,
  productCount: warehouse.productCount ?? 0,
});

const useWarehouseManagement = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [layout, setLayout] = useState<LayoutType>('table');
  const [modal, setModal] = useState<ModalState>(DEFAULT_MODAL_STATE);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await warehousesApi.getWarehouses();
      const payload = response.data.warehouses ?? [];
      const normalized = payload.map(mapBackendWarehouse);
      setWarehouses(normalized);
    } catch (error) {
      console.error('Failed to load warehouses', error);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const openModal = useCallback(
    (type: ModalType, data: Warehouse | null = null) => {
      setModal({ isOpen: true, type, data });
    },
    []
  );

  const closeModal = useCallback(() => {
    setModal(DEFAULT_MODAL_STATE);
  }, []);

  const handleSaveWarehouse = useCallback(
    async (draft: WarehouseDraft & { id?: string }) => {
      if (modal.type === 'add') {
        try {
          const payload = {
            name: draft.nameAr.trim(),
            description: draft.description?.trim() || undefined,
            address: draft.address?.trim() || undefined,
            status: draft.status,
          };

          const response = await warehousesApi.createWarehouse(payload);
          const createdWarehouse = response.data.warehouse as BackendWarehouse | undefined;

          if (createdWarehouse) {
            const normalized = mapBackendWarehouse(createdWarehouse);
            setWarehouses((previous) => {
              const withoutDuplicate = previous.filter((warehouse) => warehouse.id !== normalized.id);
              return [normalized, ...withoutDuplicate];
            });
          }

          closeModal();
        } catch (error) {
          const apiError = error as ApiError;
          console.error('Failed to create warehouse', apiError);
          window.alert(apiError?.message ?? 'تعذر إنشاء المستودع. يرجى المحاولة مرة أخرى.');
          throw error;
        }

        return;
      }

      if (!draft.id) {
        return;
      }

      try {
        const payload = {
          name: draft.nameAr.trim(),
          description: draft.description?.trim() || undefined,
          address: draft.address?.trim() || undefined,
          status: draft.status,
        };

        const response = await warehousesApi.updateWarehouse(draft.id, payload);
        const updatedWarehouse = response.data.warehouse as BackendWarehouse | undefined;

        if (updatedWarehouse) {
          const normalized = mapBackendWarehouse(updatedWarehouse);
          setWarehouses((previousWarehouses) =>
            previousWarehouses.map((warehouse) =>
              warehouse.id === normalized.id ? normalized : warehouse
            )
          );
        }

        closeModal();
      } catch (error) {
        const apiError = error as ApiError;
        console.error('Failed to update warehouse', apiError);
        window.alert(apiError?.message ?? 'تعذر تحديث المستودع. يرجى المحاولة مرة أخرى.');
        throw error;
      }
    },
    [closeModal, modal.type]
  );

  const handleDeleteWarehouse = useCallback(
    async (warehouseId: string) => {
      const warehouse = warehouses.find((item) => item.id === warehouseId);
      const requiresConfirmation =
        warehouse && warehouse.productCount > 0
          ? `هل أنت متأكد من حذف "${warehouse.nameAr}"؟ يحتوي على ${warehouse.productCount} منتج.`
          : AR_LABELS.confirmDeleteMessage;

      if (!window.confirm(requiresConfirmation)) {
        return;
      }

      try {
        await warehousesApi.deleteWarehouse(warehouseId);
        setWarehouses((previous) =>
          previous.filter((item) => item.id !== warehouseId)
        );
      } catch (error) {
        const apiError = error as ApiError;
        console.error('Failed to delete warehouse', apiError);
        window.alert(apiError?.message ?? 'تعذر حذف المستودع. يرجى المحاولة مرة أخرى.');
      }
    },
    [warehouses]
  );

  const handleViewWarehouse = useCallback((warehouse: Warehouse) => {
    window.alert(`تفاصيل المستودع: ${warehouse.nameAr}\nالعنوان: ${warehouse.address || 'غير محدد'}\nعدد المنتجات: ${warehouse.productCount}`);
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

  const handleAddWarehouseClick = useCallback(() => {
    openModal('add');
  }, [openModal]);

  const handleEditWarehouse = useCallback(
    (warehouse: Warehouse) => {
      openModal('edit', warehouse);
    },
    [openModal]
  );

  const handleImportWarehouses = useCallback(() => {
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
        const response = await warehousesApi.importWarehouses(formData);
        const payload = response.data;

        if (payload?.warehouses) {
          setWarehouses(
            payload.warehouses.map(mapBackendWarehouse)
          );
        } else {
          await fetchWarehouses();
        }

        const summary = payload?.summary;
        const successMessage =
          summary && typeof summary.created === 'number' && typeof summary.updated === 'number'
            ? `تم استيراد المستودعات بنجاح.\nمضافة: ${summary.created}\nمحدّثة: ${summary.updated}${
                summary.failed ? `\nفشل: ${summary.failed}` : ''
              }`
            : 'تم استيراد المستودعات بنجاح';

        window.alert(successMessage);
      } catch (error) {
        const apiError = error as ApiError;
        console.error('Failed to import warehouses', apiError);
        window.alert(apiError?.message ?? 'تعذر استيراد المستودعات. يرجى المحاولة مرة أخرى.');
      } finally {
        event.target.value = '';
      }
    },
    [fetchWarehouses]
  );

  const handleExportWarehouses = useCallback(async () => {
    try {
      const blob = await warehousesApi.exportWarehouses();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      link.href = downloadUrl;
      link.setAttribute('download', `warehouses-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Failed to export warehouses', apiError);
      window.alert(apiError?.message ?? 'تعذر تصدير المستودعات. يرجى المحاولة مرة أخرى.');
    }
  }, []);

  const handlePrintWarehouses = useCallback(() => {
    window.alert('وظيفة طباعة المستودعات قيد التطوير');
  }, []);

  const handleSearchFocus = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const filteredWarehouses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return warehouses.filter((warehouse) => {
      const matchesSearch = normalizedSearch
        ? warehouse.nameAr.toLowerCase().includes(normalizedSearch) ||
          (warehouse.address && warehouse.address.toLowerCase().includes(normalizedSearch))
        : true;

      const matchesStatus =
        STATUS_FILTER === 'all'
          ? true
          : warehouse.status.toLowerCase() === STATUS_FILTER;

      return matchesSearch && matchesStatus;
    });
  }, [warehouses, searchTerm]);

  const sortedWarehouses = useMemo(() => {
    const sorted = [...filteredWarehouses];
    sorted.sort(SORTERS[DEFAULT_SORT]);
    return sorted;
  }, [filteredWarehouses]);

  return {
    warehouses,
    sortedWarehouses,
    searchTerm,
    layout,
    modal,
    searchInputRef,
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
    importInputRef,
    closeModal
  };
};

export default useWarehouseManagement;

