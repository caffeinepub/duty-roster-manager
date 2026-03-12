import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Calendar, CalendarOff, ClipboardList, Users } from "lucide-react";
import { HolidaysTab } from "./components/HolidaysTab";
import { LeavesTab } from "./components/LeavesTab";
import { PersonnelTab } from "./components/PersonnelTab";
import { RosterTab } from "./components/RosterTab";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 30, retry: 1 },
  },
});

function AppShell() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card shadow-xs sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-base font-semibold tracking-tight leading-none">
                DutyRoster
              </h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                Medical Duty Scheduler
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <Tabs defaultValue="roster" className="space-y-6">
          <TabsList className="bg-muted/60 p-1 h-auto gap-0.5">
            <TabsTrigger
              value="personnel"
              data-ocid="nav.personnel.tab"
              className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-xs"
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Personnel</span>
            </TabsTrigger>
            <TabsTrigger
              value="leaves"
              data-ocid="nav.leaves.tab"
              className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-xs"
            >
              <CalendarOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Leaves & Requests</span>
            </TabsTrigger>
            <TabsTrigger
              value="holidays"
              data-ocid="nav.holidays.tab"
              className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-xs"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Holidays</span>
            </TabsTrigger>
            <TabsTrigger
              value="roster"
              data-ocid="nav.roster.tab"
              className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-xs"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Roster</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personnel">
            <PersonnelTab />
          </TabsContent>
          <TabsContent value="leaves">
            <LeavesTab />
          </TabsContent>
          <TabsContent value="holidays">
            <HolidaysTab />
          </TabsContent>
          <TabsContent value="roster">
            <RosterTab />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t bg-card py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            &copy; {year}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              caffeine.ai
            </a>
          </p>
          <p className="text-xs text-muted-foreground">
            Medical Duty Roster Manager
          </p>
        </div>
      </footer>

      <Toaster richColors position="top-right" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
