import type { CommandHandler } from "@afh/application";
import { ConflictError, NotFoundError, fail, ok } from "@afh/shared-kernel";
import type {
  Appointment,
  AppointmentStatus,
  TechnicianAssignmentReference,
} from "@afh/service";
import { ServiceEventTypes } from "@afh/service";
import {
  ServiceApprovalTypes,
  ServiceCommandTypes,
  ServicePolicyActions,
  ServiceRuleSetCodes,
  ServiceSubjectTypes,
  ServiceWorkflowCodes,
} from "../constants.js";
import type {
  AssignTechnicianPayload,
  ReassignTechnicianPayload,
  RescheduleAppointmentPayload,
  ScheduleAppointmentPayload,
} from "../commands/commands.js";
import {
  assignTechnicianCommandValidator,
  reassignTechnicianCommandValidator,
  rescheduleAppointmentCommandValidator,
  scheduleAppointmentCommandValidator,
} from "../validators/validators.js";
import type { ServiceHandlerDeps } from "./deps.js";
import {
  approvalOrNull,
  buildServiceEvent,
  commandCausationId,
  companyResource,
  enqueueDomainEvent,
  invokeServiceRules,
  newEntityId,
  recordServiceAudit,
  requireApproval,
  requireCompanyId,
  workflowOrFail,
} from "../support/support.js";

function mapAppointmentStatus(projection: string): AppointmentStatus {
  const known: AppointmentStatus[] = [
    "draft",
    "scheduled",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
    "no_show",
  ];
  return (known.includes(projection as AppointmentStatus)
    ? projection
    : "scheduled") as AppointmentStatus;
}

export function createAssignTechnicianHandler(
  deps: ServiceHandlerDeps,
): CommandHandler<
  AssignTechnicianPayload,
  {
    assignmentId: string;
    pendingApproval: boolean;
    approvalRequestId?: string;
  }
> {
  return {
    commandType: ServiceCommandTypes.AssignTechnician,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "technician_assignment",
        ServicePolicyActions.TechnicianAssign,
        p.companyId,
        null,
        {
          ownerUserId: p.userId ?? null,
          attributes: {
            employeeId: p.employeeId ?? null,
            workOrderId: p.workOrderId ?? null,
            appointmentId: p.appointmentId ?? null,
            teamId: p.teamId ?? null,
          },
        },
      );
    },
    validate() {
      return assignTechnicianCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;

      const selection = await invokeServiceRules(
        ctx,
        ServiceRuleSetCodes.TechnicianSelection,
        {
          companyId: scope.value,
          employeeId: p.employeeId,
          workOrderId: p.workOrderId ?? null,
          appointmentId: p.appointmentId ?? null,
        },
      );
      if (!selection.ok) return selection;

      const dispatch = await invokeServiceRules(
        ctx,
        ServiceRuleSetCodes.Dispatch,
        {
          companyId: scope.value,
          employeeId: p.employeeId,
          workOrderId: p.workOrderId ?? null,
          appointmentId: p.appointmentId ?? null,
        },
      );
      if (!dispatch.ok) return dispatch;

      const workload = await invokeServiceRules(
        ctx,
        ServiceRuleSetCodes.WorkloadBalancing,
        {
          companyId: scope.value,
          employeeId: p.employeeId,
        },
      );
      if (!workload.ok) return workload;

      if (p.requireApproval) {
        if (!approvalOrNull(ctx)) {
          return fail(
            new ConflictError(
              "ApprovalEngine required for technician assign",
              { code: "approval_not_wired" },
            ),
          );
        }
        const submitted = await requireApproval(ctx).submit({
          companyId: scope.value,
          branchId: ctx.branchId,
          type: ServiceApprovalTypes.AssignTechnician,
          subjectType: ServiceSubjectTypes.TechnicianAssignment,
          subjectId: p.employeeId,
          payload: {
            workOrderId: p.workOrderId ?? null,
            appointmentId: p.appointmentId ?? null,
          },
          submittedByUserId: ctx.userId ?? "unknown",
        });
        if (!submitted.ok) return submitted;

        await recordServiceAudit(deps.audit, ctx, {
          action: ServiceCommandTypes.AssignTechnician,
          entityType: "technician_assignment",
          entityId: null,
          outcome: "success",
          details: {
            pendingApproval: true,
            approvalRequestId: submitted.value.id,
          },
        });

        return ok({
          assignmentId: "",
          pendingApproval: true,
          approvalRequestId: submitted.value.id,
        });
      }

      const now = ctx.clock.now().toISOString();
      const assignmentId = newEntityId();
      const assignment: TechnicianAssignmentReference = {
        assignmentId,
        companyId: scope.value,
        workOrderId: p.workOrderId ?? null,
        appointmentId: p.appointmentId ?? null,
        technician: {
          employeeId: p.employeeId,
          companyId: scope.value,
          userId: p.userId ?? null,
          displayName: p.displayName ?? null,
        },
        team: p.teamId
          ? {
              teamId: p.teamId,
              companyId: scope.value,
              code: p.teamCode ?? null,
              name: p.teamName ?? null,
            }
          : null,
        assignedAt: now,
      };

      const saved = await deps.technicianAssignments.save(assignment);
      if (!saved.ok) return saved;

      const event = buildServiceEvent({
        eventType: ServiceEventTypes.TechnicianAssignedReference,
        aggregateType: "technician_assignment",
        aggregateId: assignmentId,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          assignmentId,
          companyId: scope.value,
          employeeId: p.employeeId,
          workOrderId: p.workOrderId ?? null,
          appointmentId: p.appointmentId ?? null,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordServiceAudit(deps.audit, ctx, {
        action: ServiceCommandTypes.AssignTechnician,
        entityType: "technician_assignment",
        entityId: assignmentId,
        outcome: "success",
        details: {
          employeeId: p.employeeId,
          workOrderId: p.workOrderId ?? null,
          appointmentId: p.appointmentId ?? null,
        },
      });

      return ok({ assignmentId, pendingApproval: false });
    },
  };
}

