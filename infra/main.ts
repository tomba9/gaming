import * as google from '@pulumi/google-native';
import * as YAML from 'yaml';
import { googleConfig, minecraftConfig } from './config';
import { roles } from './iam';
import { googleProvider } from './provider';

const computeNetwork = new google.compute.v1.Network(
  'network',
  {
    autoCreateSubnetworks: true,
  },
  { provider: googleProvider, dependsOn: [roles] },
);

const computeFirewall = new google.compute.v1.Firewall(
  'firewall',
  {
    network: computeNetwork.selfLink,
    allowed: [
      {
        ipProtocol: 'tcp',
        ports: [minecraftConfig.port, '22'],
      },
    ],
  },
  { provider: googleProvider },
);

const ipAddress = new google.compute.v1.Address(
  'static',
  {
    name: 'minecraft-srv',
    region: googleConfig.region,
  },
  { provider: googleProvider },
);

const envs: Record<string, string> = {
  EULA: 'true',
  VERSION: minecraftConfig.minecraftVersion,
  SERVER_PORT: minecraftConfig.port,
  OPS: 'https://raw.githubusercontent.com/bjerkio/minecraft/main/ops.json',
  OVERRIDE_OPS: 'true',
};

new google.compute.v1.Instance(
  'instance',
  {
    name: 'minecraft-server',
    machineType: 'f1-micro',
    disks: [
      {
        boot: true,
        initializeParams: {
          sourceImage:
            'projects/cos-cloud/global/images/cos-stable-97-16919-103-16',
        },
      },
    ],
    metadata: {
      items: [
        {
          key: 'gce-container-declaration',
          value: YAML.stringify({
            spec: {
              restartPolicy: 'Always',
              containers: [
                {
                  name: 'minecraft',
                  image: minecraftConfig.image,
                  stdin: false,
                  tty: false,
                  // command: ['rclone'],
                  // args: ['--rc'],
                  env: Object.entries(envs).map(([name, value]) => ({
                    name,
                    value,
                  })),
                  ports: [
                    {
                      containerPort: minecraftConfig.port,
                    },
                  ],
                },
              ],
            },
          }),
        },
      ],
    },
    networkInterfaces: [
      {
        network: computeNetwork.id,
        accessConfigs: [{ natIP: ipAddress.address }], // must be empty to request an ephemeral IP
      },
    ],
    serviceAccounts: [
      {
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      },
    ],
    tags: { items: ['minecraft-server'] }, // <--- this is the change compared to step 1
  },
  { dependsOn: [computeFirewall], provider: googleProvider },
);
