import React, { useState, useEffect } from 'react';
import type { InventoryItem, Supplier } from '../types';
import Button from './ui/Button';
import Input from './ui/Input';
import { Calendar, MapPin, Users as UsersIcon } from 'lucide-react';

interface InventoryItemFormProps {
    onSubmit: (item: InventoryItem) => void;
    onCancel: () => void;
    initialData?: InventoryItem;
    entrepreneurId: string;
    suppliers: Supplier[];
}

const InventoryItemForm: React.FC<InventoryItemFormProps> = ({ onSubmit, onCancel, initialData, entrepreneurId, suppliers }) => {
    const [formData, setFormData] = useState<Omit<InventoryItem, 'id' | 'entrepreneurId'>>({
        name: initialData?.name || '',
        sku: initialData?.sku || '',
        quantity: initialData?.quantity || 0,
        price: initialData?.price || 0,
        cost: initialData?.cost || 0,
        category: initialData?.category || '',
        lowStockThreshold: initialData?.lowStockThreshold || 5,
        supplierId: initialData?.supplierId || '',
        notes: initialData?.notes || '',
        expiryDate: initialData?.expiryDate || '',
        location: initialData?.location || '',
        minStockLevel: initialData?.minStockLevel || 0,
        dateStocked: initialData?.dateStocked || new Date().toISOString().split('T')[0],
        brand: initialData?.brand || '',
        manufacturer: initialData?.manufacturer || '',
        status: initialData?.status || 'active',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const item: InventoryItem = {
            ...formData,
            id: initialData?.id || crypto.randomUUID(),
            entrepreneurId,
            totalRevenue: initialData?.totalRevenue || 0,
            totalUnitsSold: initialData?.totalUnitsSold || 0,
            status: formData.status as any
        };
        onSubmit(item);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input
                label="Item Name"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
            />
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Brand / Manufacturer"
                    id="brand"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    placeholder="e.g. Samsung, Nestle..."
                />
                <Input
                    label="SKU / Barcode (Optional)"
                    id="sku"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Current Quantity"
                    id="quantity"
                    name="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                />
                <Input
                    label="Low Stock Alert Level"
                    id="lowStockThreshold"
                    name="lowStockThreshold"
                    type="number"
                    value={formData.lowStockThreshold}
                    onChange={handleChange}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Selling Price (GHS)"
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={handleChange}
                    required
                />
                <Input
                    label="Cost Price (GHS)"
                    id="cost"
                    name="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={handleChange}
                    required
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-dark-textSecondary ml-1 flex items-center">
                        <UsersIcon size={14} className="mr-1" /> Supplier
                    </label>
                    <select
                        name="supplierId"
                        value={formData.supplierId}
                        onChange={(e: any) => handleChange(e)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-dark-primary border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-accent-primary outline-none text-gray-900 dark:text-dark-text transition-all"
                    >
                        <option value="">Select a Supplier</option>
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
                <Input
                    label="Stock Location"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Shelf A1, Warehouse..."
                    icon={<MapPin size={18} />}
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Stocking Date"
                    id="dateStocked"
                    name="dateStocked"
                    type="date"
                    value={formData.dateStocked}
                    onChange={handleChange}
                    icon={<Calendar size={18} />}
                />
                <Input
                    label="Expiry Date"
                    id="expiryDate"
                    name="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    icon={<Calendar size={18} />}
                />
                <Input
                    label="Category"
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="e.g. Electronics"
                />
            </div>
            <div className="flex flex-col space-y-1">
                <label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-dark-textSecondary ml-1">Notes / Specifications</label>
                <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={(e: any) => handleChange(e)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-dark-primary border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-accent-primary outline-none text-gray-900 dark:text-dark-text transition-all min-h-[100px]"
                    placeholder="Extra details about this product..."
                />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t dark:border-white/10">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button type="submit" variant="primary">
                    {initialData ? 'Update Item' : 'Add Item'}
                </Button>
            </div>
        </form>
    );
};

export default InventoryItemForm;
