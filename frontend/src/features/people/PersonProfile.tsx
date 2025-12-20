
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, Heart, ArrowUp, ArrowDown, Plus, Edit, Trash2, Users, Calendar, MapPin, Image, Upload } from 'lucide-react';
import client from '../../api/client';
import PersonFormModal from './PersonFormModal';
import RelationshipEditModal from './RelationshipEditModal';

interface Person {
    id: number;
    name: string;
    gender?: string;
    birth_date?: string;
    birth_place?: string;
    death_date?: string;
    death_place?: string;
    bio?: string;
    start_date?: string;
    end_date?: string;
    relationship_type?: 'biological' | 'adopted';
    adoption_date?: string;
    maiden_name?: string;
}

interface Relationships {
    parents: Person[];
    children: Person[];
    spouses: Person[];
    siblings: Person[];
}

interface PersonEvent {
    id: number;
    type: string;
    event_date: string | null;
    description: string | null;
    location: string | null;
    role: string | null;
}

interface NewPersonData {
    name: string;
    gender: string;
    birth_date: string;
    birth_place: string;
    death_date: string;
    death_place: string;
    bio: string;
    maidenName?: string;
    startDate?: string;
    endDate?: string;
    relationshipSubtype?: 'biological' | 'adopted';
    adoptionDate?: string;
}

