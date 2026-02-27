
import React, { useState, useRef, useEffect } from 'react';
import { processChatWithTools } from '../services/geminiService';
import type { ChatMessage, Entrepreneur, Transaction } from '../types';
import { TransactionType, PaymentMethod, PaidStatus } from '../constants';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

interface ChatWidgetProps {
  entrepreneurs: Entrepreneur[];
  onAddTransaction: (transaction: Transaction) => Promise<void>;
}

interface PendingTransaction {
    entrepreneurId: string;
    type: TransactionType;
    amount: number;
    description: string;
    date: string;
    paymentMethod: PaymentMethod;
}

// --- Audio Utils for Live API ---

// Convert Float32 (Microphone input) to 16-bit PCM (API requirement)
const float32To16BitPCM = (float32: Float32Array) => {
    const buffer = new ArrayBuffer(float32.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32.length; i++) {
        let s = Math.max(-1, Math.min(1, float32[i]));
        s = s < 0 ? s * 0x8000 : s * 0x7FFF;
        view.setInt16(i * 2, s, true);
    }
    return buffer;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const base64ToUint8Array = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

// Manually convert Raw PCM16 bytes to AudioBuffer
// Browser native decodeAudioData() fails on raw PCM streams without headers.
const pcmToAudioBuffer = (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number = 24000,
    numChannels: number = 1
): AudioBuffer => {
    const byteLength = data.length;
    // Ensure 2-byte alignment for Int16. If odd, drop the last byte.
    const alignedLength = byteLength - (byteLength % 2); 
    
    // Create view for Int16Array
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, alignedLength / 2);
    
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            // Normalize 16-bit integer to float [-1.0, 1.0]
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
};

