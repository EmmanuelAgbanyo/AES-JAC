import React, { useState, useEffect } from 'react';
import type { Entrepreneur, CurrentUser, User } from '../types';
import Button from './ui/Button';
import Select from './ui/Select';
import Input from './ui/Input';
import { writeEntrepreneur } from '../services/storageService';
import { Lock, Smartphone, ShieldCheck, ArrowLeft, Delete } from 'lucide-react';

interface LoginProps {
  onLogin: (user: CurrentUser) => void;
  entrepreneurs: Entrepreneur[];
  users: User[];
}

const Login = ({ onLogin, entrepreneurs, users }: LoginProps) => {
  const [activeTab, setActiveTab] = useState<'system' | 'entrepreneur'>('system');

  // State for System User Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // State for Entrepreneur Login
  const [selectedEntrepreneurId, setSelectedEntrepreneurId] = useState<string>('');
  const [loginStep, setLoginStep] = useState<'selection' | 'pin-entry' | 'pin-setup'>('selection');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const handleSystemLogin = () => {
    setError('');
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user && user.password === password) {
      onLogin({ type: 'system', user });
    } else {
      setError('Invalid username or password.');
    }
  };

  const handleEntrepreneurLoginChallenge = () => {
    const entrepreneur = entrepreneurs.find(e => e.id === selectedEntrepreneurId);
    if (entrepreneur) {
      if (entrepreneur.pin) {
        setLoginStep('pin-entry');
      } else {
        setLoginStep('pin-setup');
      }
    }
  };

  const handlePinAction = async (digit: string) => {
    if (digit === 'DEL') {
      setPin(prev => prev.slice(0, -1));
      return;
    }

    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      const entrepreneur = entrepreneurs.find(e => e.id === selectedEntrepreneurId);
      if (!entrepreneur) return;

      if (loginStep === 'pin-entry') {
        if (entrepreneur.pin === newPin) {
          onLogin({ type: 'entrepreneur', user: entrepreneur });
        } else {
          setIsShaking(true);
          setTimeout(() => {
            setIsShaking(false);
            setPin('');
          }, 500);
        }
      } else if (loginStep === 'pin-setup') {
        if (!isConfirming) {
          setIsConfirming(true);
          setConfirmPin(newPin);
          setPin('');
        } else {
          if (newPin === confirmPin) {
            const updatedEntrepreneur = { ...entrepreneur, pin: newPin };
            await writeEntrepreneur(updatedEntrepreneur);
            onLogin({ type: 'entrepreneur', user: updatedEntrepreneur });
          } else {
            setIsShaking(true);
            setTimeout(() => {
              setIsShaking(false);
              setPin('');
              setIsConfirming(false);
              setConfirmPin('');
            }, 500);
          }
        }
      }
    }
  };

  const entrepreneurOptions = entrepreneurs.map(e => ({
    value: e.id,
    label: `${e.name} (${e.businessName})`
  }));

  const TabButton: React.FC<{ isActive: boolean, onClick: () => void, children?: React.ReactNode }> = ({ isActive, onClick, children }) => (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide transition-all duration-300 ${isActive
        ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm rounded-lg'
        : 'text-white/60 hover:text-white hover:bg-white/10 rounded-lg'
        }`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transform scale-105 transition-transform duration-[20s] hover:scale-100"
        style={{ backgroundImage: 'url(/login-bg.jpg)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/75 to-slate-900/40 backdrop-blur-[1px]" />
      </div>

      {/* Abstract Animated Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-aesYellow/10 rounded-full blur-[120px] animate-blob z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-aesBlue/20 rounded-full blur-[120px] animate-blob animation-delay-2000 z-0" />

      {/* Glass Card Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden relative z-10 transition-all duration-500 hover:shadow-aesBlue/20">

        {/* Left Column - Branding */}
        <div className="p-10 lg:p-14 flex flex-col justify-center relative bg-gradient-to-br from-white/5 to-transparent border-r border-white/10">
          <div className="mb-auto">
            <div className="bg-white/80 p-5 rounded-3xl w-fit mb-10 shadow-[0_0_30px_rgba(255,255,255,0.15)] backdrop-blur-xl border border-white/40 animate-float hover:scale-105 hover:bg-white/95 hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] transition-all duration-500 cursor-pointer group">
              <img
                src="/logo.png"
                alt="AES Logo"
                className="w-52 h-auto object-contain filter drop-shadow-sm group-hover:drop-shadow-md transition-all duration-300"
                onError={(e) => {
                  // Fallback if image not found
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<span class="text-aesBlue font-bold text-xl">AES</span>';
                }} />
            </div>
          </div>

          <div className="space-y-6">
            <h1 className="font-serif text-5xl font-bold text-white leading-tight drop-shadow-lg">
              The Just-A-Call <br />
              <span className="text-aesYellow">Initiative</span>
            </h1>
            <p className="text-lg text-white/90 font-light leading-relaxed border-l-2 border-aesYellow pl-5">
              Empowering MSMEs in Ghana and across Africa to master their financial records. We provide the tools to simplify bookkeeping, gain actionable insights, and drive sustainable growth.
            </p>
          </div>

          <div className="mt-auto pt-10">
            <p className="text-xs text-white/60 font-mono uppercase tracking-wider">Powered by NexusByte Technologies</p>
          </div>
        </div>

        {/* Right Column - Login Form */}
        <div className="p-10 lg:p-14 bg-black/20 flex flex-col justify-center">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white mb-2 font-sans">Welcome Back</h2>
            <p className="text-white/60">Securely access your dashboard.</p>
          </div>

          <div className="mb-8 bg-black/20 p-1.5 rounded-xl flex gap-1">
            <TabButton isActive={activeTab === 'system'} onClick={() => setActiveTab('system')}>Staff Access</TabButton>
            <TabButton isActive={activeTab === 'entrepreneur'} onClick={() => setActiveTab('entrepreneur')}>Entrepreneur</TabButton>
          </div>

          <div className="bg-white/5 p-8 rounded-2xl border border-white/10 shadow-inner">
            {activeTab === 'system' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/80 uppercase tracking-wider ml-1">Username</label>
                  <Input
                    label=""
                    id="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-white/10 border-white/10 text-white placeholder-white/30 focus:bg-white/20 focus:border-aesYellow/50 rounded-xl py-3 px-4 backdrop-blur-sm transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/80 uppercase tracking-wider ml-1">Password</label>
                  <Input
                    label=""
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/10 border-white/10 text-white placeholder-white/30 focus:bg-white/20 focus:border-aesYellow/50 rounded-xl py-3 px-4 backdrop-blur-sm transition-all"
                  />
                </div>
                {error && <p className="text-sm text-red-400 bg-red-400/10 p-2 rounded-lg text-center border border-red-400/20">{error}</p>}

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleSystemLogin}
                  className="w-full bg-gradient-to-r from-aesBlue to-blue-700 hover:from-blue-700 hover:to-aesBlue text-white border-0 shadow-lg shadow-blue-900/50 py-3.5 rounded-xl font-bold tracking-wide transform transition-all hover:-translate-y-0.5"
                  disabled={!username || !password}
                >
                  Sign In
                </Button>
              </div>
            )}

            {activeTab === 'entrepreneur' && loginStep === 'selection' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/80 uppercase tracking-wider ml-1">Select Profile</label>
                  <Select
                    label=""
                    id="entrepreneur-select"
                    variant="glass"
                    options={entrepreneurOptions}
                    value={selectedEntrepreneurId}
                    onChange={(e) => setSelectedEntrepreneurId(e.target.value)}
                    required
                    className="rounded-xl py-3 px-4 [&>option]:text-gray-900"
                  />
                </div>
                <Button
                  variant="warning"
                  size="lg"
                  onClick={handleEntrepreneurLoginChallenge}
                  disabled={!selectedEntrepreneurId}
                  className="w-full bg-gradient-to-r from-aesYellow to-yellow-500 hover:from-yellow-400 hover:to-aesYellow text-black border-0 shadow-lg shadow-yellow-900/20 py-3.5 rounded-xl font-bold tracking-wide transform transition-all hover:-translate-y-0.5"
                >
                  Access Portal
                </Button>
              </div>
            )}

            {activeTab === 'entrepreneur' && (loginStep === 'pin-entry' || loginStep === 'pin-setup') && (
              <div className={`space-y-6 animate-fadeIn ${isShaking ? 'animate-shake' : ''}`}>
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-4 backdrop-blur-md border border-white/20">
                    {loginStep === 'pin-entry' ? <Lock className="text-aesYellow w-6 h-6" /> : <ShieldCheck className="text-aesYellow w-6 h-6" />}
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {loginStep === 'pin-entry' ? 'Enter PIN' : isConfirming ? 'Confirm PIN' : 'Set Security PIN'}
                  </h3>
                  <p className="text-white/60 text-sm">
                    {loginStep === 'pin-entry' ? 'Access your secure records' : 'Protect your business data'}
                  </p>
                </div>

                <div className="flex justify-center gap-4 mb-8">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${pin.length > i
                        ? 'bg-aesYellow border-aesYellow scale-110 shadow-[0_0_15px_rgba(255,200,0,0.5)]'
                        : 'border-white/20 scale-100'
                        }`}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'].map((val, i) => (
                    <button
                      key={i}
                      disabled={val === ''}
                      onClick={() => handlePinAction(val)}
                      className={`h-16 flex items-center justify-center text-xl font-bold rounded-2xl transition-all duration-200 ${val === ''
                        ? 'opacity-0 cursor-default'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95 active:bg-white/20 text-white'
                        }`}
                    >
                      {val === 'DEL' ? <Delete className="w-6 h-6 text-white/60" /> : val}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setLoginStep('selection');
                    setPin('');
                    setIsConfirming(false);
                    setConfirmPin('');
                  }}
                  className="flex items-center justify-center gap-2 text-white/40 hover:text-white transition-colors text-sm w-full pt-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to selection
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 text-center text-white/40 text-xs font-mono">
        © {new Date().getFullYear()} AES Ghana. All Rights Reserved.
      </footer>
    </div>
  );
};

export default Login;
