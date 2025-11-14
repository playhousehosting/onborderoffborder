"use node";

export interface GraphCredentials {
  clientId: string;
  tenantId: string;
  clientSecret: string | null;
}

export async function getAccessTokenFromCredentials(credentials: GraphCredentials): Promise<string> {
  if (!credentials.clientSecret) {
    throw new Error("Client secret required for app-only Graph access");
  }

  const tokenEndpoint = `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append("client_id", credentials.clientId);
  params.append("client_secret", credentials.clientSecret);
  params.append("scope", "https://graph.microsoft.com/.default");
  params.append("grant_type", "client_credentials");

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    let errorMessage = "Failed to acquire Microsoft Graph token";
    try {
      const error = await response.json();
      errorMessage = error.error_description || error.error || errorMessage;
    } catch (err) {
      // ignore json parse errors
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.access_token;
}
