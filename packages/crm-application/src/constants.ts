/**
 * CRM application constants.
 */

export const CrmCommandTypes = {
  CreateLead: "crm.CreateLead",
  UpdateLead: "crm.UpdateLead",
  QualifyLead: "crm.QualifyLead",
  ConvertLead: "crm.ConvertLead",
  CreateContact: "crm.CreateContact",
  UpdateContact: "crm.UpdateContact",
  CreateAccount: "crm.CreateAccount",
  UpdateAccount: "crm.UpdateAccount",
  LogActivity: "crm.LogActivity",
  RecordCommunication: "crm.RecordCommunication",
  CreateCampaign: "crm.CreateCampaign",
  UpdateCampaign: "crm.UpdateCampaign",
} as const;

export const CrmQueryTypes = {
  GetLead: "crm.GetLead",
  GetContact: "crm.GetContact",
  GetAccount: "crm.GetAccount",
  GetActivity: "crm.GetActivity",
  GetCommunication: "crm.GetCommunication",
  GetCampaign: "crm.GetCampaign",
  GetCrmSummary: "crm.GetCrmSummary",
} as const;

export const CrmWorkflowCodes = {
  Lead: "crm_lead_v1",
  Campaign: "crm_campaign_v1",
} as const;

export const CrmSubjectTypes = {
  Lead: "crm.lead",
  Contact: "crm.contact",
  Account: "crm.account",
  Activity: "crm.activity",
  Communication: "crm.communication",
  Campaign: "crm.campaign",
} as const;

/** Rules remain external — scoring, qualification, segmentation, campaign, conversion */
export const CrmRuleSetCodes = {
  LeadScoring: "crm.lead_scoring",
  Qualification: "crm.qualification",
  Conversion: "crm.conversion",
  Segmentation: "crm.segmentation",
  CampaignEvaluation: "crm.campaign_evaluation",
} as const;

export const CrmPolicyActions = {
  LeadCreate: "lead.create",
  LeadUpdate: "lead.update",
  LeadQualify: "lead.qualify",
  LeadConvert: "lead.convert",
  LeadRead: "lead.read",
  ContactCreate: "contact.create",
  ContactUpdate: "contact.update",
  ContactRead: "contact.read",
  AccountCreate: "account.create",
  AccountUpdate: "account.update",
  AccountRead: "account.read",
  ActivityLog: "activity.log",
  ActivityRead: "activity.read",
  CommunicationRecord: "communication.record",
  CommunicationRead: "communication.read",
  CampaignCreate: "campaign.create",
  CampaignUpdate: "campaign.update",
  CampaignRead: "campaign.read",
  SummaryRead: "crm.summary.read",
} as const;

export const CrmApprovalTypes = {
  ConvertLead: "crm.lead_convert",
  QualifyLead: "crm.lead_qualify",
} as const;
