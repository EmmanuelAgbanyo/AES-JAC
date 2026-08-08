import React, { useState, type ChangeEvent, type FormEvent, useEffect } from 'react';
import type { Client } from '../types';
import Button from './ui/Button';
import { User, Mail, Phone, Building, MapPin, FileText, X, Check, Calendar } from 'lucide-react';

interface ClientFormProps {
    onSubmit: (client: Client) => void;
    onCancel: () => void;
    initialData?: Client;
    entrepreneurId: string;
}

// Custom Input Component for this form to maintain style consistency within the modal
const FormInput = ({
    label,
    name,
    type = "text",
    icon: Icon,
    value,
    error,
    onChange,
    required = false,
    placeholder
}: any) => (
    <div className="space-y-1.5 group">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
            {label} {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className={`relative transition-all duration-200 ${error ? 'animate-shake' : ''}`}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Icon size={18} />
            </div>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border ${error ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-100 dark:focus:ring-blue-900/30'} rounded-xl focus:outline-none focus:ring-4 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-400`}
            />
        </div>
        {error && <span className="text-xs text-red-500 mt-1 ml-1">{error}</span>}
    </div>
);

const ClientForm: React.FC<ClientFormProps> = ({ onSubmit, onCancel, initialData, entrepreneurId }) => {
    const getInitialState = () => {
        if (initialData) {
            return {
                name: initialData.name,
                email: initialData.email || '',
                phone: initialData.phone || '',
                company: initialData.company || '',
                address: initialData.address || '',
                dateOfBirth: initialData.dateOfBirth || '',
                notes: initialData.notes || '',
            };
        }
        return {
            name: '',
            email: '',
            phone: '',
            company: '',
            address: '',
            dateOfBirth: '',
            notes: '',
        };
    };

    const [formData, setFormData] = useState(getInitialState);
    const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        setFormData(getInitialState());
    }, [initialData]);

    const validate = (fieldValues: Partial<typeof formData> = formData): boolean => {
        let tempErrors: Partial<Record<keyof typeof formData, string>> = { ...errors };

        if ('name' in fieldValues)
            tempErrors.name = fieldValues.name ? "" : "Client name is required.";

        if ('email' in fieldValues && fieldValues.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            tempErrors.email = emailRegex.test(fieldValues.email) ? "" : "Invalid email format.";
        }

        setErrors(tempErrors);

        if (fieldValues === formData) {
            return Object.values(tempErrors).every(x => x === "" || x === undefined);
        }
        return true;
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (validate(formData)) {
            const finalClient: Client = {
                ...(initialData || {}),
                ...formData,
                id: initialData?.id || crypto.randomUUID(),
                entrepreneurId: initialData?.entrepreneurId || entrepreneurId,
                createdAt: initialData?.createdAt || new Date().toISOString(),
            };

            setIsSuccess(true);
            setTimeout(() => {
                onSubmit(finalClient);
                setIsSuccess(false);
                if (!initialData) setFormData(getInitialState());
            }, 1000);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <FormInput
                    label="Full Name"
                    name="name"
                    icon={User}
                    value={formData.name}
                    onChange={handleChange}
                    error={errors.name}
                    required
                    placeholder="e.g. Jane Doe"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                        label="Email Address"
                        name="email"
                        type="email"
                        icon={Mail}
                        value={formData.email}
                        onChange={handleChange}
                        error={errors.email}
                        placeholder="jane@example.com"
                    />
                    <FormInput
                        label="Phone Number"
                        name="phone"
                        type="tel"
                        icon={Phone}
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+233 20 000 0000"
                    />
                </div>

                <FormInput
                    label="Company / Organization"
                    name="company"
                    icon={Building}
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="e.g. Acme Corp"
                />

                <FormInput
                    label="Date of Birth"
                    name="dateOfBirth"
                    type="date"
                    icon={Calendar}
                    value={formData.dateOfBirth || ''}
                    onChange={handleChange}
                />

                <FormInput
                    label="Address"
                    name="address"
                    icon={MapPin}
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Physical address or location"
                />

                <div className="space-y-1.5 group">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                        Notes
                    </label>
                    <div className="relative">
                        <div className="absolute top-3 left-3 flex items-start pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                            <FileText size={18} />
                        </div>
                        <textarea
                            name="notes"
                            rows={3}
                            value={formData.notes}
                            onChange={handleChange}
                            placeholder="Any additional details..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end items-center space-x-3 pt-6 border-t border-gray-100 dark:border-white/10">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onCancel}
                    disabled={isSuccess}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant={isSuccess ? "success" : "primary"}
                    disabled={isSuccess}
                    className={`min-w-[120px] transition-all duration-300 ${isSuccess ? 'bg-green-500 hover:bg-green-600' : ''}`}
                    icon={isSuccess ? <Check size={18} /> : undefined}
                >
                    {isSuccess ? (initialData ? "Saved!" : "Added!") : (initialData ? 'Save Changes' : 'Add Client')}
                </Button>
            </div>
        </form>
    );
};

export default ClientForm;
