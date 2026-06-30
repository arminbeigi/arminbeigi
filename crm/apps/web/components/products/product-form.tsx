'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { BOILER_KIND, FUEL_TYPE, PRODUCT_CATEGORY } from '@/lib/enums';
import { Modal } from '@/components/ui/modal';
import type { Brand, Product } from '@/lib/types';

export function ProductFormModal({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const editing = !!product;

  const [sku, setSku] = useState(product?.sku ?? '');
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? 'BOILER');
  const [boilerKind, setBoilerKind] = useState(product?.boilerKind ?? 'WALL_PACKAGE');
  const [fuelType, setFuelType] = useState(product?.fuelType ?? 'GAS');
  const [brandId, setBrandId] = useState(product?.brandId ?? '');
  const [capacityKcal, setCapacityKcal] = useState(product?.capacityKcal?.toString() ?? '');
  const [priceToman, setPriceToman] = useState(
    product?.priceIrr ? String(Math.round(Number(product.priceIrr) / 10)) : '',
  );
  const [stockQty, setStockQty] = useState(product?.stockQty?.toString() ?? '0');
  const [warrantyMo, setWarrantyMo] = useState(product?.warrantyMo?.toString() ?? '');
  const [newBrand, setNewBrand] = useState('');
  const [error, setError] = useState<string | null>(null);

  const brands = useQuery({ queryKey: ['brands'], queryFn: () => api.get<Brand[]>('/products/brands'), enabled: open });

  const buildBody = () => ({
    sku: sku.trim(),
    name: name.trim(),
    category,
    boilerKind: category === 'BOILER' ? boilerKind : 'NONE',
    fuelType: ['BOILER', 'BURNER'].includes(category) ? fuelType : 'NONE',
    ...(brandId ? { brandId } : {}),
    ...(capacityKcal ? { capacityKcal: Number(capacityKcal) } : {}),
    ...(priceToman ? { priceIrr: Number(priceToman) * 10 } : {}),
    stockQty: Number(stockQty) || 0,
    ...(warrantyMo ? { warrantyMo: Number(warrantyMo) } : {}),
  });

  const save = useMutation({
    mutationFn: () =>
      editing
        ? api.patch<Product>(`/products/${product!.id}`, buildBody())
        : api.post<Product>('/products', buildBody()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'خطا در ذخیره محصول'),
  });

  const remove = useMutation({
    mutationFn: () => api.del(`/products/${product!.id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
  });

  const addBrand = useMutation({
    mutationFn: () => api.post<Brand>('/products/brands', { name: newBrand.trim() }),
    onSuccess: (b) => {
      setNewBrand('');
      setBrandId(b.id);
      void qc.invalidateQueries({ queryKey: ['brands'] });
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'ویرایش محصول' : 'افزودن محصول'}
      footer={
        <>
          <button className="btn-primary" disabled={save.isPending || !sku.trim() || !name.trim()} onClick={() => save.mutate()}>
            {save.isPending ? 'در حال ذخیره…' : 'ذخیره'}
          </button>
          <button className="btn-ghost" onClick={onClose}>انصراف</button>
          {editing && hasPermission('products:delete') && (
            <button
              className="btn-ghost mr-auto text-red-500"
              onClick={() => confirm('حذف این محصول؟') && remove.mutate()}
            >
              <Trash2 size={16} /> حذف
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-steel-700">دسته</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRODUCT_CATEGORY).map(([k, fa]) => (
              <button key={k} type="button" onClick={() => setCategory(k)}
                className={`badge cursor-pointer px-3 py-1.5 ${category === k ? 'bg-steel-700 text-white' : 'bg-steel-100 text-steel-600'}`}>
                {fa}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-steel-700">کد (SKU) *</label>
            <input className="input" dir="ltr" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="BDR-G124" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-steel-700">نام *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="نام محصول" />
          </div>
        </div>

        {category === 'BOILER' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-steel-700">نوع دیگ</label>
            <select className="input" value={boilerKind} onChange={(e) => setBoilerKind(e.target.value)}>
              {Object.entries(BOILER_KIND).filter(([k]) => k !== 'NONE').map(([k, fa]) => (
                <option key={k} value={k}>{fa}</option>
              ))}
            </select>
          </div>
        )}

        {['BOILER', 'BURNER'].includes(category) && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-steel-700">نوع سوخت</label>
            <select className="input" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
              {Object.entries(FUEL_TYPE).filter(([k]) => k !== 'NONE').map(([k, fa]) => (
                <option key={k} value={k}>{fa}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-steel-700">برند</label>
          <div className="flex gap-2">
            <select className="input flex-1" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">— بدون برند —</option>
              {brands.data?.map((b) => (
                <option key={b.id} value={b.id}>{b.nameFa || b.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex gap-2">
            <input className="input flex-1" placeholder="برند جدید…" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} />
            <button type="button" className="btn-ghost" disabled={!newBrand.trim() || addBrand.isPending} onClick={() => addBrand.mutate()}>
              <Plus size={16} /> برند
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-steel-500">ظرفیت (kcal/h)</label>
            <input className="input" dir="ltr" inputMode="numeric" placeholder="ظرفیت" value={capacityKcal} onChange={(e) => setCapacityKcal(e.target.value.replace(/[^\d]/g, ''))} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-steel-500">قیمت (تومان)</label>
            <input className="input" dir="ltr" inputMode="numeric" placeholder="قیمت (تومان)" value={priceToman} onChange={(e) => setPriceToman(e.target.value.replace(/[^\d]/g, ''))} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-steel-500">موجودی</label>
            <input className="input" dir="ltr" inputMode="numeric" placeholder="موجودی" value={stockQty} onChange={(e) => setStockQty(e.target.value.replace(/[^\d]/g, ''))} />
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      </div>
    </Modal>
  );
}
