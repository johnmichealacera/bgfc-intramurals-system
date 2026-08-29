import { GuidelinesContent } from "@/components/guidelines-content";

export default function PublicGuidelinesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sports Guidelines</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Condensed governing rules for each PRISAA sport played at BGFC Intramurals — team composition, tournament
          format, tie-breaking, and awards.
        </p>
      </div>
      <GuidelinesContent />
    </div>
  );
}
