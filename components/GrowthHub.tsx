import React, { useState, useEffect, useMemo } from 'react';
import type { Entrepreneur, GrowthPlan, Resource } from '../types';
import Select from './ui/Select';
import Button from './ui/Button';
import LoadingSpinner from './LoadingSpinner';
import { generateGrowthPlan } from '../services/geminiService';
import GrowthReportView from './GrowthReportView';
import { RESOURCE_LIBRARY } from '../data/resourceLibrary';
import Input from './ui/Input';
import Textarea from './ui/Textarea';

interface GrowthHubProps {
    entrepreneurs: Entrepreneur[];
}

const ResourceCard: React.FC<{ resource: Resource }> = ({ resource }) => {
    const iconMap = {
        'Article': '📝',
        'Video': '🎥',
        'Template': '📄'
    };
    return (
        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="block bg-white p-4 rounded-lg shadow-md hover:shadow-xl transition-shadow border border-gray-200">
            <h4 className="font-bold text-primary mb-2">
                <span className="mr-2">{iconMap[resource.type]}</span>
                {resource.title}
            </h4>
            <p className="text-sm text-gray-600 mb-3">{resource.description}</p>
            <div className="flex flex-wrap gap-2">
                {resource.tags.map(tag => (
                    <span key={tag} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">{tag}</span>
                ))}
            </div>
        </a>
    )
};


