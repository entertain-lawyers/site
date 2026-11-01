/**
 * Computes the initial author ID for the resource form.
 * When author mapping is unavailable (migration pending), author assignment is disabled
 * and returns an empty string.
 * When available, default-author selection applies to new resources and existing attribution
 * is preserved when editing.
 */
export function getInitialResourceAuthorId({
  authorMappingAvailable = true,
  resourceAuthorId,
  isEdit,
  defaultAuthorId,
}: {
  authorMappingAvailable?: boolean;
  resourceAuthorId?: string | null;
  isEdit: boolean;
  defaultAuthorId?: string;
}): string {
  if (!authorMappingAvailable) return '';
  if (isEdit) return resourceAuthorId ?? '';
  return defaultAuthorId ?? '';
}

/**
 * Computes the authorUserId payload submitted to createResourceAction or updateResourceAction.
 * Unavailable author mapping NEVER submits authorUserId (returns undefined), preventing actions
 * from rejecting saving when migrations are pending.
 */
export function getSubmittedResourceAuthorId({
  authorMappingAvailable = true,
  authorUserId,
}: {
  authorMappingAvailable?: boolean;
  authorUserId?: string;
}): string | undefined {
  if (!authorMappingAvailable) return undefined;
  return authorUserId || undefined;
}
