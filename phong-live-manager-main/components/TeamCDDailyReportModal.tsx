import React, { useState, useEffect } from 'react';
import { fetchStores, fetchPersonnel } from '../services/dataService';
import { TeamCDDailyReport, Store, Personnel, ProductItem } from '../types';

// Danh sách sản phẩm mặc định
const PRODUCT_OPTIONS = [
  'Nước giặt tím',
  'Nước giặt hồng',
  'Sản phẩm khác'
];

interface ProductInputState {
  [index: number]: boolean; // Track which products are in custom input mode
}

interface TeamCDDailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<TeamCDDailyReport, 'id'>) => Promise<void>;
  initialData?: TeamCDDailyReport;
  isEdit?: boolean;
}

export const TeamCDDailyReportModal: React.FC<TeamCDDailyReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEdit = false
}) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchStores().then(data => {
        setStores(data.filter(s => s.id !== 'all'));
      }).catch(() => {
        setStores([]);
      });
      
      fetchPersonnel().then(data => {
        setPersonnel(data);
      }).catch(() => {
        setPersonnel([]);
      });
    }
  }, [isOpen]);

  const defaultFormData: Omit<TeamCDDailyReport, 'id'> = {
    date: new Date().toISOString().split('T')[0],
    storeId: '',
    shift: '',
    time: 0,
    salary: 0,
    account: '',
    pic: '',
    products: [],
    sum: 0,
    admin: localStorage.getItem('currentUser') || '',
    session: 'SANG',
    tiktokStoreActivity: '',
    dataScreenshot: '',
  };

  const [formData, setFormData] = useState<Omit<TeamCDDailyReport, 'id'>>(
    initialData ? {
      ...initialData,
      products: initialData.products || []
    } : defaultFormData
  );

  const [loading, setLoading] = useState(false);
  const [customProductInputs, setCustomProductInputs] = useState<ProductInputState>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Load image preview when initialData changes
  useEffect(() => {
    if (initialData?.dataScreenshot) {
      // Check if it's a base64 string or URL
      if (initialData.dataScreenshot.startsWith('data:image') || initialData.dataScreenshot.startsWith('http')) {
        setImagePreview(initialData.dataScreenshot);
      }
    } else {
      setImagePreview(null);
    }
  }, [initialData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh');
        e.target.value = '';
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước ảnh không được vượt quá 5MB');
        e.target.value = '';
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, dataScreenshot: base64String }));
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
    // Reset input để có thể chọn lại file cùng tên
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, dataScreenshot: '' }));
    setImagePreview(null);
  };

  const handleAddProduct = () => {
    setFormData(prev => ({
      ...prev,
      products: [...(prev.products || []), { productName: '', quantity: 0 }]
    }));
  };

  const handleRemoveProduct = (index: number) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products?.filter((_, i) => i !== index) || []
    }));
  };

  const handleProductChange = (index: number, field: 'productName' | 'quantity', value: string | number) => {
    setFormData(prev => {
      const newProducts = [...(prev.products || [])];
      newProducts[index] = {
        ...newProducts[index],
        [field]: field === 'quantity' ? (typeof value === 'number' ? value : parseFloat(value as string) || 0) : value
      };
      return {
        ...prev,
        products: newProducts
      };
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'time' || name === 'salary'
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      setFormData(defaultFormData);
      setCustomProductInputs({});
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Có lỗi xảy ra khi lưu dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData(defaultFormData);
      setCustomProductInputs({});
      setImagePreview(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 uppercase">
            {isEdit ? 'Sửa Báo Cáo Ngày (编辑日报)' : 'Thêm Báo Cáo Ngày (添加日报)'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section 1: Thông tin cơ bản */}
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 border-b border-gray-300 pb-1">
              1. Thông tin cơ bản (基本信息)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Ngày (日期) *
                </label>
                <input
                  required
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cửa hàng (店铺) *
                </label>
                <select
                  required
                  name="storeId"
                  value={formData.storeId || ''}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 bg-white focus:ring-brand-navy focus:border-brand-navy"
                >
                  <option value="">-- Chọn cửa hàng --</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Buổi (班次) *
                </label>
                <select
                  required
                  name="session"
                  value={formData.session || 'SANG'}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 bg-white focus:ring-brand-navy focus:border-brand-navy"
                >
                  <option value="SANG">Sáng (早上)</option>
                  <option value="CHIEU">Chiều (下午)</option>
                  <option value="TOI">Tối (晚上)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  CA (班)
                </label>
                <input
                  type="text"
                  name="shift"
                  value={formData.shift || ''}
                  onChange={handleChange}
                  placeholder="VD: 7-10"
                  className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Thời gian (时间) - Giờ
                </label>
                <input
                  type="number"
                  name="time"
                  value={formData.time || 0}
                  onChange={handleChange}
                  min="0"
                  step="0.5"
                  className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Lương (工作时间工资)
                </label>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary || 0}
                  onChange={handleChange}
                  min="0"
                  className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Account (账号)
                </label>
                <input
                  type="text"
                  name="account"
                  value={formData.account || ''}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  PIC (直播)
                </label>
                <select
                  name="pic"
                  value={formData.pic || ''}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 bg-white focus:ring-brand-navy focus:border-brand-navy"
                >
                  <option value="">-- Chọn PIC --</option>
                  {personnel.map(person => (
                    <option key={person.id} value={person.fullName}>
                      {person.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Hoạt động Tiktok/Cửa hàng (有活动的日子)
                </label>
                <input
                  type="text"
                  name="tiktokStoreActivity"
                  value={formData.tiktokStoreActivity || ''}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Admin (运营)
                </label>
                <input
                  type="text"
                  name="admin"
                  value={formData.admin || ''}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Sản phẩm */}
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <div className="flex justify-between items-center mb-3 border-b border-gray-300 pb-1">
              <h3 className="text-sm font-bold text-gray-700 uppercase">
                2. Sản phẩm (产品)
              </h3>
              <button
                type="button"
                onClick={handleAddProduct}
                className="text-xs bg-brand-navy text-white px-3 py-1 rounded hover:bg-brand-darkNavy"
              >
                + Thêm sản phẩm
              </button>
            </div>
            <div className="space-y-3">
              {formData.products && formData.products.length > 0 ? (
                formData.products.map((product, index) => (
                  <div key={index} className="flex gap-2 items-center bg-white p-3 rounded border border-gray-200">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Tên sản phẩm (产品名称)
                      </label>
                      {customProductInputs[index] ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={product.productName}
                            onChange={(e) => handleProductChange(index, 'productName', e.target.value)}
                            placeholder="Nhập tên sản phẩm"
                            className="flex-1 border rounded px-3 py-2 text-sm focus:ring-brand-navy focus:border-brand-navy"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomProductInputs(prev => {
                                const newState = { ...prev };
                                delete newState[index];
                                return newState;
                              });
                            }}
                            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
                            title="Chọn từ danh sách"
                          >
                            ▼
                          </button>
                        </div>
                      ) : (
                        <select
                          value={product.productName}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setCustomProductInputs(prev => ({ ...prev, [index]: true }));
                              handleProductChange(index, 'productName', '');
                            } else {
                              handleProductChange(index, 'productName', e.target.value);
                            }
                          }}
                          className="w-full border rounded px-3 py-2 text-sm focus:ring-brand-navy focus:border-brand-navy bg-white"
                        >
                          <option value="">-- Chọn sản phẩm --</option>
                          {PRODUCT_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                          <option value="__custom__">+ Tự nhập</option>
                        </select>
                      )}
                    </div>
                    <div className="w-32">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Số lượng (数量)
                      </label>
                      <input
                        type="number"
                        value={product.quantity || 0}
                        onChange={(e) => handleProductChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        className="w-full border rounded px-3 py-2 text-sm focus:ring-brand-navy focus:border-brand-navy"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(index)}
                      className="mt-6 text-red-600 hover:text-red-800 px-2 py-1"
                      title="Xóa"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Chưa có sản phẩm nào. Nhấn "Thêm sản phẩm" để thêm.</p>
              )}
            </div>
          </div>

          {/* Section 3: Tổng và dữ liệu ảnh */}
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 border-b border-gray-300 pb-1">
              5. Tổng và dữ liệu (总和和数据)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tổng số lượng (总数量)
                </label>
                <input
                  type="number"
                  value={formData.products?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0}
                  readOnly
                  className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-700 font-bold"
                />
                <p className="text-xs text-gray-500 mt-1">Tự động tính từ tổng số lượng sản phẩm</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Dữ liệu ảnh (数据截图)
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-brand-navy focus:border-brand-navy"
                  />
                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full max-h-48 object-contain border rounded"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                        title="Xóa ảnh"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {formData.dataScreenshot && !imagePreview && (
                    <p className="text-xs text-gray-500">Ảnh đã được tải lên</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded text-gray-600 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2 bg-brand-navy text-white rounded font-bold hover:bg-brand-darkNavy disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : (isEdit ? 'Cập nhật (更新)' : 'Thêm mới (添加)')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
