# Graph Family Tree

1. Overview & Objectives

Purpose: Build a family tree web application for casual genealogists and family members that allows rich data capture, interactive visualization, media attachment, and multi-user collaboration.

Goals:

Capture detailed personal, familial, and biographical information.

Support multiple marriages, adoptions, and step-siblings.

Enable multimedia (photos, videos, documents) association with people and events.

Allow flexible querying and reporting of relationships, occupations, events, and residences.

Provide secure, role-based access with versioning and audit trails.

Support export/import of family trees in standard genealogy formats.

2. User Personas

Admin:

Full control over a specific family tree.

Can manage users, RBAC roles, and edit all nodes/relationships.

Editor:

Can add/edit people, events, media, residences, occupations, and organizations.

Cannot manage user roles.

Viewer:

Read-only access to a tree.

Can view media, events, and biographical details.

Roles are defined per family tree, not globally.

3. Core Features

3.1 People & Relationships

Nodes for each Person with properties: name, birth_date, death_date, bio, media references, education, occupations, military service, awards.

Relationships: PARENT_OF, MARRIED_TO, SIBLING_OF, ADOPTED_BY, STEP_SIBLING_OF.

Support multiple marriages, adoptions, step-siblings.

3.2 Events

Predefined types: Birth, Marriage, Graduation, Military Service, Award, Other (custom).

Properties: event_type, date, location, participants, description, media.

Relationships: PARTICIPATED_IN (Person → Event).

3.3 Media

Multiple media items per person or event.

Metadata: file type, size, resolution, EXIF data, captions.

Stored as references (e.g., URL, local path).

Support photos, videos, documents.

3.4 Places & Residences

Place nodes with properties: street, city, state, country, geo_coordinates, start_date, end_date.

Relationships: LIVED_AT (Person → Place).

Support multiple residences over time.

3.5 Occupations & Organizations

Structured fields: title, organization, start_date, end_date, location.

Free-text description for each occupation.

Organization nodes allow multiple roles per person with overlapping or sequential durations.

3.6 Queries & Reporting

Nice-to-have complex queries: ancestors/descendants by location or occupation, multi-criteria filtering (relationship + location + event type + occupation).

Export options: GEDCOM, JSON, CSV, PDF (optionally including media references).

4. Technical Architecture

4.1 Database

Graph database (preference for Neo4j) for flexible relationship traversal.

Nodes: Person, Place, Event, Occupation, Organization, Media, Document.

Edges: PARENT_OF, MARRIED_TO, SIBLING_OF, ADOPTED_BY, STEP_SIBLING_OF, PARTICIPATED_IN, LIVED_AT, WORKED_AS, AFFILIATED_WITH, HAS_MEDIA.

4.2 Backend

Web API layer for CRUD operations, search, export/import.

RBAC enforcement per tree.

Versioning and audit trail per tree.

4.3 Frontend

Web-first UI with mobile-first responsive design.

Interactive family tree visualization with pan/zoom and drag-and-drop.

Media gallery and event timeline views.

4.4 Security

Encryption at rest and in transit.

Tree-level RBAC.

Reversible edits with version history.

4.5 Concurrency

Low concurrency per tree (single-digit users).

Edit conflicts resolved via final arbiter or last-write-wins policy.

5. Integration

Optional future support for external genealogy sources (to be prioritized later).

Initial support for file imports (GEDCOM, CSV).

6. Non-functional Requirements

Expected scale: thousands of people per tree, low media volume.

Performance: fast tree traversal and rendering.

Backup and restore support.

Exportable in multiple formats.

7. MVP Scope

Core family tree CRUD operations.

Media uploads with basic metadata.

Predefined events, residences, occupations.

Tree-level RBAC (Admin, Editor, Viewer).

Interactive visualization.

Version history and reversible edits.

Export to GEDCOM/JSON/PDF/CSV.
