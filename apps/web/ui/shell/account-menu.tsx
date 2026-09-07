"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  Ellipsis,
  MessageCircle,
  SquarePen,
  LifeBuoy,
  LogOut,
  Route,
  UserRound,
  GraduationCap,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import styles from "./account-menu.module.css";
import { Button } from "@coursemap/ui/primitives/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@coursemap/ui/primitives/popover";
import {
  SidebarMenuButton,
  useSidebar,
} from "@coursemap/ui/primitives/sidebar";
import { useCoursemap } from "@/app/providers";
import { GeneratedAvatar } from "@/ui/common/generated-avatar";
import { AccountAppearance } from "@/ui/shell/account-appearance";

const accountLinks = [
  { href: "/profile", label: "Edit details", icon: UserRound },
  {
    href: "/profile?tab=study",
    label: "Update degree plan",
    icon: GraduationCap,
  },
  { href: "/profile?tab=account", label: "Account", icon: Shield },
];

const links = [
  { href: "/help", label: "Help centre", icon: LifeBuoy },
  { href: "/roadmap", label: "Product roadmap", icon: Route },
];

export function AccountMenu() {
  const { state } = useCoursemap();
  const { isMobile, setOpenMobile, state: sidebarState } = useSidebar();
  const [open, setOpen] = useState(false);
  const detailsLink = useRef<HTMLAnchorElement>(null);
  const profile = state.profile;
  const name = profile.name || "Your account";
  const closeOnNavigate = () => {
    setOpen(false);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <SidebarMenuButton
          size="lg"
          tooltip="Account options"
          aria-label="Account options"
          className={styles.trigger}
        >
          <GeneratedAvatar name={profile.name} email={profile.email} />
          <span className="grid min-w-0 flex-1 text-left leading-tight">
            <span className="truncate text-[13px] font-semibold">{name}</span>
            <span className="truncate text-[11px] text-muted-foreground">
              {profile.studentId || "Personal account"}
            </span>
          </span>
          <span
            className={`${styles.dots} group-data-[collapsible=icon]:hidden`}
          >
            <Ellipsis aria-hidden="true" className="size-4" />
          </span>
        </SidebarMenuButton>
      </PopoverTrigger>
      <PopoverContent
        aria-label="Account options"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          detailsLink.current?.focus();
        }}
        side={!isMobile && sidebarState === "collapsed" ? "right" : "top"}
        align="start"
        sideOffset={10}
        collisionPadding={12}
        className={`${styles.panel} max-h-[var(--radix-popover-content-available-height)] w-72 max-w-[calc(100vw-24px)] gap-0 overflow-y-auto rounded-xl p-0`}
      >
        <div className="flex items-center gap-3 px-4 py-4">
          <GeneratedAvatar
            name={profile.name}
            email={profile.email}
            className="size-9 text-xs"
          />
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {profile.email || "Personal account"}
            </p>
          </div>
        </div>
        <div className="border-t p-1.5">
          {accountLinks.map(({ href, label, icon: Icon }) => (
            <Button key={href} asChild variant="ghost" className={styles.row}>
              <Link
                ref={href === "/profile" ? detailsLink : undefined}
                href={href}
                onClick={closeOnNavigate}
              >
                {label}
                <Icon aria-hidden="true" />
              </Link>
            </Button>
          ))}
        </div>
        <div className="border-t p-1.5">
          <div className={styles.themeRow}>
            <span>Theme</span>
            <AccountAppearance />
          </div>
          <Button asChild variant="ghost" className={styles.row}>
            <Link href="/help#contact" onClick={closeOnNavigate}>
              Feedback
              <MessageCircle aria-hidden="true" />
            </Link>
          </Button>

          <Button
            variant="ghost"
            className={styles.row}
            onClick={() => toast.info("The changelog is coming soon.")}
          >
            Changelog
            <SquarePen aria-hidden="true" />
          </Button>
          {links.map(({ href, label, icon: Icon }) => (
            <Button key={href} asChild variant="ghost" className={styles.row}>
              <Link href={href} onClick={closeOnNavigate}>
                {label}
                <Icon aria-hidden="true" />
              </Link>
            </Button>
          ))}
        </div>
        <form action="/auth/logout" method="post" className="border-t p-1.5">
          <Button
            type="submit"
            variant="ghost"
            className={`${styles.row} ${styles.signOut}`}
          >
            Sign out
            <LogOut aria-hidden="true" />
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
