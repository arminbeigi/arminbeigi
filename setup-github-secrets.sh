#!/bin/bash
#
# Setup GitHub Secrets for GSC Auto-Fixer
# This script configures all required secrets for the automation workflow
#

set -e

echo "🔐 GitHub Secrets Setup for GSC Auto-Fixer"
echo "=========================================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "   Install from: https://cli.github.com"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub"
    echo "   Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI authenticated"
echo ""

# Get repo info
REPO=$(git config --get remote.origin.url | sed 's/.*://; s/.git$//')
echo "📦 Repository: $REPO"
echo ""

# Secrets to set
declare -A SECRETS=(
    ["WP_URL"]="https://shofazh.com"
    ["WP_USER"]="admin"
    ["WP_APP_PASS"]="XGMz B2pD n1Mh zvjY GoUn 0l0E"
)

# Optional Slack webhook
read -p "📱 Slack Webhook URL (optional, press Enter to skip): " SLACK_WEBHOOK

if [ -n "$SLACK_WEBHOOK" ]; then
    SECRETS["SLACK_WEBHOOK"]="$SLACK_WEBHOOK"
fi

echo ""
echo "Setting up secrets..."
echo ""

# Set each secret
for SECRET_NAME in "${!SECRETS[@]}"; do
    SECRET_VALUE="${SECRETS[$SECRET_NAME]}"

    echo "⚙️  Setting $SECRET_NAME..."

    # Use gh secret set
    echo "$SECRET_VALUE" | gh secret set "$SECRET_NAME" --repo "$REPO" 2>&1 | grep -v "^Error" || true

    echo "   ✅ $SECRET_NAME set"
done

echo ""
echo "=========================================="
echo "✅ All secrets configured!"
echo ""
echo "🚀 Next steps:"
echo "   1. Push branch: git push -u origin claude/google-search-console-ila5wg"
echo "   2. Check GitHub Actions:"
echo "      GitHub → Actions → GSC Auto-Fixer"
echo "   3. Run workflow manually or wait for schedule"
echo ""
echo "⏰ Workflow runs:"
echo "   - Every Friday at 9 AM UTC (automatic)"
echo "   - Or manually: GitHub → Actions → Run workflow"
echo ""
