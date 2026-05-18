import React, { useRef, useState, type ChangeEvent } from 'react';
import { AppView } from '../constants';
import Button from './ui/Button';
import type { CurrentUser } from '../types';
import { Role } from '../types';
import ThemeToggle from './ui/ThemeToggle';

interface NavbarProps {
  currentUser: CurrentUser;
  navigateTo: (view: AppView) => void;
  onLogout: () => void;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onAskAi: () => void;
  onResetData: () => void;
}

const Navbar = ({ currentUser, navigateTo, onLogout, onExport, onImport, onAskAi, onResetData }: NavbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const getDisplayName = () => {
    if (currentUser.type === 'system') {
      return `${currentUser.user.username} (${currentUser.user.role})`;
    }
    return currentUser.user.name;
  };

  const canImportExport = currentUser.type === 'system' && [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF].includes(currentUser.user.role);
  const canAskAi = currentUser.type === 'system' && [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF].includes(currentUser.user.role);
  const isSuperAdmin = currentUser.type === 'system' && currentUser.user.role === Role.SUPER_ADMIN;


  const renderNavLinks = () => (
    <div className="flex flex-col md:flex-row items-stretch md:items-center md:space-x-4">
      <div className="flex items-center space-x-2 text-white text-sm px-3 py-2">
        <span>Welcome,</span>
        <span className="font-bold">{getDisplayName()}</span>
      </div>

      <div className="h-auto w-full md:w-auto md:h-6 border-b md:border-b-0 md:border-l border-white/30 my-2 md:my-0"></div>

      {canAskAi && (
        <div className="px-3 py-2">
          <button
            onClick={() => { onAskAi(); setIsMobileMenuOpen(false); }}
            className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 text-sm font-semibold rounded-md bg-aesYellow text-aesBlue hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-white transition-all transform hover:scale-105"
            title="Ask AI a question about your data"
          >
            <span>Ask AI</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c2-2 3-4 3-4s1 2 3 4c2-1 2.657-1.343 2.657-1.343a8 8 0 010 11.314z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      )}

      {canImportExport && (
        <>
          <div className="px-3 py-2"><Button variant="ghost" size="sm" onClick={() => { onExport(); setIsMobileMenuOpen(false); }} className="w-full">Export Data</Button></div>
          <div className="px-3 py-2">
            <Button variant="ghost" size="sm" onClick={() => { handleImportClick(); setIsMobileMenuOpen(false); }} className="w-full">Import Data</Button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json,.csv,.xlsx,.xls,.pdf" onChange={onImport} />
          </div>
        </>
      )}

      {isSuperAdmin && (
        <div className="px-3 py-2">
          <Button variant="danger-ghost" size="sm" onClick={() => { onResetData(); setIsMobileMenuOpen(false); }} className="w-full">Reset Data</Button>
        </div>
      )}

      <div className="px-3 py-2 border-t border-white/20 md:border-0 md:p-0">
        <Button variant="secondary" size="sm" onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="w-full md:w-auto">Logout</Button>
      </div>
    </div>
  );


  return (
    <header className="bg-primary/95 dark:bg-dark-primary/95 backdrop-blur-xl shadow-lg sticky top-0 z-50 border-b border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 transition-all duration-300">
          <div className="flex items-center">
            <div
              className="group flex items-center gap-3 cursor-pointer"
              onClick={() => navigateTo(currentUser.type === 'system' ? AppView.DASHBOARD : AppView.ENTREPRENEUR_DASHBOARD)}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <img src="/logo.png" alt="AES Logo" className="h-10 w-auto object-contain drop-shadow-md relative z-10 transform group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="hidden sm:block">
                <span className="block font-bold text-xl text-white tracking-tight leading-none group-hover:text-aesYellow transition-colors duration-300">
                  AES JAC
                </span>
                <span className="block text-xs text-white/60 font-medium tracking-widest uppercase">Admin Portal</span>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="hidden md:flex items-center space-x-6">
              <ThemeToggle />
              <div className="h-6 w-px bg-white/10"></div>
              {renderNavLinks()}
            </div>
            <div className="md:hidden flex items-center space-x-4">
              <ThemeToggle />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-xl text-white hover:bg-white/10 focus:outline-none transition-colors duration-200"
                aria-controls="mobile-menu"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <svg className="block h-6 w-6 transform rotate-90 transition-transform duration-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6 transition-transform duration-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu with Glassmorphism */}
      <div
        className={`md:hidden absolute w-full bg-primary/95 dark:bg-dark-primary/95 backdrop-blur-xl border-t border-white/10 shadow-2xl transition-all duration-300 origin-top overflow-y-auto ${isMobileMenuOpen ? 'max-h-[calc(100vh-4.5rem)] opacity-100' : 'max-h-0 opacity-0'
          }`}
        id="mobile-menu"
      >
        <div className="px-4 pt-4 pb-6 space-y-2">
          {currentUser.type === 'system' && (
            <div className="flex flex-col space-y-1 mb-4">
              <div className="px-3 text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Navigation</div>
              {[
                { view: AppView.DASHBOARD, label: 'Dashboard', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] },
                { view: AppView.ENTREPRENEURS, label: 'Entrepreneurs', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] },
                { view: AppView.TRANSACTIONS, label: 'Transactions', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] },
                { view: AppView.REPORTS, label: 'Reports', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] },
                { view: AppView.GROWTH_HUB, label: 'Growth Hub', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] },
                { view: AppView.USER_MANAGEMENT, label: 'User Management', roles: [Role.SUPER_ADMIN] },
              ]
                .filter(item => item.roles.includes(currentUser.user.role))
                .map(item => (
                  <button
                    key={item.view}
                    onClick={() => { navigateTo(item.view); setIsMobileMenuOpen(false); }}
                    className="text-left px-3 py-2.5 rounded-xl text-base font-medium text-white hover:bg-white/10 transition-colors w-full"
                  >
                    {item.label}
                  </button>
                ))}
              <div className="border-t border-white/10 my-3"></div>
            </div>
          )}
          {renderNavLinks()}
        </div>
      </div>
    </header>
  );
};

export default Navbar;