export function createReassignTechnicianHandler(
  deps: ServiceHandlerDeps,
): CommandHandler<ReassignTechnicianPayload, { assignmentId: string }> {
  return {
    commandType: ServiceCommandTypes.ReassignTechnician,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "technician_assignment",
        ServicePolicyActions.TechnicianReassign,
        p.companyId,
        p.assignmentId,
        {
          ownerUserId: p.userId ?? null,
          attributes: {
            employeeId: p.employeeId ?? null,
            teamId: p.teamId ?? null,
          },
        },
      );
    },
    validate() {
      return reassignTechnicianCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.technicianAssignments.findById({
        companyId: scope.value,
        id: command.payload.assignmentId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Technician assignment not found", {
            code: "technician_assignment_not_found",
          }),
        );
      }

      const p = command.payload;

      const selection = await invokeServiceRules(
        ctx,
        ServiceRuleSetCodes.TechnicianSelection,
        {
          companyId: scope.value,
          assignmentId: p.assignmentId,
          employeeId: p.employeeId,
          previousEmployeeId: existing.value.technician.employeeId,
        },
      );
      if (!selection.ok) return selection;

      const workload = await invokeServiceRules(
        ctx,
        ServiceRuleSetCodes.WorkloadBalancing,
        {
          companyId: scope.value,
          employeeId: p.employeeId,
        },
      );
      if (!workload.ok) return workload;

      const now = ctx.clock.now().toISOString();
      const updated: TechnicianAssignmentReference = {
        ...existing.value,
        technician: {
          employeeId: p.employeeId,
          companyId: scope.value,
          userId: p.userId ?? null,
          displayName: p.displayName ?? null,
        },
        team: p.teamId
          ? {
              teamId: p.teamId,
              companyId: scope.value,
              code: p.teamCode ?? null,
              name: p.teamName ?? null,
            }
          : existing.value.team,
        assignedAt: now,
      };

      const saved = await deps.technicianAssignments.save(updated);
      if (!saved.ok) return saved;

      const event = buildServiceEvent({
        eventType: ServiceEventTypes.TechnicianAssignedReference,
        aggregateType: "technician_assignment",
        aggregateId: updated.assignmentId,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          assignmentId: updated.assignmentId,
          companyId: scope.value,
          employeeId: p.employeeId,
          workOrderId: updated.workOrderId,
          appointmentId: updated.appointmentId,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordServiceAudit(deps.audit, ctx, {
        action: ServiceCommandTypes.ReassignTechnician,
        entityType: "technician_assignment",
        entityId: updated.assignmentId,
        outcome: "success",
        details: {
          employeeId: p.employeeId,
          previousEmployeeId: existing.value.technician.employeeId,
        },
      });

      return ok({ assignmentId: updated.assignmentId });
    },
  };
}

