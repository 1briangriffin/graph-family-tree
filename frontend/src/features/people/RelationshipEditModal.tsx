
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface RelationshipEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    title: string;
    type: 'SPOUSE' | 'PARENT' | 'CHILD';
    initialData: {
        startDate?: string;
        endDate?: string;
        adoptionDate?: string;
        relationshipType?: string;
    };
}

const RelationshipEditModal: React.FC<RelationshipEditModalProps> = ({
    isOpen, onClose, onSubmit, title, type, initialData
}) => {
    const [startDate, setStartDate] = useState(initialData.startDate || '');
    const [endDate, setEndDate] = useState(initialData.endDate || '');
    const [adoptionDate, setAdoptionDate] = useState(initialData.adoptionDate || '');
    const [relationshipType, setRelationshipType] = useState(initialData.relationshipType || 'biological');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStartDate(initialData.startDate || '');
            setEndDate(initialData.endDate || '');
            setAdoptionDate(initialData.adoptionDate || '');
            setRelationshipType(initialData.relationshipType || 'biological');
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit({ startDate, endDate, adoptionDate, relationshipType });
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to update relationship");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
                    <X size={20} />
                </button>
                <h2 className="text-xl font-bold mb-4">{title}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">

                    {type === 'SPOUSE' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Marriage Date</label>
                                <input
                                    type="text"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    placeholder="YYYY"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">End Date (Divorce/Death)</label>
                                <input
                                    type="text"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    placeholder="YYYY"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                />
                            </div>
                        </>
                    )}

                    {(type === 'PARENT' || type === 'CHILD') && (
                        <div className="border-t pt-4 mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Relationship Type</label>
                            <div className="flex gap-4 mb-4">
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="relType"
                                        value="biological"
                                        checked={relationshipType === 'biological'}
                                        onChange={() => setRelationshipType('biological')}
                                        className="form-radio"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Biological</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="relType"
                                        value="adopted"
                                        checked={relationshipType === 'adopted'}
                                        onChange={() => setRelationshipType('adopted')}
                                        className="form-radio"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Adopted</span>
                                </label>
                            </div>

                            {relationshipType === 'adopted' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Adoption Date</label>
                                    <input
                                        type="text"
                                        value={adoptionDate}
                                        onChange={(e) => setAdoptionDate(e.target.value)}
                                        placeholder="YYYY"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:bg-indigo-400"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RelationshipEditModal;
