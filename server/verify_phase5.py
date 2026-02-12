import requests
import time

BASE_URL = "http://localhost:8002"


def test_phase5():
    print("--- Starting Phase 5 Verification ---")
    
    # 1. Check Root
    try:
        resp = requests.get(f"{BASE_URL}/")
        print(f"Root: {resp.status_code} - {resp.json()}")
    except Exception as e:
        print(f"Error: {e}")
        return

    # 2. Create Conversation
    resp = requests.post(f"{BASE_URL}/conversations", json={"title": "Test Phase 5 Chat"})
    conv = resp.json()
    conv_id = conv["id"]
    print(f"Created Conversation: {conv_id}")

    # 3. Send Message (Triggers usage tracking and model behavior)
    resp = requests.post(f"{BASE_URL}/conversations/{conv_id}/messages", json={
        "role": "user",
        "content": "Tell me a creative story about a precise robot."
    })

    msg = resp.json()
    if "content" not in msg:
        print(f"FAILED TO GET MESSAGE CONTENT. Response: {msg}")
        return
    print(f"AI Response: {msg['content']}")

    msg_id = msg["id"]

    # 4. Send Feedback
    resp = requests.post(f"{BASE_URL}/feedback", json={
        "message_id": msg_id,
        "conversation_id": conv_id,
        "is_positive": True,
        "comment": "Great story!"
    })
    print(f"Feedback Status: {resp.status_code} - {resp.json().get('id', 'No ID')}")

    # 5. Test Tool Calling (Search)
    resp = requests.post(f"{BASE_URL}/conversations/{conv_id}/messages", json={
        "role": "user",
        "content": "Can you search for the latest tech news?"
    })
    msg = resp.json()
    print(f"Tool Call Response: {msg['content']}")
    if "Web Search Tool" in msg['content']:
        print("✅ Tool Calling Triggered Successfully")

    # 6. Test Rate Limiting (Attempt many messages)
    print("Testing Rate Limit (Sending 12 messages fast)...")
    for i in range(12):
        r = requests.post(f"{BASE_URL}/conversations/{conv_id}/messages", json={
            "role": "user",
            "content": f"Spam message {i}"
        })
        if r.status_code == 429:
            print(f"✅ Rate Limit Triggered at message {i+1}")
            break
        elif i == 11:
            print("❌ Rate Limit FAILED to trigger")

    # 7. Get Analytics
    resp = requests.get(f"{BASE_URL}/analytics")
    analytics = resp.json()
    print("Analytics Summary:")
    print(f"  Total Messages: {analytics['total_messages']}")
    print(f"  Total Tokens: {analytics['total_tokens']}")
    print(f"  Pos Feedback: {analytics['positive_feedback_count']}")


    print("--- Phase 5 Verification Complete ---")

if __name__ == "__main__":
    test_phase5()
