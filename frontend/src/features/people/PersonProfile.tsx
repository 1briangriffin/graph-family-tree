
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, Heart, ArrowUp, ArrowDown, Plus, Edit, Trash2, Users } from 'lucide-react';
import client from '../../api/client';
import PersonFormModal from './PersonFormModal';

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
}

interface Relationships {
    parents: Person[];
    children: Person[];
    spouses: Person[];
    siblings: Person[];
}

interface NewPersonData {
    name: string;
    gender: string;
    birth_date: string;
    birth_place: string;
    death_date: string;
    death_place: string;
    bio: string;
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
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'PARENT' | 'CHILD' | 'SPOUSE' | 'EDIT_SELF' | null>(null);

    const fetchData = React.useCallback(async () => {
        if (!personId) return;
        setLoading(true);
        try {
            const personRes = await client.get(`/people/${personId}`);
            setPerson(personRes.data);

            const relRes = await client.get(`/people/${personId}/relationships`);
            setRelationships(relRes.data);
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
            bio: data.bio === '' ? null : data.bio
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
            bio: data.bio === '' ? null : data.bio
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
        bio: person.bio || ''
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <button onClick={() => navigate('/')} className="mb-4 text-blue-600 hover:underline">
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{person.name}</h1>
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
                                    <button
                                        onClick={() => handleRemoveRelative('PARENT', p.id)}
                                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Unlink Parent"
                                    >
                                        <Trash2 size={16} />
                                    </button>
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
                                    <button
                                        onClick={() => handleRemoveRelative('SPOUSE', p.id)}
                                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Unlink Spouse"
                                    >
                                        <Trash2 size={16} />
                                    </button>
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
                                    <button
                                        onClick={() => handleRemoveRelative('CHILD', p.id)}
                                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Unlink Child"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

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
        </div>
    );
};

export default PersonProfile;