export function createScheduleAppointmentHandler(
  deps: ServiceHandlerDeps,
): CommandHandler<ScheduleAppointmentPayload, { appointmentId: string }> {
  return {
    commandType: ServiceCommandTypes.ScheduleAppointment,
    authorize(command) {
      const p = command.payload;
      return companyResource(
        "appointment",
        ServicePolicyActions.AppointmentSchedule,
        p.companyId,
        null,
        {
          attributes: {
            serviceRequestId: p.serviceRequestId ?? null,
            workOrderId: p.workOrderId ?? null,
            projectId: p.projectId ?? null,
          },
        },
      );
    },
    validate() {
      return scheduleAppointmentCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const p = command.payload;

      const optimization = await invokeServiceRules(
        ctx,
        ServiceRuleSetCodes.AppointmentOptimization,
        {
          companyId: scope.value,
          startAt: p.startAt,
          endAt: p.endAt,
          serviceRequestId: p.serviceRequestId ?? null,
          workOrderId: p.workOrderId ?? null,
        },
      );
      if (!optimization.ok) return optimization;

      const sla = await invokeServiceRules(
        ctx,
        ServiceRuleSetCodes.SlaEvaluation,
        {
          companyId: scope.value,
          startAt: p.startAt,
          endAt: p.endAt,
          action: "schedule",
        },
      );
      if (!sla.ok) return sla;

      const wf = workflowOrFail(ctx);
      if (!wf.ok) return wf;

      const id = newEntityId();
      const now = ctx.clock.now().toISOString();

      const started = await wf.value.start({
        companyId: scope.value,
        definitionCode: ServiceWorkflowCodes.Appointment,
        subjectType: ServiceSubjectTypes.Appointment,
        subjectId: id,
        actorUserId: ctx.userId,
      });
      if (!started.ok) return started;

      const appointment: Appointment = {
        id,
        companyId: scope.value,
        status: mapAppointmentStatus(started.value.statusProjection),
        window: {
          startAt: p.startAt,
          endAt: p.endAt,
          timezone: p.timezone ?? null,
        },
        serviceRequestId: p.serviceRequestId ?? null,
        workOrderId: p.workOrderId ?? null,
        projectId: p.projectId ?? null,
        siteAddressId: p.siteAddressId ?? null,
        notes: p.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await deps.appointments.save(appointment);
      if (!saved.ok) return saved;

      const event = buildServiceEvent({
        eventType: ServiceEventTypes.AppointmentScheduled,
        aggregateType: "appointment",
        aggregateId: id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          appointmentId: id,
          companyId: scope.value,
          startAt: p.startAt,
          endAt: p.endAt,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordServiceAudit(deps.audit, ctx, {
        action: ServiceCommandTypes.ScheduleAppointment,
        entityType: "appointment",
        entityId: id,
        outcome: "success",
        details: { workflowInstanceId: started.value.id },
      });

      return ok({ appointmentId: id });
    },
  };
}

export function createRescheduleAppointmentHandler(
  deps: ServiceHandlerDeps,
): CommandHandler<RescheduleAppointmentPayload, { appointmentId: string }> {
  return {
    commandType: ServiceCommandTypes.RescheduleAppointment,
    authorize(command) {
      return companyResource(
        "appointment",
        ServicePolicyActions.AppointmentReschedule,
        command.payload.companyId,
        command.payload.appointmentId,
      );
    },
    validate() {
      return rescheduleAppointmentCommandValidator;
    },
    async handle(command, ctx) {
      const scope = requireCompanyId(ctx, command.payload.companyId);
      if (!scope.ok) return scope;

      const existing = await deps.appointments.findById({
        companyId: scope.value,
        id: command.payload.appointmentId,
      });
      if (!existing.ok) return existing;
      if (!existing.value) {
        return fail(
          new NotFoundError("Appointment not found", {
            code: "appointment_not_found",
          }),
        );
      }

      const p = command.payload;

      const optimization = await invokeServiceRules(
        ctx,
        ServiceRuleSetCodes.AppointmentOptimization,
        {
          companyId: scope.value,
          appointmentId: p.appointmentId,
          startAt: p.startAt,
          endAt: p.endAt,
          action: "reschedule",
        },
      );
      if (!optimization.ok) return optimization;

      let status = existing.value.status;
      if (p.transitionCode && p.workflowInstanceId) {
        const wf = workflowOrFail(ctx);
        if (!wf.ok) return wf;
        const transitioned = await wf.value.transition({
          instanceId: p.workflowInstanceId,
          transitionCode: p.transitionCode,
          actorUserId: ctx.userId,
        });
        if (!transitioned.ok) return transitioned;
        status = mapAppointmentStatus(transitioned.value.statusProjection);
      } else if (status === "draft") {
        status = "scheduled";
      }

      const now = ctx.clock.now().toISOString();
      const updated: Appointment = {
        ...existing.value,
        status,
        window: {
          startAt: p.startAt,
          endAt: p.endAt,
          timezone:
            p.timezone !== undefined
              ? p.timezone
              : existing.value.window.timezone,
        },
        notes: p.notes !== undefined ? p.notes : existing.value.notes,
        updatedAt: now,
      };

      const saved = await deps.appointments.save(updated);
      if (!saved.ok) return saved;

      const event = buildServiceEvent({
        eventType: ServiceEventTypes.AppointmentScheduled,
        aggregateType: "appointment",
        aggregateId: updated.id,
        companyId: scope.value,
        correlationId: ctx.correlationId,
        causationId: commandCausationId(command),
        clock: ctx.clock,
        payload: {
          appointmentId: updated.id,
          companyId: scope.value,
          startAt: p.startAt,
          endAt: p.endAt,
        },
      });
      const enqueued = await enqueueDomainEvent(deps.outbox, event);
      if (!enqueued.ok) return enqueued;

      await recordServiceAudit(deps.audit, ctx, {
        action: ServiceCommandTypes.RescheduleAppointment,
        entityType: "appointment",
        entityId: updated.id,
        outcome: "success",
        details: { transitionCode: p.transitionCode ?? null },
      });

      return ok({ appointmentId: updated.id });
    },
  };
}
