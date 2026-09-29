"use server";

import { processSainteLucieRequest } from "./submission";
import type { SainteLucieResult } from "./submission";

export async function submitSainteLucieRequest(input: unknown): Promise<SainteLucieResult> {
  return processSainteLucieRequest(input);
}
