import * as google from '@pulumi/google-native';
import { users } from './config';
import { googleProvider } from './provider';

export const roles = new google.cloudresourcemanager.v3.ProjectIamPolicy(
  'roles',
  {
    bindings: [
      {
        members: [...users.managers.map(user => `user:${user.googleAccount}`)],
        role: 'roles/editor',
      },
    ],
  },
  { provider: googleProvider },
);
