import * as google from '@pulumi/google-native';
import * as dedent from 'dedent';
import * as YAML from 'yaml';
import { arkConfig, googleConfig } from './config';
import { roles } from './iam';
import { googleProvider } from './provider';
import { mapDisk } from './storage';

const computeNetwork = new google.compute.v1.Network(
  'network',
  {
    autoCreateSubnetworks: true,
  },
  { provider: googleProvider, dependsOn: [roles] },
);

const gamePorts = ['7777', '7778', '27020', '27015'];

const computeFirewall = new google.compute.v1.Firewall(
  'firewall',
  {
    network: computeNetwork.selfLink,
    allowed: [
      {
        ipProtocol: 'tcp',
        ports: [...gamePorts, '22'],
      },
    ],
  },
  { provider: googleProvider },
);

const ipAddress = new google.compute.v1.Address(
  'static',
  {
    name: 'ark-srv',
    region: googleConfig.region,
  },
  { provider: googleProvider },
);

const envs: Record<string, string> = {
  SESSION_NAME: 'Bjerk & Friends',
  SERVER_MAP: String(arkConfig.serverMap),
  SERVER_PASSWORD: String(arkConfig.serverPassword),
  ADMIN_PASSWORD: String(arkConfig.adminPassword),
  MAX_PLAYERS: String(arkConfig.maxPlayers),
  BACKUP_ON_STOP: String(arkConfig.backupOnStop),
  GAME_MOD_IDS: String(arkConfig.gameModIds.join(',')),
};

new google.compute.v1.Instance(
  'instance',
  {
    name: 'ark-server',
    machineType: 'e2-highmem-2',
    disks: [
      {
        boot: true,
        autoDelete: true,
        initializeParams: {
          sourceImage:
            'projects/cos-cloud/global/images/cos-stable-97-16919-103-16',
        },
      },
      {
        deviceName: 'map-disk',
        source: mapDisk.id,
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
                  name: 'ark',
                  image: arkConfig.image,
                  stdin: false,
                  tty: false,
                  env: Object.entries(envs).map(([name, value]) => ({
                    name,
                    value,
                  })),
                  ports: gamePorts.map((port) => ({
                      containerPort: port,
                    })),
                  volumeMounts: [
                    { name: 'pd-0', mountPath: '/data', readOnly: false },
                  ],
                },
              ],
              volumes: [
                {
                  name: 'pd-0',
                  gcePersistentDisk: {
                    pdName: 'map-disk',
                    fsType: 'ext4',
                    readOnly: false,
                  },
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
    tags: { items: ['ark-server'] }, // <--- this is the change compared to step 1
  },
  {
    dependsOn: [computeFirewall],
    provider: googleProvider,
    replaceOnChanges: ['machineType'],
    deleteBeforeReplace: true,
  },
);
