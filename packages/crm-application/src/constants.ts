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

/**
 * Canonical RC5 permission codes (`<module>.<resource>.<action>`), normalized
 * from legacy executable keys in RC5.3 per the frozen RC5.1 mapping. The seed
 * keeps granting the legacy compatibility codes as the documented overlap
 * window for rollback.
 */
export const CrmPolicyActions = {
  LeadCreate: "crm.leads.create",
  LeadUpdate: "crm.leads.update",
  LeadQualify: "crm.leads.qualify",
  LeadConvert: "crm.leads.convert",
  LeadRead: "crm.leads.read",
  ContactCreate: "crm.contacts.create",
  ContactUpdate: "crm.contacts.update",
  ContactRead: "crm.contacts.read",
  AccountCreate: "crm.accounts.create",
  AccountUpdate: "crm.accounts.update",
  AccountRead: "crm.accounts.read",
  ActivityLog: "crm.activities.log",
  ActivityRead: "crm.activities.read",
  CommunicationRecord: "crm.communications.record",
  CommunicationRead: "crm.communications.read",
  CampaignCreate: "crm.campaigns.create",
  CampaignUpdate: "crm.campaigns.update",
  CampaignRead: "crm.campaigns.read",
  SummaryRead: "crm.summary.read",
} as const;

export const CrmApprovalTypes = {
  ConvertLead: "crm.lead_convert",
  QualifyLead: "crm.lead_qualify",
} as const;
