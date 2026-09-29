import { Inject, Injectable, InjectionToken } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private settings: AppConfig;

  constructor(@Inject(APP_CONFIG) private config: AppConfig) {
    this.settings = config;
  }

 /**
  * If the settings haven't been loaded yet, load them from the endpoint. Then, wait until they're
  * loaded, and return them
  * @returns The settings object
  */
  get configuration(): AppConfig {
    return this.settings;
  }
}


export class AppConfig {
  apiUrl: string = "";
  msal: MsalConfig = new MsalConfig()
  applicationInsight: AppInsightConfig | null = null;
}

export class MsalConfig {
  clientId: string = "";
  authority: string = "";
  redirectUri: string = "";
  graphEndpoint: string ="";
  scope: string =""
}

export class AppInsightConfig {
  instrumentationKey: string = "";
  app: string = "Wizmo Portal"
}

export let APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG')