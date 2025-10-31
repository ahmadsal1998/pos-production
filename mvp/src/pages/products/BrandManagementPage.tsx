import React, { useState, useMemo, useEffect } from 'react';
import { 
  AR_LABELS, EditIcon, DeleteIcon, UUID, SearchIcon, GridViewIcon, TableViewIcon, ViewIcon
} from '@/shared/constants';
import { Brand } from '@/shared/types';
import BrandAnalytics from '@/features/products/components/BrandAnalytics';
import BrandQuickActions from '@/features/products/components/BrandQuickActions';

// --- MOCK DATA ---
const createInitialData = (): Brand[] => {
  return [
    { id: UUID(), nameAr: 'كوكا كولا', status: 'Active', createdAt: '2023-01-15T10:00:00Z', productCount: 25 },
    { id: UUID(), nameAr: 'سامسونج', status: 'Active', createdAt: '2022-11-20T14:30:00Z', productCount: 150 },
    { id: UUID(), nameAr: 'ليز', status: 'Active', createdAt: '2023-05-10T09:00:00Z', productCount: 40 },
    { id: UUID(), nameAr: 'المراعي', status: 'Inactive', createdAt: '2021-08-01T12:00:00Z', productCount: 0 },
    { id: UUID(), nameAr: 'سوني', status: 'Active', createdAt: '2023-10-02T18:45:00Z', productCount: 88 },
    { id: UUID(), nameAr: 'علامة تجارية بدون منتجات', status: 'Active', createdAt: '2023-11-05T11:00:00Z', productCount: 0 },
  ];
};

// --- TYPE DEFINITIONS ---
type ModalType = 'add' | 'edit';
type LayoutType = 'table' | 'grid';
type SortType = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc';

const EMPTY_BRAND: Omit<Brand, 'id' | 'createdAt' | 'productCount'> = {
  nameAr: '',
  description: '',
  status: 'Active',
};

// --- HELPER COMPONENTS ---

