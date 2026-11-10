"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TABS, type TabKey } from "./_components/shared";
import { OverviewTab } from "./_components/OverviewTab";
import { PeopleTab } from "./_components/PeopleTab";
import { CampaignsTab } from "./_components/CampaignsTab";
import { RepliesTab } from "./_components/RepliesTab";
import { InboxesTab } from "./_components/InboxesTab";
import { SequencesTab } from "./_components/SequencesTab";
import { PersonSheet, type PersonRef } from "./_components/PersonSheet";

/**
 * /admin/email — the email operations desk.
 *
 * One place for everyone the business is emailing or could be: site leads
 * (what the site already records) and cold-outbound prospects, the campaigns
 * and sequences they are in, what came back, and the inboxes doing the sending.
 * Rules and thresholds follow coldoutboundskills (src/lib/coldoutbound).
 * Owner-only via the /admin middleware gate + requireOwner in every function.
 */
export default function AdminEmailPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [person, setPerson] = useState<PersonRef | null>(null);

  // The tab lives in the URL so a reload or a shared link lands where you were.
  // Read after mount (not useSearchParams) so the page needs no Suspense shell.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("tab");
    if (TABS.some((t) => t.key === fromUrl)) setTab(fromUrl as TabKey);
  }, []);

  const go = (next: TabKey) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  };

  return (
    <main className="min-h-screen bg-bg-primary p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold text-text-primary">Email</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Everyone you are emailing, what has gone out, what came back, and what needs you next.
        </p>

        <Tabs value={tab} onValueChange={(v) => go(v as TabKey)} className="mt-6">
          <TabsList className="h-auto flex-wrap justify-start bg-bg-secondary">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="data-[state=active]:bg-bg-tertiary data-[state=active]:text-gold"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab go={go} />
          </TabsContent>
          <TabsContent value="people">
            <PeopleTab openPerson={setPerson} />
          </TabsContent>
          <TabsContent value="campaigns">
            <CampaignsTab />
          </TabsContent>
          <TabsContent value="replies">
            <RepliesTab openPerson={setPerson} />
          </TabsContent>
          <TabsContent value="inboxes">
            <InboxesTab />
          </TabsContent>
          <TabsContent value="sequences">
            <SequencesTab />
          </TabsContent>
        </Tabs>
      </div>

      <PersonSheet person={person} onClose={() => setPerson(null)} />
    </main>
  );
}
