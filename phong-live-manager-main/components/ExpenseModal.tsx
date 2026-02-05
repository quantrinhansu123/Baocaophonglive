import React, { useState, useEffect } from 'react';
import { fetchPersonnel } from '../services/dataService';
import { Expense, Personnel, ExpenseItem } from '../types';

// Danh sách loại chi phí
const COST_TYPES = [
  { value: 'LƯƠNG', label: 'CHI PHÍ LƯƠNG (工资成本)' },
  { value: 'VĂN PHÒNG', label: 'CHI PHÍ VĂN PHÒNG (办公室成本)' },
  { value: 'BẾP', label: 'CHI PHÍ BẾP (厨房成本)' },
  { value: 'CSKH', label: 'CHI PHÍ CSKH (客服成本)' },
  { value: 'KHO', label: 'CHI PHÍ KHO (仓库成本)' },
  { value: 'KHÁC', label: 'KHÁC (其他)' }
];

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Expense, 'id'>) => Promise<void>;
  initialData?: Expense;
  isEdit?: boolean;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEdit = false
}) => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPersonnel().then(data => {
        setPersonnel(data);
      }).catch(() => {
        setPersonnel([]);
      });
    }
  }, [isOpen]);

  const defaultFormData: Omit<Expense, 'id'> = {
    date: new Date().toISOString().split('T')[0],
    expenses: [],
    isUrgent: false,
    payer: localStorage.getItem('currentUser') || '',
    receiver: '',
    paymentVoucher: '',
    accounting: '',
    periodType: 'MONTH',
    periodValue: new Date().toISOString().slice(0, 7), // YYYY-MM format
    maintenanceProcess: '',
    description: '',
  };

  const [formData, setFormData] = useState<Omit<Expense, 'id'>>(
    initialData ? {
      ...initialData,
      expenses: initialData.expenses || []
    } : defaultFormData
  );

  const [loading, setLoading] = useState(false);
  const [customCostTypeInputs, setCustomCostTypeInputs] = useState<Record<number, boolean>>({});

  const formatNumber = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/\./g, '')) : value;
    if (isNaN(num)) return '0';
    return num.toLocaleString('vi-VN');
  };

  const parseFormattedNumber = (value: string): number => {
    return parseFloat(value.replace(/\./g, '')) || 0;
  };

  const handleAddExpense = () => {
    setFormData(prev => ({
      ...prev,
      expenses: [...(prev.expenses || []), { costType: '', amount: 0 }]
    }));
  };

  const handleRemoveExpense = (index: number) => {
    setFormData(prev => ({
      ...prev,
      expenses: prev.expenses?.filter((_, i) => i !== index) || []
    }));
    // Remove custom input state
    setCustomCostTypeInputs(prev => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });
  };

  const handleExpenseChange = (index: number, field: 'costType' | 'amount', value: string | number) => {
    setFormData(prev => {
      const newExpenses = [...(prev.expenses || [])];
      newExpenses[index] = {
        ...newExpenses[index],
        [field]: field === 'amount' ? (typeof value === 'number' ? value : parseFloat(value as string) || 0) : value
      };
      return {
        ...prev,
        expenses: newExpenses
      };
    });
  };

  // Load image preview when initialData changes
  useEffect(() => {
    if (initialData?.paymentVoucher) {
      if (initialData.paymentVoucher.startsWith('data:image') || initialData.paymentVoucher.startsWith('http')) {
        setImagePreview(initialData.paymentVoucher);
      }
    } else {
      setImagePreview(null);
    }
  }, [initialData]);

  // Initialize period values
  const getCurrentYear = () => {
    if (initialData?.periodValue && initialData.periodType === 'YEAR') {
      return initialData.periodValue;
    } else if (initialData?.periodValue && initialData.periodType === 'MONTH') {
      return initialData.periodValue.split('-')[0];
    }
    return new Date(formData.date).getFullYear().toString();
  };

  const getCurrentMonth = () => {
    if (initialData?.periodValue && initialData.periodType === 'MONTH') {
      const parts = initialData.periodValue.split('-');
      return parts.length === 2 ? parts[1] : (new Date(formData.date).getMonth() + 1).toString().padStart(2, '0');
    }
    return (new Date(formData.date).getMonth() + 1).toString().padStart(2, '0');
  };

  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  // Update periodValue when periodType, selectedYear, or selectedMonth changes
  useEffect(() => {
    if (formData.periodType === 'YEAR') {
      setFormData(prev => ({ ...prev, periodValue: selectedYear }));
    } else if (formData.periodType === 'MONTH') {
      setFormData(prev => ({ ...prev, periodValue: `${selectedYear}-${selectedMonth}` }));
    }
  }, [formData.periodType, selectedYear, selectedMonth]);

  // Update selectedYear and selectedMonth when initialData or date changes
  useEffect(() => {
    if (initialData?.periodValue) {
      if (initialData.periodType === 'YEAR') {
        setSelectedYear(initialData.periodValue);
      } else if (initialData.periodType === 'MONTH') {
        const parts = initialData.periodValue.split('-');
        if (parts.length === 2) {
          setSelectedYear(parts[0]);
          setSelectedMonth(parts[1]);
        }
      }
    } else {
      // Update when date changes
      const year = new Date(formData.date).getFullYear();
      const month = new Date(formData.date).getMonth() + 1;
      setSelectedYear(year.toString());
      setSelectedMonth(month.toString().padStart(2, '0'));
    }
  }, [initialData, formData.date]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh');
        e.target.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước ảnh không được vượt quá 5MB');
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, paymentVoucher: base64String }));
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, paymentVoucher: '' }));
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      setFormData(defaultFormData);
      setImagePreview(null);
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
      setImagePreview(null);
      setCustomCostTypeInputs({});
    } else if (initialData) {
      setFormData({
        ...initialData,
        expenses: initialData.expenses || [],
        paymentVoucher: initialData.paymentVoucher || ''
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 uppercase">
            {isEdit ? 'Sửa Thu Chi (编辑收支)' : 'Thêm Thu Chi (添加收支)'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  QUY TRÌNH BẢO TRÌ (维护流程)
                </label>
                <input
                  type="text"
                  name="maintenanceProcess"
                  value={formData.maintenanceProcess || ''}
                  onChange={handleChange}
                  placeholder="Nhập quy trình bảo trì"
                  className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Kỳ hạch toán (会计期间)
                </label>
                <select
                  name="periodType"
                  value={formData.periodType}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 bg-white focus:ring-brand-navy focus:border-brand-navy"
                >
                  <option value="MONTH">THEO THÁNG (按月)</option>
                  <option value="YEAR">THEO NĂM (按年)</option>
                </select>
              </div>
              {formData.periodType === 'MONTH' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Năm (年)
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full border rounded px-3 py-2 bg-white focus:ring-brand-navy focus:border-brand-navy"
                    >
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - 5 + i;
                        return (
                          <option key={year} value={year.toString()}>{year}</option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tháng (月)
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full border rounded px-3 py-2 bg-white focus:ring-brand-navy focus:border-brand-navy"
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = (i + 1).toString().padStart(2, '0');
                        const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
                        return (
                          <option key={month} value={month}>{monthNames[i]} ({month})</option>
                        );
                      })}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Năm (年)
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full border rounded px-3 py-2 bg-white focus:ring-brand-navy focus:border-brand-navy"
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - 5 + i;
                      return (
                        <option key={year} value={year.toString()}>{year}</option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Chi phí */}
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <div className="flex justify-between items-center mb-3 border-b border-gray-300 pb-1">
              <h3 className="text-sm font-bold text-gray-700 uppercase">
                2. Chi phí (成本)
              </h3>
              <button
                type="button"
                onClick={handleAddExpense}
                className="text-xs bg-brand-navy text-white px-3 py-1 rounded hover:bg-brand-darkNavy"
              >
                + Thêm chi phí
              </button>
            </div>
            <div className="space-y-3">
              {formData.expenses && formData.expenses.length > 0 ? (
                formData.expenses.map((expense, index) => (
                  <div key={index} className="flex gap-2 items-center bg-white p-3 rounded border border-gray-200">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Loại chi phí (成本类型)
                      </label>
                      {customCostTypeInputs[index] ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={expense.costType}
                            onChange={(e) => handleExpenseChange(index, 'costType', e.target.value)}
                            placeholder="Nhập loại chi phí"
                            className="flex-1 border rounded px-3 py-2 text-sm focus:ring-brand-navy focus:border-brand-navy"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomCostTypeInputs(prev => {
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
                          value={expense.costType}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setCustomCostTypeInputs(prev => ({ ...prev, [index]: true }));
                              handleExpenseChange(index, 'costType', '');
                            } else {
                              handleExpenseChange(index, 'costType', e.target.value);
                            }
                          }}
                          className="w-full border rounded px-3 py-2 text-sm focus:ring-brand-navy focus:border-brand-navy bg-white"
                        >
                          <option value="">-- Chọn loại chi phí --</option>
                          {COST_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                          <option value="__custom__">+ Tự nhập</option>
                        </select>
                      )}
                    </div>
                    <div className="w-48">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Số tiền (金额)
                      </label>
                      <input
                        type="text"
                        value={formatNumber(expense.amount || 0)}
                        onChange={(e) => {
                          const numValue = parseFormattedNumber(e.target.value);
                          handleExpenseChange(index, 'amount', numValue);
                        }}
                        placeholder="0"
                        className="w-full border rounded px-3 py-2 text-sm focus:ring-brand-navy focus:border-brand-navy"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExpense(index)}
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
                <p className="text-sm text-gray-500 text-center py-4">Chưa có chi phí nào. Nhấn "Thêm chi phí" để thêm.</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  TỔNG CHI PHÍ (总成本)
                </label>
                <input
                  type="text"
                  value={formatNumber(formData.expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0)}
                  readOnly
                  className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-700 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Người chi và người nhận */}
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 border-b border-gray-300 pb-1">
              3. Người chi và người nhận (付款人和收款人)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Người chi (付款人)
                </label>
                <select
                  name="payer"
                  value={formData.payer}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 bg-white focus:ring-brand-navy focus:border-brand-navy"
                >
                  <option value="">-- Chọn người chi --</option>
                  {personnel.map(p => (
                    <option key={p.id} value={p.fullName}>{p.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Người nhận (收款人)
                </label>
                <select
                  name="receiver"
                  value={formData.receiver}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 bg-white focus:ring-brand-navy focus:border-brand-navy"
                >
                  <option value="">-- Chọn người nhận --</option>
                  {personnel.map(p => (
                    <option key={p.id} value={p.fullName}>{p.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Chứng từ thanh toán */}
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 border-b border-gray-300 pb-1">
              4. Chứng từ thanh toán (付款凭证)
            </h3>
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
                    alt="Chứng từ"
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
            </div>
          </div>

          {/* Section 5: Mô tả */}
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 border-b border-gray-300 pb-1">
              5. Mô tả (描述)
            </h3>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={3}
              placeholder="Nhập mô tả thêm (nếu có)"
              className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
            />
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded text-gray-600 hover:bg-gray-50"
            >
              Hủy (取消)
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
