import * as pulumi from '@pulumi/pulumi';

export const _googleConfig = new pulumi.Config('google');

export const googleConfig = {
  project: _googleConfig.require('project'),
  region: _googleConfig.require('region'),
  zone: _googleConfig.require('zone'),
};

export const _minecraftConfig = new pulumi.Config('minecraft');

export const minecraftConfig = {
  port: String(_minecraftConfig.get('port') ?? 25565),
  image: _minecraftConfig.require('image'),
  minecraftVersion: _minecraftConfig.require('minecraft-version'),
};

export const _users = new pulumi.Config('users');

type Role = { googleAccount: string; minecraftUser: string };

export const users = {
  managers: _users.requireObject<Role[]>('managers'),
};
