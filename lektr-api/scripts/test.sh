#!/usr/bin/env bash
# Run all unit and integration tests individually to avoid mock pollution
# Usage: ./scripts/test.sh

set -e

echo "🧪 Running Lektr API Tests..."
echo ""

test_files=(
  "tests/unit/email.test.ts"
  "tests/unit/digest.test.ts"
  "tests/unit/job-queue.test.ts"
  "tests/integration/admin.test.ts"
)

for file in "${test_files[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 $file"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  bun test "$file"
  echo ""
done

echo "✅ All tests passed!"
