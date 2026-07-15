/**
 * Service domain event contracts — no publishers, consumers, or Event Bus.
 */

import type { DomainEvent, DomainEventMetadata } from "@afh/shared-kernel";

export type ServiceRequestCreatedPayload = {
  readonly serviceRequestId: string;
  readonly companyId: string;
};

export type WorkOrderCreatedPayload = {
  readonly workOrderId: string;
  readonly companyId: string;
  readonly serviceRequestId: string | null;
};

export type AppointmentScheduledPayload = {
  readonly appointmentId: string;
  readonly companyId: string;
  readonly startAt: string;
  readonly endAt: string;
};

export type TechnicianAssignedReferencePayload = {
  readonly assignmentId: string;
  readonly companyId: string;
  readonly employeeId: string;
  readonly workOrderId: string | null;
  readonly appointmentId: string | null;
};

export type ServiceCompletedPayload = {
  readonly serviceRequestId: string;
  readonly companyId: string;
  readonly workOrderId: string | null;
};

export const ServiceEventTypes = {
  ServiceRequestCreated: "service.request.created",
  WorkOrderCreated: "service.work_order.created",
  AppointmentScheduled: "service.appointment.scheduled",
  TechnicianAssignedReference: "service.technician.assigned_reference",
  ServiceCompleted: "service.request.completed",
} as const;

export type ServiceEventType =
  (typeof ServiceEventTypes)[keyof typeof ServiceEventTypes];

export type ServiceDomainEvent<TPayload> = DomainEvent<TPayload> & {
  readonly metadata: DomainEventMetadata & {
    readonly eventType: ServiceEventType | string;
  };
};

export type ServiceRequestCreatedEvent =
  ServiceDomainEvent<ServiceRequestCreatedPayload>;
export type WorkOrderCreatedEvent = ServiceDomainEvent<WorkOrderCreatedPayload>;
export type AppointmentScheduledEvent =
  ServiceDomainEvent<AppointmentScheduledPayload>;
export type TechnicianAssignedReferenceEvent =
  ServiceDomainEvent<TechnicianAssignedReferencePayload>;
export type ServiceCompletedEvent = ServiceDomainEvent<ServiceCompletedPayload>;
