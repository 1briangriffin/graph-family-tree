import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Search, ArrowLeft, Plus } from 'lucide-react';
import client from '../../api/client';

interface Person {
    id: number;
    name: string;
    gender: string | null;
    birth_date: string | null;
    birth_place: string | null;
    death_date: string | null;
    death_place: string | null;
    bio: string | null;
    maiden_name: string | null;
}

const PeopleListPage: React.FC = () => {
    const navigate = useNavigate();
    const [people, setPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [birthYear, setBirthYear] = useState('');
    const [location, setLocation] = useState('');
    const [aliveFilter, setAliveFilter] = useState<'all' | 'alive' | 'deceased'>('all');
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchPeople = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (birthYear) params.append('birth_year', birthYear);
            if (location) params.append('location', location);
            if (aliveFilter !== 'all') {
                params.append('alive', aliveFilter === 'alive' ? 'true' : 'false');
            }

            const url = `/people/${params.toString() ? `?${params.toString()}` : ''}`;
            const response = await client.get(url);
            setPeople(response.data);
        } catch (error) {
            console.error('Failed to fetch people', error);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, birthYear, location, aliveFilter]);

    useEffect(() => {
        fetchPeople();
    }, [fetchPeople]);

    const handleAddPerson = async (personData: any) => {
        try {
            const response = await client.post('/people/', personData);
            setShowAddModal(false);
            // Navigate to the new person's profile
            navigate(`/people/${response.data.id}`);
        } catch (error) {
            console.error('Failed to create person', error);
            alert('Failed to create person');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64">Loading...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Link to="/" className="text-gray-600 hover:text-gray-900">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">People Directory</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500">{people.length} people</div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                    >
                        <Plus size={20} />
                        Add Person
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Birth Year */}
                    <input
                        type="number"
                        placeholder="Birth Year"
                        value={birthYear}
                        onChange={(e) => setBirthYear(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />

                    {/* Location */}
                    <input
                        type="text"
                        placeholder="Location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />

                    {/* Alive/Deceased */}
                    <select
                        value={aliveFilter}
                        onChange={(e) => setAliveFilter(e.target.value as 'all' | 'alive' | 'deceased')}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All</option>
                        <option value="alive">Living</option>
                        <option value="deceased">Deceased</option>
                    </select>
                </div>
            </div>

            {/* People Grid */}
            {people.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                    No people found. {searchQuery && 'Try a different search.'}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {people.map((person) => (
                        <PersonCard key={person.id} person={person} />
                    ))}
                </div>
            )}

            {/* Add Person Modal */}
            {showAddModal && (
                <AddPersonModal
                    onClose={() => setShowAddModal(false)}
                    onCreate={handleAddPerson}
                />
            )}
        </div>
    );
};

// Person Card Component
const PersonCard: React.FC<{ person: Person }> = ({ person }) => {
    const getBirthYear = () => {
        if (!person.birth_date) return null;
        const match = person.birth_date.match(/^\d{4}/);
        return match ? match[0] : null;
    };

    const getDeathYear = () => {
        if (!person.death_date) return null;
        const match = person.death_date.match(/^\d{4}/);
        return match ? match[0] : null;
    };

    const birthYear = getBirthYear();
    const deathYear = getDeathYear();

    return (
        <Link
            to={`/people/${person.id}`}
            className="block bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
        >
            <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <User className="text-indigo-600" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{person.name}</h3>
                    {person.maiden_name && (
                        <p className="text-sm text-gray-500">née {person.maiden_name}</p>
                    )}

                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        {birthYear && <span>{birthYear}</span>}
                        {(birthYear || deathYear) && <span>—</span>}
                        {deathYear ? <span>{deathYear}</span> : (birthYear && <span className="text-green-600">Living</span>)}
                    </div>

                    {person.birth_place && (
                        <p className="text-xs text-gray-500 mt-1 truncate">📍 {person.birth_place}</p>
                    )}

                    {person.bio && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{person.bio}</p>
                    )}
                </div>
            </div>
        </Link>
    );
};

// Add Person Modal Component
const AddPersonModal: React.FC<{
    onClose: () => void;
    onCreate: (data: any) => void;
}> = ({ onClose, onCreate }) => {
    const [formData, setFormData] = useState({
        name: '',
        gender: '',
        birth_date: '',
        birth_place: '',
        death_date: '',
        death_place: '',
        bio: '',
        maiden_name: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">Add New Person</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            placeholder="First Last"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="">Select...</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
                            <input
                                type="text"
                                placeholder="YYYY or YYYY-MM-DD"
                                value={formData.birth_date}
                                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Birth Place</label>
                            <input
                                type="text"
                                placeholder="City, State"
                                value={formData.birth_place}
                                onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Death Date</label>
                            <input
                                type="text"
                                placeholder="YYYY or YYYY-MM-DD"
                                value={formData.death_date}
                                onChange={(e) => setFormData({ ...formData, death_date: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Death Place</label>
                            <input
                                type="text"
                                placeholder="City, State"
                                value={formData.death_place}
                                onChange={(e) => setFormData({ ...formData, death_place: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Maiden Name</label>
                        <input
                            type="text"
                            value={formData.maiden_name}
                            onChange={(e) => setFormData({ ...formData, maiden_name: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            placeholder="For married women"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Biography</label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                            placeholder="Brief life summary..."
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
                            Create Person
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PeopleListPage;
