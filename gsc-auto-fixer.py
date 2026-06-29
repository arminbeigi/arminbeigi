#!/usr/bin/env python3
"""
GSC Auto-Fixer: Interactive workflow to identify and fix zero-click queries in WordPress
Uses Yoast SEO only

Usage:
  python3 gsc-auto-fixer.py --dry-run          ← Preview what would change
  python3 gsc-auto-fixer.py --apply            ← Apply after approval
  python3 gsc-auto-fixer.py --query "کلمه"    ← Test single query
"""

import os
import sys
import json
from datetime import datetime
from gsc_wp_mapper import GSCWordPressMapper


class GSCAutoFixer:
    """Orchestrate GSC data analysis + WordPress updates with user approval"""

    def __init__(self, gsc_fixes_file: str = "gsc-fixes.json"):
        """Initialize with GSC fixes data"""
        self.gsc_fixes_file = gsc_fixes_file
        self.mapper = GSCWordPressMapper()
        self.issues = []
        self.enriched_issues = []
        self.log_file = "gsc-fixes-applied.log"

    def load_gsc_data(self) -> bool:
        """Load and parse gsc-fixes.json"""
        if not os.path.exists(self.gsc_fixes_file):
            print(f"❌ File not found: {self.gsc_fixes_file}")
            return False

        try:
            with open(self.gsc_fixes_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.issues = data.get('fixes', [])
            print(f"✅ Loaded {len(self.issues)} issues from GSC")
            return True
        except Exception as e:
            print(f"❌ Error loading GSC data: {e}")
            return False

    def enrich_with_wordpress(self) -> None:
        """Add WordPress post-id and current SEO to each issue"""
        print("\n🔍 Enriching GSC data with WordPress info...\n")

        for i, issue in enumerate(self.issues, 1):
            print(f"[{i}/{len(self.issues)}] {issue['query']}")

            # Map GSC URL to WordPress post-id
            page_url = issue.get('page', '')
            result = self.mapper.slug_to_post_id(page_url)

            if not result:
                print(f"   ⚠ Skipping: Could not find WordPress page")
                issue['status'] = 'SKIPPED'
                issue['skip_reason'] = 'Post not found'
                continue

            post_id, post_type = result

            # Fetch current SEO
            seo = self.mapper.fetch_current_seo(post_id, post_type)
            if not seo:
                print(f"   ⚠ Skipping: Could not fetch current SEO")
                issue['status'] = 'SKIPPED'
                issue['skip_reason'] = 'SEO fetch failed'
                continue

            # Enrich issue with WordPress data
            issue['post_id'] = post_id
            issue['post_type'] = post_type
            issue['current_title'] = seo['current_title']
            issue['current_meta'] = seo['current_meta']
            issue['status'] = 'PENDING'
            issue['skip_reason'] = None

            print(f"   ✓ Post {post_id} ({post_type})")
            self.enriched_issues.append(issue)

        print()

    def display_dry_run(self) -> None:
        """Display preview of what would change"""
        if not self.enriched_issues:
            print("❌ No issues to display (all skipped)")
            return

        print("=" * 80)
        print("🔍 DRY RUN - Preview of Changes (No modifications yet)")
        print("=" * 80)
        print()

        for i, issue in enumerate(self.enriched_issues, 1):
            query = issue['query']
            page = issue['page']
            post_id = issue['post_id']
            post_type = issue['post_type']
            current_title = issue['current_title'][:50] + "..." if len(issue['current_title']) > 50 else issue['current_title']
            new_title = issue['recommended_title']
            current_meta = issue['current_meta'][:50] + "..." if len(issue['current_meta']) > 50 else issue['current_meta']
            new_meta = issue['recommended_meta']
            expected_gain = issue.get('expected_gain', '?')

            print(f"[{i}] Query: {query}")
            print(f"    Page: {page}")
            print(f"    Post-ID: {post_id} ({post_type})")
            print()
            print(f"    Current Title: {current_title}")
            print(f"    ➜ New Title:     {new_title}")
            print()
            print(f"    Current Meta:  {current_meta}")
            print(f"    ➜ New Meta:     {new_meta}")
            print()
            print(f"    Expected Gain: {expected_gain}")
            print(f"    Status: [PENDING APPROVAL] ⏳")
            print()
            print("-" * 80)
            print()

        # Summary
        total_potential_clicks = sum(
            int(i.get('expected_gain', '0').replace('+', '').replace(' clicks', '').strip())
            for i in self.enriched_issues
        )
        print(f"📊 Summary: {len(self.enriched_issues)} fixes | ~{total_potential_clicks} potential clicks")
        print()

    def ask_approval(self) -> bool:
        """Ask user for approval before applying (skip in CI/non-interactive)"""
        import sys
        if not sys.stdin.isatty():
            print("✅ Auto-approving (CI environment detected)")
            return True

        while True:
            response = input("Apply these fixes to WordPress? (yes/no): ").strip().lower()
            if response in ['yes', 'y']:
                return True
            elif response in ['no', 'n']:
                return False
            else:
                print("Please answer 'yes' or 'no'")

    def apply_fixes(self) -> None:
        """Apply approved fixes to WordPress (Yoast SEO only)"""
        if not self.enriched_issues:
            print("❌ No issues to apply")
            return

        print("\n" + "=" * 80)
        print("✅ Applying Fixes to WordPress (Yoast SEO)")
        print("=" * 80 + "\n")

        successful = 0
        failed = 0

        for i, issue in enumerate(self.enriched_issues, 1):
            query = issue['query']
            post_id = issue['post_id']
            post_type = issue['post_type']
            new_title = issue['recommended_title']
            new_meta = issue['recommended_meta']
            keyword = query

            print(f"[{i}/{len(self.enriched_issues)}] {query}")

            # Build Yoast-only payload
            payload = self.mapper.build_update_payload(new_title, new_meta, keyword)

            # Apply update
            if self.mapper.apply_metadata_update(post_id, post_type, payload):
                successful += 1
                self.log_change(issue, success=True)
                print(f"   ✅ Post {post_id} updated\n")
            else:
                failed += 1
                self.log_change(issue, success=False)
                print(f"   ❌ Failed to update post {post_id}\n")

        print("=" * 80)
        print(f"📊 Results: {successful} successful, {failed} failed")
        print("=" * 80)
        print()

        if successful > 0:
            print("✨ Yoast metadata updated! Monitor GSC for changes in 7-14 days.")

    def log_change(self, issue: dict, success: bool) -> None:
        """Log applied changes for audit trail"""
        try:
            with open(self.log_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps({
                    'timestamp': datetime.now().isoformat(),
                    'query': issue['query'],
                    'page': issue['page'],
                    'post_id': issue['post_id'],
                    'current_title': issue['current_title'],
                    'new_title': issue['recommended_title'],
                    'current_meta': issue['current_meta'],
                    'new_meta': issue['recommended_meta'],
                    'success': success,
                }, ensure_ascii=False) + '\n')
        except Exception as e:
            print(f"⚠ Warning: Could not write log: {e}")

    def run_workflow(self, dry_run: bool = True, query_filter: str = None) -> None:
        """Execute full workflow"""
        # Load data
        if not self.load_gsc_data():
            sys.exit(1)

        # Filter by single query if specified
        if query_filter:
            self.issues = [i for i in self.issues if query_filter.lower() in i['query'].lower()]
            if not self.issues:
                print(f"❌ No issues found matching: {query_filter}")
                sys.exit(1)

        # Enrich with WordPress data
        self.enrich_with_wordpress()

        # Display dry run
        self.display_dry_run()

        # If not dry-run, ask for approval and apply
        if not dry_run:
            if self.ask_approval():
                self.apply_fixes()
            else:
                print("❌ Cancelled by user")


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='GSC Auto-Fixer: Fix zero-click queries in WordPress')
    parser.add_argument('--dry-run', action='store_true', default=True, help='Preview only (default)')
    parser.add_argument('--apply', action='store_true', help='Apply fixes after approval')
    parser.add_argument('--query', type=str, help='Filter to single query for testing')
    parser.add_argument('--file', type=str, default='gsc-fixes.json', help='Path to GSC fixes file')

    args = parser.parse_args()

    fixer = GSCAutoFixer(gsc_fixes_file=args.file)
    fixer.run_workflow(dry_run=not args.apply, query_filter=args.query)


if __name__ == "__main__":
    main()
