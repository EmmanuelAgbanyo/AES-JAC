
import React from 'react';
import type { CurrentUser } from '../types';
import { AppView } from '../constants';
import { Role } from '../types';
import DashboardIcon from './icons/DashboardIcon';
import EntrepreneursIcon from './icons/EntrepreneursIcon';
import TransactionsIcon from './icons/TransactionsIcon';
import ReportsIcon from './icons/ReportsIcon';
import GrowthHubIcon from './icons/GrowthHubIcon';
import UserManagementIcon from './icons/UserManagementIcon';

interface SecondaryNavProps {
    currentView: AppView;
    navigateTo: (view: AppView) => void;
    currentUser: CurrentUser;
}

const NavLink: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({
    icon,
    label,
    isActive,
    onClick,
}) => {
        return (
            <button
                onClick={onClick}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${isActive
                        ? 'bg-aesBlue text-white shadow-lg shadow-aesBlue/25 transform scale-105'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                    }`}
                aria-current={isActive ? 'page' : undefined}
            >
                <span className={`transform transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {icon}
                </span>
                <span>{label}</span>
            </button>
        );
    };

const SecondaryNav = ({ currentView, navigateTo, currentUser }: SecondaryNavProps) => {
    if (currentUser?.type !== 'system') {
        return null;
    }

    const navItems = [
        { view: AppView.DASHBOARD, label: 'Dashboard', icon: <DashboardIcon />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] },
        { view: AppView.ENTREPRENEURS, label: 'Entrepreneurs', icon: <EntrepreneursIcon />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] },
        { view: AppView.TRANSACTIONS, label: 'Transactions', icon: <TransactionsIcon />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] },
        { view: AppView.REPORTS, label: 'Reports', icon: <ReportsIcon />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] },
        { view: AppView.GROWTH_HUB, label: 'Growth Hub', icon: <GrowthHubIcon />, roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] },
        { view: AppView.USER_MANAGEMENT, label: 'User Management', icon: <UserManagementIcon />, roles: [Role.SUPER_ADMIN] },
    ];

    const visibleNavItems = navItems.filter(item => item.roles.includes(currentUser.user.role));

    // Determine active tab, grouping related views
    const getIsActive = (view: AppView) => {
        if (view === AppView.ENTREPRENEURS) {
            return [AppView.ENTREPRENEURS, AppView.ADD_ENTREPRENEUR, AppView.EDIT_ENTREPRENEUR, AppView.ENTREPRENEUR_DASHBOARD].includes(currentView);
        }
        return currentView === view;
    };


    return (
        <nav className="bg-white/80 dark:bg-dark-secondary/80 backdrop-blur-md shadow-sm sticky top-[72px] z-40 border-b border-gray-200/50 dark:border-white/5 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center gap-2 py-3 overflow-x-auto no-scrollbar">
                    {visibleNavItems.map(item => (
                        <NavLink
                            key={item.view}
                            label={item.label}
                            icon={item.icon}
                            isActive={getIsActive(item.view)}
                            onClick={() => navigateTo(item.view)}
                        />
                    ))}
                </div>
            </div>
        </nav>
    );
};

export default SecondaryNav;
