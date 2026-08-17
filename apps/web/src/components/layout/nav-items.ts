import type { Icon } from "@phosphor-icons/react";

export type NavItem = {
  label: string;
  href: string;
  icon: Icon;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};