// 1. Brand Form Modal
const BrandFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (brand: Omit<Brand, 'createdAt' | 'productCount'>) => void;
  brandToEdit: Brand | null;
}> = ({ isOpen, onClose, onSave, brandToEdit }) => {
  const [formData, setFormData] = useState(EMPTY_BRAND);

  useEffect(() => {
    if (brandToEdit) {
      setFormData(brandToEdit);
    } else {
      setFormData(EMPTY_BRAND);
    }
  }, [brandToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleStatusChange = (status: 'Active' | 'Inactive') => {
    setFormData(prev => ({ ...prev, status }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameAr.trim()) {
      alert(AR_LABELS.nameArabic + ' مطلوب');
      return;
    }
    onSave({ id: brandToEdit?.id || UUID(), ...formData });
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 text-right">{brandToEdit ? AR_LABELS.edit : AR_LABELS.addNewBrand}</h2>
          
          <div>
            <label htmlFor="nameAr" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right mb-1">{AR_LABELS.nameArabic} *</label>
            <input type="text" name="nameAr" value={formData.nameAr} onChange={handleChange} required className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm text-right"/>
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right mb-1">{AR_LABELS.description}</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm text-right"></textarea>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right mb-2">{AR_LABELS.status}</label>
             <div className="flex justify-end gap-4">
                <button type="button" onClick={() => handleStatusChange('Inactive')} className={`px-4 py-2 rounded-md text-sm font-medium ${formData.status === 'Inactive' ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'}`}>{AR_LABELS.inactive}</button>
                <button type="button" onClick={() => handleStatusChange('Active')} className={`px-4 py-2 rounded-md text-sm font-medium ${formData.status === 'Active' ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'}`}>{AR_LABELS.active}</button>
             </div>
          </div>

          <div className="flex justify-start space-x-4 space-x-reverse pt-4">
            <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600">{AR_LABELS.save}</button>
            <button type="button" onClick={onClose} className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">{AR_LABELS.cancel}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const BrandManagementPage: React.FC = () => {
    const [brands, setBrands] = useState<Brand[]>(createInitialData());
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState<SortType>('date-desc');
    const [layout, setLayout] = useState<LayoutType>('table');
    const [modal, setModal] = useState<{ isOpen: boolean; type: ModalType; data: Brand | null }>({ isOpen: false, type: 'add', data: null });

    const handleOpenModal = (type: ModalType, data: Brand | null = null) => {
        setModal({ isOpen: true, type, data });
    };

    const handleSaveBrand = (data: Omit<Brand, 'createdAt' | 'productCount'>) => {
        if (modal.type === 'add') {
            const newBrand: Brand = {
                ...data,
                createdAt: new Date().toISOString(),
                productCount: 0,
            };
            setBrands(prev => [...prev, newBrand]);
        } else {
            setBrands(prev => prev.map(c => c.id === data.id ? { ...c, ...data } : c));
        }
        setModal({ isOpen: false, type: 'add', data: null });
    };
    
    const handleDeleteBrand = (brandId: string) => {
        const brand = brands.find(b => b.id === brandId);
        if (brand && brand.productCount > 0) {
            if (!window.confirm(AR_LABELS.confirmDeleteBrandWithProducts)) return;
        } else {
            if (!window.confirm(AR_LABELS.confirmDeleteBrandMessage)) return;
        }
        setBrands(prev => prev.filter(c => c.id !== brandId));
    };

    const handleQuickAction = (action: string) => {
        switch (action) {
            case 'add-brand':
                handleOpenModal('add');
                break;
            case 'import':
                alert('وظيفة الاستيراد قيد التطوير');
                break;
            case 'export':
                alert('وظيفة التصدير قيد التطوير');
                break;
            case 'print':
                alert('وظيفة الطباعة قيد التطوير');
                break;
            case 'search':
                // Focus on search input
                const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (searchInput) {
                    searchInput.focus();
                }
                break;
            default:
                break;
        }
    };

    const filteredAndSortedBrands = useMemo(() => {
        let result = brands.filter(brand => {
            const matchesSearch = searchTerm ? brand.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) : true;
            const matchesStatus = statusFilter !== 'all' ? brand.status.toLowerCase() === statusFilter : true;
            return matchesSearch && matchesStatus;
        });

        result.sort((a, b) => {
            switch (sortBy) {
                case 'name-asc': return a.nameAr.localeCompare(b.nameAr, 'ar');
                case 'name-desc': return b.nameAr.localeCompare(a.nameAr, 'ar');
                case 'date-asc': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'date-desc': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                default: return 0;
            }
        });

        return result;
    }, [brands, searchTerm, statusFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Analytics and Quick Actions */}
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

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Search */}
          <div className="relative w-full md:w-1/3">
              <input type="text" placeholder={AR_LABELS.searchByBrandName} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-orange-500 text-right"/>
              <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          {/* Filters & Actions */}
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
              <button onClick={() => setLayout(layout === 'table' ? 'grid' : 'table')} className="p-2 border dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
                  {layout === 'table' ? <GridViewIcon/> : <TableViewIcon />}
              </button>
          </div>
        </div>
      </div>
      
      {/* Content Area */}
      {layout === 'table' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.brandName}</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">{AR_LABELS.productCount}</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.createdDate}</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.status}</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">{AR_LABELS.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredAndSortedBrands.map(brand => (
                            <tr key={brand.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{brand.nameAr}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{brand.productCount}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(brand.createdAt).toLocaleDateString('ar-EG')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${brand.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                        {brand.status === 'Active' ? AR_LABELS.active : AR_LABELS.inactive}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                    <button onClick={() => handleOpenModal('edit', brand)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 ml-2 p-1"><EditIcon /></button>
                                    <button onClick={() => handleDeleteBrand(brand.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"><DeleteIcon /></button>
                                    <button onClick={() => alert('View details for ' + brand.nameAr)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"><ViewIcon /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedBrands.map(brand => (
            <div key={brand.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{brand.nameAr}</h3>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${brand.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                          {brand.status === 'Active' ? AR_LABELS.active : AR_LABELS.inactive}
                      </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{AR_LABELS.productCount}: {brand.productCount}</p>
                </div>
                <div className="border-t dark:border-gray-700 pt-2 flex justify-end space-x-2 space-x-reverse">
                  <button onClick={() => handleOpenModal('edit', brand)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1"><EditIcon /></button>
                  <button onClick={() => handleDeleteBrand(brand.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"><DeleteIcon /></button>
                  <button onClick={() => alert('View details for ' + brand.nameAr)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"><ViewIcon /></button>
                </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <BrandFormModal 
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, type: 'add', data: null })}
        onSave={handleSaveBrand}
        brandToEdit={modal.data}
      />
    </div>
  );
};

export default BrandManagementPage;
