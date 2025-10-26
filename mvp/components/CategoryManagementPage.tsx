import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  AR_LABELS, EditIcon, DeleteIcon, PlusIcon, UUID, SearchIcon, ImportIcon, ExportIcon, GridViewIcon, TableViewIcon, ViewIcon
} from '../constants';
import { Category } from '../types';

// --- MOCK DATA ---
const createInitialData = () => {
    const cat1Id = UUID();
    const cat2Id = UUID();
    const cat3Id = UUID();
    const cat4Id = UUID();
  
    return [
      { id: cat1Id, nameAr: 'مشروبات', parentId: null, status: 'Active' as const, createdAt: '2023-10-26T10:00:00Z', productCount: 150 },
      { id: cat2Id, nameAr: 'مشروبات غازية', parentId: cat1Id, status: 'Active' as const, createdAt: '2023-10-26T10:05:00Z', productCount: 45 },
      { id: UUID(), nameAr: 'كوكا كولا', parentId: cat2Id, status: 'Active' as const, createdAt: '2023-10-26T10:06:00Z', productCount: 10 },
      { id: UUID(), nameAr: 'عصائر', parentId: cat1Id, status: 'Active' as const, createdAt: '2023-11-01T12:00:00Z', productCount: 30 },
      { id: cat3Id, nameAr: 'وجبات خفيفة', parentId: null, status: 'Active' as const, createdAt: '2023-09-15T09:00:00Z', productCount: 200 },
      { id: cat4Id, nameAr: 'بطاطس شيبس', parentId: cat3Id, status: 'Inactive' as const, createdAt: '2023-09-15T09:30:00Z', productCount: 80 },
      { id: UUID(), nameAr: 'إلكترونيات', parentId: null, status: 'Inactive' as const, createdAt: '2022-01-20T14:00:00Z', productCount: 0 },
    ];
};

// --- TYPE DEFINITIONS ---
type ModalType = 'add' | 'edit';
type LayoutType = 'table' | 'grid';
type SortType = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc';

const EMPTY_CATEGORY: Omit<Category, 'id' | 'createdAt' | 'productCount'> = {
  nameAr: '',
  description: '',
  parentId: null,
  status: 'Active',
};

// --- HELPER COMPONENTS ---

