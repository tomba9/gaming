import * as google from '@pulumi/google-native';
import { interpolate } from '@pulumi/pulumi';
import { googleConfig } from './config';
import { googleProvider } from './provider';

export const mapDisk = new google.compute.v1.Disk(
  'map-disk',
  {
    name: 'map-storage',
    type: interpolate`projects/${googleConfig.project}/zones/${googleConfig.zone}/diskTypes/pd-ssd`,
    sizeGb: '50',
  },
  { provider: googleProvider },
);
