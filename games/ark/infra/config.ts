import * as pulumi from '@pulumi/pulumi';

export const _googleConfig = new pulumi.Config('google');

export const googleConfig = {
  project: _googleConfig.require('project'),
  region: _googleConfig.require('region'),
  zone: _googleConfig.require('zone'),
};

const _arkConfig = new pulumi.Config('ark');

export const arkConfig = {
  image: _arkConfig.require('image'),
  serverMap: _arkConfig.require('server-map'),
  serverPassword: _arkConfig.requireSecret('server-password'),
  adminPassword: _arkConfig.requireSecret('admin-password'),
  maxPlayers: _arkConfig.getObject<number>('max-players') ?? 20,
  backupOnStop: _arkConfig.getObject<boolean>('backup-on-stop') ?? true,
  gameModIds: _arkConfig.getObject<string[]>('game-mod-ids') ?? [],
};

export const _users = new pulumi.Config('users');

type Role = { googleAccount: string };

export const users = {
  managers: _users.requireObject<Role[]>('managers'),
};
