import kuzu

db = kuzu.Database("kuzu_db")
conn = kuzu.Connection(db)

# Try to describe the Person table schema
try:
    # Kuzu doesn't have DESCRIBE, but we can try to query the schema
    result = conn.execute("CALL table_info('Person') RETURN *;")
    print("Person table schema:")
    while result.has_next():
        print(result.get_next())
except Exception as e:
    print(f"Schema query failed: {e}")
    
# Try a different approach - just try to select all columns
try:
    result = conn.execute("MATCH (p:Person) RETURN p LIMIT 0;")
    print("\nQuery structure test passed")
except Exception as e:
    print(f"\nQuery test failed: {e}")

# Try to create a person with all fields to see which one fails
try:
    result = conn.execute("""
        CREATE (p:Person {
            name: 'Test',
            gender: 'Male',
            birth_date: '1990',
            birth_place: 'NYC',
            death_date: NULL,
            death_place: NULL,
            bio: 'Test',
            maiden_name: NULL
        })
        RETURN p.id
    """)
    if result.has_next():
        person_id = result.get_next()[0]
        print(f"\n✅ SUCCESS! Created person with ID: {person_id}")
    else:
        print("\n❌ No result returned")
except Exception as e:
    print(f"\n❌ Person creation failed with error: {e}")
