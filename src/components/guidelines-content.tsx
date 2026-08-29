"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { BookOpen, Swords, ListOrdered } from "lucide-react";
import { SPORTS_GUIDELINES, SPORTS_COMPOSITION, MODIFIED_MEDAL_COUNT } from "@/lib/sports-guidelines";

export function GuidelinesContent() {
  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
        <CardContent className="flex items-start gap-3 p-5">
          <BookOpen className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            These guidelines are adapted from the PRISAA National Games governing rules and summarized for
            operational use — team composition, tournament format, tie-breaking, and awards. Each sport still
            follows the official rules of its governing body (FIBA, FIVB, World Athletics, FINA, BWF, FIDE, WDSF,
            ITTF, FIG, WPA) for anything not covered here.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
        <CardContent className="space-y-6 p-5">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Contingent Composition (per delegation)</h2>
            <p className="mt-1 text-xs text-muted-foreground">Team sports</p>
            <div className="mt-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sport</TableHead>
                    <TableHead className="text-right">M</TableHead>
                    <TableHead className="text-right">W</TableHead>
                    <TableHead className="text-right">C</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SPORTS_COMPOSITION.team.map((row) => (
                    <TableRow key={row.sport}>
                      <TableCell className="font-medium">{row.sport}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.m}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.w}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.c}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{row.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Individual sports</p>
            <div className="mt-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sport</TableHead>
                    <TableHead className="text-right">M</TableHead>
                    <TableHead className="text-right">W</TableHead>
                    <TableHead className="text-right">C</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SPORTS_COMPOSITION.individual.map((row) => (
                    <TableRow key={row.sport}>
                      <TableCell className="font-medium">{row.sport}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.m}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.w}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.c}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{row.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">M = Men, W = Women, C = Coaches (national delegation quota).</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <ListOrdered className="size-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Modified Medal Count</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Used to encourage broader regional participation — medal counts scale with how many athletes compete
            simultaneously in an event.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Gold</TableHead>
                  <TableHead className="text-right">Silver</TableHead>
                  <TableHead className="text-right">Bronze</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MODIFIED_MEDAL_COUNT.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell className="font-medium">{row.category}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.gold}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.silver}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.bronze}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Per-Sport Guidelines</h2>
        <div className="grid gap-4">
          {SPORTS_GUIDELINES.map((sport) => (
            <Card
              key={sport.slug}
              id={sport.slug}
              className="scroll-mt-6 border-border/70 bg-card/85 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10"
            >
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {sport.suggestedEventType === "TEAM_VS_TEAM" ? (
                      <Swords className="size-4 text-muted-foreground" />
                    ) : (
                      <ListOrdered className="size-4 text-muted-foreground" />
                    )}
                    <h3 className="font-semibold tracking-tight">{sport.name}</h3>
                  </div>
                  <Badge variant="outline">{sport.category}</Badge>
                </div>
                <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {sport.governingBody}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{sport.overview}</p>

                <Accordion className="mt-3">
                  {sport.sections.map((section) => (
                    <AccordionItem key={section.heading} value={section.heading}>
                      <AccordionTrigger>{section.heading}</AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                          {section.items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
