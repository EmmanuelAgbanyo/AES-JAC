
import React, { useState, type FormEvent, type ChangeEvent } from 'react';
import type { Goal } from '../types';
import { GoalType } from '../types';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Textarea from './ui/Textarea';

interface GoalFormProps {
    onSubmit: (goal: Goal) => void;
    onCancel: () => void;
    initialData?: Goal;
}

const GoalForm = ({ onSubmit, onCancel, initialData }: GoalFormProps) => {
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        type: initialData?.type || GoalType.REVENUE_TARGET,
        targetValue: initialData?.targetValue || 0,
        targetDate: initialData?.targetDate ? initialData.targetDate.split('T')[0] : new Date().toISOString().split('T')[0],
        description: initialData?.description || ''
    });
    const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
    const [isSuccess, setIsSuccess] = useState(false);


    const validate = (fieldValues: Partial<typeof formData> = formData): boolean => {
        let tempErrors: Partial<Record<keyof typeof formData, string>> = { ...errors };

        const checkField = (fieldName: keyof typeof formData) => {
            switch (fieldName) {
                case 'title':
                    tempErrors.title = fieldValues.title ? "" : "Goal title is required.";
                    break;
                case 'targetValue':
                     if (formData.type !== GoalType.CUSTOM) {
                        const val = Number(formData.targetValue);
                        if (isNaN(val) || val <= 0) {
                            tempErrors.targetValue = "Target value must be a positive number.";
                        } else {
                            tempErrors.targetValue = "";
                        }
                    } else {
                        tempErrors.targetValue = ""; // No error for custom goals
                    }
                    break;
                case 'targetDate':
                    tempErrors.targetDate = fieldValues.targetDate ? "" : "Target date is required.";
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
    
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const newFormData = { ...formData, [name]: name === 'targetValue' ? parseFloat(value) || 0 : value };
        setFormData(newFormData);
        
        if (errors[name as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
        // Special case: if type changes, re-validate targetValue
        if (name === 'type') {
            validate({ ...newFormData });
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name } = e.target;
        validate({ [name]: formData[name as keyof typeof formData] });
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (validate(formData)) {
            setIsSuccess(true);
            const goal: Goal = {
                id: initialData?.id || crypto.randomUUID(),
                ...formData,
            };
            setTimeout(() => {
                onSubmit(goal);
            }, 1000);
        }
    };

    const goalTypeOptions = Object.values(GoalType).map(type => ({ value: type, label: type }));

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input
                label="Goal Title"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.title}
                placeholder="e.g., Increase Q3 Revenue"
                required
            />
            <Select
                label="Goal Type"
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                options={goalTypeOptions}
                required
            />
            {formData.type !== GoalType.CUSTOM && (
                 <Input
                    label="Target Value (GHS)"
                    id="targetValue"
                    name="targetValue"
                    type="number"
                    step="100"
                    value={String(formData.targetValue)}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.targetValue}
                    required
                />
            )}
            <Input
                label="Target Date"
                id="targetDate"
                name="targetDate"
                type="date"
                value={formData.targetDate}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.targetDate}
                required
            />
            <Textarea
                label="Description (Optional)"
                id="description"
                name="description"
                rows={2}
                placeholder="Add more details about this goal."
                value={formData.description}
                onChange={handleChange}
            />
            <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                <Button type="button" variant="secondary" onClick={onCancel} disabled={isSuccess}>Cancel</Button>
                <Button type="submit" variant={isSuccess ? "success" : "primary"} disabled={isSuccess}>
                    {isSuccess ? 'Goal Set!' : (initialData ? 'Save Changes' : 'Set Goal')}
                </Button>
            </div>
        </form>
    );
};

export default GoalForm;