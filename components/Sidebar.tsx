import React, { useState } from 'react';
import type { CurrentUser } from '../types';
import { AppView } from '../constants';
import { Role } from '../types';
import DashboardIcon from './icons/DashboardIcon';
import EntrepreneursIcon from './icons/EntrepreneursIcon';
import TransactionsIcon from './icons/TransactionsIcon';
import ReportsIcon from './icons/ReportsIcon';
import GrowthHubIcon from './icons/GrowthHubIcon';
import UserManagementIcon from './icons/UserManagementIcon';

interface SidebarProps {
    currentView: AppView;
    navigateTo: (view: AppView) => void;
    currentUser: CurrentUser;
    isOpen: boolean;
    toggleSidebar: () => void;
}

const NavLink: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    isOpen: boolean;
}> = ({
    icon,
    label,
    isActive,
    onClick,
    isOpen
}) => {
        return (
            <button
                onClick={onClick}
                className={`flex items-center space-x-3 px-4 py-3 w-full rounded-2xl transition-all duration-300 group ${isActive
                    ? 'bg-aesBlue text-white shadow-lg shadow-aesBlue/25 translate-x-1'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                    }`}
                title={!isOpen ? label : ''}
            >
                <span className={`transform transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {icon}
                </span>
                <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
                    {label}
                </span>

                {/* Active Indicator Dot (only visible when collapsed and active) */}
                {!isOpen && isActive && (
                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white shadow-sm"></div>
                )}
            </button>
        );
    };

const Sidebar = ({ currentView, navigateTo, currentUser, isOpen, toggleSidebar }: SidebarProps) => {
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

    const getIsActive = (view: AppView) => {
        if (view === AppView.ENTREPRENEURS) {
            return [AppView.ENTREPRENEURS, AppView.ADD_ENTREPRENEUR, AppView.EDIT_ENTREPRENEUR, AppView.ENTREPRENEUR_DASHBOARD].includes(currentView);
        }
        return currentView === view;
    };

    return (
        <>
            {/* Sidebar Container */}
            <aside
                className={`fixed left-0 top-18 h-[calc(100vh-4.5rem)] z-30 transition-all duration-500 ease-in-out border-r border-white/20 dark:border-white/5 bg-white/40 dark:bg-dark-secondary/40 backdrop-blur-xl shadow-2xl ${isOpen ? 'w-64' : 'w-20'
                    } hidden md:flex flex-col py-6 px-3`}
            >
                {/* Navigation Items */}
                <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
                    {visibleNavItems.map(item => (
                        <NavLink
                            key={item.view}
                            label={item.label}
                            icon={item.icon}
                            isActive={getIsActive(item.view)}
                            onClick={() => navigateTo(item.view)}
                            isOpen={isOpen}
                        />
                    ))}
                </div>

                {/* Toggle Button at Bottom */}
                <button
                    onClick={toggleSidebar}
                    className="mt-4 p-2.5 rounded-xl bg-white/80 dark:bg-white/10 hover:bg-aesBlue hover:text-white transition-all duration-300 text-gray-600 dark:text-gray-300 self-center group border border-gray-200 dark:border-white/10 hover:border-aesBlue shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform duration-500 ${isOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                </button>
            </aside>


            {/* Content Spacer to prevent overlap */}
            <div className={`hidden md:block transition-all duration-500 ease-in-out ${isOpen ? 'w-64' : 'w-20'} shrink-0`}></div>
        </>
    );
};

export default Sidebar;
