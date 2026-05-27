// Catalog of all possible integrations (static + coming soon)
// This can be extended or loaded from config/app.json if needed
export const INTEGRATIONS_CATALOG = [
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync meetings and events with Google Calendar.',
    category: 'calendar',
    comingSoon: false,
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Sync contacts and deals with HubSpot CRM.',
    category: 'crm',
    comingSoon: false,
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Automate workflows with Zapier.',
    category: 'webhook',
    comingSoon: false,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications and messages to Slack.',
    category: 'communication',
    comingSoon: false,
  },
  // Add more integrations here, including those not yet available
  {
    id: 'gohighlevel',
    name: 'GoHighLevel',
    description: 'CRM and marketing automation platform.',
    category: 'crm',
    comingSoon: true,
  },
  // ...
];
