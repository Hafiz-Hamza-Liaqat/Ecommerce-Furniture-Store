/**
 * RC7.1 — Bounded authorized scan for List* pages (ADR D56).
 *
 * totalCount = number of Policy-allowed rows after filterAuthorizedRecords.
 * Repository totals are never copied onto Page.totalCount.
 * Modules must call this helper; alternate total strategies are forbidden.
 */

import {
  AuthorizationError,
  encodeAuthorizedCursor,
  fail,
  LIST_MAX_PAGE_SIZE,
  normalizeListOffsetPage,
  ok,
  requireListCompanyId,
  type ListQueryRequest,
  type Page,
  type PlatformError,
  type Result,
} from "@afh/shared-kernel";
import type { ApplicationContext } from "../context/context.js";
import {
  filterAuthorizedRecords,
  type ListRecordScope,
} from "./record-filtering.js";

/** Default candidate batch size (matches existing summary page bound). */
export const LIST_CANDIDATE_BATCH_SIZE = LIST_MAX_PAGE_SIZE;

/** Fail closed if more candidates would be scanned (never return a silent partial total). */
export const LIST_MAX_CANDIDATE_SCAN = 10_000;

export type FetchListCandidates<T> = (args: {
  readonly companyId: string;
  readonly offset: number;
  readonly limit: number;
}) => Promise<Result<readonly T[], PlatformError>>;

export type BuildAuthorizedListPageArgs<T> = {
  readonly ctx: ApplicationContext;
  readonly action: string;
  readonly resourceType: string;
  readonly request: ListQueryRequest;
  readonly toScope: (record: T) => ListRecordScope;
  /**
   * Company-scoped candidate fetcher (module-owned repository).
   * Return fewer than `limit` items to signal candidate exhaustion.
   */
  readonly fetchCandidates: FetchListCandidates<T>;
  readonly batchSize?: number;
  readonly maxCandidateScan?: number;
};

/**
 * Run a bounded authorized scan and return a Page whose totalCount is
 * the authorized population only.
 */
export async function buildAuthorizedListPage<T>(
  args: BuildAuthorizedListPageArgs<T>,
): Promise<Result<Page<T>, PlatformError>> {
  const company = requireListCompanyId(args.request.companyId);
  if (!company.ok) {
    return company;
  }

  const window = normalizeListOffsetPage(args.request);
  if (!window.ok) {
    return window;
  }

  const batchSize = Math.min(
    Math.max(1, args.batchSize ?? LIST_CANDIDATE_BATCH_SIZE),
    LIST_MAX_PAGE_SIZE,
  );
  const maxScan = Math.max(1, args.maxCandidateScan ?? LIST_MAX_CANDIDATE_SCAN);

  const authorized: T[] = [];
  let candidateOffset = 0;
  let scanned = 0;

  for (;;) {
    if (scanned >= maxScan) {
      return fail(
        new AuthorizationError(
          "List candidate scan exceeded safety ceiling; refusing partial authorized total",
          {
            code: "list_scan_ceiling",
            details: { maxCandidateScan: maxScan, scanned },
          },
        ),
      );
    }

    const remainingCeiling = maxScan - scanned;
    const limit = Math.min(batchSize, remainingCeiling);
    const batch = await args.fetchCandidates({
      companyId: company.value,
      offset: candidateOffset,
      limit,
    });
    if (!batch.ok) {
      return batch;
    }

    const candidates = batch.value;
    if (candidates.length === 0) {
      break;
    }

    scanned += candidates.length;
    const filtered = await filterAuthorizedRecords(
      args.ctx,
      args.action,
      args.resourceType,
      candidates,
      args.toScope,
    );
    if (!filtered.ok) {
      return filtered;
    }
    for (const row of filtered.value) {
      authorized.push(row);
    }

    if (candidates.length < limit) {
      break;
    }
    candidateOffset += candidates.length;
  }

  const totalCount = authorized.length;
  const items = authorized.slice(
    window.value.offset,
    window.value.offset + window.value.pageSize,
  );
  const nextOffset = window.value.offset + items.length;
  const hasMore = nextOffset < totalCount;

  return ok({
    items,
    totalCount,
    page: window.value.page,
    pageSize: window.value.pageSize,
    nextCursor: hasMore ? encodeAuthorizedCursor(nextOffset) : null,
    hasMore,
  });
}
