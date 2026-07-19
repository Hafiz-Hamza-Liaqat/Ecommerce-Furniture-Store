import type { EntityDef, FilterDef, ModuleDefinition } from "../erp/types";
import { makeRows, row } from "../erp/fixtures";

const filters: FilterDef[] = [
  { key: "status", label: "Status", options: ["Draft", "Published", "Scheduled", "Archived"] },
  { key: "locale", label: "Locale", options: ["en", "ur", "ar"] },
  { key: "category", label: "Category" },
  { key: "author", label: "Author" },
  { key: "date", label: "Date" },
];

function e(p: Omit<EntityDef, "filters"> & { filters?: EntityDef["filters"] }): EntityDef {
  return { filters, ...p };
}

export const CMS_MODULE: ModuleDefinition = {
  id: "cms",
  title: "CMS",
  lead: "Content entries via CMS Application CQRS — pages create/update/list/get; other chrome remains presentation.",
  basePath: "/app/cms",
  kpis: [
    { label: "Published pages", value: "Live", trend: 2.0, href: "pages" },
    { label: "Drafts", value: "—", trend: -1.0, href: "articles" },
    { label: "Locales", value: "3", trend: 0, href: "localization" },
    { label: "Redirects", value: "26", trend: 1.0, href: "redirects" },
  ],
  nav: [
    { to: "", label: "Dashboard" },
    { to: "pages", label: "Pages", entityKey: "pages" },
    { to: "blogs", label: "Blogs", entityKey: "blogs" },
    { to: "articles", label: "Articles", entityKey: "articles" },
    { to: "news", label: "News", entityKey: "news" },
    { to: "faq", label: "FAQ", entityKey: "faq" },
    { to: "policies", label: "Policies", entityKey: "policies" },
    { to: "landing", label: "Landing pages", entityKey: "landing" },
    { to: "menus", label: "Menus", entityKey: "menus" },
    { to: "footer", label: "Footer", entityKey: "footer" },
    { to: "categories", label: "Categories", entityKey: "categories" },
    { to: "tags", label: "Tags", entityKey: "tags" },
    { to: "seo", label: "SEO", entityKey: "seo" },
    { to: "redirects", label: "Redirects", entityKey: "redirects" },
    { to: "localization", label: "Localization", entityKey: "localization" },
    { to: "versions", label: "Version history", entityKey: "versions" },
    { to: "media", label: "Media browser", entityKey: "media" },
    { to: "analytics", label: "Analytics", entityKey: "analytics" },
  ],
  entities: [
    e({
      key: "pages",
      label: "Page",
      plural: "Pages",
      description: "Site pages.",
      columns: [
        { key: "title", label: "Page", sortable: true },
        { key: "status", label: "Status" },
        { key: "Path", label: "Path" },
        { key: "Locale", label: "Locale" },
      ],
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "slug", label: "Slug / path", type: "text", required: true },
        {
          name: "kind",
          label: "Kind",
          type: "select",
          options: ["page", "article", "news", "landing_page", "static", "policy", "faq", "other"],
        },
        { name: "summary", label: "Summary", type: "textarea" },
        { name: "localeCode", label: "Locale", type: "select", options: ["en", "ur", "ar"] },
        {
          name: "publish",
          label: "Publish now",
          type: "select",
          options: ["false", "true"],
        },
      ],
      records: makeRows("PG", ["Home", "About", "Manufacturing", "Contact"], (i) => ({
        Path: ["/", "/about", "/manufacturing", "/contact"][i]!,
        Locale: "en",
      })),
      api: {
        createCommandType: "cms.CreateCmsEntry",
        updateCommandType: "cms.UpdateCmsEntry",
        getQueryType: "cms.GetCmsEntry",
        listQueryType: "cms.ListCmsEntry",
        buildCreatePayload: (companyId, v) => ({
          companyId,
          kind: v.kind || "page",
          slug: v.slug,
          title: v.title,
          summary: v.summary || null,
          localeCode: v.localeCode || "en",
          publish: v.publish === "true",
        }),
        buildUpdatePayload: (companyId, contentId, v) => ({
          companyId,
          contentId,
          title: v.title || null,
          summary: v.summary || null,
          localeCode: v.localeCode || null,
          publish: v.publish === "true",
        }),
        buildGetPayload: (companyId, id) => ({ companyId, contentId: id }),
        extractCreateId: (data) => (data as { contentId?: string }).contentId ?? null,
        mapEntity: (data) => {
          const wrapped = data as { content?: Record<string, unknown> };
          const d = (wrapped.content ?? data) as {
            id?: string;
            title?: string;
            status?: string;
            slug?: string;
            localeCode?: string | null;
          };
          if (!d.id) return null;
          return row(d.id, d.title ?? d.slug ?? d.id, d.status ?? "draft", {
            Path: d.slug ?? "—",
            Locale: d.localeCode ?? "en",
          }, { source: "api" });
        },
      },
    }),
    e({
      key: "blogs",
      label: "Blog post",
      plural: "Blogs",
      description: "Blog posts.",
      columns: [
        { key: "title", label: "Post" },
        { key: "status", label: "Status" },
        { key: "Author", label: "Author" },
      ],
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "author", label: "Author", type: "text" },
      ],
      records: makeRows("BLG", ["Material stories", "Workplace trends", "Craft notes"], (i) => ({
        Author: ["Maya Chen", "Studio", "Ops"][i]!,
      })),
    }),
    e({
      key: "articles",
      label: "Article",
      plural: "Articles",
      description: "Long-form articles.",
      columns: [
        { key: "title", label: "Article" },
        { key: "status", label: "Status" },
        { key: "Category", label: "Category" },
      ],
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "category", label: "Category", type: "text" },
      ],
      records: makeRows("ART", ["Specifying for longevity", "Hospitality durability"], () => ({
        Category: "Insights",
      })),
    }),
    e({
      key: "news",
      label: "News item",
      plural: "News",
      description: "News releases.",
      columns: [
        { key: "title", label: "News" },
        { key: "status", label: "Status" },
        { key: "Date", label: "Date" },
      ],
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "date", label: "Date", type: "date" },
      ],
      records: makeRows("NWS", ["Atelier launch", "Open factory days"], (i) => ({
        Date: i ? "2026-02-01" : "2026-03-01",
      })),
    }),
    e({
      key: "faq",
      label: "FAQ",
      plural: "FAQ",
      description: "Frequently asked questions.",
      columns: [
        { key: "title", label: "Question" },
        { key: "status", label: "Status" },
        { key: "Category", label: "Category" },
      ],
      fields: [
        { name: "title", label: "Question", type: "text", required: true },
        { name: "answer", label: "Answer", type: "textarea" },
      ],
      records: makeRows("FAQ", ["Lead times?", "Custom finishes?", "Export?"], () => ({
        Category: "General",
      })),
    }),
    e({
      key: "policies",
      label: "Policy",
      plural: "Policies",
      description: "Legal and policy pages.",
      columns: [
        { key: "title", label: "Policy" },
        { key: "status", label: "Status" },
        { key: "Path", label: "Path" },
      ],
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "path", label: "Path", type: "text" },
      ],
      records: makeRows("POL", ["Privacy", "Terms"], (i) => ({
        Path: i ? "/terms" : "/privacy",
      })),
    }),
    e({
      key: "landing",
      label: "Landing page",
      plural: "Landing pages",
      description: "Campaign landing pages.",
      columns: [
        { key: "title", label: "Landing" },
        { key: "status", label: "Status" },
        { key: "Campaign", label: "Campaign" },
      ],
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "campaign", label: "Campaign", type: "text" },
      ],
      records: makeRows("LND", ["Atelier launch LP", "Factory open day LP"], (i) => ({
        Campaign: i ? "Factory open day" : "Atelier launch",
      })),
    }),
    e({
      key: "menus",
      label: "Menu",
      plural: "Menus",
      description: "Navigation menus.",
      columns: [
        { key: "title", label: "Menu" },
        { key: "status", label: "Status" },
        { key: "Items", label: "Items" },
      ],
      fields: [{ name: "title", label: "Menu", type: "text", required: true }],
      records: makeRows("MNU", ["Primary", "Footer company", "Footer legal"], (i) => ({
        Items: 6 + i,
      })),
    }),
    e({
      key: "footer",
      label: "Footer block",
      plural: "Footer",
      description: "Footer content blocks.",
      columns: [
        { key: "title", label: "Block" },
        { key: "status", label: "Status" },
        { key: "Locale", label: "Locale" },
      ],
      fields: [
        { name: "title", label: "Block", type: "text", required: true },
        { name: "locale", label: "Locale", type: "select", options: ["en", "ur", "ar"] },
      ],
      records: makeRows("FTR", ["Brand blurb", "Newsletter", "Legal links"], () => ({
        Locale: "en",
      })),
    }),
    e({
      key: "categories",
      label: "Category",
      plural: "Categories",
      description: "Content categories.",
      columns: [
        { key: "title", label: "Category" },
        { key: "status", label: "Status" },
        { key: "Count", label: "Entries" },
      ],
      fields: [{ name: "title", label: "Category", type: "text", required: true }],
      records: makeRows("CCT", ["Insights", "News", "Guides"], (i) => ({
        Count: 8 + i * 3,
      })),
    }),
    e({
      key: "tags",
      label: "Tag",
      plural: "Tags",
      description: "Content tags.",
      columns: [
        { key: "title", label: "Tag" },
        { key: "status", label: "Status" },
        { key: "Uses", label: "Uses" },
      ],
      fields: [{ name: "title", label: "Tag", type: "text", required: true }],
      records: makeRows("TAG", ["hospitality", "timber", "workplace"], (i) => ({
        Uses: 12 + i * 4,
      })),
    }),
    e({
      key: "seo",
      label: "SEO record",
      plural: "SEO",
      description: "SEO metadata records.",
      columns: [
        { key: "title", label: "Path" },
        { key: "status", label: "Status" },
        { key: "TitleTag", label: "Title tag" },
      ],
      fields: [
        { name: "title", label: "Path", type: "text", required: true },
        { name: "titleTag", label: "Title tag", type: "text" },
      ],
      records: makeRows("SEO", ["/", "/about", "/products"], (i) => ({
        TitleTag: ["AFH", "About AFH", "Catalogue"][i]!,
      })),
    }),
    e({
      key: "redirects",
      label: "Redirect",
      plural: "Redirects",
      description: "URL redirects.",
      columns: [
        { key: "title", label: "From" },
        { key: "status", label: "Status" },
        { key: "To", label: "To" },
        { key: "Code", label: "Code" },
      ],
      fields: [
        { name: "title", label: "From", type: "text", required: true },
        { name: "to", label: "To", type: "text" },
      ],
      records: makeRows("RDR", ["/old-about", "/catalog", "/contact-us"], (i) => ({
        To: ["/about", "/products", "/contact"][i]!,
        Code: 301,
      })),
    }),
    e({
      key: "localization",
      label: "Locale pack",
      plural: "Localization",
      description: "Locale packs and coverage.",
      columns: [
        { key: "title", label: "Locale" },
        { key: "status", label: "Status" },
        { key: "Coverage", label: "Coverage" },
      ],
      fields: [
        { name: "title", label: "Locale", type: "text", required: true },
        { name: "coverage", label: "Coverage", type: "text" },
      ],
      records: makeRows("LOC", ["en", "ur", "ar"], (i) => ({
        Coverage: ["100%", "62%", "40%"][i]!,
      })),
    }),
    e({
      key: "versions",
      label: "Version",
      plural: "Version history",
      description: "Content version history.",
      columns: [
        { key: "title", label: "Version" },
        { key: "status", label: "Status" },
        { key: "Author", label: "Author" },
      ],
      fields: [
        { name: "title", label: "Version label", type: "text", required: true },
        { name: "author", label: "Author", type: "text" },
      ],
      records: makeRows("VER", ["Home v12", "About v4", "Privacy v3"], (i) => ({
        Author: ["Editor", "Legal", "Editor"][i]!,
      })),
    }),
    e({
      key: "media",
      label: "Media item",
      plural: "Media browser",
      description: "CMS media browser.",
      columns: [
        { key: "title", label: "Asset" },
        { key: "status", label: "Status" },
        { key: "Type", label: "Type" },
      ],
      fields: [
        { name: "title", label: "Name", type: "text", required: true },
        { name: "type", label: "Type", type: "select", options: ["Image", "Video", "PDF"] },
      ],
      records: makeRows("MED", ["hero-lounge.jpg", "factory-tour.mp4", "catalogue.pdf"], (i) => ({
        Type: ["Image", "Video", "PDF"][i]!,
      })),
    }),
    e({
      key: "analytics",
      label: "Analytics view",
      plural: "CMS analytics",
      description: "CMS analytics gallery.",
      analytics: true,
      columns: [
        { key: "title", label: "View" },
        { key: "status", label: "Period" },
        { key: "Value", label: "Value" },
      ],
      fields: [{ name: "title", label: "View", type: "text", required: true }],
      records: makeRows("CMA", ["Page views", "Top landing", "Bounce"], (i) => ({
        Value: ["128k", "/products", "34%"][i]!,
      })),
    }),
  ],
};
