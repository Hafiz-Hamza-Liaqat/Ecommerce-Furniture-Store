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

export const ServicePolicyActions = {
  ServiceRequestCreate: "service_request.create",
  ServiceRequestUpdate: "service_request.update",
  ServiceRequestClose: "service_request.close",
  ServiceRequestRead: "service_request.read",
  TechnicianAssign: "technician.assign",
  TechnicianReassign: "technician.reassign",
  TechnicianAssignmentRead: "technician_assignment.read",
  AppointmentSchedule: "appointment.schedule",
  AppointmentReschedule: "appointment.reschedule",
  AppointmentRead: "appointment.read",
  WorkOrderCreate: "work_order.create",
  WorkOrderUpdate: "work_order.update",
  WorkOrderComplete: "work_order.complete",
  WorkOrderRead: "work_order.read",
  HistoryRead: "service.history.read",
  SummaryRead: "service.summary.read",
} as const;

export const ServiceApprovalTypes = {
  CloseServiceRequest: "service.service_request_close",
  CompleteWorkOrder: "service.work_order_complete",
  AssignTechnician: "service.technician_assign",
} as const;
