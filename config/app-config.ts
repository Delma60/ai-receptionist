import { adminDb } from "../lib/firebase-admin";

export interface AppConfig {
  paymentProvider: 'stripe' | 'flutterwave';
  allowGoogleAuth: boolean;
  allowGithubAuth: boolean;
  maintenanceMode: boolean;
  defaultTrialDays: number;
  supportEmail: string;
}

/**
 * Server-side utility to fetch global application configuration.
 */
export async function getAppConfig(): Promise<AppConfig> {
  try {
    const docSnap = await adminDb.collection("platform").doc("config").get();
    const data = docSnap.data();
    
    return {
      paymentProvider: data?.paymentProvider || 'stripe',
      allowGoogleAuth: data?.allowGoogleAuth ?? true,
      allowGithubAuth: data?.allowGithubAuth ?? true,
      maintenanceMode: data?.maintenanceMode ?? false,
      defaultTrialDays: data?.defaultTrialDays || 14,
      supportEmail: data?.supportEmail || "support@receptionly.ai",
    };
  } catch (error) {
    console.error("Error fetching app config:", error);
    return {
      paymentProvider: 'stripe',
      allowGoogleAuth: true,
      allowGithubAuth: true,
      maintenanceMode: false,
      defaultTrialDays: 14,
      supportEmail: "support@receptionly.ai",
    };
  }
}