// 1. Category Form Modal
const CategoryFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Omit<Category, 'createdAt' | 'productCount'>) => void;
  categoryToEdit: Category | null;
  allCategories: Category[];
}> = ({ isOpen, onClose, onSave, categoryToEdit, allCategories }) => {
  const [formData, setFormData] = useState(EMPTY_CATEGORY);

  useEffect(() => {
    if (categoryToEdit) {
      setFormData(categoryToEdit);
    } else {
      setFormData(EMPTY_CATEGORY);
    }
  }, [categoryToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleStatusChange = (status: 'Active' | 'Inactive') => {
    setFormData(prev => ({ ...prev, status }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameAr) {
      alert('الاسم بالعربية مطلوب');
      return;
    }
    onSave({ id: categoryToEdit?.id || UUID(), ...formData });
  };
  
  const possibleParents = allCategories.filter(c => c.id !== categoryToEdit?.id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 text-right">{categoryToEdit ? AR_LABELS.edit : AR_LABELS.addNewCategory}</h2>
          
          <div>
            <label htmlFor="nameAr" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right mb-1">{AR_LABELS.nameArabic} *</label>
            <input type="text" name="nameAr" value={formData.nameAr} onChange={handleChange} required className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm text-right"/>
          </div>
          
          <div>
            <label htmlFor="parentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-right mb-1">{AR_LABELS.parentCategory}</label>
            <select name="parentId" value={formData.parentId || ''} onChange={handleChange} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm text-right appearance-none pr-8">
                <option value="">{AR_LABELS.noParentCategory}</option>
                {possibleParents.map(cat => <option key={cat.id} value={cat.id}>{cat.nameAr}</option>)}
            </select>
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

// 2. Category Table Row (Recursive)
const CategoryTableRow: React.FC<{
  category: Category;
  allCategories: Category[];
  level: number;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
}> = ({ category, allCategories, level, onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const children = useMemo(() => allCategories.filter(c => c.parentId === category.id), [allCategories, category.id]);

    return (
        <>
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    <div className="flex items-center" style={{ paddingRight: `${level * 1.5}rem`}}>
                        {children.length > 0 && (
                            <button onClick={() => setIsOpen(!isOpen)} className="ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                                <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        )}
                        <span className={children.length === 0 ? 'mr-6' : ''}>{category.nameAr}</span>
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{category.productCount}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(category.createdAt).toLocaleDateString('ar-EG')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${category.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                        {category.status === 'Active' ? AR_LABELS.active : AR_LABELS.inactive}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button onClick={() => onEdit(category)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 ml-2 p-1"><EditIcon /></button>
                    <button onClick={() => onDelete(category.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"><DeleteIcon /></button>
                    <button onClick={() => alert('View details for ' + category.nameAr)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"><ViewIcon /></button>
                </td>
            </tr>
            {isOpen && children.map(child => (
                <CategoryTableRow key={child.id} category={child} allCategories={allCategories} level={level + 1} onEdit={onEdit} onDelete={onDelete} />
            ))}
        </>
    );
};

// --- MAIN COMPONENT ---
const CategoryManagementPage: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>(createInitialData());
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState<SortType>('date-desc');
    const [layout, setLayout] = useState<LayoutType>('table');
    const [modal, setModal] = useState<{ isOpen: boolean; type: ModalType; data: Category | null }>({ isOpen: false, type: 'add', data: null });

    const handleOpenModal = (type: ModalType, data: Category | null = null) => {
        setModal({ isOpen: true, type, data });
    };

    const handleSaveCategory = (data: Omit<Category, 'createdAt' | 'productCount'>) => {
        if (modal.type === 'add') {
            const newCategory: Category = {
                ...data,
                createdAt: new Date().toISOString(),
                productCount: 0,
            };
            setCategories(prev => [...prev, newCategory]);
        } else {
            setCategories(prev => prev.map(c => c.id === data.id ? { ...c, ...data } : c));
        }
        setModal({ isOpen: false, type: 'add', data: null });
    };
    
    const handleDeleteCategory = (categoryId: string) => {
        const hasChildren = categories.some(c => c.parentId === categoryId);
        if (hasChildren) {
            alert(AR_LABELS.confirmDeleteWithChildren);
            return;
        }
        const category = categories.find(c => c.id === categoryId);
        if (category && category.productCount > 0) {
            if (!window.confirm(AR_LABELS.confirmDeleteWithProducts)) return;
        } else {
            if (!window.confirm(AR_LABELS.confirmDeleteMessage)) return;
        }
        setCategories(prev => prev.filter(c => c.id !== categoryId));
    };

    const filteredAndSortedCategories = useMemo(() => {
        let result = categories.filter(cat => {
            const matchesSearch = searchTerm ? cat.nameAr.includes(searchTerm) : true;
            const matchesStatus = statusFilter !== 'all' ? cat.status.toLowerCase() === statusFilter : true;
            return matchesSearch && matchesStatus;
        });

        result.sort((a, b) => {
            switch (sortBy) {
                case 'name-asc': return a.nameAr.localeCompare(b.nameAr);
                case 'name-desc': return b.nameAr.localeCompare(a.nameAr);
                case 'date-asc': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'date-desc': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                default: return 0;
            }
        });

        return result;
    }, [categories, searchTerm, statusFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Search */}
          <div className="relative w-full md:w-1/3">
              <input type="text" placeholder={AR_LABELS.searchByCategoryName} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-orange-500 text-right"/>
              <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          {/* Filters & Actions */}
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
              <select onChange={e => setStatusFilter(e.target.value)} className="w-full md:w-auto border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md shadow-sm text-right">
                  <option value="all">{AR_LABELS.allStatuses}</option>
                  <option value="active">{AR_LABELS.active}</option>
                  <option value="inactive">{AR_LABELS.inactive}</option>
              </select>
              <select onChange={e => setSortBy(e.target.value as SortType)} className="w-full md:w-auto border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md shadow-sm text-right">
                  <option value="date-desc">{AR_LABELS.sortByDateDesc}</option>
                  <option value="date-asc">{AR_LABELS.sortByDateAsc}</option>
                  <option value="name-asc">{AR_LABELS.sortByNameAsc}</option>
                  <option value="name-desc">{AR_LABELS.sortByNameDesc}</option>
              </select>
              <button onClick={() => setLayout(layout === 'table' ? 'grid' : 'table')} className="p-2 border dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
                  {layout === 'table' ? <GridViewIcon/> : <TableViewIcon />}
              </button>
              <button onClick={() => handleOpenModal('add')} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600">
                  <PlusIcon className="h-4 w-4 ml-2" /><span>{AR_LABELS.addNewCategory}</span>
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
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.categoryName}</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">{AR_LABELS.productCount}</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.createdDate}</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{AR_LABELS.status}</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">{AR_LABELS.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredAndSortedCategories.filter(c => c.parentId === null).map(category => (
                            <CategoryTableRow key={category.id} category={category} allCategories={filteredAndSortedCategories} level={0} onEdit={cat => handleOpenModal('edit', cat)} onDelete={handleDeleteCategory} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedCategories.map(cat => (
            <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{cat.nameAr}</h3>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cat.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                          {cat.status === 'Active' ? AR_LABELS.active : AR_LABELS.inactive}
                      </span>
                  </div>
                  {cat.parentId && <p className="text-sm text-gray-500 dark:text-gray-400">{AR_LABELS.parentCategory}: {categories.find(p=>p.id === cat.parentId)?.nameAr}</p>}
                  <p className="text-sm text-gray-600 dark:text-gray-300">{AR_LABELS.productCount}: {cat.productCount}</p>
                </div>
                <div className="border-t dark:border-gray-700 pt-2 flex justify-end space-x-2 space-x-reverse">
                  <button onClick={() => handleOpenModal('edit', cat)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1"><EditIcon /></button>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"><DeleteIcon /></button>
                </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <CategoryFormModal 
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, type: 'add', data: null })}
        onSave={handleSaveCategory}
        categoryToEdit={modal.data}
        allCategories={categories}
      />
    </div>
  );
};

export default CategoryManagementPage;