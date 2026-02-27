
import React, { useState } from 'react';
import type { GrowthPlan, Entrepreneur, SuggestedDocument } from '../types';
import Button from './ui/Button';
import ContractGenerator from './ContractGenerator';

interface GrowthReportViewProps {
    plan: GrowthPlan;
    entrepreneur: Entrepreneur;
    onBack: () => void;
}

const GrowthReportView = ({ plan, entrepreneur, onBack }: GrowthReportViewProps) => {
    const [contractToGenerate, setContractToGenerate] = useState<SuggestedDocument | null>(null);

    const priorityColor = (priority: 'High' | 'Medium' | 'Low') => {
        switch (priority) {
            case 'High': return 'bg-red-100 text-red-800';
            case 'Medium': return 'bg-yellow-100 text-yellow-800';
            case 'Low': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex justify-start">
                <Button onClick={onBack} variant="secondary">← Back to Generator</Button>
            </div>
            
            <div className="bg-white shadow-lg rounded-lg p-8">
                <h1 className="text-3xl font-bold text-aesBlue mb-2">Strategic Growth Plan</h1>
                <p className="text-xl font-semibold text-aesOrange mb-6">For: {entrepreneur.businessName}</p>

                {/* Executive Summary */}
                <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3 border-b-2 border-aesYellow pb-2">Executive Summary</h3>
                    <p className="text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-md border border-blue-200">
                        {plan.executiveSummary}
                    </p>
                </section>
                
                {/* Strategic Recommendations */}
                <section className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3 border-b-2 border-aesYellow pb-2">Strategic Recommendations</h3>
                    <ul className="space-y-4">
                        {plan.strategicRecommendations.map((rec, index) => (
                             <li key={index} className="p-4 bg-gray-50 rounded-md">
                               <div className="flex items-start">
                                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full mr-4 mt-1 ${priorityColor(rec.priority)}`}>{rec.priority}</span>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{rec.title}</h4>
                                        <p className="text-gray-600 text-sm mt-1">{rec.recommendation}</p>
                                    </div>
                               </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Suggested Resources */}
                {plan.suggestedResources && plan.suggestedResources.length > 0 && (
                    <section className="mb-8">
                        <h3 className="text-xl font-semibold text-gray-800 mb-3 border-b-2 border-aesYellow pb-2">Suggested Learning Resources</h3>
                         <p className="text-sm text-gray-500 mb-4">
                            The AI recommends these resources from the library to help you achieve your goals.
                        </p>
                        <ul className="space-y-3">
                            {plan.suggestedResources.map((res, index) => (
                                <li key={index} className="p-3 bg-gray-50 rounded-md border-l-4 border-aesBlue">
                                    <h4 className="font-bold text-gray-900">📝 {res.title}</h4>
                                    <p className="text-gray-600 text-sm mt-1 pl-6 italic"><strong>Reason:</strong> {res.reason}</p>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                
                {/* Suggested Documents */}
                <section>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3 border-b-2 border-aesYellow pb-2">Suggested Business Documents</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Based on the analysis, here are some legal or business documents that could help formalize and protect the business. Click to generate an editable draft.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plan.suggestedDocuments.map((doc, index) => (
                             <div key={index} className="p-4 bg-gray-50 rounded-md border-l-4 border-aesBlue flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-900">{doc.documentName}</h4>
                                    <p className="text-gray-600 text-sm mt-1">{doc.description}</p>
                                </div>
                                <div className="mt-4 text-right">
                                    <Button variant="primary" size="sm" onClick={() => setContractToGenerate(doc)}>
                                        Generate Draft
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
            
            {contractToGenerate && (
                <ContractGenerator 
                    suggestedDocument={contractToGenerate}
                    entrepreneur={entrepreneur}
                    onClose={() => setContractToGenerate(null)}
                />
            )}
        </div>
    );
};

export default GrowthReportView;
