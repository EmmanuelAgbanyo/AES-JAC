
import React from 'react';
import type { Goal } from '../types';
import { GoalType } from '../types';

interface GoalCardProps {
    goal: Goal;
    currentValue: number;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, currentValue }) => {
    const isCustom = goal.type === GoalType.CUSTOM;
    const progress = isCustom ? 0 : Math.min((currentValue / goal.targetValue) * 100, 100);
    const isCompleted = isCustom ? false : currentValue >= goal.targetValue;
    const isExpenseReduction = goal.type === GoalType.EXPENSE_REDUCTION;

    const daysRemaining = Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    let statusText: string;
    let statusColor: string;

    if (isCompleted) {
        statusText = 'Completed!';
        statusColor = 'text-green-600';
    } else if (daysRemaining < 0) {
        statusText = `Overdue by ${Math.abs(daysRemaining)} days`;
        statusColor = 'text-red-600';
    } else if (daysRemaining <= 7) {
        statusText = `${daysRemaining} days left`;
        statusColor = 'text-yellow-600';
    } else {
        statusText = `${daysRemaining} days remaining`;
        statusColor = 'text-gray-500';
    }
    
    const progressColor = isCompleted ? 'bg-green-500' : 'bg-primary';

    const renderValueText = () => {
        if (isCustom) {
            return <p className="text-lg font-semibold text-gray-800">Custom Milestone</p>;
        }
        if (isExpenseReduction) {
             return (
                <p className="text-lg font-semibold text-gray-800">
                    <span className={currentValue <= goal.targetValue ? 'text-green-600' : 'text-red-600'}>
                        GHS {currentValue.toFixed(2)}
                    </span>
                    <span className="text-gray-500 text-sm"> / Target: &lt; GHS {goal.targetValue.toFixed(2)}</span>
                </p>
            );
        }
        return (
            <p className="text-lg font-semibold text-gray-800">
                GHS {currentValue.toFixed(2)}
                <span className="text-gray-500 text-sm"> / GHS {goal.targetValue.toFixed(2)}</span>
            </p>
        );
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-700">{goal.title}</h4>
                <span className={`text-xs font-semibold ${statusColor}`}>{statusText}</span>
            </div>
            {goal.description && <p className="text-sm text-gray-500 mt-1 mb-2">{goal.description}</p>}
            
            <div className="mt-3">
                {renderValueText()}
                {!isCustom && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div className={`h-2.5 rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${progress}%` }}></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GoalCard;
