
import React, { useState, useEffect } from 'react';
import type { ContractData, SuggestedDocument, Entrepreneur } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import LoadingSpinner from './LoadingSpinner';
import { generateContract } from '../services/geminiService';
import { exportContractToDocx } from '../services/exportService';

interface ContractGeneratorProps {
    suggestedDocument: SuggestedDocument;
    entrepreneur: Entrepreneur;
    onClose: () => void;
}

const ContractGenerator = ({ suggestedDocument, entrepreneur, onClose }: ContractGeneratorProps) => {
    const [contractData, setContractData] = useState<ContractData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchContract = async () => {
            setIsLoading(true);
            setError(null);
            try {
                if (!process.env.API_KEY) {
                    throw new Error("Gemini API key not configured.");
                }
                const businessProfile = `Business Name: ${entrepreneur.businessName}\nOwner: ${entrepreneur.name}\nBio: ${entrepreneur.bio || 'Not provided'}`;
                const data = await generateContract(suggestedDocument.contractType, businessProfile);
                setContractData(data);
            } catch (err) {
                console.error("Failed to generate contract:", err);
                setError((err as Error).message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchContract();
    }, [suggestedDocument, entrepreneur]);

    const handleClauseChange = (index: number, newContent: string) => {
        if (!contractData) return;
        const updatedClauses = [...contractData.clauses];
        updatedClauses[index].content = newContent;
        setContractData({ ...contractData, clauses: updatedClauses });
    };

    const handleExport = async () => {
        if (!contractData) return;
        setIsExporting(true);
        try {
            await exportContractToDocx(contractData, entrepreneur.name);
        } catch(err) {
            console.error("Export failed:", err);
            alert("Sorry, the export failed. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <LoadingSpinner message="AI Legal Assistant is drafting the document..." />;
        }
        if (error) {
            return <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>;
        }
        if (contractData) {
            return (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded-md border border-yellow-200">
                        <strong>Disclaimer:</strong> This is an AI-generated draft and not legal advice. Please review carefully and consult with a legal professional.
                    </p>
                    <h3 className="text-xl font-bold text-center text-gray-800">{contractData.title}</h3>
                    {contractData.clauses.map((clause, index) => (
                        <div key={index}>
                            <label htmlFor={`clause-${index}`} className="block text-sm font-bold text-gray-700 mb-1">{clause.title}</label>
                            <textarea
                                id={`clause-${index}`}
                                value={clause.content}
                                onChange={(e) => handleClauseChange(index, e.target.value)}
                                rows={clause.content.split('\n').length + 1}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-primary focus:border-primary"
                            />
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };


    return (
        <Modal isOpen={true} onClose={onClose} title={`Draft: ${suggestedDocument.documentName}`}>
           <div className="space-y-4">
               {renderContent()}
               <div className="flex justify-end space-x-3 border-t pt-4 mt-4">
                   <Button variant="secondary" onClick={onClose}>Cancel</Button>
                   <Button 
                    variant="primary" 
                    onClick={handleExport} 
                    disabled={!contractData || isExporting}
                    isLoading={isExporting}
                   >
                       {isExporting ? 'Exporting...' : 'Export to Word (.docx)'}
                   </Button>
               </div>
           </div>
        </Modal>
    );
};

export default ContractGenerator;
