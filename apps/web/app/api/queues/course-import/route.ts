import { processCourseImportTarget } from "@/lib/course-import/process-target";
import { createCourseImportQueueConsumer } from "@/lib/course-import/queue";

export const runtime = "nodejs";
export const maxDuration = 60;

const consumeCourseImport = createCourseImportQueueConsumer(
  async ({
    runId,
    targetId,
    messageId,
    deliveryCount,
    maxDeliveries,
    signal,
  }) => {
    await processCourseImportTarget({
      runId,
      targetId,
      messageId,
      deliveryCount,
      maxDeliveries,
      signal,
    });
  },
);

export async function POST(request: Request) {
  return consumeCourseImport(request);
}
