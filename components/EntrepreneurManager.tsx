import React from 'react';
import type { Entrepreneur, User, CurrentUser, Transaction, InventoryItem } from '../types';
import { AppView } from '../constants';
import EntrepreneurForm from './EntrepreneurForm';
import EntrepreneurList from './EntrepreneurList';
import Button from './ui/Button';

interface EntrepreneurManagerProps {
  entrepreneurs: Entrepreneur[];
  onAddOrUpdateEntrepreneur: (entrepreneur: Entrepreneur) => Promise<void>;
  editingEntrepreneur: Entrepreneur | null;
  setEditingEntrepreneur: (entrepreneur: Entrepreneur | null) => void;
  currentView: AppView;
  navigateTo: (view: AppView) => void;
  onEdit: (entrepreneur: Entrepreneur) => void;
  onViewDashboard: (entrepreneur: Entrepreneur) => void;
  onDeleteEntrepreneur: (id: string) => void;
  users: User[];
  currentUser: { type: 'system', user: User };
  onAddTransaction?: (transaction: Transaction) => Promise<void>;
  inventory?: InventoryItem[];
}

const EntrepreneurManager = ({
  entrepreneurs,
  onAddOrUpdateEntrepreneur,
  editingEntrepreneur,
  setEditingEntrepreneur,
  currentView,
  navigateTo,
  onEdit,
  onViewDashboard,
  onDeleteEntrepreneur,
  users,
  currentUser,
  onAddTransaction,
  inventory = []
}: EntrepreneurManagerProps) => {
  const handleAddOrUpdateEntrepreneur = async (entrepreneurData: Omit<Entrepreneur, 'goals'>) => {
    const isEditing = entrepreneurs.some(e => e.id === entrepreneurData.id);
    
    let finalEntrepreneur: Entrepreneur;
    if (isEditing) {
        const originalEntrepreneur = entrepreneurs.find(e => e.id === entrepreneurData.id)!;
        finalEntrepreneur = { ...originalEntrepreneur, ...entrepreneurData };
    } else {
        finalEntrepreneur = { ...entrepreneurData, goals: [] };
    }
      
    await onAddOrUpdateEntrepreneur(finalEntrepreneur);
    setEditingEntrepreneur(null);
    navigateTo(AppView.ENTREPRENEURS); // Navigate to list view after save
  };

  const handleCancelEdit = () => {
    setEditingEntrepreneur(null);
    navigateTo(AppView.ENTREPRENEURS);
  };

  return (
    <div className="space-y-8">
      {currentView === AppView.ADD_ENTREPRENEUR && (
        <EntrepreneurForm 
          onSubmit={handleAddOrUpdateEntrepreneur} 
          onCancel={() => navigateTo(AppView.ENTREPRENEURS)} 
          users={users}
          currentUser={currentUser}
        />
      )}
      {currentView === AppView.EDIT_ENTREPRENEUR && editingEntrepreneur && (
        <EntrepreneurForm 
          onSubmit={handleAddOrUpdateEntrepreneur} 
          initialData={editingEntrepreneur}
          onCancel={handleCancelEdit} 
          users={users}
          currentUser={currentUser}
        />
      )}
      {currentView === AppView.ENTREPRENEURS && (
        <EntrepreneurList
          entrepreneurs={entrepreneurs}
          onEdit={onEdit}
          onDelete={onDeleteEntrepreneur}
          onViewDashboard={onViewDashboard}
          onAddEntrepreneur={() => navigateTo(AppView.ADD_ENTREPRENEUR)}
          users={users}
          currentUser={currentUser}
          onAddTransaction={onAddTransaction}
          inventory={inventory}
        />
      )}
    </div>
  );
};

export default EntrepreneurManager;
