import React, { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import type { Entrepreneur, User, CurrentUser } from '../types';
import { Role } from '../types';
import { PaymentMethod } from '../constants';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Textarea from './ui/Textarea';

interface EntrepreneurFormProps {
  onSubmit: (entrepreneur: Omit<Entrepreneur, 'goals'>) => void;
  initialData?: Entrepreneur | null;
  onCancel?: () => void;
  users?: User[];
  currentUser?: { type: 'system', user: User };
}

const EntrepreneurForm = ({ onSubmit, initialData, onCancel, users = [], currentUser }: EntrepreneurFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    businessName: '',
    startDate: new Date().toISOString().split('T')[0], // Default to today
    preferredPaymentType: PaymentMethod.CASH,
    bio: '',
    assignedStaffId: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
  const [isSuccess, setIsSuccess] = useState(false);


  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        contact: initialData.contact,
        businessName: initialData.businessName,
        startDate: initialData.startDate.split('T')[0], // Format for date input
        preferredPaymentType: initialData.preferredPaymentType,
        bio: initialData.bio || '',
        assignedStaffId: initialData.assignedStaffId || '',
      });
    }
  }, [initialData]);
  
  const validate = (fieldValues: Partial<typeof formData> = formData): boolean => {
    let tempErrors: Partial<Record<keyof typeof formData, string>> = { ...errors };

    const checkField = (fieldName: keyof typeof formData) => {
        switch (fieldName) {
            case 'name':
                tempErrors.name = fieldValues.name ? "" : "Full Name is required.";
                break;
            case 'businessName':
                tempErrors.businessName = fieldValues.businessName ? "" : "Business Name is required.";
                break;
            case 'contact':
                if (!fieldValues.contact) {
                    tempErrors.contact = "Contact is required.";
                } else if (!/^\S+@\S+\.\S+$/.test(fieldValues.contact) && !/^[0-9\s+-]{10,}$/.test(fieldValues.contact)) {
                    tempErrors.contact = "Please enter a valid email or phone number.";
                } else {
                    tempErrors.contact = "";
                }
                break;
            case 'startDate':
                tempErrors.startDate = fieldValues.startDate ? "" : "Start Date is required.";
                break;
            case 'bio':
                 if (fieldValues.bio && fieldValues.bio.length > 500) {
                    tempErrors.bio = "Bio should not exceed 500 characters.";
                } else {
                    tempErrors.bio = "";
                }
                break;
            default:
                break;
        }
    };
    
    if (fieldValues === formData) { // Validating all fields on submit
        Object.keys(formData).forEach(key => checkField(key as keyof typeof formData));
    } else { // Validating single field on blur
        Object.keys(fieldValues).forEach(key => checkField(key as keyof typeof formData));
    }

    setErrors(tempErrors);

    if (fieldValues === formData) {
      return Object.values(tempErrors).every(x => x === "");
    }
    return true; // onBlur does not determine form validity
  };


  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    validate({ [name]: formData[name as keyof typeof formData] });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validate(formData)) {
        onSubmit({ ...formData, id: initialData?.id || crypto.randomUUID() });
        
        if (!initialData) {
            setIsSuccess(true);
            setFormData({
                name: '',
                contact: '',
                businessName: '',
                startDate: new Date().toISOString().split('T')[0],
                preferredPaymentType: PaymentMethod.CASH,
                bio: '',
                assignedStaffId: '',
            });
            setErrors({});
            setTimeout(() => setIsSuccess(false), 3000);
        }
    }
  };

  const paymentMethodOptions = Object.values(PaymentMethod).map(method => ({ value: method, label: method }));
  const staffOptions = users
    .filter(u => u.role === Role.STAFF)
    .map(u => ({ value: u.id, label: u.username }));

  const canAssignStaff = currentUser?.user.role === Role.SUPER_ADMIN;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">{initialData ? 'Edit Entrepreneur' : 'Add New Entrepreneur'}</h2>
      <Input
        label="Full Name"
        id="name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.name}
        required
      />
      <Input
        label="Contact (Phone/Email)"
        id="contact"
        name="contact"
        value={formData.contact}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.contact}
        required
      />
      <Input
        label="Business Name"
        id="businessName"
        name="businessName"
        value={formData.businessName}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.businessName}
        required
      />
       <Textarea
        label="Bio / Profile Description (Optional)"
        id="bio"
        name="bio"
        rows={3}
        placeholder="A short description of the entrepreneur or their business."
        value={formData.bio || ''}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.bio}
      />
      <Input
        label="Start Date"
        id="startDate"
        name="startDate"
        type="date"
        value={formData.startDate}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.startDate}
        required
      />
      <Select
        label="Preferred Payment Method"
        id="preferredPaymentType"
        name="preferredPaymentType"
        value={formData.preferredPaymentType}
        onChange={handleChange}
        onBlur={handleBlur}
        options={paymentMethodOptions}
        required
      />
      {canAssignStaff && (
          <Select
            label="Assign to Staff Member"
            id="assignedStaffId"
            name="assignedStaffId"
            value={formData.assignedStaffId}
            onChange={handleChange}
            options={staffOptions}
          />
      )}
      <div className="flex justify-end items-center space-x-3 pt-4">
        <div className={`text-green-600 font-semibold transition-opacity duration-500 ${isSuccess ? 'opacity-100' : 'opacity-0'}`}>
          Success!
        </div>
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" variant="primary">{initialData ? 'Save Changes' : 'Add Entrepreneur'}</Button>
      </div>
    </form>
  );
};

export default EntrepreneurForm;