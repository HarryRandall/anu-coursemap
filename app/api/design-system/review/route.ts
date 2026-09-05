import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  emptyComponentReviewFile,
  isComponentReviewDecision,
  isComponentReviewSource,
  type ComponentReviewDecision,
  type ComponentReviewFile,
  type ComponentReviewItem,
} from "@/components/design-system/review/review-types";

export const dynamic = "force-dynamic";

const reviewFilePath = path.join(
  process.cwd(),
  "docs",
  "design-system",
  "component-review.json",
);

let writeQueue = Promise.resolve();

function isLocalDevelopmentRequest(request: Request) {
  if (process.env.NODE_ENV !== "development") return false;

  const hostname = new URL(request.url).hostname;
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
  );
}

function isReviewItem(value: unknown): value is ComponentReviewItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ComponentReviewItem>;
  return (
    typeof item.id === "string" &&
    /^[a-z0-9][a-z0-9:_-]{2,159}$/.test(item.id) &&
    typeof item.family === "string" &&
    item.family.length > 0 &&
    item.family.length <= 80 &&
    typeof item.title === "string" &&
    item.title.length > 0 &&
    item.title.length <= 160 &&
    (item.description === undefined ||
      (typeof item.description === "string" &&
        item.description.length <= 500)) &&
    isComponentReviewSource(item.source)
  );
}

function isReviewFile(value: unknown): value is ComponentReviewFile {
  if (!value || typeof value !== "object") return false;
  const review = value as Partial<ComponentReviewFile>;
  return (
    review.version === 1 &&
    (review.updatedAt === null || typeof review.updatedAt === "string") &&
    Boolean(review.decisions) &&
    typeof review.decisions === "object"
  );
}

async function readReviewFile(): Promise<ComponentReviewFile> {
  try {
    const contents = await readFile(reviewFilePath, "utf8");
    const parsed: unknown = JSON.parse(contents);
    return isReviewFile(parsed) ? parsed : emptyComponentReviewFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyComponentReviewFile;
    }
    throw error;
  }
}

async function writeReviewFile(review: ComponentReviewFile) {
  await mkdir(path.dirname(reviewFilePath), { recursive: true });
  const temporaryPath = `${reviewFilePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(
    temporaryPath,
    `${JSON.stringify(review, null, 2)}\n`,
    "utf8",
  );
  await rename(temporaryPath, reviewFilePath);
}

function unavailableResponse() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET(request: Request) {
  if (!isLocalDevelopmentRequest(request)) return unavailableResponse();

  return NextResponse.json(await readReviewFile(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PATCH(request: Request) {
  if (!isLocalDevelopmentRequest(request)) return unavailableResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid review update" },
      { status: 400 },
    );
  }

  const update = body as {
    item?: unknown;
    decision?: ComponentReviewDecision | null;
  };
  const item = update.item;
  const decision = update.decision;
  if (
    !isReviewItem(item) ||
    !(decision === null || isComponentReviewDecision(decision))
  ) {
    return NextResponse.json(
      { error: "Invalid review update" },
      { status: 400 },
    );
  }

  let result = emptyComponentReviewFile;
  writeQueue = writeQueue
    .catch(() => {})
    .then(async () => {
      const review = await readReviewFile();
      const updatedAt = new Date().toISOString();
      const decisions = { ...review.decisions };

      if (decision === null) {
        delete decisions[item.id];
      } else {
        decisions[item.id] = {
          ...item,
          decision,
          updatedAt,
        };
      }

      result = { version: 1, updatedAt, decisions };
      await writeReviewFile(result);
    });

  try {
    await writeQueue;
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Could not save the component review" },
      { status: 500 },
    );
  }
}
