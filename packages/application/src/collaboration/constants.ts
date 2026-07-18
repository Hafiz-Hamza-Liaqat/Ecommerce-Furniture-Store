export const CollaborationCommandTypes = {
  CreateEntityNote: "collaboration.CreateEntityNote",
  DeleteEntityNote: "collaboration.DeleteEntityNote",
  AttachEntityAsset: "collaboration.AttachEntityAsset",
  DetachEntityAsset: "collaboration.DetachEntityAsset",
} as const;

export const CollaborationQueryTypes = {
  ListEntityNotes: "collaboration.ListEntityNotes",
  ListEntityAttachments: "collaboration.ListEntityAttachments",
} as const;
