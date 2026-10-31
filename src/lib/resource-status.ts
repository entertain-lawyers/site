/**
 * What a study resource can show a reader. Case summaries and notes migrated
 * from WordPress (and "Write Note" resources) are text with no PDF, so a
 * missing documentId alone does not mean the resource is empty.
 */
export type ResourceBodyStatus = 'UPLOADED' | 'WRITTEN' | 'EMPTY';

export function resourceBodyStatus(resource: {
  documentId: string | null;
  content: string | null;
}): ResourceBodyStatus {
  if (resource.documentId) return 'UPLOADED';
  if (resource.content?.trim()) return 'WRITTEN';
  return 'EMPTY';
}
