"""
Kennedy Family Test Data Seeder

This script populates the family tree database with Kennedy family data to test:
- People with birth/death dates
- Marriages (including divorces and remarriages)
- Parent-child relationships (biological)
- Occupations
- Events
- Places

Data source: Wikipedia and public records
"""

import requests
from datetime import date

BASE_URL = "http://localhost:8000"

# Store created IDs for relationship linking
people_ids = {}
place_ids = {}
org_ids = {}
event_ids = {}

def create_person(name, **kwargs):
    """Create a person and store their ID."""
    data = {"name": name, **kwargs}
    response = requests.post(f"{BASE_URL}/people", json=data)
    if response.status_code == 201:
        person = response.json()
        people_ids[name] = person["id"]
        print(f"✓ Created person: {name} (ID: {person['id']})")
        return person
    else:
        print(f"✗ Failed to create {name}: {response.text}")
        return None

def create_place(name, **kwargs):
    """Create a place and store its ID."""
    data = {"name": name, **kwargs}
    response = requests.post(f"{BASE_URL}/places", json=data)
    if response.status_code == 201:
        place = response.json()
        place_ids[name] = place["id"]
        print(f"✓ Created place: {name} (ID: {place['id']})")
        return place
    else:
        print(f"✗ Failed to create place {name}: {response.text}")
        return None

def create_organization(name, **kwargs):
    """Create an organization and store its ID."""
    data = {"name": name, **kwargs}
    response = requests.post(f"{BASE_URL}/organizations", json=data)
    if response.status_code == 201:
        org = response.json()
        org_ids[name] = org["id"]
        print(f"✓ Created organization: {name} (ID: {org['id']})")
        return org
    else:
        print(f"✗ Failed to create organization {name}: {response.text}")
        return None

def create_occupation(person_name, title, org_name=None, **kwargs):
    """Create an occupation for a person."""
    data = {
        "person_id": people_ids[person_name],
        "title": title,
        **kwargs
    }
    if org_name and org_name in org_ids:
        data["organization_id"] = org_ids[org_name]
    
    response = requests.post(f"{BASE_URL}/occupations", json=data)
    if response.status_code == 201:
        print(f"✓ Created occupation: {person_name} as {title}")
        return response.json()
    else:
        print(f"✗ Failed to create occupation for {person_name}: {response.text}")
        return None

def create_event(event_type, description, event_date=None, location=None, participant_names=None):
    """Create an event and link participants."""
    data = {
        "type": event_type,
        "description": description,
        "event_date": event_date,
        "location": location
    }
    if participant_names:
        data["participant_ids"] = [people_ids[name] for name in participant_names if name in people_ids]
    
    response = requests.post(f"{BASE_URL}/events", json=data)
    if response.status_code == 201:
        event = response.json()
        event_ids[description] = event["id"]
        print(f"✓ Created event: {description}")
        return event
    else:
        print(f"✗ Failed to create event {description}: {response.text}")
        return None

def add_parent_child(parent_name, child_name, relationship_type="biological"):
    """Create a parent-child relationship."""
    data = {
        "parent_id": people_ids[parent_name],
        "child_id": people_ids[child_name],
        "relationship_type": relationship_type
    }
    response = requests.post(f"{BASE_URL}/relationships/parent", json=data)
    if response.status_code == 201:
        print(f"✓ Added parent relationship: {parent_name} → {child_name}")
        return True
    else:
        print(f"✗ Failed to add parent {parent_name} → {child_name}: {response.text}")
        return False

def add_marriage(spouse1_name, spouse2_name, start_date=None, end_date=None, end_reason=None):
    """Create a spouse relationship (marriage).
    
    end_reason can be: 'divorce', 'death', 'annulment', or None for ongoing marriages.
    """
    data = {
        "spouse1_id": people_ids[spouse1_name],
        "spouse2_id": people_ids[spouse2_name],
        "start_date": start_date,
        "end_date": end_date,
        "end_reason": end_reason
    }
    response = requests.post(f"{BASE_URL}/relationships/spouse", json=data)
    if response.status_code in [200, 201]:
        if end_reason:
            status = f"ended by {end_reason}"
        elif end_date:
            status = "ended"
        else:
            status = "married"
        print(f"✓ Added marriage: {spouse1_name} & {spouse2_name} ({status})")
        return True
    else:
        print(f"✗ Failed to add marriage {spouse1_name} & {spouse2_name}: {response.text}")
        return False

