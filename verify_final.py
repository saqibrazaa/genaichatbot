import requests
import json
import os

BASE_URL = "http://localhost:8002"


def test_final_phases():
    print("--- Starting Final Phases Verification ---")
    
    # 0. Check Root
    try:
        root_resp = requests.get(f"{BASE_URL}/")
        print(f"Root Status: {root_resp.status_code}")
        print(f"Root Content: {root_resp.json()}")
    except Exception as e:
        print(f"Root Check Failed: {e}")

    # 1. Create Conversation
    response = requests.post(f"{BASE_URL}/conversations", json={"title": "RAG & Model Test"})
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    conv = response.json()
    conv_id = conv['id']
    print(f"Created conversation: {conv_id}")
    
    # 2. Upload File
    test_file_path = "test_knowledge.txt"
    with open(test_file_path, "w") as f:
        f.write("The secret code is AURA-2026.")
    
    with open(test_file_path, "rb") as f:
        response = requests.post(f"{BASE_URL}/upload?conversation_id={conv_id}", files={"file": f})
    
    att = response.json()
    print(f"Uploaded file: {att['filename']}")
    
    # 3. Switch Model
    requests.patch(f"{BASE_URL}/conversations/{conv_id}", json={"selected_model": "aura-creative"})
    print("Switched model to aura-creative")
    
    # 4. Send Message (Test RAG)
    response = requests.post(f"{BASE_URL}/conversations/{conv_id}/messages", json={"role": "user", "content": "What is the secret code?"})

    print(f"Message Status: {response.status_code}")
    msg = response.json()
    if 'content' not in msg:
        print(f"Error: 'content' not found in response. Full response: {msg}")
        return
    print(f"AI Response: {msg['content']}")
    
    assert "[aura-creative]" in msg['content']
    assert "AURA-2026" in msg['content']
    
    print("Verification successful: RAG and Model Switching are working!")
    
    # Cleanup
    os.remove(test_file_path)
    print("--- Final Phases Verification Complete ---")

if __name__ == "__main__":
    try:
        test_final_phases()
    except Exception as e:
        print(f"Verification failed: {e}")
        import traceback
        traceback.print_exc()
