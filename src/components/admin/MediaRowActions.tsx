"use client";

import {
  Archive,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import {
  archiveMediaFromLibraryAction,
  cancelUploadAction,
  deleteMediaObjectFromLibraryAction,
  retryFinalizeMediaAction,
} from "@/app/admin/(protected)/media-actions";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import type { MediaLifecycle } from "@/lib/media/types";

export type MediaRowActionId =
  | "retry-finalize"
  | "cancel-upload"
  | "open-details"
  | "archive"
  | "delete-object";

type MediaRowActionsProps = Readonly<{
  assetId: number;
  status: MediaLifecycle;
  sourceType: "upload" | "external";
  hasStoredObject: boolean;
  usageCount: number;
  canManage: boolean;
  canReview: boolean;
}>;

type MenuPosition = Readonly<{ left: number; top: number }>;

export function getMediaRowActionIds({
  status,
  sourceType,
  hasStoredObject,
  usageCount,
  canManage,
}: Omit<MediaRowActionsProps, "assetId" | "canReview">): readonly MediaRowActionId[] {
  if (status === "uploading") {
    return canManage && sourceType === "upload"
      ? ["retry-finalize", "cancel-upload", "open-details"]
      : ["open-details"];
  }

  const actions: MediaRowActionId[] = ["open-details"];
  if (status !== "archived" && canManage && usageCount === 0) {
    actions.push("archive");
  }
  if (
    status === "archived" &&
    canManage &&
    usageCount === 0 &&
    sourceType === "upload" &&
    hasStoredObject
  ) {
    actions.push("delete-object");
  }
  return actions;
}

export function MediaRowActions(props: MediaRowActionsProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const actionIds = getMediaRowActionIds(props);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();
    const space = 8;
    const left = Math.min(
      Math.max(space, trigger.right - menu.width),
      window.innerWidth - menu.width - space,
    );
    const top = trigger.bottom + menu.height + space <= window.innerHeight
      ? trigger.bottom + space
      : Math.max(space, trigger.top - menu.height - space);
    setPosition({ left, top });
    firstMenuItem(menuRef.current)?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function closeForOutsideInteraction(event: PointerEvent | FocusEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    function closeForViewportChange() {
      setOpen(false);
    }

    document.addEventListener("pointerdown", closeForOutsideInteraction);
    document.addEventListener("focusin", closeForOutsideInteraction);
    window.addEventListener("resize", closeForViewportChange);
    window.addEventListener("scroll", closeForViewportChange, {
      capture: true,
      passive: true,
    });
    return () => {
      document.removeEventListener("pointerdown", closeForOutsideInteraction);
      document.removeEventListener("focusin", closeForOutsideInteraction);
      window.removeEventListener("resize", closeForViewportChange);
      window.removeEventListener("scroll", closeForViewportChange, true);
    };
  }, [open]);

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = menuItems(menuRef.current);
    if (items.length === 0) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (currentIndex + 1) % items.length
          : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  return (
    <>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-white px-3 text-sm font-bold text-text-primary outline-none hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
        type="button"
      >
        <MoreHorizontal aria-hidden="true" size={18} />
        <span>Actions</span>
      </button>
      {open
        ? createPortal(
            <div
              aria-label="Media actions"
              className="fixed z-[100] min-w-56 rounded-xl border border-border bg-white p-1.5 shadow-xl"
              id={menuId}
              onKeyDown={handleMenuKeyDown}
              ref={menuRef}
              role="menu"
              style={position
                ? { left: position.left, top: position.top }
                : { left: 0, top: 0, visibility: "hidden" }}
            >
              {actionIds.map((actionId) => (
                <MediaRowAction actionId={actionId} key={actionId} {...props} />
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function MediaRowAction({
  actionId,
  assetId,
  status,
  canReview,
}: MediaRowActionsProps & Readonly<{ actionId: MediaRowActionId }>) {
  const detailHref = `/admin/media/${assetId}`;
  if (actionId === "open-details") {
    return (
      <Link className={menuItemClass} href={detailHref} role="menuitem">
        <Eye aria-hidden="true" size={17} />
        <span>{status === "pending_review" && canReview ? "Review / open details" : "Open details"}</span>
      </Link>
    );
  }
  if (actionId === "retry-finalize") {
    return (
      <form action={retryFinalizeMediaAction.bind(null, assetId)} role="none">
        <button className={menuItemClass} role="menuitem" type="submit">
          <RefreshCw aria-hidden="true" size={17} />
          <span>Retry finalize</span>
        </button>
      </form>
    );
  }
  if (actionId === "cancel-upload") {
    return (
      <form action={cancelUploadAction.bind(null, assetId)} role="none">
        <ConfirmSubmitButton
          className={destructiveMenuItemClass}
          confirmation="Cancel this incomplete upload and delete its stored object if present?"
          role="menuitem"
        >
          <XCircle aria-hidden="true" size={17} />
          <span>Cancel upload</span>
        </ConfirmSubmitButton>
      </form>
    );
  }
  if (actionId === "archive") {
    return (
      <form action={archiveMediaFromLibraryAction.bind(null, assetId)} role="none">
        <ConfirmSubmitButton
          className={destructiveMenuItemClass}
          confirmation="Archive this unreferenced media asset?"
          role="menuitem"
        >
          <Archive aria-hidden="true" size={17} />
          <span>Archive</span>
        </ConfirmSubmitButton>
      </form>
    );
  }
  return (
    <form action={deleteMediaObjectFromLibraryAction.bind(null, assetId)} role="none">
      <ConfirmSubmitButton
        className={destructiveMenuItemClass}
        confirmation="Permanently delete this unreferenced stored object? The archived asset metadata will remain."
        role="menuitem"
      >
        <Trash2 aria-hidden="true" size={17} />
        <span>Delete stored object</span>
      </ConfirmSubmitButton>
    </form>
  );
}

function menuItems(menu: HTMLDivElement | null): HTMLElement[] {
  return menu
    ? Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    : [];
}

function firstMenuItem(menu: HTMLDivElement | null): HTMLElement | undefined {
  return menuItems(menu)[0];
}

const menuItemClass =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-text-primary outline-none hover:bg-slate-50 focus-visible:bg-blue-50 focus-visible:text-primary";
const destructiveMenuItemClass = `${menuItemClass} text-red-700 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:text-red-800`;
