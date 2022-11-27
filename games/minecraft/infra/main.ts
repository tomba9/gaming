import * as google from '@pulumi/google-native';
import * as dedent from 'dedent';
import * as YAML from 'yaml';
import { googleConfig, minecraftConfig } from './config';
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
  SERVER_NAME: '§aBjerk§r Minecraft',
  TZ: 'Europe/Oslo',
  MOTD: '§aBjerk§r Minecraft – Grav i vei!',
  VERSION: minecraftConfig.minecraftVersion,
  SERVER_PORT: minecraftConfig.port,
  ICON: 'https://github.com/bjerkio/minecraft/blob/main/assets/server-icon.png',
  OPS_FILE: 'https://raw.githubusercontent.com/bjerkio/minecraft/main/ops.json',
  OVERRIDE_OPS: 'true',
  ENABLE_AUTOPAUSE: 'true',
  OVERRIDE_ICON: 'true',
  TYPE: 'CURSEFORGE',
  MEMORY: '14G',
  CF_BASE_DIR: '/data',
  CF_SERVER_MOD:
    'https://mediafiles.forgecdn.net/files/3467/826/MC-Eternal-Lite-1.3.8.1-SERVER.zip',
  RCON_CMDS_STARTUP: dedent`
    gamerule doFireTick false
    pregen start 200
  `,
};

new google.compute.v1.Instance(
  'instance',
  {
    name: 'minecraft-server',
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
                  name: 'minecraft',
                  image: minecraftConfig.image,
                  stdin: false,
                  tty: false,
                  env: Object.entries(envs).map(([name, value]) => ({
                    name,
                    value,
                  })),
                  ports: [
                    {
                      containerPort: minecraftConfig.port,
                    },
                  ],
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
    tags: { items: ['minecraft-server'] }, // <--- this is the change compared to step 1
  },
  {
    dependsOn: [computeFirewall],
    provider: googleProvider,
    replaceOnChanges: ['machineType'],
    deleteBeforeReplace: true,
  },
);
