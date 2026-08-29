"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { GuidelinesContent } from "@/components/guidelines-content";

export default function GuidelinesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sports Guidelines"
        description="Condensed governing rules for each PRISAA sport, for quick reference when organizing events."
      />
      <GuidelinesContent />
    </div>
  );
}
