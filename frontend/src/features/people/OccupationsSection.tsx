
import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Building } from 'lucide-react';
import client from '../../api/client';

interface Occupation {
    id: number;
    title: string;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    location: string | null;
    organization: {
        id: number;
        name: string;
        type: string | null;
        location: string | null;
    } | null;
}

interface Organization {
    id: number;
    name: string;
}

interface Props {
    personId: number;
    onUpdate?: () => void;
}

const OccupationsSection: React.FC<Props> = ({ personId, onUpdate }) => {
    const [occupations, setOccupations] = useState<Occupation[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchOccupations = async () => {
        try {
            const response = await client.get(`/occupations/person/${personId}`);
            setOccupations(response.data);
        } catch (error) {
            console.error('Failed to fetch occupations', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrganizations = async () => {
        try {
            const response = await client.get('/organizations/');
            setOrganizations(response.data);
        } catch (error) {
            console.error('Failed to fetch organizations', error);
        }
    };

    useEffect(() => {
        fetchOccupations();
        fetchOrganizations();
    }, [personId]);

    const handleDelete = async (occupationId: number) => {
        if (!confirm('Delete this occupation?')) return;
        try {
            await client.delete(`/occupations/${occupationId}`);
            fetchOccupations();
            onUpdate?.();
        } catch (error) {
            console.error('Failed to delete occupation', error);
        }
    };

    return (
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center text-gray-800">
                    <Briefcase className="w-5 h-5 mr-2 text-purple-500" />
                    Career History
                </h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm"
                >
                    <Plus size={16} />
                    Add Occupation
                </button>
            </div>

            {loading ? (
                <p className="text-gray-400">Loading...</p>
            ) : occupations.length === 0 ? (
                <p className="text-gray-400 italic">No occupations on record.</p>
            ) : (
                <div className="space-y-4">
                    {occupations.map((occ) => (
                        <div key={occ.id} className="border-l-4 border-purple-300 pl-4 py-2">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">{occ.title}</h3>
                                    {occ.organization && (
                                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                            <Building size={14} />
                                            <span>{occ.organization.name}</span>
                                            {occ.organization.type && (
                                                <span className="text-xs text-gray-400">({occ.organization.type})</span>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-500 mt-1">
                                        {occ.start_date || '?'} — {occ.end_date || 'present'}
                                        {occ.location && ` • ${occ.location}`}
                                    </p>
                                    {occ.description && (
                                        <p className="text-sm text-gray-600 mt-2">{occ.description}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(occ.id)}
                                    className="text-red-500 hover:text-red-700 text-sm ml-4"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && (
                <AddOccupationModal
                    personId={personId}
                    organizations={organizations}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        fetchOccupations();
                        setShowAddModal(false);
                        onUpdate?.();
                    }}
                />
            )}
        </div>
    );
};

// Add Occupation Modal
const AddOccupationModal: React.FC<{
    personId: number;
    organizations: Organization[];
    onClose: () => void;
    onSuccess: () => void;
}> = ({ personId, organizations, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        location: '',
        organization_id: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                person_id: personId,
                organization_id: formData.organization_id ? parseInt(formData.organization_id) : null
            };
            await client.post('/occupations/', payload);
            onSuccess();
        } catch (error) {
            console.error('Failed to create occupation', error);
            alert('Failed to create occupation');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4">Add Occupation</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            placeholder="e.g., Software Engineer"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                        <select
                            value={formData.organization_id}
                            onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="">None</option>
                            {organizations.map((org) => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                type="text"
                                placeholder="YYYY or YYYY-MM-DD"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                                type="text"
                                placeholder="YYYY or YYYY-MM-DD"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            placeholder="City, State"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                            placeholder="Role details..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                        >
                            Add Occupation
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OccupationsSection;
