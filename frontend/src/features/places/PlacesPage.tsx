
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Plus, ArrowLeft, Search, Home, Users } from 'lucide-react';
import client from '../../api/client';

interface Place {
    id: number;
    name: string;
    street: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    geo_lat: number | null;
    geo_lng: number | null;
    residents?: { id: number; name: string; start_date: string | null; end_date: string | null; residence_type: string | null }[];
}

const PlacesPage: React.FC = () => {
    const [places, setPlaces] = useState<Place[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchPlaces = useCallback(async () => {
        try {
            const url = searchTerm ? `/places/?search=${encodeURIComponent(searchTerm)}` : '/places/';
            const response = await client.get(url);
            setPlaces(response.data);
        } catch (error) {
            console.error('Failed to fetch places', error);
        } finally {
            setLoading(false);
        }
    }, [searchTerm]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchPlaces();
        }, 300);
        return () => clearTimeout(debounce);
    }, [fetchPlaces]);

    const handleCreatePlace = async (placeData: Partial<Place>) => {
        try {
            await client.post('/places/', placeData);
            setShowCreateModal(false);
            fetchPlaces();
        } catch (error) {
            console.error('Failed to create place', error);
            alert('Failed to create place');
        }
    };

    const formatAddress = (place: Place): string => {
        const parts = [place.city, place.state, place.country].filter(Boolean);
        return parts.join(', ') || 'No address';
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64">Loading places...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Link to="/" className="text-gray-600 hover:text-gray-900">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Places</h1>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                    <Plus size={20} />
                    Add Place
                </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search places by name or city..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                    />
                </div>
            </div>

            {/* Places Grid */}
            {places.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                    {searchTerm ? 'No places match your search.' : 'No places found. Add your first place!'}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {places.map((place) => (
                        <PlaceCard key={place.id} place={place} onUpdate={fetchPlaces} />
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreatePlaceModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreatePlace}
                />
            )}
        </div>
    );
};

// Place Card Component
const PlaceCard: React.FC<{ place: Place; onUpdate: () => void }> = ({ place, onUpdate }) => {
    const [expanded, setExpanded] = useState(false);
    const [residents, setResidents] = useState<Place['residents']>([]);

    const fetchResidents = async () => {
        try {
            const response = await client.get(`/places/${place.id}`);
            setResidents(response.data.residents || []);
        } catch (error) {
            console.error('Failed to fetch residents', error);
        }
    };

    useEffect(() => {
        if (expanded) {
            fetchResidents();
        }
    }, [expanded, place.id]);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this place?')) return;
        try {
            await client.delete(`/places/${place.id}`);
            onUpdate();
        } catch (error) {
            console.error('Failed to delete place', error);
        }
    };

    const formatAddress = (): string => {
        const parts = [place.street, place.city, place.state, place.country].filter(Boolean);
        return parts.join(', ') || 'No address details';
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <Home size={18} className="text-indigo-500" />
                    <h3 className="font-semibold text-gray-800">{place.name}</h3>
                </div>
                <button
                    onClick={handleDelete}
                    className="text-red-500 hover:text-red-700 text-sm"
                >
                    Delete
                </button>
            </div>

            <div className="flex items-start gap-2 text-gray-600 text-sm mb-3">
                <MapPin size={14} className="mt-0.5 shrink-0" />
                <span>{formatAddress()}</span>
            </div>

            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-indigo-600 text-sm hover:underline"
            >
                <Users size={14} />
                {expanded ? 'Hide Residents' : 'Show Residents'}
            </button>

            {expanded && (
                <div className="mt-3 border-t pt-3">
                    {residents && residents.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">No residents linked</p>
                    ) : (
                        <ul className="space-y-1">
                            {residents?.map((r) => (
                                <li key={r.id} className="text-sm">
                                    <Link to={`/people/${r.id}`} className="text-indigo-600 hover:underline">
                                        {r.name}
                                    </Link>
                                    <span className="text-gray-500 ml-1">
                                        ({r.start_date || '?'} - {r.end_date || 'present'})
                                    </span>
                                    {r.residence_type && (
                                        <span className="text-xs text-gray-400 ml-1">[{r.residence_type}]</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

// Create Place Modal
const CreatePlaceModal: React.FC<{
    onClose: () => void;
    onCreate: (data: Partial<Place>) => void;
}> = ({ onClose, onCreate }) => {
    const [formData, setFormData] = useState({
        name: '',
        street: '',
        city: '',
        state: '',
        country: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Place name is required');
            return;
        }
        onCreate(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4">Add New Place</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Place Name *</label>
                        <input
                            type="text"
                            placeholder="e.g., Childhood Home, Work Address"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                        <input
                            type="text"
                            placeholder="123 Main St"
                            value={formData.street}
                            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <input
                                type="text"
                                placeholder="City"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                            <input
                                type="text"
                                placeholder="State"
                                value={formData.state}
                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                        <input
                            type="text"
                            placeholder="Country"
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
                            Create Place
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PlacesPage;
