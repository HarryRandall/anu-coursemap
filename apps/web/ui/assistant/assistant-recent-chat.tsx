"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@coursemap/ui/primitives/dialog";
import { Input } from "@coursemap/ui/primitives/input";
import { Button } from "@coursemap/ui/primitives/button";
import { useState } from "react";
import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from "@coursemap/ui/primitives/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@coursemap/ui/primitives/dropdown-menu";
import styles from "./assistant-recent-chat.module.css";
import { assistantTitle, type AssistantDraft } from "@/lib/assistant/history";

export function AssistantRecentChat({
  chat,
  age,
  active,
  onSelect,
  onDelete,
  onRename,
}: {
  chat: AssistantDraft;
  age: string;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const title = assistantTitle(chat);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(title);
  return (
    <SidebarMenuItem className={styles.row} data-open={open}>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={title}
        className="h-10 gap-3 px-3 pr-12 data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
      >
        <Link
          href={`/compass/${chat.id}`}
          onClick={(event) => {
            event.preventDefault();
            onSelect();
          }}
        >
          <MessageSquare aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{title}</span>
          <time
            dateTime={chat.updatedAt}
            className={`${styles.time} absolute right-3 w-7 text-right text-xs text-muted-foreground tabular-nums`}
          >
            {age}
          </time>
        </Link>
      </SidebarMenuButton>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            className={`${styles.action} top-2 right-2 size-6 hover:bg-transparent`}
            aria-label={`Options for ${title}`}
          >
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" className="w-40 p-1">
          <DropdownMenuItem
            onSelect={() => {
              setName(title);
              setRenaming(true);
            }}
          >
            <Pencil aria-hidden="true" />
            Rename chat
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 aria-hidden="true" />
            Delete chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim()) return;
              onRename(name);
              setRenaming(false);
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>Rename chat</DialogTitle>
            </DialogHeader>
            <Input
              aria-label="Chat name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={64}
              autoFocus
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenaming(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarMenuItem>
  );
}
