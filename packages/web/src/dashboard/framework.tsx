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
  AreaChart,
  BarChart,
  HorizontalBarChart,
  StackedBarChart,
  PieChart,
  DonutChart,
  RadarChart,
  ScatterPlot,
  FunnelChart,
  ProgressList,
  Heatmap,
  CalendarHeatmap,
  TreeMap,
  SankeyPlaceholder,
  GaugeChart,
  ProgressRing,
  Sparkline,
  TimelineChart,
  WaterfallChart,
  LocationMap,
} from "../workspace/charts";