const GrowthHub = ({ entrepreneurs }: GrowthHubProps) => {
    const [activeTab, setActiveTab] = useState<'generator' | 'library'>('generator');
    
    // State for Generator
    const [selectedEntrepreneurId, setSelectedEntrepreneurId] = useState<string>('');
    const [businessProfile, setBusinessProfile] = useState<string>('');
    const [needsAssessment, setNeedsAssessment] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState({ businessProfile: '', needsAssessment: '' });
    const [growthPlan, setGrowthPlan] = useState<GrowthPlan | null>(null);

    // State for Library
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState('');

    const entrepreneurOptions = entrepreneurs.map(e => ({ value: e.id, label: `${e.name} (${e.businessName})` }));

    useEffect(() => {
        const selected = entrepreneurs.find(e => e.id === selectedEntrepreneurId);
        if (selected) {
            setBusinessProfile(selected.bio || `Business Name: ${selected.businessName}\nOwner: ${selected.name}`);
        } else {
            setBusinessProfile('');
        }
    }, [selectedEntrepreneurId, entrepreneurs]);

    const validateForm = (): boolean => {
        let errors = { businessProfile: '', needsAssessment: '' };
        let isValid = true;
        
        if (!businessProfile.trim() || businessProfile.trim().length < 50) {
            errors.businessProfile = "Please provide a detailed profile (min 50 characters).";
            isValid = false;
        }
        if (!needsAssessment.trim() || needsAssessment.trim().length < 20) {
            errors.needsAssessment = "Please describe the business needs (min 20 characters).";
            isValid = false;
        }
        
        setFormErrors(errors);
        return isValid;
    };

    const handleGeneratePlan = async () => {
        setApiError(null);
        if (!validateForm()) {
            return;
        }

        const selectedEntrepreneur = entrepreneurs.find(e => e.id === selectedEntrepreneurId);
        if (!selectedEntrepreneur) return;

        setIsLoading(true);
        setGrowthPlan(null);

        try {
            if (!process.env.API_KEY) {
                throw new Error("Gemini API key not configured. Strategic analysis is unavailable. Please configure the API_KEY environment variable.");
            }
            const plan = await generateGrowthPlan(businessProfile, needsAssessment, selectedEntrepreneur.name, RESOURCE_LIBRARY);
            setGrowthPlan(plan);
        } catch (err) {
            console.error("Error generating growth plan:", err);
            setApiError((err as Error).message || "An unknown error occurred while generating the plan.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        RESOURCE_LIBRARY.forEach(r => r.tags.forEach(t => tags.add(t)));
        return Array.from(tags).sort();
    }, []);

    const filteredResources = useMemo(() => {
        return RESOURCE_LIBRARY.filter(resource => {
            const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) || resource.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTag = selectedTag ? resource.tags.includes(selectedTag) : true;
            return matchesSearch && matchesTag;
        });
    }, [searchTerm, selectedTag]);
    
    if (isLoading) {
        return <LoadingSpinner message="Your AI Business Strategist is building the growth plan..." />;
    }

    if (growthPlan) {
        const selectedEntrepreneur = entrepreneurs.find(e => e.id === selectedEntrepreneurId);
        return (
            <GrowthReportView 
                plan={growthPlan} 
                entrepreneur={selectedEntrepreneur!} // We know it's defined if a plan exists
                onBack={() => setGrowthPlan(null)}
            />
        );
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800">Growth Strategy Hub</h1>
            
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('generator')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'generator' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        AI Strategy Generator
                    </button>
                    <button onClick={() => setActiveTab('library')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'library' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Resource Library
                    </button>
                </nav>
            </div>
            
            {activeTab === 'generator' && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <p className="mb-4 text-gray-600">
                        Generate an AI-powered strategic growth plan. Select an entrepreneur, detail their needs, and let our AI create an actionable plan with legal and resource suggestions.
                    </p>
                    <div className="space-y-4">
                         <Select
                            label="Select Entrepreneur"
                            id="selectedEntrepreneurId"
                            options={entrepreneurOptions}
                            value={selectedEntrepreneurId}
                            onChange={(e) => setSelectedEntrepreneurId(e.target.value)}
                            required
                        />

                        <Textarea
                            label="Business Profile & Bio"
                            id="businessProfile"
                            rows={5}
                            placeholder="Describe the business, its mission, products/services, and target market."
                            value={businessProfile}
                            onChange={(e) => {
                                setBusinessProfile(e.target.value);
                                if (formErrors.businessProfile) setFormErrors(p => ({...p, businessProfile: ''}));
                            }}
                            error={formErrors.businessProfile}
                        />

                        <Textarea
                            label="Needs Assessment"
                            id="needsAssessment"
                            rows={5}
                            placeholder="What are the entrepreneur's current challenges, goals, or areas where they need help? (e.g., 'needs help with marketing', 'wants to formalize a partnership', 'struggling with cash flow')."
                            value={needsAssessment}
                            onChange={(e) => {
                                setNeedsAssessment(e.target.value);
                                if (formErrors.needsAssessment) setFormErrors(p => ({...p, needsAssessment: ''}));
                            }}
                            error={formErrors.needsAssessment}
                        />
                    </div>

                    <div className="border-t border-gray-200 pt-4 mt-4">
                        <div className="flex justify-end">
                            <Button onClick={handleGeneratePlan} disabled={!selectedEntrepreneurId || isLoading}>
                                Generate Growth Plan
                            </Button>
                        </div>
                    </div>

                    {apiError && <p className="text-red-500 bg-red-100 p-3 rounded-md mt-4">{apiError}</p>}
                </div>
            )}
            
            {activeTab === 'library' && (
                <div className="space-y-6">
                    <div className="bg-white p-4 rounded-lg shadow-md flex flex-col md:flex-row gap-4 items-center">
                        <div className="w-full md:flex-grow">
                             <Input 
                                id="search" 
                                type="text"
                                placeholder="Search resources..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                             />
                        </div>
                        <div className="w-full md:w-auto">
                            <select
                              id="tag-filter"
                              value={selectedTag}
                              onChange={(e) => setSelectedTag(e.target.value)}
                              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white text-gray-900"
                            >
                              <option value="">All Tags</option>
                              {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                            </select>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredResources.length > 0 ? (
                            filteredResources.map(resource => <ResourceCard key={resource.id} resource={resource} />)
                        ) : (
                            <p className="text-gray-500 md:col-span-2 text-center">No resources found matching your criteria.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GrowthHub;