def link_residence(person_name, place_name, start_date=None, end_date=None, residence_type="primary"):
    """Link a person to a place of residence."""
    data = {
        "person_id": people_ids[person_name],
        "start_date": start_date,
        "end_date": end_date,
        "residence_type": residence_type
    }
    response = requests.post(f"{BASE_URL}/places/{place_ids[place_name]}/residents", json=data)
    if response.status_code in [200, 201]:
        print(f"✓ Linked residence: {person_name} lived at {place_name}")
        return True
    else:
        print(f"✗ Failed to link residence {person_name} → {place_name}: {response.text}")
        return False


def seed_data():
    print("=" * 60)
    print("SEEDING KENNEDY FAMILY DATA")
    print("=" * 60)
    
    # =========================================================================
    # ORGANIZATIONS
    # =========================================================================
    print("\n--- Creating Organizations ---")
    
    create_organization("United States Government", type="government", location="Washington, D.C., USA")
    create_organization("United States Senate", type="government", location="Washington, D.C., USA")
    create_organization("United States House of Representatives", type="government", location="Washington, D.C., USA")
    create_organization("Securities and Exchange Commission", type="government", location="Washington, D.C., USA")
    create_organization("Peace Corps", type="government", location="Washington, D.C., USA")
    create_organization("Special Olympics", type="non-profit", location="Washington, D.C., USA")
    create_organization("Harvard University", type="school", location="Cambridge, Massachusetts, USA")
    create_organization("United States Navy", type="military", location="USA")
    
    # =========================================================================
    # PLACES
    # =========================================================================
    print("\n--- Creating Places ---")
    
    create_place("Kennedy Compound", 
                 street="50 Marchant Avenue", 
                 city="Hyannis Port", 
                 state="Massachusetts", 
                 country="USA",
                 geo_lat=41.6295,
                 geo_lng=-70.3016)
    
    create_place("The White House",
                 street="1600 Pennsylvania Avenue NW",
                 city="Washington",
                 state="D.C.",
                 country="USA",
                 geo_lat=38.8977,
                 geo_lng=-77.0365)
    
    create_place("Brookline Birthplace",
                 street="83 Beals Street",
                 city="Brookline",
                 state="Massachusetts",
                 country="USA")
    
    # =========================================================================
    # PEOPLE - Generation 1 (Grandparents)
    # =========================================================================
    print("\n--- Creating People (Generation 1 - Grandparents) ---")
    
    create_person("Patrick Joseph Kennedy",
                  gender="male",
                  birth_date="1858-01-14",
                  birth_place="Boston, Massachusetts, USA",
                  death_date="1929-05-18",
                  death_place="Boston, Massachusetts, USA",
                  bio="Irish-American businessman and politician. Massachusetts state legislator and political boss.")
    
    create_person("Mary Augusta Hickey",
                  gender="female",
                  birth_date="1857-12-06",
                  birth_place="Boston, Massachusetts, USA",
                  death_date="1923-05-20",
                  death_place="Boston, Massachusetts, USA",
                  maiden_name="Hickey",
                  bio="Wife of Patrick Joseph Kennedy.")
    
    create_person("John Francis Fitzgerald",
                  gender="male",
                  birth_date="1863-02-11",
                  birth_place="Boston, Massachusetts, USA",
                  death_date="1950-10-02",
                  death_place="Boston, Massachusetts, USA",
                  bio="American politician, Mayor of Boston. Known as 'Honey Fitz'.")
    
    create_person("Mary Josephine Hannon",
                  gender="female",
                  birth_date="1865-10-31",
                  birth_place="Acton, Massachusetts, USA",
                  death_date="1964-08-08",
                  death_place="Boston, Massachusetts, USA",
                  maiden_name="Hannon",
                  bio="Wife of John Francis Fitzgerald, grandmother of President John F. Kennedy.")
    
    # =========================================================================
    # PEOPLE - Generation 2 (Parents)
    # =========================================================================
    print("\n--- Creating People (Generation 2 - Parents) ---")
    
    create_person("Joseph Patrick Kennedy Sr.",
                  gender="male",
                  birth_date="1888-09-06",
                  birth_place="Boston, Massachusetts, USA",
                  death_date="1969-11-18",
                  death_place="Hyannis Port, Massachusetts, USA",
                  bio="American businessman, investor, and politician. First chairman of SEC. US Ambassador to UK. Patriarch of the Kennedy family.")
    
    create_person("Rose Elizabeth Fitzgerald",
                  gender="female",
                  birth_date="1890-07-22",
                  birth_place="Boston, Massachusetts, USA",
                  death_date="1995-01-22",
                  death_place="Hyannis Port, Massachusetts, USA",
                  maiden_name="Fitzgerald",
                  bio="American philanthropist and socialite. Matriarch of the Kennedy family. Lived to 104 years old.")
    
    # =========================================================================
    # PEOPLE - Generation 3 (The Kennedy Children)
    # =========================================================================
    print("\n--- Creating People (Generation 3 - Kennedy Children) ---")
    
    create_person("Joseph Patrick Kennedy Jr.",
                  gender="male",
                  birth_date="1915-07-25",
                  birth_place="Brookline, Massachusetts, USA",
                  death_date="1944-08-12",
                  death_place="English Channel",
                  bio="US Navy lieutenant and aviator. Killed in action during WWII in Operation Aphrodite. Posthumously awarded Navy Cross.")
    
    create_person("John Fitzgerald Kennedy",
                  gender="male",
                  birth_date="1917-05-29",
                  birth_place="Brookline, Massachusetts, USA",
                  death_date="1963-11-22",
                  death_place="Dallas, Texas, USA",
                  bio="35th President of the United States (1961-1963). Assassinated in Dallas. WWII Navy veteran, PT-109 commander.")
    
    create_person("Rosemary Kennedy",
                  gender="female",
                  birth_date="1918-09-13",
                  birth_place="Brookline, Massachusetts, USA",
                  death_date="2005-01-07",
                  death_place="Fort Atkinson, Wisconsin, USA",
                  bio="Eldest daughter of Joseph and Rose Kennedy. Underwent lobotomy in 1941.")
    
    create_person("Kathleen Agnes Kennedy",
                  gender="female",
                  birth_date="1920-02-20",
                  birth_place="Brookline, Massachusetts, USA",
                  death_date="1948-05-13",
                  death_place="Saint-Bauzile, France",
                  bio="Known as 'Kick'. Died in plane crash. Married to William Cavendish, Marquess of Hartington.")
    
    create_person("Eunice Mary Kennedy",
                  gender="female",
                  birth_date="1921-07-10",
                  birth_place="Brookline, Massachusetts, USA",
                  death_date="2009-08-11",
                  death_place="Hyannis Port, Massachusetts, USA",
                  bio="Founder of Special Olympics. Advocate for people with intellectual disabilities.")
    
    create_person("Patricia Kennedy",
                  gender="female",
                  birth_date="1924-05-06",
                  birth_place="Brookline, Massachusetts, USA",
                  death_date="2006-09-17",
                  death_place="New York City, New York, USA",
                  bio="First prominent Kennedy to divorce (from Peter Lawford in 1966).")
    
    create_person("Robert Francis Kennedy",
                  gender="male",
                  birth_date="1925-11-20",
                  birth_place="Brookline, Massachusetts, USA",
                  death_date="1968-06-06",
                  death_place="Los Angeles, California, USA",
                  bio="64th US Attorney General. US Senator from New York. Assassinated during presidential campaign.")
    
    create_person("Jean Ann Kennedy",
                  gender="female",
                  birth_date="1928-02-20",
                  birth_place="Boston, Massachusetts, USA",
                  death_date="2020-06-17",
                  death_place="New York City, New York, USA",
                  bio="US Ambassador to Ireland (1993-1998). Youngest daughter of Joseph and Rose Kennedy.")
    
    create_person("Edward Moore Kennedy",
                  gender="male",
                  birth_date="1932-02-22",
                  birth_place="Boston, Massachusetts, USA",
                  death_date="2009-08-25",
                  death_place="Hyannis Port, Massachusetts, USA",
                  bio="Known as 'Ted'. US Senator from Massachusetts for 46 years. 'Lion of the Senate'.")
    
    # =========================================================================
    # PEOPLE - Spouses
    # =========================================================================
    print("\n--- Creating Spouses ---")
    
    create_person("Jacqueline Lee Bouvier",
                  gender="female",
                  birth_date="1929-07-28",
                  birth_place="Southampton, New York, USA",
                  death_date="1994-05-19",
                  death_place="New York City, New York, USA",
                  maiden_name="Bouvier",
                  bio="First Lady of the United States (1961-1963). Later married Aristotle Onassis. Book editor at Viking and Doubleday.")
    
    create_person("Aristotle Onassis",
                  gender="male",
                  birth_date="1906-01-15",
                  birth_place="Smyrna, Ottoman Empire",
                  death_date="1975-03-15",
                  death_place="Paris, France",
                  bio="Greek shipping magnate. Second husband of Jacqueline Kennedy.")
    
    create_person("Ethel Skakel",
                  gender="female",
                  birth_date="1928-04-11",
                  birth_place="Chicago, Illinois, USA",
                  maiden_name="Skakel",
                  bio="Wife of Robert F. Kennedy. Mother of 11 children. Human rights activist.")
    
    create_person("Sargent Shriver",
                  gender="male",
                  birth_date="1915-11-09",
                  birth_place="Westminster, Maryland, USA",
                  death_date="2011-01-18",
                  death_place="Bethesda, Maryland, USA",
                  bio="First director of the Peace Corps. US Ambassador to France. Democratic VP nominee in 1972. Husband of Eunice Kennedy.")
    
    create_person("Peter Lawford",
                  gender="male",
                  birth_date="1923-09-07",
                  birth_place="London, England",
                  death_date="1984-12-24",
                  death_place="Los Angeles, California, USA",
                  bio="British-American actor. Member of the Rat Pack. First husband of Patricia Kennedy (divorced 1966).")
    
    create_person("Joan Bennett Kennedy",
                  gender="female",
                  birth_date="1936-09-05",
                  birth_place="Bronxville, New York, USA",
                  maiden_name="Bennett",
                  bio="First wife of Ted Kennedy (divorced 1982). Model and pianist.")
    
    create_person("Victoria Reggie Kennedy",
                  gender="female",
                  birth_date="1954-02-26",
                  birth_place="Crowley, Louisiana, USA",
                  maiden_name="Reggie",
                  bio="Second wife of Ted Kennedy. Lawyer and gun control advocate.")
    
    # =========================================================================
    # PEOPLE - Generation 4 (Selected Grandchildren)
    # =========================================================================
    print("\n--- Creating People (Generation 4 - Selected Grandchildren) ---")
    
    create_person("Caroline Bouvier Kennedy",
                  gender="female",
                  birth_date="1957-11-27",
                  birth_place="New York City, New York, USA",
                  bio="Attorney and diplomat. US Ambassador to Japan (2013-2017) and Australia (2022-present). Only surviving child of JFK.")
    
    create_person("John Fitzgerald Kennedy Jr.",
                  gender="male",
                  birth_date="1960-11-25",
                  birth_place="Washington, D.C., USA",
                  death_date="1999-07-16",
                  death_place="Atlantic Ocean near Martha's Vineyard",
                  bio="Lawyer, journalist, and magazine publisher. Founder of George magazine. Died in plane crash.")
    
    create_person("Robert Francis Kennedy Jr.",
                  gender="male",
                  birth_date="1954-01-17",
                  birth_place="Washington, D.C., USA",
                  bio="Environmental lawyer and author. Secretary of Health and Human Services (2025-present). Known for controversial views.")
    
    create_person("Maria Shriver",
                  gender="female",
                  birth_date="1955-11-06",
                  birth_place="Chicago, Illinois, USA",
                  bio="Journalist, author, and former First Lady of California. Niece of JFK. Divorced from Arnold Schwarzenegger.")
    
    create_person("Arnold Schwarzenegger",
                  gender="male",
                  birth_date="1947-07-30",
                  birth_place="Thal, Austria",
                  bio="Actor, bodybuilder, and politician. 38th Governor of California (2003-2011). Divorced Maria Shriver in 2021.")
    
    # =========================================================================
    # PARENT-CHILD RELATIONSHIPS
    # =========================================================================
    print("\n--- Creating Parent-Child Relationships ---")
    
    # Generation 1 → 2
    add_parent_child("Patrick Joseph Kennedy", "Joseph Patrick Kennedy Sr.")
    add_parent_child("Mary Augusta Hickey", "Joseph Patrick Kennedy Sr.")
    add_parent_child("John Francis Fitzgerald", "Rose Elizabeth Fitzgerald")
    add_parent_child("Mary Josephine Hannon", "Rose Elizabeth Fitzgerald")
    
    # Generation 2 → 3 (Joseph Sr. & Rose's children)
    for child in ["Joseph Patrick Kennedy Jr.", "John Fitzgerald Kennedy", "Rosemary Kennedy",
                  "Kathleen Agnes Kennedy", "Eunice Mary Kennedy", "Patricia Kennedy",
                  "Robert Francis Kennedy", "Jean Ann Kennedy", "Edward Moore Kennedy"]:
        add_parent_child("Joseph Patrick Kennedy Sr.", child)
        add_parent_child("Rose Elizabeth Fitzgerald", child)
    
    # Generation 3 → 4 (JFK's children)
    add_parent_child("John Fitzgerald Kennedy", "Caroline Bouvier Kennedy")
    add_parent_child("Jacqueline Lee Bouvier", "Caroline Bouvier Kennedy")
    add_parent_child("John Fitzgerald Kennedy", "John Fitzgerald Kennedy Jr.")
    add_parent_child("Jacqueline Lee Bouvier", "John Fitzgerald Kennedy Jr.")
    
    # RFK's children (selected)
    add_parent_child("Robert Francis Kennedy", "Robert Francis Kennedy Jr.")
    add_parent_child("Ethel Skakel", "Robert Francis Kennedy Jr.")
    
    # Eunice & Sargent's children
    add_parent_child("Eunice Mary Kennedy", "Maria Shriver")
    add_parent_child("Sargent Shriver", "Maria Shriver")
    
    # =========================================================================
    # MARRIAGES & DIVORCES
    # =========================================================================
    print("\n--- Creating Marriages ---")
    
    # Generation 1 marriages (both spouses deceased - marriages ended by death)
    add_marriage("Patrick Joseph Kennedy", "Mary Augusta Hickey", start_date="1887-11-23", end_date="1923-05-20", end_reason="death")  # Mary died 1923
    add_marriage("John Francis Fitzgerald", "Mary Josephine Hannon", start_date="1889-09-18", end_date="1950-10-02", end_reason="death")  # Honey Fitz died 1950
    
    # Generation 2 marriages
    add_marriage("Joseph Patrick Kennedy Sr.", "Rose Elizabeth Fitzgerald", start_date="1914-10-07", end_date="1969-11-18", end_reason="death")  # Joe Sr died 1969
    
    # Generation 3 marriages
    # JFK & Jackie - ended by JFK's assassination
    add_marriage("John Fitzgerald Kennedy", "Jacqueline Lee Bouvier", start_date="1953-09-12", end_date="1963-11-22", end_reason="death")
    # Jackie & Onassis (remarriage) - ended by Onassis's death
    add_marriage("Jacqueline Lee Bouvier", "Aristotle Onassis", start_date="1968-10-20", end_date="1975-03-15", end_reason="death")
    
    # RFK & Ethel - ended by RFK's assassination
    add_marriage("Robert Francis Kennedy", "Ethel Skakel", start_date="1950-06-17", end_date="1968-06-06", end_reason="death")
    
    # Eunice & Sargent - ended by Sargent's death in 2011
    add_marriage("Eunice Mary Kennedy", "Sargent Shriver", start_date="1953-05-23", end_date="2009-08-11", end_reason="death")  # Eunice died first
    
    # Patricia & Peter Lawford - DIVORCED
    add_marriage("Patricia Kennedy", "Peter Lawford", start_date="1954-04-24", end_date="1966-02-01", end_reason="divorce")
    
    # Ted Kennedy marriages
    add_marriage("Edward Moore Kennedy", "Joan Bennett Kennedy", start_date="1958-11-29", end_date="1982-01-01", end_reason="divorce")
    add_marriage("Edward Moore Kennedy", "Victoria Reggie Kennedy", start_date="1992-07-03", end_date="2009-08-25", end_reason="death")  # Ted died 2009
    
    # Generation 4 marriages
    add_marriage("Maria Shriver", "Arnold Schwarzenegger", start_date="1986-04-26", end_date="2021-12-28", end_reason="divorce")
    
    # =========================================================================
    # OCCUPATIONS
    # =========================================================================
    print("\n--- Creating Occupations ---")
    
    # Joseph Sr.
    create_occupation("Joseph Patrick Kennedy Sr.", "Chairman", "Securities and Exchange Commission",
                      start_date="1934-07-02", end_date="1935-09-23",
                      description="First chairman of the SEC, appointed by FDR")
    create_occupation("Joseph Patrick Kennedy Sr.", "Ambassador to the United Kingdom", "United States Government",
                      start_date="1938-03-08", end_date="1940-11-06",
                      location="London, UK")
    
    # JFK
    create_occupation("John Fitzgerald Kennedy", "Lieutenant", "United States Navy",
                      start_date="1941-10-27", end_date="1945-03-01",
                      description="PT-109 Commander, WWII hero")
    create_occupation("John Fitzgerald Kennedy", "Representative", "United States House of Representatives",
                      start_date="1947-01-03", end_date="1953-01-03",
                      location="Massachusetts 11th district")
    create_occupation("John Fitzgerald Kennedy", "Senator", "United States Senate",
                      start_date="1953-01-03", end_date="1960-12-22",
                      location="Massachusetts")
    create_occupation("John Fitzgerald Kennedy", "President of the United States", "United States Government",
                      start_date="1961-01-20", end_date="1963-11-22",
                      description="35th President")
    
    # RFK
    create_occupation("Robert Francis Kennedy", "Attorney General", "United States Government",
                      start_date="1961-01-20", end_date="1964-09-03",
                      description="64th US Attorney General")
    create_occupation("Robert Francis Kennedy", "Senator", "United States Senate",
                      start_date="1965-01-03", end_date="1968-06-06",
                      location="New York")
    
    # Ted Kennedy
    create_occupation("Edward Moore Kennedy", "Senator", "United States Senate",
                      start_date="1962-11-07", end_date="2009-08-25",
                      location="Massachusetts",
                      description="Served 46 years, 'Lion of the Senate'")
    
    # Sargent Shriver
    create_occupation("Sargent Shriver", "Director", "Peace Corps",
                      start_date="1961-03-01", end_date="1966-02-28",
                      description="Founding director")
    create_occupation("Sargent Shriver", "Ambassador to France", "United States Government",
                      start_date="1968-03-21", end_date="1970-01-30",
                      location="Paris, France")
    
    # Eunice Kennedy
    create_occupation("Eunice Mary Kennedy", "Founder", "Special Olympics",
                      start_date="1968-07-20",
                      description="Founded and led the Special Olympics movement")
    
    # Jackie Kennedy
    create_occupation("Jacqueline Lee Bouvier", "First Lady", "United States Government",
                      start_date="1961-01-20", end_date="1963-11-22")
    create_occupation("Jacqueline Lee Bouvier", "Book Editor",
                      start_date="1975-01-01", end_date="1994-05-19",
                      location="New York City",
                      description="Editor at Viking Press and Doubleday")
    
    # Caroline Kennedy
    create_occupation("Caroline Bouvier Kennedy", "Ambassador to Japan", "United States Government",
                      start_date="2013-11-12", end_date="2017-01-18",
                      location="Tokyo, Japan")
    create_occupation("Caroline Bouvier Kennedy", "Ambassador to Australia", "United States Government",
                      start_date="2022-07-22",
                      location="Canberra, Australia")
    
    # JFK Jr.
    create_occupation("John Fitzgerald Kennedy Jr.", "Founder and Editor", 
                      start_date="1995-01-01", end_date="1999-07-16",
                      description="Founded George magazine, a monthly political magazine")
    
    # Arnold Schwarzenegger
    create_occupation("Arnold Schwarzenegger", "Governor of California", "United States Government",
                      start_date="2003-11-17", end_date="2011-01-03",
                      location="Sacramento, California",
                      description="38th Governor")
    
    # Maria Shriver
    create_occupation("Maria Shriver", "Journalist",
                      start_date="1978-01-01", end_date="2004-01-01",
                      description="NBC News anchor and correspondent")
    create_occupation("Maria Shriver", "First Lady of California",
                      start_date="2003-11-17", end_date="2011-01-03",
                      location="Sacramento, California")
    
    # =========================================================================
    # EVENTS
    # =========================================================================
    print("\n--- Creating Events ---")
    
    # Births are already captured in person records, but we can add significant events
    
    create_event("OTHER", "JFK Inaugural Address",
                 event_date="1961-01-20",
                 location="Washington, D.C., USA",
                 participant_names=["John Fitzgerald Kennedy", "Jacqueline Lee Bouvier"])
    
    create_event("OTHER", "JFK Assassination",
                 event_date="1963-11-22",
                 location="Dallas, Texas, USA",
                 participant_names=["John Fitzgerald Kennedy", "Jacqueline Lee Bouvier"])
    
    create_event("OTHER", "RFK Assassination",
                 event_date="1968-06-05",
                 location="Los Angeles, California, USA",
                 participant_names=["Robert Francis Kennedy", "Ethel Skakel"])
    
    create_event("OTHER", "First Special Olympics Games",
                 event_date="1968-07-20",
                 location="Chicago, Illinois, USA",
                 participant_names=["Eunice Mary Kennedy", "Sargent Shriver"])
    
    create_event("OTHER", "JFK Jr. Plane Crash",
                 event_date="1999-07-16",
                 location="Atlantic Ocean near Martha's Vineyard",
                 participant_names=["John Fitzgerald Kennedy Jr."])
    
    create_event("WEDDING", "JFK & Jackie Wedding at St. Mary's Church",
                 event_date="1953-09-12",
                 location="St. Mary's Church, Newport, Rhode Island, USA",
                 participant_names=["John Fitzgerald Kennedy", "Jacqueline Lee Bouvier"])
    
    create_event("WEDDING", "RFK & Ethel Wedding",
                 event_date="1950-06-17",
                 location="St. Mary's Church, Greenwich, Connecticut, USA",
                 participant_names=["Robert Francis Kennedy", "Ethel Skakel"])
    
    create_event("WEDDING", "Ted Kennedy & Joan Wedding",
                 event_date="1958-11-29",
                 location="St. Joseph's Church, Bronxville, New York, USA",
                 participant_names=["Edward Moore Kennedy", "Joan Bennett Kennedy"])
    
    create_event("OTHER", "Patricia Kennedy Divorce",
                 event_date="1966-02-01",
                 location="Santa Monica, California, USA",
                 participant_names=["Patricia Kennedy", "Peter Lawford"])
    
    create_event("OTHER", "Ted Kennedy Divorce",
                 event_date="1982-01-01",
                 location="Boston, Massachusetts, USA",
                 participant_names=["Edward Moore Kennedy", "Joan Bennett Kennedy"])
    
    create_event("MILITARY_SERVICE", "JFK Jr. Navy Service",
                 event_date="1944-08-12",
                 location="English Channel",
                 participant_names=["Joseph Patrick Kennedy Jr."])
    
    # =========================================================================
    # RESIDENCES
    # =========================================================================
    print("\n--- Linking Residences ---")
    
    # Kennedy Compound residents
    for person in ["Joseph Patrick Kennedy Sr.", "Rose Elizabeth Fitzgerald", 
                   "John Fitzgerald Kennedy", "Robert Francis Kennedy", 
                   "Edward Moore Kennedy", "Eunice Mary Kennedy"]:
        link_residence(person, "Kennedy Compound", residence_type="vacation")
    
    # White House residents
    link_residence("John Fitzgerald Kennedy", "The White House", 
                   start_date="1961-01-20", end_date="1963-11-22", 
                   residence_type="primary")
    link_residence("Jacqueline Lee Bouvier", "The White House",
                   start_date="1961-01-20", end_date="1963-11-22",
                   residence_type="primary")
    
    print("\n" + "=" * 60)
    print("SEEDING COMPLETE!")
    print("=" * 60)
    print(f"\nCreated:")
    print(f"  - {len(people_ids)} people")
    print(f"  - {len(place_ids)} places")
    print(f"  - {len(org_ids)} organizations")
    print(f"  - Multiple relationships, occupations, and events")


if __name__ == "__main__":
    seed_data()
