import { Bell, CheckCheck } from "lucide-react";
import { useT } from "../../lib/i18n/LocalizationProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../../shared/ui/dropdown-menu";

// Reference-only shell: Blocks does not expose a notifications API, so this
// renders a real, accessible menu with a static empty state rather than
// faking data against a Blocks endpoint that does not exist.
export function NotificationsMenu() {
  const { t } = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="icon-button" aria-label={t("notifications.title")}>
        <Bell size={18} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[300px]">
        <DropdownMenuLabel>{t("notifications.title")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
          <CheckCheck size={22} className="text-[hsl(var(--muted-foreground))]" />
          <p className="text-sm font-medium">{t("notifications.empty.title")}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{t("notifications.empty.body")}</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}