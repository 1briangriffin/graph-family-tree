
import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import client from '../../api/client';

interface PersonData {
    name: string;
    gender: string;
    birth_date: string;
    birth_place: string;
    death_date: string;
    death_place: string;
    bio: string;
    startDate?: string; // Marriage Start
    endDate?: string;   // Marriage End
    relationshipSubtype?: 'biological' | 'adopted';
    adoptionDate?: string;
}

interface PersonFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: PersonData) => Promise<void>;
    onLink?: (personId: number, data?: PersonData) => Promise<void>;
    title: string;
    initialData?: PersonData;
    allowLinking?: boolean;
    relationshipType?: 'PARENT' | 'CHILD' | 'SPOUSE';
}

const PersonFormModal: React.FC<PersonFormModalProps> = ({
    isOpen, onClose, onSubmit, onLink, title, initialData, allowLinking = false, relationshipType
}) => {
    const [mode, setMode] = useState<'CREATE' | 'LINK'>('CREATE');
    const [formData, setFormData] = useState<PersonData>({
        name: initialData?.name || '',
        gender: initialData?.gender || '',
        birth_date: initialData?.birth_date || '',
        birth_place: initialData?.birth_place || '',
        death_date: initialData?.death_date || '',
        death_place: initialData?.death_place || '',
        bio: initialData?.bio || '',
        startDate: initialData?.startDate || '',
        endDate: initialData?.endDate || '',
        relationshipSubtype: initialData?.relationshipSubtype || 'biological',
        adoptionDate: initialData?.adoptionDate || ''
    });

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Reset or update form data when modal opens or initialData changes
    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: initialData?.name || '',
                gender: initialData?.gender || '',
                birth_date: initialData?.birth_date || '',
                birth_place: initialData?.birth_place || '',
                death_date: initialData?.death_date || '',
                death_place: initialData?.death_place || '',
                bio: initialData?.bio || '',
                startDate: initialData?.startDate || '',
                endDate: initialData?.endDate || '',
                relationshipSubtype: initialData?.relationshipSubtype || 'biological',
                adoptionDate: initialData?.adoptionDate || ''
            });
            setMode('CREATE'); // Default to create
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [isOpen, initialData]);

    const [loading, setLoading] = useState(false);

    // Search Effect
    useEffect(() => {
        const doSearch = async () => {
            if (!searchQuery || searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const res = await client.get(`/people/search?q=${encodeURIComponent(searchQuery)}`);
                setSearchResults(res.data);
            } catch (e) {
                console.error("Search failed", e);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(doSearch, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);


    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(formData);
            onClose();
            setFormData({
                name: '', gender: '', birth_date: '', birth_place: '', death_date: '', death_place: '', bio: ''
            });
        } catch (error) {
            console.error("Form submission failed", error);
            alert("Failed to save. Check console.");
        } finally {
            setLoading(false);
        }
    };

    const handleLink = async (personId: number) => {
        if (!onLink) return;
        setLoading(true);
        try {
            await onLink(personId);
            onClose();
        } catch (error) {
            console.error("Link failed", error);
            alert("Failed to link. Check console.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold mb-4 text-gray-800">{title}</h2>

                {allowLinking && (
                    <div className="flex border-b border-gray-200 mb-4">
                        <button
                            className={`flex-1 py-2 text-center font-medium ${mode === 'CREATE' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setMode('CREATE')}
                        >
                            Create New
                        </button>
                        <button
                            className={`flex-1 py-2 text-center font-medium ${mode === 'LINK' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setMode('LINK')}
                        >
                            Link Existing
                        </button>
                    </div>
                )}

                {mode === 'LINK' ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Search Person</label>
                            <div className="relative mt-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search size={16} className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Type name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                />
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto border rounded-md divide-y divide-gray-100">
                            {isSearching ? (
                                <div className="p-4 text-center text-gray-500">Searching...</div>
                            ) : searchResults.length === 0 ? (
                                <div className="p-4 text-center text-gray-400">No results found</div>
                            ) : (
                                searchResults.map(p => (
                                    <div key={p.id} className="p-3 hover:bg-gray-50 flex justify-between items-center group">
                                        <div>
                                            <div className="font-medium text-gray-900">{p.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {p.birth_date ? `b. ${p.birth_date}` : ''}
                                                {p.birth_date && p.death_date ? ' - ' : ''}
                                                {p.death_date ? `d. ${p.death_date}` : ''}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleLink(p.id)}
                                            disabled={loading}
                                            className="px-3 py-1 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 group-hover:border-indigo-300 group-hover:text-indigo-600"
                                        >
                                            Select
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Exisitng Form Fields - compacted for this tool call, assumed to be same */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Name *</label>
                            <input
                                type="text"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Gender</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            >
                                <option value="">Select...</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Birth Date</label>
                                <input
                                    type="text"
                                    name="birth_date"
                                    placeholder="YYYY or YYYY-MM-DD"
                                    value={formData.birth_date}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Birth Place</label>
                                <input
                                    type="text"
                                    name="birth_place"
                                    value={formData.birth_place}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Death Date</label>
                                <input
                                    type="text"
                                    name="death_date"
                                    placeholder="YYYY or YYYY-MM-DD"
                                    value={formData.death_date}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Death Place</label>
                                <input
                                    type="text"
                                    name="death_place"
                                    value={formData.death_place}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                />
                            </div>
                        </div>

                        {/* Relationship Details (Parent/Child) */}
                        {(relationshipType === 'PARENT' || relationshipType === 'CHILD') && (
                            <div className="mt-4 border-t pt-4">
                                <h3 className="text-sm font-medium text-gray-900 mb-2">Relationship Type</h3>
                                <div className="flex gap-4 mb-3">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            name="relationshipSubtype"
                                            value="biological"
                                            checked={formData.relationshipSubtype === 'biological'}
                                            onChange={handleChange}
                                            className="form-radio"
                                        />
                                        <span className="ml-2">Biological</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            name="relationshipSubtype"
                                            value="adopted"
                                            checked={formData.relationshipSubtype === 'adopted'}
                                            onChange={handleChange}
                                            className="form-radio"
                                        />
                                        <span className="ml-2">Adopted</span>
                                    </label>
                                </div>
                                {formData.relationshipSubtype === 'adopted' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Adoption Date</label>
                                        <input
                                            type="text"
                                            name="adoptionDate"
                                            placeholder="YYYY"
                                            value={formData.adoptionDate || ''}
                                            onChange={handleChange}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Relationship Dates (Only for Spouse) */}
                        {relationshipType === 'SPOUSE' && (
                            <div className="mt-4 border-t pt-4">
                                <h3 className="text-sm font-medium text-gray-900 mb-2">Marriage Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Marriage Date</label>
                                        <input
                                            type="text"
                                            name="startDate"
                                            placeholder="YYYY"
                                            value={formData.startDate || ''}
                                            onChange={handleChange}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">End Date (Divorce/Death)</label>
                                        <input
                                            type="text"
                                            name="endDate"
                                            placeholder="YYYY"
                                            value={formData.endDate || ''}
                                            onChange={handleChange}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Bio</label>
                            <textarea
                                name="bio"
                                rows={3}
                                value={formData.bio}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            />
                        </div>

                        <div className="flex justify-end pt-4">
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
                                {loading ? 'Saving...' : 'Save Person'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default PersonFormModal;
