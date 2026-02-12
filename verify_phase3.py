import requests
import json

BASE_URL = "http://localhost:8001"

def test_phase3():
    print("--- Starting Phase 3 Verification ---")
    
    # 1. Create Conversation
    response = requests.post(f"{BASE_URL}/conversations", json={"title": "Test Chat"})
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    conv = response.json()
    conv_id = conv['id']
    print(f"Created conversation: {conv_id}")
    
    # 2. Update Settings
    patch_data = {
        "system_prompt": "You are a poetic assistant.",
        "temperature": 0.9
    }
    response = requests.patch(f"{BASE_URL}/conversations/{conv_id}", json=patch_data)
    updated_conv = response.json()
    print(f"Updated settings: prompt='{updated_conv['system_prompt']}', temp={updated_conv['temperature']}")
    
    assert updated_conv['system_prompt'] == patch_data['system_prompt']
    assert updated_conv['temperature'] == patch_data['temperature']
    
    # 3. Delete Conversation
    response = requests.delete(f"{BASE_URL}/conversations/{conv_id}")
    print(f"Deleted conversation: {response.json()['message']}")
    
    # 4. Verify Deletion
    response = requests.get(f"{BASE_URL}/conversations/{conv_id}")
    assert response.status_code == 404
    print("Verification successful: Conversation deleted and inaccessible.")
    print("--- Phase 3 Verification Complete ---")

if __name__ == "__main__":
    try:
        test_phase3()
    except Exception as e:
        print(f"Verification failed: {e}")
