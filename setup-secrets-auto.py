#!/usr/bin/env python3
"""
Setup GitHub Secrets automatically via GitHub API
Requires GITHUB_TOKEN environment variable
"""

import os
import sys
import json
import requests
from base64 import b64encode

def setup_secrets():
    """Setup all required secrets"""

    # Get GitHub token from environment
    token = os.environ.get('GITHUB_TOKEN')
    if not token:
        print("❌ GITHUB_TOKEN not set!")
        print("   Set it: export GITHUB_TOKEN='your_github_token'")
        print("")
        print("   To create a token:")
        print("   1. GitHub → Settings → Developer settings → Personal access tokens")
        print("   2. Create new token with 'repo' scope")
        print("   3. Copy token and export as GITHUB_TOKEN")
        return False

    # Get repo info from git
    repo_owner = "arminbeigi"
    repo_name = "arminbeigi"

    # Secrets to set
    secrets = {
        "WP_URL": "https://shofazh.com",
        "WP_USER": "admin",
        "WP_APP_PASS": "XGMz B2pD n1Mh zvjY GoUn 0l0E",
    }

    # Optional: Ask for Slack webhook
    slack_webhook = input("📱 Slack Webhook URL (optional, press Enter to skip): ").strip()
    if slack_webhook:
        secrets["SLACK_WEBHOOK"] = slack_webhook

    print("")
    print("Setting up secrets in GitHub...")
    print("")

    # Get repository public key (needed for encryption)
    key_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/actions/secrets/public-key"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }

    try:
        resp = requests.get(key_url, headers=headers, timeout=10)
        if resp.status_code != 200:
            print(f"❌ Failed to get public key: {resp.status_code}")
            print(f"   {resp.text}")
            return False

        public_key_data = resp.json()
        public_key = public_key_data['key']
        key_id = public_key_data['key_id']

    except Exception as e:
        print(f"❌ Error getting public key: {e}")
        return False

    # Set each secret
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization
    from nacl import pwhash, secret, utils
    from nacl.public import PublicKey

    success_count = 0
    for secret_name, secret_value in secrets.items():
        try:
            # Encrypt secret using libsodium (NaCl)
            public_key_bytes = PublicKey(public_key.encode())
            encrypted = public_key_bytes.encrypt(
                secret_value.encode(),
                nonce=utils.random(24)
            )
            encrypted_b64 = b64encode(encrypted.ciphertext).decode()

            # Create secret via API
            set_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/actions/secrets/{secret_name}"
            payload = {
                "encrypted_value": encrypted_b64,
                "key_id": key_id
            }

            resp = requests.put(set_url, json=payload, headers=headers, timeout=10)

            if resp.status_code in [201, 204]:
                print(f"✅ {secret_name} set")
                success_count += 1
            else:
                print(f"❌ {secret_name} failed: {resp.status_code}")
                print(f"   {resp.text}")

        except Exception as e:
            print(f"❌ Error setting {secret_name}: {e}")

    print("")
    print("=" * 50)
    if success_count == len(secrets):
        print(f"✅ All {success_count} secrets configured!")
        print("")
        print("🚀 Next steps:")
        print("   1. git push -u origin claude/google-search-console-ila5wg")
        print("   2. GitHub → Actions → GSC Auto-Fixer")
        print("   3. Run workflow manually or wait for schedule")
        return True
    else:
        print(f"⚠️  {success_count}/{len(secrets)} secrets set")
        return False

if __name__ == "__main__":
    try:
        # Try to import nacl for encryption
        from nacl.public import PublicKey
        from nacl import utils
        from cryptography.hazmat.primitives.asymmetric import rsa
    except ImportError:
        print("Installing required packages...")
        os.system("pip install pynacl cryptography requests")

    success = setup_secrets()
    sys.exit(0 if success else 1)
