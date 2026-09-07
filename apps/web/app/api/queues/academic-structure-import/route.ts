import { processAcademicStructureImportTarget } from "@/lib/structure-import/process-target";
import { createAcademicStructureImportQueueConsumer } from "@/lib/structure-import/queue";

export const runtime = "nodejs";
export const maxDuration = 60;

const consumeAcademicStructureImport =
  createAcademicStructureImportQueueConsumer(
    async ({
      runId,
      targetId,
      messageId,
      deliveryCount,
      maxDeliveries,
      signal,
    }) => {
      await processAcademicStructureImportTarget({
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
  return consumeAcademicStructureImport(request);
}
