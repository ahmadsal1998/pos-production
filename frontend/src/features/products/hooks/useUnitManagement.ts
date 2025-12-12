import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AR_LABELS } from '@/shared/constants';
import { Unit } from '@/shared/types';
import { ApiError, unitsApi } from '@/lib/api/client';

export type ModalType = 'add' | 'edit';
export type LayoutType = 'table' | 'grid';
export type SortType = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc';

export type UnitDraft = Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>;

export interface ModalState {
  isOpen: boolean;
  type: ModalType;
  data: Unit | null;
}

const DEFAULT_MODAL_STATE: ModalState = {
  isOpen: false,
  type: 'add',
  data: null
};

const SORTERS: Record<SortType, (a: Unit, b: Unit) => number> = {
  'name-asc': (a, b) => a.nameAr.localeCompare(b.nameAr),
  'name-desc': (a, b) => b.nameAr.localeCompare(a.nameAr),
  'date-asc': (a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  'date-desc': (a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
};

const DEFAULT_SORT: SortType = 'date-desc';

type BackendUnit = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

const mapBackendUnit = (unit: BackendUnit): Unit => ({
  id: unit.id,
  nameAr: unit.name,
  description: unit.description ?? '',
  createdAt: unit.createdAt,
  updatedAt: unit.updatedAt,
});

const useUnitManagement = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [layout, setLayout] = useState<LayoutType>('table');
  const [modal, setModal] = useState<ModalState>(DEFAULT_MODAL_STATE);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const fetchUnits = useCallback(async () => {
    try {
      const response = await unitsApi.getUnits();
      console.log('Units API response:', response);
      
      // The API client wraps the response, so response.data is the backend response
      // Backend returns: { success: true, message: '...', units: [...] }
      const backendResponse = response.data as any;
      
      // Try different possible response structures
      let unitsData = [];
      if (backendResponse?.units) {
        unitsData = backendResponse.units;
      } else if (backendResponse?.data?.units) {
        unitsData = backendResponse.data.units;
      } else if (Array.isArray(backendResponse)) {
        unitsData = backendResponse;
      } else if (Array.isArray(backendResponse?.data)) {
        unitsData = backendResponse.data;
      }
      
      console.log('Extracted units data:', unitsData);
      
      // Map backend units to frontend format
      const normalized = Array.isArray(unitsData) ? unitsData.map((unit: any) => {
        // Handle different ID formats
        const unitId = unit.id || unit._id?.toString() || unit._id;
        const unitName = unit.name || unit.nameAr;
        
        // Handle date formatting
        let createdAt = new Date().toISOString();
        if (unit.createdAt) {
          if (typeof unit.createdAt === 'string') {
            createdAt = unit.createdAt;
          } else if (unit.createdAt instanceof Date) {
            createdAt = unit.createdAt.toISOString();
          } else if (unit.createdAt.toISOString) {
            createdAt = unit.createdAt.toISOString();
          }
        }
        
        let updatedAt = createdAt;
        if (unit.updatedAt) {
          if (typeof unit.updatedAt === 'string') {
            updatedAt = unit.updatedAt;
          } else if (unit.updatedAt instanceof Date) {
            updatedAt = unit.updatedAt.toISOString();
          } else if (unit.updatedAt.toISOString) {
            updatedAt = unit.updatedAt.toISOString();
          }
        }
        
        return {
          id: unitId?.toString() || '',
          nameAr: unitName || '',
          description: unit.description || '',
          createdAt: createdAt,
          updatedAt: updatedAt,
        };
      }) : [];
      
      console.log('Normalized units:', normalized);
      setUnits(normalized);
    } catch (error) {
      console.error('Failed to load units', error);
      setUnits([]); // Set empty array on error to prevent undefined state
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const openModal = useCallback(
    (type: ModalType, data: Unit | null = null) => {
      setModal({ isOpen: true, type, data });
    },
    []
  );

  const closeModal = useCallback(() => {
    setModal(DEFAULT_MODAL_STATE);
  }, []);

  const handleSaveUnit = useCallback(
    async (draft: UnitDraft & { id?: string }) => {
      if (modal.type === 'add') {
        try {
          const payload = {
            name: draft.nameAr.trim(),
            description: draft.description?.trim() || undefined,
          };

          const response = await unitsApi.createUnit(payload);
          const createdUnit = response.data.unit as BackendUnit | undefined;

          if (createdUnit) {
            const normalized = mapBackendUnit(createdUnit);
            setUnits((previous) => {
              const withoutDuplicate = previous.filter((unit) => unit.id !== normalized.id);
              return [normalized, ...withoutDuplicate];
            });
          }

          closeModal();
        } catch (error) {
          const apiError = error as ApiError;
          console.error('Failed to create unit', apiError);
          window.alert(apiError?.message ?? 'تعذر إنشاء الوحدة. يرجى المحاولة مرة أخرى.');
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
        };

        const response = await unitsApi.updateUnit(draft.id, payload);
        const updatedUnit = response.data.unit as BackendUnit | undefined;

        if (updatedUnit) {
          const normalized = mapBackendUnit(updatedUnit);
          setUnits((previous) =>
            previous.map((unit) =>
              unit.id === normalized.id ? normalized : unit
            )
          );
        }

        closeModal();
      } catch (error) {
        const apiError = error as ApiError;
        console.error('Failed to update unit', apiError);
        window.alert(apiError?.message ?? 'تعذر تحديث الوحدة. يرجى المحاولة مرة أخرى.');
        throw error;
      }
    },
    [closeModal, modal.type]
  );

  const handleDeleteUnit = useCallback(
    async (unitId: string) => {
      if (!window.confirm('هل أنت متأكد من حذف هذه الوحدة؟')) {
        return;
      }

      try {
        await unitsApi.deleteUnit(unitId);
        setUnits((previous) =>
          previous.filter((item) => item.id !== unitId)
        );
      } catch (error) {
        const apiError = error as ApiError;
        console.error('Failed to delete unit', apiError);
        window.alert(apiError?.message ?? 'تعذر حذف الوحدة. يرجى المحاولة مرة أخرى.');
      }
    },
    []
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(event.target.value);
    },
    []
  );

  const handleLayoutToggle = useCallback(() => {
    setLayout((previous) => (previous === 'table' ? 'grid' : 'table'));
  }, []);

  const handleAddUnitClick = useCallback(() => {
    openModal('add');
  }, [openModal]);

  const handleEditUnit = useCallback(
    (unit: Unit) => {
      openModal('edit', unit);
    },
    [openModal]
  );

  const handleImportUnits = useCallback(() => {
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
        const response = await unitsApi.importUnits(formData);
        const payload = response.data;

        if (payload?.units) {
          setUnits(
            payload.units.map(mapBackendUnit)
          );
        } else {
          await fetchUnits();
        }

        const summary = payload?.summary;
        const successMessage =
          summary && typeof summary.created === 'number' && typeof summary.updated === 'number'
            ? `تم استيراد الوحدات بنجاح.\nمضافة: ${summary.created}\nمحدّثة: ${summary.updated}${
                summary.failed ? `\nفشل: ${summary.failed}` : ''
              }`
            : 'تم استيراد الوحدات بنجاح';

        window.alert(successMessage);
      } catch (error) {
        const apiError = error as ApiError;
        console.error('Failed to import units', apiError);
        window.alert(apiError?.message ?? 'تعذر استيراد الوحدات. يرجى المحاولة مرة أخرى.');
      } finally {
        event.target.value = '';
      }
    },
    [fetchUnits]
  );

  const handleExportUnits = useCallback(async () => {
    try {
      const blob = await unitsApi.exportUnits();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      link.href = downloadUrl;
      link.setAttribute('download', `units-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Failed to export units', apiError);
      window.alert(apiError?.message ?? 'تعذر تصدير الوحدات. يرجى المحاولة مرة أخرى.');
    }
  }, []);

  const handlePrintUnits = useCallback(() => {
    window.alert('وظيفة طباعة الوحدات قيد التطوير');
  }, []);

  const handleSearchFocus = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const filteredUnits = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return units.filter((unit) => {
      const matchesSearch = normalizedSearch
        ? unit.nameAr.toLowerCase().includes(normalizedSearch) ||
          (unit.description && unit.description.toLowerCase().includes(normalizedSearch))
        : true;

      return matchesSearch;
    });
  }, [units, searchTerm]);

  const sortedUnits = useMemo(() => {
    const sorted = [...filteredUnits];
    sorted.sort(SORTERS[DEFAULT_SORT]);
    return sorted;
  }, [filteredUnits]);

  const EMPTY_UNIT: UnitDraft = {
    nameAr: '',
    description: '',
  };

  return {
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
  };
};

export default useUnitManagement;

