import React, { useState, type ChangeEvent, type FormEvent, useEffect, useRef } from 'react';
import type { Entrepreneur, Transaction, PartialTransaction } from '../types';
import { TransactionType, PaymentMethod, PaidStatus } from '../constants';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

interface TransactionFormProps {
  onSubmit: (transaction: Transaction) => void;
  onCancel?: () => void;
  initialData?: Transaction | PartialTransaction;
  entrepreneurs: Entrepreneur[];
  currentEntrepreneur?: Entrepreneur; // For logged-in entrepreneur view
}

const TransactionForm = ({ onSubmit, onCancel, initialData, entrepreneurs, currentEntrepreneur }: TransactionFormProps) => {
  const lastSubmittedType = useRef<TransactionType>(TransactionType.INCOME);
  
  const getInitialState = () => {
    if (initialData) {
       // Check if it's a full transaction (editing) or partial (from scanner)
      const isFullTransaction = 'id' in initialData;
      return {
        entrepreneurId: isFullTransaction ? initialData.entrepreneurId : currentEntrepreneur?.id || '',
        type: initialData.type || TransactionType.EXPENSE, // Default to Expense for scanned receipts
        date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: initialData.description || '',
        amount: String(initialData.amount || ''),
        paymentMethod: initialData.paymentMethod || currentEntrepreneur?.preferredPaymentType || PaymentMethod.CASH,
        paidStatus: initialData.paidStatus || PaidStatus.FULL,
        customerName: initialData.customerName || '',
        productServiceCategory: initialData.productServiceCategory || '',
      };
    }
    return {
      entrepreneurId: currentEntrepreneur?.id || '',
      type: lastSubmittedType.current, // Default to the last used type for new entries
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      paymentMethod: currentEntrepreneur?.preferredPaymentType || PaymentMethod.CASH,
      paidStatus: PaidStatus.FULL,
      customerName: '',
      productServiceCategory: '',
    };
  };

  const [formData, setFormData] = useState(getInitialState);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setFormData(getInitialState());
  }, [initialData, currentEntrepreneur]);


  const validate = (fieldValues: Partial<typeof formData> = formData): boolean => {
    let tempErrors: Partial<Record<keyof typeof formData, string>> = { ...errors };

    const checkField = (fieldName: keyof typeof formData) => {
        switch (fieldName) {
            case 'entrepreneurId':
                if (!currentEntrepreneur) { // Only validate if not pre-selected
                  tempErrors.entrepreneurId = fieldValues.entrepreneurId ? "" : "Please select an entrepreneur.";
                }
                break;
            case 'description':
                tempErrors.description = fieldValues.description && fieldValues.description.length >= 3 ? "" : "Description must be at least 3 characters long.";
                break;
            case 'amount':
                const amount = Number(fieldValues.amount);
                if (!fieldValues.amount || isNaN(amount)) {
                    tempErrors.amount = "A valid amount is required.";
                } else if (amount <= 0) {
                    tempErrors.amount = "Amount must be a positive number.";
                } else {
                    tempErrors.amount = "";
                }
                break;
            case 'date':
                tempErrors.date = fieldValues.date ? "" : "Transaction date is required.";
                break;
            default:
                break;
        }
    };
    
    if (fieldValues === formData) {
        Object.keys(formData).forEach(key => checkField(key as keyof typeof formData));
    } else {
        Object.keys(fieldValues).forEach(key => checkField(key as keyof typeof formData));
    }

    setErrors(tempErrors);

    if (fieldValues === formData) {
        return Object.values(tempErrors).every(x => x === "" || x === undefined);
    }
    return true;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
     if (errors[name as keyof typeof errors]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    validate({ [name]: formData[name as keyof typeof formData] });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validate(formData)) {
        const finalTransaction: Transaction = {
          ...(initialData || {}),
          ...formData,
          id: (initialData && 'id' in initialData) ? initialData.id! : crypto.randomUUID(),
          amount: parseFloat(formData.amount),
        } as Transaction;

        // For expenses, paidStatus is not applicable.
        // It must be deleted to prevent sending `undefined` to Firebase, which causes an error.
        if (finalTransaction.type === TransactionType.EXPENSE) {
          delete (finalTransaction as Partial<Transaction>).paidStatus;
        }
        
        // If it's a new entry, remember its type for the next reset
        if (!(initialData && 'id' in initialData)) {
            lastSubmittedType.current = finalTransaction.type;
        }
        
        setIsSuccess(true);
        setTimeout(() => {
          onSubmit(finalTransaction);
          if (!(initialData && 'id' in initialData)) { // only reset if it was a new entry (not an edit)
            setFormData(getInitialState());
            setIsSuccess(false);
          }
        }, 1000);
    }
  };

  const entrepreneurOptions = entrepreneurs.map(e => ({ value: e.id, label: `${e.name} (${e.businessName})` }));
  const transactionTypeOptions = Object.values(TransactionType).map(t => ({ value: t, label: t }));
  const paymentMethodOptions = Object.values(PaymentMethod).map(m => ({ value: m, label: m }));
  const paidStatusOptions = Object.values(PaidStatus).map(s => ({ value: s, label: s }));

  const isEditing = initialData && 'id' in initialData;
  const successMessage = isEditing ? "Saved!" : "Success! Transaction added.";
  const title = isEditing ? 'Edit Transaction' : (initialData ? 'Confirm Scanned Expense' : 'Add New Transaction');


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      
      {!currentEntrepreneur && (
        <Select
          label="Entrepreneur"
          id="entrepreneurId"
          name="entrepreneurId"
          value={formData.entrepreneurId}
          onChange={handleChange}
          onBlur={handleBlur}
          options={entrepreneurOptions}
          error={errors.entrepreneurId}
          required
        />
      )}

      <Select
        label="Transaction Type"
        id="type"
        name="type"
        value={formData.type}
        onChange={handleChange}
        options={transactionTypeOptions}
        required
      />
      <Input
        label="Date"
        id="date"
        name="date"
        type="date"
        value={formData.date.split('T')[0]} // Handle potential full ISO string from initialData
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.date}
        required
      />
      <Input
        label="Description"
        id="description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.description}
        required
      />
      <Input
        label="Amount (GHS)"
        id="amount"
        name="amount"
        type="number"
        step="0.01"
        value={formData.amount}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.amount}
        required
      />
      <Select
        label="Payment Method"
        id="paymentMethod"
        name="paymentMethod"
        value={formData.paymentMethod}
        onChange={handleChange}
        options={paymentMethodOptions}
        required
      />
      {formData.type === TransactionType.INCOME && (
        <Select
          label="Paid Status"
          id="paidStatus"
          name="paidStatus"
          value={formData.paidStatus || PaidStatus.FULL}
          onChange={handleChange}
          options={paidStatusOptions}
          required
        />
      )}
      <Input
        label="Customer Name (Optional)"
        id="customerName"
        name="customerName"
        value={formData.customerName || ''}
        onChange={handleChange}
      />
      <Input
        label="Product/Service Category (Optional)"
        id="productServiceCategory"
        name="productServiceCategory"
        value={formData.productServiceCategory || ''}
        onChange={handleChange}
      />
      <div className="flex justify-end items-center space-x-3 pt-4 border-t dark:border-dark-border mt-4">
         {onCancel && <Button type="button" variant="secondary" onClick={onCancel} disabled={isSuccess}>Cancel</Button>}
         <Button type="submit" variant={isSuccess ? "success" : "primary"} disabled={isSuccess}>
            {isSuccess ? successMessage : (isEditing ? 'Save Changes' : 'Add Transaction')}
        </Button>
      </div>
    </form>
  );
};

export default TransactionForm;
