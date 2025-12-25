
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Plus, Filter, ArrowLeft } from 'lucide-react';
import client from '../../api/client';

interface Event {
    id: number;
    type: string;
    event_date: string | null;
    description: string | null;
    location: string | null;
    participants?: { id: number; name: string; role: string | null }[];
}

const EVENT_TYPE_LABELS: Record<string, string> = {
    'GRADUATION': 'Graduation',
    'MILITARY_SERVICE': 'Military Service',
    'AWARD': 'Award',
    'IMMIGRATION': 'Immigration',
    'RETIREMENT': 'Retirement',
    'OTHER': 'Other'
};

const EVENT_TYPE_COLORS: Record<string, string> = {
    'GRADUATION': 'bg-blue-100 text-blue-800',
    'MILITARY_SERVICE': 'bg-gray-100 text-gray-800',
    'AWARD': 'bg-yellow-100 text-yellow-800',
    'IMMIGRATION': 'bg-teal-100 text-teal-800',
    'RETIREMENT': 'bg-orange-100 text-orange-800',
    'OTHER': 'bg-purple-100 text-purple-800'
};

const EventsPage: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchEvents = useCallback(async () => {
        try {
            const url = filterType ? `/events/?event_type=${filterType}` : '/events/';
            const response = await client.get(url);
            setEvents(response.data);
        } catch (error) {
            console.error('Failed to fetch events', error);
        } finally {
            setLoading(false);
        }
    }, [filterType]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleCreateEvent = async (eventData: Partial<Event>) => {
        try {
            await client.post('/events/', eventData);
            setShowCreateModal(false);
            fetchEvents();
        } catch (error) {
            console.error('Failed to create event', error);
            alert('Failed to create event');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64">Loading events...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Link to="/" className="text-gray-600 hover:text-gray-900">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Events</h1>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                    <Plus size={20} />
                    Add Event
                </button>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-4 mb-6">
                <Filter size={20} className="text-gray-500" />
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2"
                >
                    <option value="">All Types</option>
                    {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            {/* Events Grid */}
            {events.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                    No events found. Create your first event!
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.map((event) => (
                        <EventCard key={event.id} event={event} onUpdate={fetchEvents} />
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateEventModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateEvent}
                />
            )}
        </div>
    );
};

// Event Card Component
const EventCard: React.FC<{ event: Event; onUpdate: () => void }> = ({ event, onUpdate }) => {
    const [expanded, setExpanded] = useState(false);
    const [participants, setParticipants] = useState<{ id: number; name: string; role: string | null }[]>([]);

    const fetchParticipants = async () => {
        try {
            const response = await client.get(`/events/${event.id}`);
            setParticipants(response.data.participants || []);
        } catch (error) {
            console.error('Failed to fetch participants', error);
        }
    };

    useEffect(() => {
        if (expanded) {
            fetchParticipants();
        }
    }, [expanded, event.id]);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this event?')) return;
        try {
            await client.delete(`/events/${event.id}`);
            onUpdate();
        } catch (error) {
            console.error('Failed to delete event', error);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${EVENT_TYPE_COLORS[event.type] || 'bg-gray-100'}`}>
                    {EVENT_TYPE_LABELS[event.type] || event.type}
                </span>
                <button
                    onClick={handleDelete}
                    className="text-red-500 hover:text-red-700 text-sm"
                >
                    Delete
                </button>
            </div>

            {event.event_date && (
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                    <Calendar size={14} />
                    <span>{event.event_date}</span>
                </div>
            )}

            {event.location && (
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                    <MapPin size={14} />
                    <span>{event.location}</span>
                </div>
            )}

            {event.description && (
                <p className="text-gray-700 text-sm mb-3">{event.description}</p>
            )}

            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-indigo-600 text-sm hover:underline"
            >
                <Users size={14} />
                {expanded ? 'Hide Participants' : 'Show Participants'}
            </button>

            {expanded && (
                <div className="mt-3 border-t pt-3">
                    {participants.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">No participants linked</p>
                    ) : (
                        <ul className="space-y-1">
                            {participants.map((p) => (
                                <li key={p.id} className="text-sm">
                                    <Link to={`/people/${p.id}`} className="text-indigo-600 hover:underline">
                                        {p.name}
                                    </Link>
                                    {p.role && <span className="text-gray-500 ml-1">({p.role})</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

// Create Event Modal
const CreateEventModal: React.FC<{
    onClose: () => void;
    onCreate: (data: Partial<Event>) => void;
}> = ({ onClose, onCreate }) => {
    const [formData, setFormData] = useState({
        type: 'OTHER',
        event_date: '',
        description: '',
        location: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4">Create New Event</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                            {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            type="text"
                            placeholder="YYYY or YYYY-MM-DD"
                            value={formData.event_date}
                            onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input
                            type="text"
                            placeholder="City, State or Address"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            placeholder="Event details..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
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
                            Create Event
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventsPage;
