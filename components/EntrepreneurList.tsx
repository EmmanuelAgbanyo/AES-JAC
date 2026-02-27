import React, { useState } from 'react';
import type { Entrepreneur, User } from '../types';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { Role } from '../types';

interface EntrepreneurListProps {
  entrepreneurs: Entrepreneur[];
  onEdit: (entrepreneur: Entrepreneur) => void;
  onDelete: (id: string) => void;
  onViewDashboard: (entrepreneur: Entrepreneur) => void;
  users: User[];
  currentUser: { type: 'system', user: User };
}

const EntrepreneurList = ({ entrepreneurs, onEdit, onDelete, onViewDashboard, users, currentUser }: EntrepreneurListProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [entrepreneurToDelete, setEntrepreneurToDelete] = useState<Entrepreneur | null>(null);

  const openDeleteModal = (entrepreneur: Entrepreneur) => {
    setEntrepreneurToDelete(entrepreneur);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setEntrepreneurToDelete(null);
    setShowDeleteModal(false);
  };

  const handleDeleteConfirm = () => {
    if (entrepreneurToDelete) {
        onDelete(entrepreneurToDelete.id);
        closeDeleteModal();
    }
  };
  
  const getStaffName = (staffId?: string) => {
    if (!staffId) return 'Unassigned';
    return users.find(u => u.id === staffId)?.username || 'Unknown Staff';
  };

  const canManage = [Role.ADMIN, Role.SUPER_ADMIN, Role.STAFF].includes(currentUser.user.role);
  
  if (entrepreneurs.length === 0) {
    return <p className="text-center text-gray-500 dark:text-dark-textSecondary py-8">No entrepreneurs found.</p>;
  }

  return (
    <div className="bg-white dark:bg-dark-secondary p-2 md:p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-text mb-6 px-4 md:px-0">Entrepreneur Profiles</h2>

      {/* Table view for larger screens */}
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
          <thead className="bg-gray-50 dark:bg-dark-primary">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Business Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Contact</th>
              {canManage && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Assigned To</th>}
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-textSecondary uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-secondary divide-y divide-gray-200 dark:divide-dark-border animate-fadeIn">
            {entrepreneurs.map((e) => (
              <tr 
                key={e.id} 
                className='hover:bg-gray-50 dark:hover:bg-dark-primary'
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-dark-text">{e.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-textSecondary">{e.businessName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-textSecondary">{e.contact}</td>
                {canManage && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-textSecondary">{getStaffName(e.assignedStaffId)}</td>}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button variant="primary" size="sm" onClick={() => onViewDashboard(e)}>Dashboard</Button>
                  <Button variant="info" size="sm" onClick={() => onEdit(e)}>Edit</Button>
                  {canManage && <Button variant="danger" size="sm" onClick={() => openDeleteModal(e)}>Delete</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Card view for smaller screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
        {entrepreneurs.map(e => (
          <div key={e.id} className="bg-gray-50 dark:bg-dark-primary rounded-lg p-4 shadow-sm border dark:border-dark-border flex flex-col justify-between space-y-4">
            <div>
              <p className="font-bold text-lg text-primary">{e.businessName}</p>
              <p className="text-sm text-gray-800 dark:text-dark-text">{e.name}</p>
              <p className="text-sm text-gray-600 dark:text-dark-textSecondary mt-1">{e.contact}</p>
              {canManage && (
                <p className="text-xs text-gray-500 dark:text-dark-textSecondary mt-2 pt-2 border-t dark:border-dark-border">
                  Assigned to: <span className="font-semibold">{getStaffName(e.assignedStaffId)}</span>
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-2 border-t dark:border-dark-border pt-3 mt-auto">
                <Button variant="primary" size="sm" onClick={() => onViewDashboard(e)}>Dashboard</Button>
                <Button variant="info" size="sm" onClick={() => onEdit(e)}>Edit</Button>
                {canManage && <Button variant="danger" size="sm" onClick={() => openDeleteModal(e)}>Delete</Button>}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        title={`Delete ${entrepreneurToDelete?.name || 'Entrepreneur'}`}
      >
        <p className="text-gray-700 dark:text-dark-textSecondary mb-4">Are you sure you want to delete this entrepreneur? This action cannot be undone and will also remove all associated transactions.</p>
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
};

export default EntrepreneurList;