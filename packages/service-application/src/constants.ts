/**
 * Service management application constants.
 */

export const ServiceCommandTypes = {
  CreateServiceRequest: "service.CreateServiceRequest",
  UpdateServiceRequest: "service.UpdateServiceRequest",
  AssignTechnician: "service.AssignTechnician",
  ReassignTechnician: "service.ReassignTechnician",
  ScheduleAppointment: "service.ScheduleAppointment",
  RescheduleAppointment: "service.RescheduleAppointment",
  CreateWorkOrder: "service.CreateWorkOrder",
  UpdateWorkOrder: "service.UpdateWorkOrder",
  CompleteWorkOrder: "service.CompleteWorkOrder",
  CloseServiceRequest: "service.CloseServiceRequest",
} as const;

export const ServiceQueryTypes = {
  GetServiceRequest: "service.GetServiceRequest",
  GetWorkOrder: "service.GetWorkOrder",
  GetAppointment: "service.GetAppointment",
  GetTechnicianAssignment: "service.GetTechnicianAssignment",
  GetServiceHistory: "service.GetServiceHistory",
  GetServiceSummary: "service.GetServiceSummary",
  ListServiceRequest: "service.ListServiceRequest",
  ListWorkOrder: "service.ListWorkOrder",
  ListAppointment: "service.ListAppointment",
  ListTechnicianAssignment: "service.ListTechnicianAssignment",
} as const;

export const ServiceWorkflowCodes = {
  ServiceRequest: "service_request_v1",
  WorkOrder: "service_work_order_v1",
  Appointment: "service_appointment_v1",
} as const;

export const ServiceSubjectTypes = {
  ServiceRequest: "service.service_request",
  WorkOrder: "service.work_order",
  Appointment: "service.appointment",
  TechnicianAssignment: "service.technician_assignment",
} as const;

/** Rules remain external — dispatch, selection, SLA, workload, appointment optimization */
export const ServiceRuleSetCodes = {
  TechnicianSelection: "service.technician_selection",
  Dispatch: "service.dispatch",
  SlaEvaluation: "service.sla_evaluation",
  WorkloadBalancing: "service.workload_balancing",
  AppointmentOptimization: "service.appointment_optimization",
} as const;

/**
 * Canonical RC5 permission codes (`<module>.<resource>.<action>`), normalized
 * from legacy executable keys in RC5.3 per the frozen RC5.1 mapping. The seed
 * keeps granting the legacy compatibility codes as the documented overlap
 * window for rollback.
 */
export const ServicePolicyActions = {
  ServiceRequestCreate: "service.requests.create",
  ServiceRequestUpdate: "service.requests.update",
  ServiceRequestClose: "service.requests.close",
  ServiceRequestRead: "service.requests.read",
  TechnicianAssign: "service.technicians.assign",
  TechnicianReassign: "service.technicians.reassign",
  TechnicianAssignmentRead: "service.technician_assignments.read",
  AppointmentSchedule: "service.appointments.schedule",
  AppointmentReschedule: "service.appointments.reschedule",
  AppointmentRead: "service.appointments.read",
  WorkOrderCreate: "service.work_orders.create",
  WorkOrderUpdate: "service.work_orders.update",
  WorkOrderComplete: "service.work_orders.complete",
  WorkOrderRead: "service.work_orders.read",
  HistoryRead: "service.history.read",
  SummaryRead: "service.summary.read",
} as const;

export const ServiceApprovalTypes = {
  CloseServiceRequest: "service.service_request_close",
  CompleteWorkOrder: "service.work_order_complete",
  AssignTechnician: "service.technician_assign",
} as const;