const PersonProfile: React.FC = () => {
    const { personId } = useParams<{ personId: string }>();
    const navigate = useNavigate();
    const [person, setPerson] = useState<Person | null>(null);
    const [relationships, setRelationships] = useState<Relationships>({ parents: [], children: [], spouses: [], siblings: [] });
    const [events, setEvents] = useState<PersonEvent[]>([]);
    const [residences, setResidences] = useState<{
        id: number;
        name: string;
        city: string | null;
        state: string | null;
        country: string | null;
        start_date: string | null;
        end_date: string | null;
        residence_type: string | null;
    }[]>([]);
    const [media, setMedia] = useState<{
        id: number;
        filename: string;
        file_type: string;
        caption: string | null;
    }[]>([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'PARENT' | 'CHILD' | 'SPOUSE' | 'EDIT_SELF' | null>(null);

    // Relationship Edit State
    const [editRelModalOpen, setEditRelModalOpen] = useState(false);
    const [editRelData, setEditRelData] = useState<{ type: 'SPOUSE' | 'PARENT' | 'CHILD', id: number, data: any } | null>(null);

    const fetchData = React.useCallback(async () => {
        if (!personId) return;
        setLoading(true);
        try {
            const personRes = await client.get(`/people/${personId}`);
            setPerson(personRes.data);

            const relRes = await client.get(`/people/${personId}/relationships`);
            setRelationships(relRes.data);

            // Fetch events for this person
            const eventsRes = await client.get(`/events/person/${personId}`);
            setEvents(eventsRes.data);

            // Fetch residences for this person
            const residencesRes = await client.get(`/places/person/${personId}`);
            setResidences(residencesRes.data);

            // Fetch media for this person
            const mediaRes = await client.get(`/media/person/${personId}`);
            setMedia(mediaRes.data);
        } catch (error) {
            console.error("Failed to load profile", error);
        } finally {
            setLoading(false);
        }
    }, [personId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddClick = (type: 'PARENT' | 'CHILD' | 'SPOUSE') => {
        setModalType(type);
        setIsModalOpen(true);
    };

    const handleCreateRelative = async (data: NewPersonData) => {
        if (!person) return;

        // 1. Create the new person
        // Clean up empty strings to be undefined/null to implicit Pydantic handling
        // Convert dates: Input date is YYYY-MM-DD, backend expects same.
        const payload = {
            ...data,
            birth_date: data.birth_date === '' ? null : data.birth_date,
            death_date: data.death_date === '' ? null : data.death_date,
            birth_place: data.birth_place === '' ? null : data.birth_place,
            death_place: data.death_place === '' ? null : data.death_place,
            gender: data.gender === '' ? null : data.gender,
            bio: data.bio === '' ? null : data.bio,
            maiden_name: data.maidenName === '' ? null : data.maidenName
        };

        try {
            const createRes = await client.post('/people/', payload);
            const newPersonId = createRes.data.id;

            // 2. Link them based on modalType
            if (modalType === 'PARENT') {
                // New Person (parent) -> PARENT_OF -> Current Person (child)
                await client.post(`/relationships/parent`, {
                    parent_id: newPersonId,
                    child_id: person.id,
                    relationship_type: data.relationshipSubtype,
                    adoption_date: data.adoptionDate
                });
            } else if (modalType === 'CHILD') {
                // Current Person (parent) -> PARENT_OF -> New Person (child)
                await client.post(`/relationships/parent`, {
                    parent_id: person.id,
                    child_id: newPersonId,
                    relationship_type: data.relationshipSubtype,
                    adoption_date: data.adoptionDate
                });
            } else if (modalType === 'SPOUSE') {
                await client.post(`/relationships/spouse`, {
                    spouse1_id: person.id,
                    spouse2_id: newPersonId,
                    start_date: data.startDate || null,
                    end_date: data.endDate || null
                });
            }

            // 3. Refresh
            fetchData();

        } catch (err) {
            console.error("Failed to create relative", err);
            alert("Person created, but failed to link relationship.");
        }
    };

    // Edit Handler
    const handleEditPerson = async (data: NewPersonData) => {
        if (!person) return;
        const payload = {
            ...data,
            birth_date: data.birth_date === '' ? null : data.birth_date,
            death_date: data.death_date === '' ? null : data.death_date,
            birth_place: data.birth_place === '' ? null : data.birth_place,
            death_place: data.death_place === '' ? null : data.death_place,
            gender: data.gender === '' ? null : data.gender,
            bio: data.bio === '' ? null : data.bio,
            maiden_name: data.maidenName === '' ? null : data.maidenName
        };

        try {
            await client.put(`/people/${person.id}`, payload);
            fetchData();
        } catch (err) {
            console.error("Failed to update person", err);
            alert("Failed to update person.");
        }
    }

    const handleLinkRelative = async (newPersonId: number, data?: NewPersonData) => {
        if (!person) return;

        try {
            if (modalType === 'PARENT') {
                // Selected Person (newPersonId) -> PARENT_OF -> Current Person (person.id)
                await client.post(`/relationships/parent`, {
                    parent_id: newPersonId,
                    child_id: person.id,
                    relationship_type: data?.relationshipSubtype,
                    adoption_date: data?.adoptionDate
                });
            } else if (modalType === 'CHILD') {
                // Current Person (person.id) -> PARENT_OF -> Selected Person (newPersonId)
                await client.post(`/relationships/parent`, {
                    parent_id: person.id,
                    child_id: newPersonId,
                    relationship_type: data?.relationshipSubtype,
                    adoption_date: data?.adoptionDate
                });
            } else if (modalType === 'SPOUSE') {
                await client.post(`/relationships/spouse`, {
                    spouse1_id: person.id,
                    spouse2_id: newPersonId,
                    start_date: data?.startDate || null,
                    end_date: data?.endDate || null
                });
            }
            fetchData();
        } catch (err) {
            console.error("Failed to link relative", err);
            alert("Failed to link relative.");
        }
    };

    // Delete Person
    const handleDeletePerson = async () => {
        if (!person) return;
        if (!window.confirm("Are you sure you want to delete this person? This action cannot be undone.")) return;

        try {
            await client.delete(`/people/${person.id}`);
            navigate('/');
        } catch (error) {
            console.error("Failed to delete person", error);
            alert("Failed to delete person.");
        }
    };

    // Remove Relative
    const handleRemoveRelative = async (type: 'PARENT' | 'CHILD' | 'SPOUSE', relativeId: number) => {
        if (!person) return;
        if (!window.confirm("Are you sure you want to unlink this relative?")) return;

        try {
            if (type === 'PARENT') {
                // Remove PARENT_OF: relative -> person
                await client.delete(`/relationships/parent`, {
                    data: { parent_id: relativeId, child_id: person.id }
                });
            } else if (type === 'CHILD') {
                // Remove PARENT_OF: person -> relative
                await client.delete(`/relationships/parent`, {
                    data: { parent_id: person.id, child_id: relativeId }
                });
            } else if (type === 'SPOUSE') {
                // Remove MARRIED_TO
                await client.delete(`/relationships/spouse`, {
                    data: { spouse1_id: person.id, spouse2_id: relativeId }
                });
            }
            fetchData();
        } catch (error) {
            console.error("Failed to remove relative", error);
            alert("Failed to unlink relative.");
        }
    };

    const handleOpenEditRel = (type: 'SPOUSE' | 'PARENT' | 'CHILD', relative: Person) => {
        setEditRelData({
            type,
            id: relative.id,
            data: {
                startDate: relative.start_date,
                endDate: relative.end_date,
                adoptionDate: relative.adoption_date,
                relationshipType: relative.relationship_type
            }
        });
        setEditRelModalOpen(true);
    };

    const handleUpdateRelationship = async (data: any) => {
        if (!person || !editRelData) return;

        try {
            if (editRelData.type === 'SPOUSE') {
                await client.put('/relationships/spouse', {
                    spouse1_id: person.id,
                    spouse2_id: editRelData.id,
                    start_date: data.startDate,
                    end_date: data.endDate
                });
            } else if (editRelData.type === 'PARENT' || editRelData.type === 'CHILD') {
                // Determine parent/child direction
                // If type is PARENT, relative is Parent, Person is Child
                // If type is CHILD, Person is Parent, relative is Child
                const parentId = editRelData.type === 'PARENT' ? editRelData.id : person.id;
                const childId = editRelData.type === 'PARENT' ? person.id : editRelData.id;

                await client.put('/relationships/parent', {
                    parent_id: parentId,
                    child_id: childId,
                    relationship_type: data.relationshipType, // Use value from form
                    adoption_date: data.adoptionDate
                });
            }
            fetchData();
        } catch (error) {
            console.error("Failed to update relationship", error);
            alert("Failed to update relationship details.");
        }
    };

    if (loading) return <div className="p-8">Loading profile...</div>;
    if (!person) return <div className="p-8">Person not found.</div>;

    // Helper for initial data for edit
    const personInitialData: NewPersonData = {
        name: person.name,
        gender: person.gender || '',
        birth_date: person.birth_date || '',
        birth_place: person.birth_place || '',
        death_date: person.death_date || '',
        death_place: person.death_place || '',
        bio: person.bio || '',
        maidenName: person.maiden_name || ''
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <button onClick={() => navigate('/tree')} className="mb-4 text-blue-600 hover:underline">
                &larr; Back to Tree
            </button>

            {/* Bio Card */}
            <div className="bg-white rounded-xl shadow-md p-8 mb-8 flex flex-col md:flex-row gap-8 relative group">
                <div className="absolute top-4 right-4 flex gap-2">
                    <button
                        onClick={() => { setModalType('EDIT_SELF'); setIsModalOpen(true); }}
                        className="text-gray-400 hover:text-indigo-600"
                        title="Edit Person"
                    >
                        <Edit size={20} />
                    </button>
                    <button
                        onClick={handleDeletePerson}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete Person"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
                <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 shrink-0">
                    <User size={64} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {person.name}
                        {person.maiden_name && <span className="text-xl font-normal text-gray-500 ml-2">(née {person.maiden_name})</span>}
                    </h1>
                    <div className="text-gray-500 mb-4 flex flex-col gap-2">
                        {person.gender && <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm w-fit">{person.gender}</span>}
                        <div className="flex flex-col gap-1 mt-2">
                            {(person.birth_date || person.birth_place) && (
                                <span>
                                    <strong>Born:</strong> {person.birth_date}
                                    {person.birth_place && <span className="text-gray-400"> in {person.birth_place}</span>}
                                </span>
                            )}
                            {(person.death_date || person.death_place) && (
                                <span>
                                    <strong>Died:</strong> {person.death_date}
                                    {person.death_place && <span className="text-gray-400"> in {person.death_place}</span>}
                                </span>
                            )}
                        </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed mt-4">{person.bio || "No biography available."}</p>
                </div>
            </div>

            {/* Relationships Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Parents */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold flex items-center text-gray-800">
                            <ArrowUp className="w-5 h-5 mr-2 text-blue-500" /> Parents
                        </h2>
                        <button
                            onClick={() => handleAddClick('PARENT')}
                            className="p-1 text-blue-500 hover:bg-blue-50 rounded-full"
                            title="Add Parent"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    {relationships.parents.length === 0 ? <p className="text-gray-400 italic">Unknown</p> : (
                        <ul className="space-y-2">
                            {relationships.parents.map(p => (
                                <li key={p.id} className="flex justify-between items-center group">
                                    <div>
                                        <Link to={`/people/${p.id}`} className="text-indigo-600 hover:underline">{p.name}</Link>
                                        {p.relationship_type === 'adopted' && (
                                            <span className="text-xs text-amber-600 ml-2 bg-amber-50 px-1 rounded">
                                                (Adopted{p.adoption_date ? ` ${p.adoption_date}` : ''})
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenEditRel('PARENT', p)}
                                            className="text-gray-300 hover:text-indigo-600"
                                            title="Edit Relationship"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleRemoveRelative('PARENT', p.id)}
                                            className="text-gray-300 hover:text-red-500"
                                            title="Unlink Parent"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Spouses */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold flex items-center text-gray-800">
                            <Heart className="w-5 h-5 mr-2 text-pink-500" /> Spouses
                        </h2>
                        <button
                            onClick={() => handleAddClick('SPOUSE')}
                            className="p-1 text-pink-500 hover:bg-pink-50 rounded-full"
                            title="Add Spouse"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    {relationships.spouses.length === 0 ? <p className="text-gray-400 italic">None</p> : (
                        <ul className="space-y-2">
                            {relationships.spouses.map(p => (
                                <li key={p.id} className="flex justify-between items-center group">
                                    <div>
                                        <Link to={`/people/${p.id}`} className="text-indigo-600 hover:underline">{p.name}</Link>
                                        {(p.start_date || p.end_date) && (
                                            <span className="text-xs text-gray-500 ml-2">
                                                (m. {p.start_date || '?'}{p.end_date ? ` - ${p.end_date}` : ''})
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenEditRel('SPOUSE', p)}
                                            className="text-gray-300 hover:text-indigo-600"
                                            title="Edit Relationship"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleRemoveRelative('SPOUSE', p.id)}
                                            className="text-gray-300 hover:text-red-500"
                                            title="Unlink Spouse"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Siblings */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold flex items-center text-gray-800">
                            <Users className="w-5 h-5 mr-2 text-violet-500" /> Siblings
                        </h2>
                    </div>
                    {relationships.siblings.length === 0 ? <p className="text-gray-400 italic">None</p> : (
                        <ul className="space-y-2">
                            {relationships.siblings.map(p => (
                                <li key={p.id} className="flex justify-between items-center group">
                                    <Link to={`/people/${p.id}`} className="text-indigo-600 hover:underline">{p.name}</Link>
                                    {/* Siblings are inferred, no direct link to remove here easily unless we remove parent link? 
                                        Let's keep it read-only for now as per requirement 'Inferring'. 
                                    */}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Children */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold flex items-center text-gray-800">
                            <ArrowDown className="w-5 h-5 mr-2 text-green-500" /> Children
                        </h2>
                        <button
                            onClick={() => handleAddClick('CHILD')}
                            className="p-1 text-green-500 hover:bg-green-50 rounded-full"
                            title="Add Child"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    {relationships.children.length === 0 ? <p className="text-gray-400 italic">None</p> : (
                        <ul className="space-y-2">
                            {relationships.children.map(p => (
                                <li key={p.id} className="flex justify-between items-center group">
                                    <div>
                                        <Link to={`/people/${p.id}`} className="text-indigo-600 hover:underline">{p.name}</Link>
                                        {p.relationship_type === 'adopted' && (
                                            <span className="text-xs text-amber-600 ml-2 bg-amber-50 px-1 rounded">
                                                (Adopted{p.adoption_date ? ` ${p.adoption_date}` : ''})
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenEditRel('CHILD', p)}
                                            className="text-gray-300 hover:text-indigo-600"
                                            title="Edit Relationship"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleRemoveRelative('CHILD', p.id)}
                                            className="text-gray-300 hover:text-red-500"
                                            title="Unlink Child"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

            </div>

            {/* Events Section */}
            <div className="mt-8 bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center text-gray-800">
                        <Calendar className="w-5 h-5 mr-2 text-purple-500" />
                        Life Events
                    </h2>
                    <Link
                        to="/events"
                        className="text-indigo-600 hover:underline text-sm"
                    >
                        View All Events →
                    </Link>
                </div>

                {events.length === 0 ? (
                    <p className="text-gray-400 italic">No events linked to this person.</p>
                ) : (
                    <div className="space-y-3">
                        {events.map((evt) => (
                            <div key={evt.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="w-2 h-2 mt-2 rounded-full bg-purple-400"></div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-800">
                                            {evt.type.replace('_', ' ')}
                                        </span>
                                        {evt.role && (
                                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                                                {evt.role}
                                            </span>
                                        )}
                                    </div>
                                    {evt.event_date && (
                                        <p className="text-sm text-gray-500">{evt.event_date}</p>
                                    )}
                                    {evt.location && (
                                        <p className="text-sm text-gray-500 flex items-center gap-1">
                                            <MapPin size={12} /> {evt.location}
                                        </p>
                                    )}
                                    {evt.description && (
                                        <p className="text-sm text-gray-600 mt-1">{evt.description}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Residences Section */}
            <div className="mt-8 bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center text-gray-800">
                        <MapPin className="w-5 h-5 mr-2 text-green-500" />
                        Residences
                    </h2>
                    <Link
                        to="/places"
                        className="text-indigo-600 hover:underline text-sm"
                    >
                        Manage Places →
                    </Link>
                </div>

                {residences.length === 0 ? (
                    <p className="text-gray-400 italic">No residences linked to this person.</p>
                ) : (
                    <div className="space-y-3">
                        {residences.map((res, idx) => (
                            <div key={`${res.id}-${idx}`} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="w-2 h-2 mt-2 rounded-full bg-green-400"></div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-800">{res.name}</span>
                                        {res.residence_type && (
                                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                                                {res.residence_type}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        {[res.city, res.state, res.country].filter(Boolean).join(', ') || 'No location details'}
                                    </p>
                                    {(res.start_date || res.end_date) && (
                                        <p className="text-sm text-gray-400">
                                            {res.start_date || '?'} — {res.end_date || 'present'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Photos & Documents Section */}
            <div className="mt-8 bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center text-gray-800">
                        <Image className="w-5 h-5 mr-2 text-blue-500" />
                        Photos & Documents
                    </h2>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm"
                    >
                        <Upload size={16} />
                        Upload
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*,application/pdf,.doc,.docx"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !personId) return;

                            const formData = new FormData();
                            formData.append('file', file);

                            try {
                                // Upload the file
                                const uploadRes = await client.post('/media/upload', formData, {
                                    headers: { 'Content-Type': 'multipart/form-data' }
                                });
                                const mediaId = uploadRes.data.id;

                                // Link to this person
                                await client.post(`/media/${mediaId}/link/person/${personId}`);

                                // Refresh
                                fetchData();
                            } catch (error) {
                                console.error('Upload failed', error);
                                alert('Failed to upload file');
                            }

                            // Clear input
                            e.target.value = '';
                        }}
                    />
                </div>

                {media.length === 0 ? (
                    <p className="text-gray-400 italic">No photos or documents linked to this person.</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {media.map((m) => (
                            <div key={m.id} className="relative group">
                                {m.file_type === 'image' ? (
                                    <img
                                        src={`http://localhost:8000/media/${m.id}/file`}
                                        alt={m.caption || m.filename}
                                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                                    />
                                ) : (
                                    <div className="w-full h-24 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                        <span className="text-xs text-gray-500 text-center px-2">
                                            {m.filename}
                                        </span>
                                    </div>
                                )}
                                <p className="text-xs text-gray-500 mt-1 truncate">{m.caption || m.filename}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <PersonFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={modalType === 'EDIT_SELF' ? handleEditPerson : handleCreateRelative}
                onLink={handleLinkRelative}
                initialData={modalType === 'EDIT_SELF' ? personInitialData : undefined}
                allowLinking={modalType !== 'EDIT_SELF'}
                relationshipType={
                    modalType === 'PARENT' ? 'PARENT' :
                        modalType === 'SPOUSE' ? 'SPOUSE' :
                            modalType === 'CHILD' ? 'CHILD' : undefined
                }
                title={
                    modalType === 'PARENT' ? 'Add Parent' :
                        modalType === 'SPOUSE' ? 'Add Spouse' :
                            modalType === 'CHILD' ? 'Add Child' :
                                modalType === 'EDIT_SELF' ? 'Edit Person' : 'Add Relative'
                }
            />

            {editRelData && (
                <RelationshipEditModal
                    isOpen={editRelModalOpen}
                    onClose={() => setEditRelModalOpen(false)}
                    onSubmit={handleUpdateRelationship}
                    title="Edit Relationship Details"
                    type={editRelData.type}
                    initialData={editRelData.data}
                />
            )}
        </div>
    );
};

export default PersonProfile;
