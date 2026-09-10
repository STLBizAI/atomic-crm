import { CRM } from "@/components/atomic-crm/root/CRM";

const dealStages = [
  { value: "assessment-proposed", label: "Proposed" },
  { value: "assessment-booked", label: "Booked" },
  { value: "assessment-interview-held", label: "Interview Held" },
  { value: "assessment-report-delivered", label: "Report Delivered" },
  { value: "assessment-followup-held", label: "Follow-up Held" },
  { value: "assessment-won", label: "Won" },
  { value: "assessment-lost", label: "Lost" },
  { value: "build-scoped", label: "Scoped" },
  { value: "build-deposit-paid", label: "Deposit Paid" },
  { value: "build-in-build", label: "In Build" },
  { value: "build-live", label: "Live" },
  { value: "build-retainer", label: "Retainer" },
  { value: "build-complete", label: "Complete" },
  { value: "build-cancelled", label: "Cancelled" },
];

const dealCategories = [
  { value: "assessment", label: "Assessment" },
  { value: "build", label: "Build" },
];

const dealPipelineStatuses = [
  "assessment-won",
  "assessment-lost",
  "build-complete",
  "build-cancelled",
];

const taskTypes = [
  { value: "none", label: "None" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "one-to-one", label: "121" },
  { value: "meeting", label: "Meeting" },
  { value: "follow-up", label: "Follow-up" },
  { value: "thank-you", label: "Thank you" },
];

const App = () => (
  <CRM
    dealStages={dealStages}
    dealCategories={dealCategories}
    dealPipelineStatuses={dealPipelineStatuses}
    taskTypes={taskTypes}
    title="STL Biz AI CRM"
  />
);

export default App;

/**
 * Application entry point
 *
 * Customize Atomic CRM by passing props to the CRM component:
 *  - companySectors
 *  - darkTheme
 *  - dealCategories
 *  - dealPipelineStatuses
 *  - dealStages
 *  - lightTheme
 *  - darkModeLogo / lightModeLogo
 *  - noteStatuses
 *  - taskTypes
 *  - title
 * ... as well as all the props accepted by shadcn-admin-kit's <Admin> component.
 *
 * Logos must be an imported asset, an absolute URL, or a data URI — never a
 * route-relative path like "./img/logo.png", which breaks on nested routes.
 *
 * @example
 * import logoDark from "./logo-dark.svg";
 * import logoLight from "./logo-light.svg";
 *
 * const App = () => (
 *    <CRM
 *       darkModeLogo={logoDark}
 *       lightModeLogo={logoLight}
 *       title="Acme CRM"
 *    />
 * );
 */
