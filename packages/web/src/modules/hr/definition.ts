import type { EntityDef, FilterDef, ModuleDefinition } from "../erp/types";
import { makeRows } from "../erp/fixtures";

const filters: FilterDef[] = [
  { key: "status", label: "Status", options: ["Active", "On leave", "Probation", "Exited"] },
  { key: "department", label: "Department", options: ["Operations", "Design", "Sales", "Finance", "Plant"] },
  { key: "location", label: "Location", options: ["Lahore HQ", "Factory", "Karachi"] },
  { key: "date", label: "Date" },
];

function e(p: Omit<EntityDef, "filters"> & { filters?: EntityDef["filters"] }): EntityDef {
  return { filters, ...p };
}

export const HR_MODULE: ModuleDefinition = {
  id: "hr",
  title: "HR",
  lead: "People operations presentation over the HR foundation — handlers dispatch when registered; records persist locally until then.",
  basePath: "/app/hr",
  kpis: [
    { label: "Employees", value: "418", trend: 1.2, href: "employees" },
    { label: "Open leave", value: "22", trend: 0, href: "leave" },
    { label: "Open roles", value: "9", trend: 2.0, href: "recruitment" },
    { label: "Training due", value: "14", trend: -1.0, href: "training" },
  ],
  nav: [
    { to: "", label: "Dashboard" },
    { to: "employees", label: "Employees", entityKey: "employees" },
    { to: "departments", label: "Departments", entityKey: "departments" },
    { to: "org-chart", label: "Organization chart", entityKey: "org-chart" },
    { to: "attendance", label: "Attendance", entityKey: "attendance" },
    { to: "leave", label: "Leave", entityKey: "leave" },
    { to: "payroll", label: "Payroll overview", entityKey: "payroll" },
    { to: "recruitment", label: "Recruitment", entityKey: "recruitment" },
    { to: "applicants", label: "Applicants", entityKey: "applicants" },
    { to: "training", label: "Training", entityKey: "training" },
    { to: "performance", label: "Performance", entityKey: "performance" },
    { to: "skills", label: "Skills", entityKey: "skills" },
    { to: "certifications", label: "Certifications", entityKey: "certifications" },
    { to: "shifts", label: "Shift planner", entityKey: "shifts" },
    { to: "assets", label: "Assets", entityKey: "assets" },
    { to: "documents", label: "Documents", entityKey: "documents" },
    { to: "analytics", label: "Analytics", entityKey: "analytics" },
  ],
  entities: [
    e({
      key: "employees",
      label: "Employee",
      plural: "Employees",
      description: "Employee directory.",
      columns: [
        { key: "title", label: "Employee", sortable: true },
        { key: "status", label: "Status" },
        { key: "Department", label: "Department" },
        { key: "Role", label: "Role" },
      ],
      fields: [
        { name: "title", label: "Full name", type: "text", required: true },
        { name: "department", label: "Department", type: "select", options: ["Operations", "Design", "Sales", "Finance", "Plant"] },
        { name: "role", label: "Role", type: "text" },
      ],
      records: makeRows("EMP", ["Nadia Farooq", "Hassan Ali", "Maya Chen", "Imran Shah", "Farah Noor"], (i) => ({
        Department: ["Operations", "Plant", "Design", "Plant", "Service"][i]!,
        Role: ["CEO", "Head of Mfg", "Design Director", "Technician", "Technician"][i]!,
      })),
    }),
    e({
      key: "departments",
      label: "Department",
      plural: "Departments",
      description: "Organizational departments.",
      columns: [
        { key: "title", label: "Department" },
        { key: "status", label: "Status" },
        { key: "Head", label: "Head" },
        { key: "Headcount", label: "Headcount" },
      ],
      fields: [
        { name: "title", label: "Department", type: "text", required: true },
        { name: "head", label: "Head", type: "text" },
      ],
      records: makeRows("DEP", ["Operations", "Design", "Sales", "Finance", "Plant"], (i) => ({
        Head: ["Nadia F.", "Maya C.", "A. Khan", "Finance lead", "Hassan A."][i]!,
        Headcount: [40, 18, 32, 12, 210][i]!,
      })),
    }),
    e({
      key: "org-chart",
      label: "Org node",
      plural: "Organization chart",
      description: "Reporting relationships.",
      columns: [
        { key: "title", label: "Person" },
        { key: "status", label: "Status" },
        { key: "ReportsTo", label: "Reports to" },
      ],
      fields: [
        { name: "title", label: "Person", type: "text", required: true },
        { name: "reportsTo", label: "Reports to", type: "text" },
      ],
      records: makeRows("ORG", ["Hassan Ali", "Maya Chen", "Ayesha Khan"], () => ({
        ReportsTo: "Nadia Farooq",
      })),
    }),
    e({
      key: "attendance",
      label: "Attendance",
      plural: "Attendance",
      description: "Daily attendance register.",
      columns: [
        { key: "title", label: "Employee" },
        { key: "status", label: "Status" },
        { key: "Date", label: "Date" },
        { key: "Hours", label: "Hours" },
      ],
      fields: [
        { name: "title", label: "Employee", type: "text", required: true },
        { name: "date", label: "Date", type: "date" },
      ],
      records: makeRows("ATT", ["Imran Shah", "Farah Noor", "Yasir Ali"], () => ({
        Date: "2026-07-15",
        Hours: 8,
      })),
    }),
    e({
      key: "leave",
      label: "Leave request",
      plural: "Leave",
      description: "Leave requests and balances.",
      columns: [
        { key: "title", label: "Request" },
        { key: "status", label: "Status" },
        { key: "Type", label: "Type" },
        { key: "Days", label: "Days" },
      ],
      fields: [
        { name: "title", label: "Employee", type: "text", required: true },
        { name: "type", label: "Type", type: "select", options: ["Annual", "Sick", "Unpaid"] },
      ],
      records: makeRows("LVE", ["Annual — Farah", "Sick — Yasir"], (i) => ({
        Type: i ? "Sick" : "Annual",
        Days: i ? 2 : 5,
      })),
    }),
    e({
      key: "payroll",
      label: "Payroll run",
      plural: "Payroll overview",
      description: "Payroll run overview (calculations remain server-side).",
      columns: [
        { key: "title", label: "Run" },
        { key: "status", label: "Status" },
        { key: "Period", label: "Period" },
        { key: "amount", label: "Gross" },
      ],
      fields: [
        { name: "title", label: "Run", type: "text", required: true },
        { name: "period", label: "Period", type: "text" },
      ],
      records: makeRows("PAY", ["July 2026", "June 2026"], (i) => ({
        Period: i ? "2026-06" : "2026-07",
      })),
    }),
    e({
      key: "recruitment",
      label: "Job opening",
      plural: "Recruitment",
      description: "Open roles.",
      columns: [
        { key: "title", label: "Role" },
        { key: "status", label: "Status" },
        { key: "Department", label: "Department" },
      ],
      fields: [
        { name: "title", label: "Role", type: "text", required: true },
        { name: "department", label: "Department", type: "text" },
      ],
      records: makeRows("JOB", ["CNC operator", "Project coordinator", "Showroom associate"], (i) => ({
        Department: ["Plant", "Operations", "Sales"][i]!,
      })),
    }),
    e({
      key: "applicants",
      label: "Applicant",
      plural: "Applicants",
      description: "Candidates for open roles.",
      columns: [
        { key: "title", label: "Applicant" },
        { key: "status", label: "Status" },
        { key: "Role", label: "Role" },
      ],
      fields: [
        { name: "title", label: "Name", type: "text", required: true },
        { name: "role", label: "Role", type: "text" },
      ],
      records: makeRows("APL", ["Zainab R.", "Omar K.", "Hina S."], (i) => ({
        Role: ["CNC operator", "Project coordinator", "Showroom associate"][i]!,
      })),
    }),
    e({
      key: "training",
      label: "Training",
      plural: "Training",
      description: "Training programs and completions.",
      columns: [
        { key: "title", label: "Course" },
        { key: "status", label: "Status" },
        { key: "Due", label: "Due" },
      ],
      fields: [
        { name: "title", label: "Course", type: "text", required: true },
        { name: "due", label: "Due", type: "date" },
      ],
      records: makeRows("TRN", ["Safety induction", "Finish standards", "Customer care"], (i) => ({
        Due: `2026-08-0${1 + i}`,
      })),
    }),
    e({
      key: "performance",
      label: "Review",
      plural: "Performance",
      description: "Performance review cycles.",
      columns: [
        { key: "title", label: "Review" },
        { key: "status", label: "Status" },
        { key: "Rating", label: "Rating" },
      ],
      fields: [
        { name: "title", label: "Employee", type: "text", required: true },
        { name: "rating", label: "Rating", type: "text" },
      ],
      records: makeRows("PRF", ["H1 — Imran", "H1 — Farah"], (i) => ({
        Rating: i ? "Exceeds" : "Meets",
      })),
    }),
    e({
      key: "skills",
      label: "Skill",
      plural: "Skills",
      description: "Skill inventory.",
      columns: [
        { key: "title", label: "Skill" },
        { key: "status", label: "Status" },
        { key: "People", label: "People" },
      ],
      fields: [{ name: "title", label: "Skill", type: "text", required: true }],
      records: makeRows("SKL", ["CNC programming", "Upholstery", "CAD"], (i) => ({
        People: 12 + i * 5,
      })),
    }),
    e({
      key: "certifications",
      label: "Certification",
      plural: "Certifications",
      description: "Employee certifications.",
      columns: [
        { key: "title", label: "Certification" },
        { key: "status", label: "Status" },
        { key: "Expires", label: "Expires" },
      ],
      fields: [
        { name: "title", label: "Certification", type: "text", required: true },
        { name: "expires", label: "Expires", type: "date" },
      ],
      records: makeRows("CRT", ["Forklift", "First aid", "ISO internal auditor"], (i) => ({
        Expires: `2027-0${2 + i}-01`,
      })),
    }),
    e({
      key: "shifts",
      label: "Shift",
      plural: "Shift planner",
      description: "Shift planning board.",
      columns: [
        { key: "title", label: "Shift" },
        { key: "status", label: "Status" },
        { key: "Window", label: "Window" },
        { key: "Crew", label: "Crew" },
      ],
      fields: [
        { name: "title", label: "Shift", type: "text", required: true },
        { name: "window", label: "Window", type: "text" },
      ],
      records: makeRows("SHF", ["Plant A day", "Plant A night", "Install crew"], (i) => ({
        Window: ["06:00–14:00", "14:00–22:00", "09:00–18:00"][i]!,
        Crew: 18 + i * 4,
      })),
    }),
    e({
      key: "assets",
      label: "HR asset",
      plural: "Assets",
      description: "Assigned company assets.",
      columns: [
        { key: "title", label: "Asset" },
        { key: "status", label: "Status" },
        { key: "Assignee", label: "Assignee" },
      ],
      fields: [
        { name: "title", label: "Asset", type: "text", required: true },
        { name: "assignee", label: "Assignee", type: "text" },
      ],
      records: makeRows("HAS", ["Laptop L-12", "Phone P-44", "Tool kit T-9"], (i) => ({
        Assignee: ["Maya Chen", "A. Khan", "Imran Shah"][i]!,
      })),
    }),
    e({
      key: "documents",
      label: "Document",
      plural: "Documents",
      description: "HR documents.",
      columns: [
        { key: "title", label: "Document" },
        { key: "status", label: "Status" },
        { key: "Type", label: "Type" },
      ],
      fields: [
        { name: "title", label: "Document", type: "text", required: true },
        { name: "type", label: "Type", type: "select", options: ["Contract", "Policy", "ID", "Other"] },
      ],
      records: makeRows("HDC", ["Employment contract", "NDA", "Handbook ack"], (i) => ({
        Type: ["Contract", "Policy", "Other"][i]!,
      })),
    }),
    e({
      key: "analytics",
      label: "Analytics view",
      plural: "HR analytics",
      description: "HR analytics gallery.",
      analytics: true,
      columns: [
        { key: "title", label: "View" },
        { key: "status", label: "Period" },
        { key: "Value", label: "Value" },
      ],
      fields: [{ name: "title", label: "View", type: "text", required: true }],
      records: makeRows("HAN", ["Attrition", "Time-to-hire", "Training completion"], (i) => ({
        Value: ["6.2%", "34d", "88%"][i]!,
      })),
    }),
  ],
};
