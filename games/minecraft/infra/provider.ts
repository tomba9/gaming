import * as google from '@pulumi/google-native';
import { googleConfig } from './config';

export const googleProvider = new google.Provider('google', {
  project: googleConfig.project,
  region: googleConfig.region,
  zone: googleConfig.zone,
});
