import type { EntityDef, FilterDef, ModuleDefinition } from "../erp/types";
import { makeRows, row } from "../erp/fixtures";

const filters: FilterDef[] = [
  { key: "status", label: "Status", options: ["Draft", "Approved", "Published", "Archived"] },
  { key: "type", label: "Type", options: ["Image", "Video", "Document", "CAD", "3D", "Brand"] },
  { key: "collection", label: "Collection" },
  { key: "tag", label: "Tag" },
  { key: "date", label: "Date" },
];

function e(p: Omit<EntityDef, "filters"> & { filters?: EntityDef["filters"] }): EntityDef {
  return { filters, ...p };
}

export const DAM_MODULE: ModuleDefinition = {
  id: "dam",
  title: "Digital Asset Management",
  lead: "Assets via DAM upload API and presentation catalogue — storage ownership remains backend DAM.",
  basePath: "/app/dam",
  kpis: [
    { label: "Assets", value: "6,420", trend: 4.0, href: "images" },
    { label: "Pending approval", value: "17", trend: -2.0, href: "approvals" },
    { label: "Downloads (30d)", value: "890", trend: 6.0, href: "downloads" },
    { label: "Collections", value: "64", trend: 1.0, href: "collections" },
  ],
  nav: [
    { to: "", label: "Dashboard" },
    { to: "images", label: "Images", entityKey: "images" },
    { to: "videos", label: "Videos", entityKey: "videos" },
    { to: "documents", label: "Documents", entityKey: "documents" },
    { to: "cad", label: "CAD files", entityKey: "cad" },
    { to: "models", label: "3D models", entityKey: "models" },
    { to: "brand", label: "Brand assets", entityKey: "brand" },
    { to: "collections", label: "Collections", entityKey: "collections" },
    { to: "folders", label: "Folders", entityKey: "folders" },
    { to: "metadata", label: "Metadata", entityKey: "metadata" },
    { to: "tags", label: "Tags", entityKey: "tags" },
    { to: "versions", label: "Version history", entityKey: "versions" },
    { to: "downloads", label: "Downloads", entityKey: "downloads" },
    { to: "usage", label: "Usage tracking", entityKey: "usage" },
    { to: "approvals", label: "Approval status", entityKey: "approvals" },
    { to: "preview", label: "Asset preview", entityKey: "preview" },
    { to: "assets", label: "Upload asset", entityKey: "assets" },
  ],
  entities: [
    e({
      key: "assets",
      label: "Asset",
      plural: "Upload asset",
      description: "Create asset metadata through the upload API.",
      columns: [
        { key: "title", label: "Asset" },
        { key: "status", label: "Status" },
        { key: "Type", label: "Type" },
        { key: "MIME", label: "MIME" },
      ],
      fields: [
        { name: "name", label: "Asset name", type: "text", required: true },
        { name: "mimeType", label: "MIME type", type: "text", required: true, placeholder: "image/jpeg" },
        { name: "assetType", label: "Asset type", type: "select", options: ["image", "video", "document", "cad", "model", "brand"] },
      ],
      records: [],
      api: {
        uploadAsset: true,
        extractCreateId: (data) => {
          const d = data as { assetId?: string; id?: string };
          return d.assetId ?? d.id ?? null;
        },
        mapEntity: (data) => {
          const d = data as { id?: string; assetId?: string; name?: string; status?: string; assetType?: string; mimeType?: string };
          const id = d.id ?? d.assetId;
          if (!id) return null;
          return row(id, d.name ?? id, d.status ?? "Draft", {
            Type: d.assetType ?? "document",
            MIME: d.mimeType ?? "—",
          }, { source: "api" });
        },
      },
    }),
    e({
      key: "images",
      label: "Image",
      plural: "Images",
      description: "Image library.",
      columns: [
        { key: "title", label: "Image" },
        { key: "status", label: "Status" },
        { key: "Collection", label: "Collection" },
        { key: "Dims", label: "Dims" },
      ],
      fields: [
        { name: "title", label: "Name", type: "text", required: true },
        { name: "collection", label: "Collection", type: "text" },
      ],
      records: makeRows("IMG", ["hero-lounge.jpg", "factory-cnc.jpg", "atelier-detail.jpg"], (i) => ({
        Collection: ["Campaign", "Factory", "Product"][i]!,
        Dims: ["2400×1600", "2000×1333", "1800×1200"][i]!,
      })),
    }),
    e({
      key: "videos",
      label: "Video",
      plural: "Videos",
      description: "Video library.",
      columns: [
        { key: "title", label: "Video" },
        { key: "status", label: "Status" },
        { key: "Duration", label: "Duration" },
      ],
      fields: [{ name: "title", label: "Name", type: "text", required: true }],
      records: makeRows("VID", ["factory-tour.mp4", "install-timelapse.mp4"], (i) => ({
        Duration: i ? "01:12" : "03:40",
      })),
    }),
    e({
      key: "documents",
      label: "Document",
      plural: "Documents",
      description: "Document library.",
      columns: [
        { key: "title", label: "Document" },
        { key: "status", label: "Status" },
        { key: "Type", label: "Type" },
      ],
      fields: [
        { name: "title", label: "Name", type: "text", required: true },
        { name: "type", label: "Type", type: "select", options: ["PDF", "DOC", "XLS"] },
      ],
      records: makeRows("DOC", ["catalogue.pdf", "care-guide.pdf", "spec-sheet.xlsx"], (i) => ({
        Type: ["PDF", "PDF", "XLS"][i]!,
      })),
    }),
    e({
      key: "cad",
      label: "CAD file",
      plural: "CAD files",
      description: "CAD drawings.",
      columns: [
        { key: "title", label: "File" },
        { key: "status", label: "Status" },
        { key: "Format", label: "Format" },
      ],
      fields: [
        { name: "title", label: "Name", type: "text", required: true },
        { name: "format", label: "Format", type: "select", options: ["DWG", "DXF", "STEP"] },
      ],
      records: makeRows("CAD", ["meridian-frame.dwg", "harbor-top.dxf"], (i) => ({
        Format: i ? "DXF" : "DWG",
      })),
    }),
    e({
      key: "models",
      label: "3D model",
      plural: "3D models",
      description: "3D model assets.",
      columns: [
        { key: "title", label: "Model" },
        { key: "status", label: "Status" },
        { key: "Format", label: "Format" },
      ],
      fields: [
        { name: "title", label: "Name", type: "text", required: true },
        { name: "format", label: "Format", type: "select", options: ["GLB", "OBJ", "FBX"] },
      ],
      records: makeRows("3D", ["atelier-lounge.glb", "studio-credenza.fbx"], (i) => ({
        Format: i ? "FBX" : "GLB",
      })),
    }),
    e({
      key: "brand",
      label: "Brand asset",
      plural: "Brand assets",
      description: "Logos and brand kits.",
      columns: [
        { key: "title", label: "Asset" },
        { key: "status", label: "Status" },
        { key: "Variant", label: "Variant" },
      ],
      fields: [
        { name: "title", label: "Name", type: "text", required: true },
        { name: "variant", label: "Variant", type: "text" },
      ],
      records: makeRows("BRD", ["Logo primary", "Logo reverse", "Wordmark"], (i) => ({
        Variant: ["Color", "Reverse", "Mono"][i]!,
      })),
    }),
    e({
      key: "collections",
      label: "Collection",
      plural: "Collections",
      description: "Asset collections.",
      columns: [
        { key: "title", label: "Collection" },
        { key: "status", label: "Status" },
        { key: "Count", label: "Assets" },
      ],
      fields: [{ name: "title", label: "Collection", type: "text", required: true }],
      records: makeRows("COL", ["Atelier 2026", "Factory tour", "Hospitality refs"], (i) => ({
        Count: 24 + i * 10,
      })),
    }),
    e({
      key: "folders",
      label: "Folder",
      plural: "Folders",
      description: "Folder tree.",
      columns: [
        { key: "title", label: "Folder" },
        { key: "status", label: "Status" },
        { key: "Path", label: "Path" },
      ],
      fields: [
        { name: "title", label: "Folder", type: "text", required: true },
        { name: "path", label: "Path", type: "text" },
      ],
      records: makeRows("FLD", ["Products", "Campaigns", "Legal"], (i) => ({
        Path: ["/products", "/campaigns", "/legal"][i]!,
      })),
    }),
    e({
      key: "metadata",
      label: "Metadata schema",
      plural: "Metadata",
      description: "Metadata fields and values.",
      columns: [
        { key: "title", label: "Field" },
        { key: "status", label: "Status" },
        { key: "Type", label: "Type" },
      ],
      fields: [
        { name: "title", label: "Field", type: "text", required: true },
        { name: "type", label: "Type", type: "select", options: ["Text", "Number", "Date", "Enum"] },
      ],
      records: makeRows("META", ["SKU", "Photographer", "Rights"], (i) => ({
        Type: ["Text", "Text", "Enum"][i]!,
      })),
    }),
    e({
      key: "tags",
      label: "Tag",
      plural: "Tags",
      description: "Asset tags.",
      columns: [
        { key: "title", label: "Tag" },
        { key: "status", label: "Status" },
        { key: "Uses", label: "Uses" },
      ],
      fields: [{ name: "title", label: "Tag", type: "text", required: true }],
      records: makeRows("DTG", ["hero", "detail", "lifestyle"], (i) => ({
        Uses: 40 + i * 12,
      })),
    }),
    e({
      key: "versions",
      label: "Version",
      plural: "Version history",
      description: "Asset versions.",
      columns: [
        { key: "title", label: "Version" },
        { key: "status", label: "Status" },
        { key: "Asset", label: "Asset" },
      ],
      fields: [
        { name: "title", label: "Version", type: "text", required: true },
        { name: "asset", label: "Asset", type: "text" },
      ],
      records: makeRows("DVER", ["hero-lounge v3", "logo primary v2"], (i) => ({
        Asset: ["hero-lounge.jpg", "Logo primary"][i]!,
      })),
    }),
    e({
      key: "downloads",
      label: "Download",
      plural: "Downloads",
      description: "Download events.",
      columns: [
        { key: "title", label: "Asset" },
        { key: "status", label: "When" },
        { key: "User", label: "User" },
      ],
      fields: [{ name: "title", label: "Asset", type: "text", required: true }],
      records: makeRows("DL", ["catalogue.pdf", "logo primary.svg"], (i) => ({
        User: i ? "Partner" : "Internal",
      })),
    }),
    e({
      key: "usage",
      label: "Usage",
      plural: "Usage tracking",
      description: "Where assets are used.",
      columns: [
        { key: "title", label: "Asset" },
        { key: "status", label: "Status" },
        { key: "Surface", label: "Surface" },
      ],
      fields: [
        { name: "title", label: "Asset", type: "text", required: true },
        { name: "surface", label: "Surface", type: "text" },
      ],
      records: makeRows("USE", ["hero-lounge.jpg", "logo primary"], (i) => ({
        Surface: i ? "Email header" : "Public home",
      })),
    }),
    e({
      key: "approvals",
      label: "Approval",
      plural: "Approval status",
      description: "Asset approval queue.",
      columns: [
        { key: "title", label: "Asset" },
        { key: "status", label: "Status" },
        { key: "Owner", label: "Owner" },
      ],
      fields: [
        { name: "title", label: "Asset", type: "text", required: true },
        { name: "owner", label: "Owner", type: "text" },
      ],
      records: makeRows("DAP", ["campaign hero draft", "new wordmark"], () => ({
        Owner: "Brand",
      })),
    }),
    e({
      key: "preview",
      label: "Preview",
      plural: "Asset preview",
      description: "Preview-ready assets.",
      columns: [
        { key: "title", label: "Asset" },
        { key: "status", label: "Status" },
        { key: "Preview", label: "Preview" },
      ],
      fields: [{ name: "title", label: "Asset", type: "text", required: true }],
      records: makeRows("PRV", ["hero-lounge.jpg", "atelier-detail.jpg"], () => ({
        Preview: "Ready",
      })),
    }),
  ],
};
