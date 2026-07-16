/**
 * Dashboard framework — re-exports shared enterprise widgets for module pages.
 * Reporting calculations remain backend-owned.
 */

export {
  ActivityFeed,
  ChartCard,
  DashboardGrid,
  StatCard as SummaryWidget,
  EmptyState,
  Skeleton,
  DataTable,
  FilterBar,
  Toolbar,
  Tabs,
  Accordion,
  Drawer,
  Modal,
  SidePanel,
  StatusBadge,
  TrendBadge,
  WidgetContainer,
  KanbanPreview,
  Timeline,
  CalendarPreview,
  ErrorState,
} from "../workspace/widgets";

export {
  LineChart,
  BarChart,
  FunnelChart,
  ProgressList,
  Heatmap,
  LocationMap,
} from "../workspace/charts";
