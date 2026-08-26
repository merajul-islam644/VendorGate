import { Boxes, Home, UserRound } from "lucide-react";

export const navItems = [
  { href: "/", labelKey: "nav.dashboard", icon: Home },
  { href: "/assets", labelKey: "nav.assets", icon: Boxes },
  { href: "/profile", labelKey: "nav.profile", icon: UserRound }
] as const;
