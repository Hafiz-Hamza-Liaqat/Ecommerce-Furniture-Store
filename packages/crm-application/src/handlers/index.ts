export type { CrmHandlerDeps } from "./deps.js";
export {
  createCreateLeadHandler,
  createUpdateLeadHandler,
  createQualifyLeadHandler,
  createConvertLeadHandler,
} from "./lead-handlers.js";
export {
  createCreateContactHandler,
  createUpdateContactHandler,
  createCreateAccountHandler,
  createUpdateAccountHandler,
} from "./party-handlers.js";
export {
  createLogActivityHandler,
  createRecordCommunicationHandler,
  createCreateCampaignHandler,
  createUpdateCampaignHandler,
} from "./activity-campaign-handlers.js";
export {
  createGetLeadHandler,
  createGetContactHandler,
  createGetAccountHandler,
  createGetActivityHandler,
  createGetCommunicationHandler,
  createGetCampaignHandler,
  createGetCrmSummaryHandler,
} from "./query-handlers.js";
export {
  createListLeadHandler,
  createListContactHandler,
  createListAccountHandler,
  createListActivityHandler,
  createListCampaignHandler,
} from "./list-handlers.js";