const ChatWidget = ({ entrepreneurs, onAddTransaction }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: "Hi! I can help you record transactions. Try saying 'Add 500 GHS income for Kojo'." }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<PendingTransaction | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Live API State
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Refs for Audio Contexts and cleanup
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingTransaction]);

  // Clean up Live API on unmount
  useEffect(() => {
      return () => {
          stopLiveSession();
      };
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = { sender: 'user', text: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await processChatWithTools(userMsg.text, messages, entrepreneurs);
      
      const aiMsg: ChatMessage = { sender: 'ai', text: response.text };
      setMessages(prev => [...prev, aiMsg]);

      if (response.toolCall && response.toolCall.name === 'record_transaction') {
         const args = response.toolCall.args;
         setPendingTransaction({
             entrepreneurId: args.entrepreneurId,
             type: args.type as TransactionType,
             amount: Number(args.amount),
             description: args.description,
             date: args.date,
             paymentMethod: (args.paymentMethod as PaymentMethod) || PaymentMethod.CASH
         });
      }

    } catch (error) {
      setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I encountered an error processing your request." }]);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmTransaction = async () => {
      if (!pendingTransaction) return;
      
      try {
          // Construct full transaction object
          const newTransaction: Transaction = {
              id: crypto.randomUUID(),
              entrepreneurId: pendingTransaction.entrepreneurId,
              type: pendingTransaction.type,
              amount: pendingTransaction.amount,
              description: pendingTransaction.description,
              date: pendingTransaction.date,
              paymentMethod: pendingTransaction.paymentMethod,
              paidStatus: pendingTransaction.type === TransactionType.INCOME ? PaidStatus.FULL : undefined, // Defaulting to full for simplicity in chat
          };

          await onAddTransaction(newTransaction);
          setMessages(prev => [...prev, { sender: 'ai', text: "✅ Transaction recorded successfully!" }]);
      } catch (err) {
          setMessages(prev => [...prev, { sender: 'ai', text: "❌ Failed to save transaction." }]);
      } finally {
          setPendingTransaction(null);
      }
  };

  const handleCancelTransaction = () => {
      setMessages(prev => [...prev, { sender: 'ai', text: "Transaction cancelled." }]);
      setPendingTransaction(null);
  };
  
  const getEntrepreneurName = (id: string) => {
      return entrepreneurs.find(e => e.id === id)?.businessName || 'Unknown Entrepreneur';
  }

  // --- Live API Logic ---
  const startLiveSession = async () => {
    if (isConnected) return;
    
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API Key not found");

        setIsLiveMode(true);
        setIsConnected(true); // Optimistically set connected

        const ai = new GoogleGenAI({ apiKey });
        
        // 1. Setup Audio Output Context (24kHz is standard for Gemini Live output)
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const outputCtx = new AudioContext({ sampleRate: 24000 });
        audioContextRef.current = outputCtx;
        nextStartTimeRef.current = outputCtx.currentTime;

        // 2. Setup Audio Input Context (16kHz is standard for Gemini Live input)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const inputCtx = new AudioContext({ sampleRate: 16000 });
        inputAudioContextRef.current = inputCtx; // Track input context to close it later
        
        inputSourceRef.current = inputCtx.createMediaStreamSource(stream);
        processorRef.current = inputCtx.createScriptProcessor(4096, 1, 1);

        // 3. Connect session
        // Fixed: Updated to the correct native audio model name per guidelines
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: "You are Aida, an AI assistant for the AES JAC Portal. You are helpful, professional, and knowledgeable about Ghanaian business context. You can understand English and are familiar with Ghanaian languages/dialects like Twi, Ga, and Ewe. If a user speaks in these dialects, try to understand and respond helpfully in English or the dialect if capable. Keep responses concise.",
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                },
            },
            callbacks: {
                onopen: () => {
                    console.log("Live session opened");
                    setIsConnected(true);
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Handle Audio Output
                    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (base64Audio) {
                        setIsSpeaking(true);
                        try {
                            const audioBytes = base64ToUint8Array(base64Audio);
                            // Ensure context is available and not closed before interacting
                            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                                const audioBuffer = pcmToAudioBuffer(audioBytes, audioContextRef.current, 24000);
                                
                                const source = audioContextRef.current.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(audioContextRef.current.destination);
                                
                                // Schedule playback
                                const currentTime = audioContextRef.current.currentTime;
                                // Ensure we schedule slightly in future if we fell behind, or append to queue
                                const startTime = Math.max(currentTime, nextStartTimeRef.current);
                                source.start(startTime);
                                nextStartTimeRef.current = startTime + audioBuffer.duration;
                                
                                source.onended = () => {
                                   // Reset speaking state if we've caught up
                                   if (audioContextRef.current && audioContextRef.current.currentTime >= nextStartTimeRef.current - 0.1) {
                                       setIsSpeaking(false);
                                   }
                                   // Remove from queue
                                   audioQueueRef.current = audioQueueRef.current.filter(s => s !== source);
                                };
                                audioQueueRef.current.push(source);
                            }
                        } catch (decodeErr) {
                            console.error("Error processing audio chunk:", decodeErr);
                        }
                    }
                    
                    if (message.serverContent?.turnComplete) {
                        // Optional: logic when turn is complete
                    }
                },
                onclose: () => {
                    console.log("Live session closed by server");
                    stopLiveSession();
                },
                onerror: (e) => {
                    console.error("Live session error", e);
                    stopLiveSession();
                }
            }
        });
        
        liveSessionRef.current = sessionPromise;

        // 4. Start Processing Audio Input
        processorRef.current.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Calculate volume for visualizer
            let sum = 0;
            for(let i=0; i<inputData.length; i++) sum += inputData[i]*inputData[i];
            const rms = Math.sqrt(sum/inputData.length);
            setAudioLevel(Math.min(1, rms * 5)); // Amplify for visual

            // Convert to PCM 16-bit
            const pcm16 = float32To16BitPCM(inputData);
            const base64 = arrayBufferToBase64(pcm16);
            
            // Use promise to ensure we only send data when connected
            sessionPromise.then(session => {
                session.sendRealtimeInput({
                    media: {
                        mimeType: 'audio/pcm;rate=16000',
                        data: base64
                    }
                });
            });
        };

        inputSourceRef.current.connect(processorRef.current);
        processorRef.current.connect(inputCtx.destination); // Mute input to speakers

    } catch (err) {
        console.error("Failed to start live session:", err);
        stopLiveSession();
    }
  };

  const stopLiveSession = () => {
      setIsLiveMode(false);
      setIsConnected(false);
      setIsSpeaking(false);
      setAudioLevel(0);

      // 1. Stop all playing audio
      audioQueueRef.current.forEach(source => {
          try { source.stop(); } catch (e) {}
          try { source.disconnect(); } catch (e) {}
      });
      audioQueueRef.current = [];

      // 2. Disconnect input nodes
      if (processorRef.current) {
          processorRef.current.disconnect();
          processorRef.current.onaudioprocess = null;
          processorRef.current = null;
      }
      if (inputSourceRef.current) {
          inputSourceRef.current.disconnect();
          inputSourceRef.current = null;
      }
      
      // 3. Close Input Context safely
      if (inputAudioContextRef.current) {
          if (inputAudioContextRef.current.state !== 'closed') {
              inputAudioContextRef.current.close().catch(e => console.warn("InputCtx close error", e));
          }
          inputAudioContextRef.current = null;
      }

      // 4. Close Output Context safely
      if (audioContextRef.current) {
          if (audioContextRef.current.state !== 'closed') {
              audioContextRef.current.close().catch(e => console.warn("OutputCtx close error", e));
          }
          audioContextRef.current = null;
      }
      
      // 5. Close Session
      if (liveSessionRef.current) {
          liveSessionRef.current.then((session: any) => {
              if (session && session.close) {
                 try { session.close(); } catch(e) { console.warn("Error closing session:", e); }
              }
          }).catch((e: any) => console.log("Session promise error during stop:", e));
          liveSessionRef.current = null;
      }
      nextStartTimeRef.current = 0;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 bg-aesYellow text-aesBlue rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50 focus:outline-none focus:ring-4 focus:ring-aesYellow/50"
        title="Open AI Assistant"
      >
        <span className="text-3xl">✨</span>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 w-96 bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col z-50 transition-all duration-300 border border-gray-200 dark:border-gray-700 ${isMinimized ? 'h-16' : 'h-[600px] max-h-[80vh]'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-primary rounded-t-xl text-white cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center space-x-2">
            <span className="text-2xl">🤖</span>
            <div>
                <h3 className="font-bold text-sm">Aida Assistant</h3>
                {!isMinimized && <span className="text-xs text-green-300 block">Powered by Gemini 3 Pro</span>}
            </div>
        </div>
        <div className="flex space-x-2">
            <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="hover:text-gray-200 focus:outline-none text-xl">
                {isMinimized ? '□' : '_'}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="hover:text-red-300 focus:outline-none text-xl">
                &times;
            </button>
        </div>
      </div>

      {!isMinimized && !isLiveMode && (
        <>
            {/* Chat Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                            msg.sender === 'user' 
                            ? 'bg-primary text-white rounded-br-none' 
                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-600 rounded-bl-none'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                
                {pendingTransaction && (
                    <div className="mx-4 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-aesYellow overflow-hidden animate-fadeIn">
                        <div className="bg-aesYellow/20 p-2 border-b border-aesYellow/30 text-center">
                            <span className="text-xs font-bold text-aesBlue uppercase tracking-wide">Confirm Transaction</span>
                        </div>
                        <div className="p-4 text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Entrepreneur:</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{getEntrepreneurName(pendingTransaction.entrepreneurId)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Type:</span>
                                <span className={`font-bold ${pendingTransaction.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-500'}`}>{pendingTransaction.type}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">GHS {pendingTransaction.amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Date:</span>
                                <span className="text-gray-800 dark:text-gray-200">{pendingTransaction.date}</span>
                            </div>
                            <div className="pt-2 text-xs text-gray-500 italic border-t dark:border-gray-600 mt-2">
                                "{pendingTransaction.description}"
                            </div>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 flex space-x-2">
                            <button onClick={handleCancelTransaction} className="flex-1 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleConfirmTransaction} className="flex-1 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-md">Confirm & Save</button>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="flex justify-start">
                         <div className="bg-white dark:bg-gray-700 p-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 dark:border-gray-600 flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-b-xl flex items-center space-x-2">
                <button
                    onClick={startLiveSession}
                    className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-aesBlue hover:bg-aesBlue hover:text-white transition-colors"
                    title="Start Voice Chat (Live API)"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                </button>
                <form 
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex-grow flex items-center space-x-2"
                >
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-grow px-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-full focus:ring-2 focus:ring-primary text-sm text-gray-800 dark:text-gray-200 placeholder-gray-500"
                        disabled={isLoading || !!pendingTransaction}
                    />
                    <button 
                        type="submit" 
                        disabled={isLoading || !inputValue.trim() || !!pendingTransaction}
                        className={`p-2 rounded-full text-white transition-colors ${isLoading || !inputValue.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover shadow-md'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </form>
            </div>
        </>
      )}

      {/* Live Voice Mode Overlay */}
      {!isMinimized && isLiveMode && (
          <div className="flex-grow flex flex-col items-center justify-center bg-gray-900 rounded-b-xl relative overflow-hidden">
              {/* Visualizer Background */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <div 
                    className="w-64 h-64 bg-aesBlue rounded-full blur-3xl transition-transform duration-75"
                    style={{ transform: `scale(${1 + audioLevel})` }}
                  ></div>
              </div>
              
              <div className="z-10 text-center space-y-8">
                  <div className="relative">
                      {/* Pulsing Circle */}
                      <div className={`w-32 h-32 rounded-full border-4 border-aesYellow flex items-center justify-center transition-all duration-200 ${isSpeaking ? 'shadow-[0_0_30px_#E1A11A]' : ''}`}>
                          <div 
                            className="w-24 h-24 bg-aesBlue rounded-full flex items-center justify-center text-white text-4xl"
                            style={{ transform: `scale(${0.8 + (audioLevel * 0.4)})` }}
                          >
                              {isSpeaking ? '🗣️' : '👂'}
                          </div>
                      </div>
                  </div>
                  
                  <div>
                      <h3 className="text-white text-xl font-bold mb-2">Live Voice Chat</h3>
                      <p className="text-gray-400 text-sm">
                          {isConnected ? (isSpeaking ? "Aida is speaking..." : "Listening...") : "Connecting..."}
                      </p>
                      <p className="text-gray-500 text-xs mt-2">Supports English & Ghanaian Dialects</p>
                  </div>
                  
                  <button 
                    onClick={stopLiveSession}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold shadow-lg transition-transform hover:scale-105"
                  >
                      End Voice Chat
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default ChatWidget;
