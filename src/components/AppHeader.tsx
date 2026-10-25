import { Logo } from "@/components/AppHeader";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function Logo() {
  return null;
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-card/60 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-5" />
        <Logo />
      </div>
    </header>
  );
}
