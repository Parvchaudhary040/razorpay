#!/usr/bin/env python3
import requests
import json
import time
from datetime import datetime, timedelta
import jwt

# Configuration
API_BASE_URL = "http://localhost:3001/api"
JWT_SECRET = "some-very-secret-development-key-1234567890"
USER_ID = "79881cea-35bd-45a3-88ca-7e62bfdd55c5"
ROLE = "CUSTOMER"

# Create a fresh JWT token valid for 1 hour
def create_test_token():
    payload = {
        "userId": USER_ID,
        "role": ROLE,
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600  # Valid for 1 hour
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    return token

def test_ai_chat():
    token = create_test_token()
    print(f"Token created: {token[:50]}...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test 1: Simple compare products request
    print("\n=== Test 1: Compare products (no product IDs provided) ===")
    payload = {"message": "Compare products"}
    response = requests.post(f"{API_BASE_URL}/ai/chat", json=payload, headers=headers)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}")
    
    # Test 2: Search for products first, then compare
    print("\n=== Test 2: Search for products ===")
    payload = {"message": "Find me gaming laptops under 80000"}
    response = requests.post(f"{API_BASE_URL}/ai/chat", json=payload, headers=headers)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}")
    
    if result.get("data") and isinstance(result["data"], list) and len(result["data"]) > 0:
        # Extract product IDs from search results
        product_ids = [p["id"] for p in result["data"][:3]]  # Get first 3
        print(f"\nFound products: {product_ids[:2]}")
        
        # Test 3: Compare using extracted product IDs
        print("\n=== Test 3: Compare specific products ===")
        # Format the message with product IDs
        ids_str = " ".join(product_ids[:2])
        payload = {"message": f"Compare these products {ids_str}"}
        response = requests.post(f"{API_BASE_URL}/ai/chat", json=payload, headers=headers)
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")

if __name__ == "__main__":
    try:
        test_ai_chat()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
