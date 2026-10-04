import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicSiteButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
      nativeButton={false}
      render={<a href="/" target="_blank" rel="noopener noreferrer" />}
    >
      <ExternalLink className="size-4" />
      Public site
    </Button>
  );
}
