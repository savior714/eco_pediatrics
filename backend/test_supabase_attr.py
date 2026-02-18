import asyncio
import os
from supabase._async.client import create_client

async def test_method():
    url = os.environ.get("SUPABASE_URL", "http://localhost:54321")
    key = os.environ.get("SUPABASE_ANON_KEY", "dummy")
    supabase = await create_client(url, key)
    
    query = supabase.table("admissions").select("*")
    print(f"Query type: {type(query)}")
    print(f"Attributes: {dir(query)}")
    try:
        print(f"Method: {query.method}")
    except AttributeError:
        print("Attribute 'method' not found on query builder")

if __name__ == "__main__":
    asyncio.run(test_method())
